# Reference material

Documents here are **inputs**, not part of any running system. They were added on 2026-10-19 from a folder named `kuccps` in Downloads. The file names were tidied (no spaces or "Copy of" prefixes); the original names are in the table.

| In this repository | Original name | Format and size |
|---|---|---|
| `degree-choices-eligibility-system-draft-2.xlsx` | `Copy of DEGREE CHOICES ELIGIBILITY SYSTEM DRAFT 2.xlsx` | Excel, 1.3 MB, 4 sheets, no macros or external links |
| `sheet-1-eligibility-system-design-notes.docx` | `Sheet 1.docx` (added later the same day) | Word, 60 KB, about 4,500 words, 29 tables, no images or macros |
| `kcse-subject-groups.docx` | `Subjects Categories.docx` | Word, 15 KB |
| `kmtc-courses-and-entry-points-2026-27.pdf` | `KMTC-Courses and entry points.pdf` and `KMTC-Courses and entry points (1).pdf` | PDF, 2 pages, 548 KB. **The two originals were byte-for-byte identical, so only one copy is kept.** |
| `tvet-cluster-document.pdf` | `TVET_CLUSTER_DOCUMENT (1).pdf` | PDF, 6 pages, 258 KB |

All four are programme and requirement information (no learners' names or results). They were checked for that before being added.

## `degree-choices-eligibility-system-draft-2.xlsx`

A working Excel prototype of a **degree eligibility checker**. The title says "draft 2"; who made it and when is not recorded in the file.

### The four sheets

| Sheet | What it holds |
|---|---|
| **POINTS CALCULATIONS** | The calculator. KCSE grades go in for the compulsory subjects (Mathematics, English, Kiswahili), the sciences (Chemistry, Physics, Biology), the humanities (Geography, CRE, History) and the cluster subjects. It turns grades into points (A is 12 down to E at 1), totals them, and works out the cluster points. |
| **DEGREE CLUSTER** | The programme database: about **2,050 programmes** (the sheet is about 2,650 rows long, counting the group headings and the calculation cells): programme code, institution, programme name, **cut-off points for each year from 2018 to 2024**, and then the calculated columns that compare the learner's cluster points with each programme's cut-off: *Degree Eligibility* (cut-off at or below the learner's points), *Not qualified*, *Margin* (the learner's points minus the cut-off) and *Flexibility*, a **label** from the margin: "Safe Choice" at +2 or more, "Best Fit" from 0 up to +2, "Stretch Choice" down to -2, and "Exclude (Too competitive)" below that (the bands sit in cells S3 to S6). Programmes are grouped under headings such as "BACHELOR OF ARTS". About 14,600 formulas. |
| **Subject Combination** | About **2,080 programmes** (2,687 rows with the headings): programme code, institution, programme, the 2023 and 2022 cut-offs, and up to four **subject requirements** per programme. 85% of programmes (1,780 of 2,084) list at least one subject; about 300 list none. |
| **DEGREE** | **Hidden.** It is **identical to *Subject Combination***: every one of its 2,687 rows matches (checked cell by cell). It looks like a leftover copy. |

### How the cluster points are worked out

From the formulas (and checked against the sheet's own example):

```
cluster points = 48 x square root of  ( r / 48 ) x ( t / 84 )
```

- `r` is the sum of the points for the **four cluster subjects** the programme requires (so at most 4 x 12 = 48),
- `t` is the learner's **total KCSE points** over the subjects entered (at most 84, which is seven subjects at 12 points),
- 48 is the scaling, so the result runs from 0 to 48.

The sheet's example: cluster subjects worth 8 + 9 + 10 + 12 = 39 and a total of 68 give 48 x sqrt((39/48) x (68/84)) = **38.93**, exactly what the sheet shows. A programme is then marked eligible when its cut-off is **at or below** the learner's cluster points.

This has the same shape as the cluster-point formula KUCCPS publishes, but **it has not been checked here against the current official document**, and the choice of which four subjects form the cluster is different for every programme (that is what *Subject Combination* is for). Treat the workbook as a prototype of the idea, not as an authority on anyone's placement.

### Things noticed in it (not investigated further; it is not our file)

- **The label formula is broken for the two lower bands.** The *Flexibility* formula ends `IF(M4>=K4-$S$5,"Stretch,""Exclude")`: the quote marks are doubled by mistake, so that branch is the single text `Stretch,"Exclude` and there is no value for the case below it. In the file, 55 programme rows show the text `Stretch,"Exclude` and 48 show `FALSE`, where they should show "Stretch Choice" or "Exclude (Too competitive)". (Most rows say "Safe Choice" only because the sample learner's 38.93 beats most cut-offs.) A further 106 rows show `#DIV/0!` in that column; the cause was not looked into.

- **Several of the counting formulas near the top of *DEGREE CLUSTER* look shifted by one row** from one line to the next (`COUNTIF(L4:L2658,...)` then `COUNTIF(L5:L2659,...)`), the usual sign of a formula copied down by accident. The counts they give may be wrong.
- **About 300 programmes (15%) have no subject requirements listed** in *Subject Combination*, so eligibility cannot be fully worked out for those programmes from this file alone.
- **Two sheets hold the same data** (*Subject Combination* and the hidden *DEGREE*), and the programme counts differ slightly between sheets (about 2,050 in *DEGREE CLUSTER*, 2,084 in *Subject Combination*), so the sheets are not perfectly in step.
- **Cut-off history is uneven:** some programmes show "-" for early years (a programme that did not yet exist, or a missing value; the file does not say which).
- **A typo:** "COMPULSURY" for "compulsory", on the calculator sheet.
- **The data's source and date are not written in the workbook.** The cut-offs through 2024 look like KUCCPS's published figures, but nothing in the file says so.

## `sheet-1-eligibility-system-design-notes.docx`

About 4,500 words and 29 tables. It explains the workbook's three main sheets and then designs an **Auto Course Recommendations (ACR)** system on top of them. It has no author or date, and it reads like a **saved conversation with an AI assistant** (it ends with offers of "next logical steps" and with its own verdicts such as "production-grade Excel system design", "fully KCSE-compliant" and "KUCCPS-aligned"). Those verdicts are its own and **have not been checked**.

### What it says

- **The three sheets and their jobs** (its "Sheet 1, 2, 3" are the workbook's POINTS CALCULATIONS, DEGREE CLUSTER and Subject Combination): Sheet 1 builds the learner's cluster points; Sheet 3 (subject requirements) decides whether the calculation is even valid for a course; Sheet 2 (cut-offs) decides who would be admitted.
- **The cluster formula:** the same one found in the workbook, written with `r` = the sum of the best four cluster subjects, `R` = 48, `t` = total KCSE points and `T` = 84. It adds that the total should use the learner's **best seven** subjects.
- **The proposed recommendation logic:**
  1. A **subject gate** (`SUBJECT_OK`): a course is only considered if the learner's subjects satisfy its requirements, after normalising how the requirements are written.
  2. A **cluster margin** (the learner's cluster points minus the cut-off), turned into a label: **Safe choice** at +2.00 or more, **Best fit** from 0.00 to +1.99, **Stretch choice** from -0.01 to -2.00, and **Exclude (too competitive)** below -2.00.
  3. A **ranking score**, suggested as 50% cluster margin, 30% course demand trend (the average cut-off) and 20% institutional prestige (optional).
  4. A **student-friendly output**: tables of recommended courses (course, university, cut-off, the learner's cluster, margin) and short messages, with worked examples for three example learners (A, B and C; invented grades) and a suggestion of a teacher-only input area.

### How it relates to the workbook (checked)

| In the notes | In the workbook |
|---|---|
| The cluster-points formula | **Yes**, the same formula |
| Cluster margin and the four labels with those bands | **Yes** (the *Margin* and *Flexibility* columns), but the label formula is broken for the lower two bands (see above) |
| The `SUBJECT_OK` subject gate | **No.** No such column or rule exists in the file |
| The ranking score (50/30/20) | **No** |
| A recommendations sheet and output tables | **No** (the workbook has four sheets and none of them is this) |
| Best seven subjects for the total | **No**: the workbook adds up the grades entered |

So the notes describe the **next step beyond draft 2**, not a description of it.

### How far to trust it

- The cluster formula and the margin bands agree with the workbook; that is a consistency check between two of our own files, not proof that either matches KUCCPS's rules.
- **The weights (50/30/20) and the margin bands are design choices**, not official rules. Nothing says KUCCPS or anyone else uses them. The "prestige" weight in particular is a judgement call that an advisory tool for learners should think hard about before using.
- Its advice to "test with real KCSE learners" is sensible, but real learners' results are personal data (open question 5 below).

## `kcse-subject-groups.docx`

The KCSE subjects in their groups with the official subject codes, for example: Group I (compulsory) English 101, Kiswahili 102, Mathematics 121/122; Group II (sciences) Biology 231, Physics 232, Chemistry 233, General Science 237 (for some learners); Group III (humanities) History and Government 311, Geography 312, CRE 313, IRE/HRE 313/314, and so on. It is a short list (19 lines, no tables), useful for turning a learner's results into the groups an eligibility rule talks about.

## `kmtc-courses-and-entry-points-2026-27.pdf`

A Kenya Medical Training College notice, "Training opportunities 2026/2027 academic year (March 2026) pre-service intake", signed by its Chief Executive Officer (January 2026). A two-page table of the courses KMTC offers, each with its **specific minimum entry requirements** (a mean grade and minimum grades in named subjects). It is a **published, dated** source, so it is the kind of document that goes out of date every year.

## `tvet-cluster-document.pdf`

Six pages of **minimum subject requirements and grades for technical and vocational (TVET) programmes**, by programme category and level (certificate or diploma), for example that a diploma needs a mean grade of C plain with C+ in English or Kiswahili, and a certificate C- with C in English or Kiswahili, with stricter rules for science-based courses. Its date and issuer are not clear from the pages read.

## Open questions, before any building

1. **What is this for, and who uses it?** The design notes lean towards an **advisory tool run by a teacher or counsellor** ("teacher-only input area") that recommends courses to a learner. Is that right, or is it learner-facing, or an admissions-office tool? The answer decides almost everything.
2. **Which programmes are in scope:** degrees only (as the workbook), or also diplomas, certificates, KMTC and TVET (as the two PDFs suggest)? Their entry rules are different kinds of rules (cluster points against a cut-off for degrees, minimum grades for diplomas and certificates).
3. **Where will the programme and cut-off data come from, and who keeps it current?** The cut-offs change every year and a wrong figure tells a learner something false about their chances. The source should be official, and dated on the screen.
4. **Is the cluster-points formula the current official one,** and where is each programme's list of four cluster subjects published?
5. **Will it handle learners' results?** A tool that takes a learner's KCSE grades is handling **personal data** (children's results, under Kenya's Data Protection Act). Whether anything is stored, or the calculation happens on the learner's own screen and nothing is kept, is a design decision to take first, not last.
6. **Is it advice or an estimate?** Placement is decided by KUCCPS, not by this tool. Any version should say clearly that the result is an indication from past cut-offs, not a placement.
