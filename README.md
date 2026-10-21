# KUCCPS Course Advisor

A tool that mimics how the Kenya Universities and Colleges Central Placement Service (**KUCCPS**) places learners in degree programmes, and turns it into advice. A learner enters their KCSE grades and the tool works as an **eligibility checker**, a **ranking system** and a **counselling support tool**:

- It calculates **cluster points** for each programme from the learner's subjects, and checks the programme's subject-grade requirements.
- It sorts all 2,122 degree programmes into **Best fit, Safe, Stretch and Excluded** bands, using either a fixed 2-point band or a **flexible band** based on how much each programme's own cut-off has moved in past years.
- It checks a learner's **four choices** and warns about a poor mix (for example, no safe choice).
- It checks the **KMTC and TVET** routes too (36 KMTC courses and 70 TVET diploma, certificate and artisan programmes): eligibility from the mean grade and subject grades, with near misses and the exact shortfalls.
- It groups programmes into **career families**: STEM, Social Sciences and Humanities, and Arts and Sports Science (the CBE senior-school pathways), and lets a learner **weight preferred universities** and families.
- It analyses a **whole class or school** from a mark sheet (a dashboard of grade spread, subject strength, reach by career family, and learners who need support).
- It produces a **printable report** for a learner (print, then save as PDF).

**Status (2026-10-20): built and tested; pushed to GitHub, not deployed.** 188 backend tests and 184 frontend tests pass, every test was checked by deliberately breaking the code, and the app has been run end to end in a real browser. The full account of what was built, decided and found along the way is in [docs/DEVLOG.md](docs/DEVLOG.md).

```
kuccps/
├── README.md             this file
├── docs/
│   ├── DEVLOG.md         what was built, in order, with decisions and problems
│   └── reference/        the source documents, with a guide to each (README.md)
├── backend/              Django API and the calculation engine (see its README)
└── frontend/             React web app (see its README)
```

## Running it on your computer

Two terminals. The first starts the API (from `backend/`; the data file is already built):

```
venv/Scripts/python.exe manage.py runserver 8000      # set DEBUG=1 first, see backend/README.md
```

The second starts the web app (from `frontend/`):

```
npm install
npm run dev                                           # opens on http://localhost:5173, which forwards /api to port 8000
```

Tests: `venv/Scripts/python.exe manage.py test` in `backend/`, and `npm test` in `frontend/`.

## Read this before relying on the results

The tool is only as good as its data and assumptions. These are the ones to confirm, most important first:

1. **The data is a draft Excel workbook**, not a live KUCCPS feed. For programmes that were new in 2024 the workbook's "2024 cut-off" is an average of earlier years, not a published figure. 107 programmes have no cut-off at all and cannot be banded.
2. **Subject requirements are minimums from the workbook**, not necessarily KUCCPS's official cluster-subject lists. Where a programme lists fewer than four subjects (or none: 342 programmes), the learner's best remaining subjects fill the rest. Every such result is flagged on screen.
3. **The mean-grade table** (for example 74 to 80 points is A-) is the usual KNEC table written from memory. It has not been checked against KNEC's own publication, and which seven subjects count is not confirmed either.
4. **Career families are assigned from programme names** by keyword rules. No document maps degrees to CBE pathways. Treat them as a guide until KICD/KUCCPS guidance is checked.
5. **The flexible band formula** (1.5 times a programme's typical yearly cut-off movement, kept between 1 and 5 points) is a reasoned starting point. It has not been tested against how placement actually turned out.
6. **KMTC and TVET data was typed in by hand** from the two PDFs. KMTC rules were checked line by line against the source text; the TVET table was read from page images and has no automated cross-check. A few courses have notes where the source is unclear (no mean grade printed, requirements cut off at a page break, "D- and below" for artisan courses read as no minimum). Which institutions offer each TVET programme is not in the documents.
7. **Subject codes 444 to 450** (technical subjects) are not in the workbook; their keys are assumed.
8. The design notes (Sheet 1) contain errors that were found and not copied: a cluster figure of 38.6 that should be 38.545, a mean grade of A- for 65 points (it is B), inconsistent ranking weights, and Safe ranked above Best fit. See the DEVLOG.

## Not built

- Accounts, saved classes, or a school-level database. Class analysis is deliberately stateless: marks are analysed and forgotten. Storing learner data would need a data-protection design first.
- A server-generated PDF. The report uses the browser's print function (Save as PDF), which needs nothing extra on the server.
- Deployment. There is no GitHub repository, server or address yet. The usual route (build the front end, serve it and forward `/api` to gunicorn) follows the sibling projects.

## Where it lives

| | Folder | GitHub repository | Server | Address |
|---|---|---|---|---|
| Whole project | this folder | `leonawiti/kuccps` (private) | not set up | not set up |

The code is on GitHub (`main`). There is no server or address yet.
