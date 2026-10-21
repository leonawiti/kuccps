# Development log

What was built, in order, what was decided and why, and anything that went wrong. Newest at the bottom.
Method throughout: write the test first and watch it fail, make it pass, then break the code on purpose to
prove the test guards it.

## 1. Backend scaffold
Django 5.2 with Django REST framework. No accounts and no database tables of its own: the API is stateless and
stores nothing about learners. Settings are read from the environment. Tests run with
`venv/Scripts/python.exe manage.py test` from `backend/`.

## 2. Grades (`engine/grades.py`) — 20 tests with subjects
The 12-point scale (A = 12 … E = 1), parsing of grades as the documents write them ("C (plain)", "C- (minus)"),
the total of the best seven subjects, and the mean grade for a total.
**To verify:** the mean-grade table is from my own knowledge, not from your documents. Check it against KNEC.
**Noted:** the design notes call a 65-point learner "A-"; under this table 65 is a B (A- starts at 74).

## 3. Subjects (`engine/subjects.py`)
34 subjects in KCSE groups 1–5. The 28 codes seen in the workbook are exact. Technical subjects 444–450 are not
in the workbook; their keys are mine (`in_workbook=False`). The subject-groups document gives IRE/HRE the wrong
codes; the workbook's 313/314/315 are used.

## 4. Requirement parser (`engine/requirements.py`) — 31 tests in total
Reads `CODE(num)/CODE(num):GRADE` slots, copes with line breaks inside codes, refuses anything it cannot read
with certainty (cut-off cells, missing grades, unknown subjects, code/number mismatches). Mutation check:
disabling the number-match check made a test fail; restored.

## 5. Cluster points and slot assignment (`engine/cluster.py`)
Formula `C = 48 * sqrt((r/48) * (t/84))`. Each requirement slot takes a distinct subject meeting its minimum
grade, chosen so the learner's total is highest. Where a programme lists fewer than four slots, the remaining
cluster positions are filled with the learner's best remaining subjects. **This is an assumption**: the
workbook lists minimum requirements, not necessarily KUCCPS's official cluster-subject lists. It is switchable
(`fill=False`) and every result will say when it was used.
A worked example I had written from memory (36.482) was wrong; recomputed as 36.567 before the code existed.
   Done: tests 44 → all pass. Mutation checks: two of my first attempts did not apply (wrong text pattern) or
   survived (a test that could not tell a best-total pick from the only possible pick); I rewrote that test and
   re-ran until each mutation failed a test.

## 6. Bands (`engine/bands.py`)
Classic bands: margin ≥ +2 safe; 0 to +2 best fit; −2 to 0 stretch; below −2 excluded. Flexible bands use the
same boundaries with a width of 1.5 × the programme's mean yearly cut-off movement, kept between 1 and 5 points
(2 when fewer than two yearly changes exist). Reason: only 54% of programmes moved 2 points or less between 2023
and 2024; a fixed ±2 is wrong for both stable and volatile programmes. Three mutation checks all caught.

## 7. Recommender (`engine/recommend.py`) — 72 tests in total
`learner_from_grades`, `evaluate` (one programme), `rank_programmes`, `analyse_choices` (one to four choices with
advice: no safe choice, all excluded, duplicates, no cut-off data, fewer than four chosen).
Decisions:
- Subject requirements not met → **excluded**, whatever the points (a hard gate).
- No cut-off in any year (blank, '-' or 0) → **no band**, state `no_cutoff`.
- Programmes with no listed subject requirements (295 of 2,016) or unreadable ones are still banded using the
  learner's best four subjects, but carry a warning (`subject_requirements_unknown` / `_defective`) that the
  screens will show. The alternative, refusing to assess, would leave about 15% of programmes unusable.
- Ranking: best fit first, then safe, stretch, excluded, no-data last (the design notes ranked safe above best
  fit; I disagree, a best fit is the target and a safe course is the fallback). Within best fit and safe the
  more selective programme comes first.
- Worked check: the test learner (ENG B, KIS B+, MAT A A-, BIO B, CHE B+, PHY B, GEO C+; r = 40, t = 65) gets
  38.545 cluster points, which matches the figure the design notes should have had.
One mutation (using the oldest cut-off year instead of the newest) survived; added a test with two valid years.

## 8. Catalogue builder (`catalogue/build.py`, `manage.py build_catalogue`) — 82 tests in total
Reads the workbook (cut-offs from DEGREE CLUSTER, requirement slots from Subject Combination, matched by programme
code) and writes `catalogue/data/degrees.json` plus `build-report.json`. Run with `DEBUG=1` set: the settings
demand a `SECRET_KEY` otherwise.
Real result: **2,122 programmes, 71 institutions**; 1,745 with readable requirements, 342 with none listed, 35
unreadable; 107 with no cut-off in any year.
Corrections to my earlier audit: 2,122 not 2,050 programmes. The earlier count only matched numeric codes; 72
programmes have alphanumeric codes such as `1105B61` (all kept, as text).
Cleaning rules (tested): '-', blank, 0, `#DIV/0!` and anything above 48 are "no data". 2024 cut-offs for some
programmes are unrounded averages (22.0428…); rounded to 3 places.
The 35 defects are one pattern: programme codes ending `120` (BSc in Physical-science combinations) where one
cell is cut off after `PHY(23` and the next has no grade. They are not guessed; the programme is flagged
`defect` and assessed with the learner's best four subjects and a warning. The list is in `build-report.json`.
Windows detail: the workbook has to be closed after reading or the temp file in the tests cannot be deleted.

## 9. Career pathways (`engine/careers.py`) and preference weighting — 98 tests in total
**Pathways:** every programme is placed in one of the three CBE senior-school pathways: STEM, Social Sciences and
Humanities, Arts and Sports Science. The rules are keyword rules on the programme name, in a fixed order (arts and
sports first, then strong STEM words, then social/humanities/business/education, then a bare "science" or
"technology" as STEM). **This is a heuristic, not an official mapping.** None of the provided documents maps degrees
to pathways, so it should be confirmed against KICD/KUCCPS guidance. Result on the real catalogue: STEM 1,260,
Social 814, Arts and Sports 48 programmes. I read a random 22 names from each pathway to check them.
Bugs found by that audit and fixed with tests: "guidance" contains "dance", so Guidance and Counselling was filed
under Arts (now a word-boundary match); "Education (Science)" was caught by the education rule (now STEM).
**Preference weighting:** a learner can weight institutions and pathways (numbers of 0 or more). Weights add and
reorder programmes *within* a band only. A preference never lifts a programme into a better band, so wishing for a
course cannot make an out-of-reach one look attainable. Each result reports its `preference` weight.
**Process notes (honest):** a `\b` written through a Python heredoc became a literal backspace character in the
source; found because a test failed, fixed with the Edit tool. A mutation script crashed halfway and left a
mutated file on disk; I restored it from a backup before doing anything else and replaced the script with one that
always restores (try/finally). Two mutation checks initially "survived" because the text pattern did not match, or
because no test covered preference inside the stretch band; both gaps closed.

## 10. Class analysis, API and real-data check — 131 tests in total
**Class analysis (`engine/classes.py`):** per learner a total, mean grade, best cluster, counts per band, reachable
programmes per pathway and an "at risk" flag (nothing safe or best fit anywhere); for the cohort: mean total, mean-grade
distribution, share of learners with a safe course, reach per pathway, subject averages, and the at-risk names.
Stateless: nothing is stored, and names are labels only. Limited to 300 learners per request.
**Speed:** 200 learners against all 2,122 programmes took 6.9 s. Profiling showed the time was in
`statistics.mean`, not the subject assignment; replaced by `sum/len` (same result, tests unchanged), and slot
assignments are cached per learner. Now 2.9 s for 200 learners; one learner takes about 0.1 s.
**API (`advisor/`):** `GET /api/meta/`, `GET /api/programmes/`, `POST /api/eligibility/`, `POST /api/choices/`,
`POST /api/class/`. Validation errors come back as 400 with a message, a missing catalogue as 503 with the command
to build it. No accounts, no cookies, nothing stored; anonymous requests are rate limited.
**Mutation checks on the API:** two survivors were real gaps (class over the limit; unknown pathway in preferences),
now covered. Two others are equivalent because the engine independently enforces the same rule (five choices,
negative weights), so they stay.
**Real data:** `catalogue/test_real_catalogue.py` checks the built catalogue (unique codes, cut-offs in 0–48, known
subjects and grades, slot status consistent, every programme has a pathway). End to end, the worked learner (total
65, B) gets 38.545 cluster points against all 2,122 programmes: 58 best fit, 1,763 safe, 43 stretch, 151 excluded,
107 with no cut-off.
**Data caveat found:** for programmes new in 2024 the workbook's 2024 "cut-off" is an unrounded average of earlier
years (for example 22.0428…), not a published KUCCPS cut-off. They are treated like any other cut-off, but the
screens should not present them as official.

## 11. Frontend foundations (`frontend/`) — 38 tests so far
Same stack as `gnc` and `jobs`: React 19, TypeScript, Vite, Tailwind 3, Vitest with Testing Library. Dev server proxies
`/api` to the Django API on port 8000.
- `src/lib/api.ts`: typed client. Turns the API's two error shapes (`{detail}` and `{field: [messages]}`) into one
  readable sentence, and reports an unreachable server, a non-JSON reply and throttling in plain words. 10 tests.
- `src/lib/profile.ts`: the grade form's rules (seven subjects with grades, no duplicates, no subject without a
  grade, not both mathematics papers) and a live total/mean-grade preview that uses the tables the server sends
  in `/api/meta/`, so the two cannot drift apart. The server's figures are the ones shown in results. 12 tests.
- `src/lib/csv.ts`: reads a class mark sheet (comma, semicolon or tab separated, quotes, byte-order mark). Columns
  are named by subject key, name or number, with common short names (Maths, History); unknown or repeated columns
  are warned about and ignored; blank grade = subject not taken. Also produces a downloadable template. 16 tests.
Mutation checks: survivors were a gap (the template filling only seven subjects) and equivalents (a byte-order
mark is already removed by `trim()`; delimiter fallback when nothing is found gives the comma either way).
**Tooling lesson (second time):** the tool I write files with turns `\uXXXX` and, inside some shell scripts, `\n`
into real characters. A `﻿` became an invisible character in the source, and a `'\n'` became a line break
inside a string, which broke a test file and made two mutation runs report "caught" for the wrong reason (the whole
suite failed to load). Fixes: compare by character code (`charCodeAt(0) === 0xfeff`), use a regular expression
`/\r?\n/`, and always check the suite is green before trusting a mutation result.

## 12. The web app, end to end — backend 133 tests, frontend 150 tests
**Backend addition:** each evaluated programme now carries its cut-off history and subject requirements (so a card can
show the trend and the requirements). Test first; one mutation survived on `slots_status` and got its own assertion.
**Screens:** Check my courses, My four choices, Class analysis, Report, About (see `frontend/README.md`). Shared
state (grades, mode, choices) lives in one context; grades and choices persist in `localStorage`, validated on the way
back in (a stored subject the server no longer knows is dropped; an invalid stored profile is ignored).
**Report / PDF:** the report is a normal page with print styles; "Print or save as PDF" opens the browser's print
window. This avoids a server-side PDF library and keeps the layout identical on screen and on paper. Chrome printed it
to a 5-page PDF.
**Class analysis:** CSV is read in the browser (so nothing but the grades is sent), results are sortable and can be
downloaded as CSV. Names that start with `=`, `+`, `-` or `@` are defused in the download so a spreadsheet cannot run
them as formulas (tested).
**Testing method:** these screens were written before their tests, so every screen was mutation-checked afterwards:
well over a hundred deliberate breakages in total across the screens and libraries. Roughly one in six survived on
the first pass and each pointed at a real gap (trend text, cluster-subject list, requirement list, move-up/down limits, the 12-row limit,
print button state, family ordering and limits, stored-profile validation, and others). Each got a test, then the
mutation was run again and caught. A few survivors were equivalent (for example `trim()` already removes a
byte-order mark) and were left.
Two process mistakes worth recording: a mutation run reported "caught" for every mutation because a test file was
already failing to load (a broken baseline proves nothing; always confirm the suite is green first), and a new test
that I had not run yet made a later batch meaningless in the same way. Both were noticed and re-run.
**Real browser check:** driven over the DevTools protocol (no extra packages): empty form, 7 grades restored from
storage, search (58 best fit, 1,763 safe, 43 stretch, 151 excluded, 107 no data for the worked learner), choices,
the class dashboard with six learners, the report, and a 390 px phone view. No console errors. One visual defect was
found and fixed: chart labels such as "Social Sciences and Humanities" were cut off.
**Observation worth the user's attention:** for the worked learner (B, 65 points) the two top "best fit" programmes
are only 0.01 and 0.06 points above their cut-offs, and both carry data warnings. The report correctly says
"No choice is safe". This is the flexible band doing its job, and also a reminder of how thin the margins are.
**Known limits:** rate limit is 60 requests a minute per address, and the checker re-queries (after a short pause)
whenever a filter changes, so very rapid filtering could hit it; a class of 300 takes around 4 to 5 seconds;
Safari, Firefox and screen readers were not tried; nothing has been committed or deployed.
