# KUCCPS

Reference material, and the start of a project, around **KUCCPS**, the Kenya Universities and Colleges Central Placement Service, which places KCSE candidates in degree, diploma and certificate programmes.

**Status (2026-10-19): documents only.** The repository holds the source documents and a guide to them. There is no code yet, and no confirmed brief for what the application should do. The files point to a tool that tells a learner which programmes they are eligible for from their KCSE results; the design notes (`sheet-1-eligibility-system-design-notes.docx`) go further and describe an **"Auto Course Recommendations"** tool for advising learners, with a teacher-only input area. That is the clearest hint of the purpose so far, but it is a document, not a decision. The first job is to confirm the purpose (see the open questions in [docs/reference/README.md](docs/reference/README.md)).

This repository follows the layout of the `gnc` and `jobs` projects, with the two halves side by side and the documents with them:

```
kuccps/
├── README.md             this file
├── docs/
│   └── reference/        the source documents, with a guide to each (README.md)
├── backend/              the API (not started; see its README)
└── frontend/             the web app (not started; see its README)
```

## What is in `docs/reference/`

| File | What it is |
|---|---|
| `degree-choices-eligibility-system-draft-2.xlsx` | An Excel prototype: enter KCSE grades, get **cluster points**, and see which degree programmes the learner qualifies for, against cut-off points from 2018 to 2024. About 2,050 programmes. |
| `sheet-1-eligibility-system-design-notes.docx` | Design notes (about 4,500 words, 29 tables) explaining how the workbook's three sheets work together and proposing an **Auto Course Recommendations** system on top of it: a subject-requirement gate, a margin against the cut-off with labels such as "Safe choice" and "Stretch choice", a ranking score, and a student-friendly output. Reads like a saved conversation with an AI assistant; see the guide for how far to trust it. |
| `kcse-subject-groups.docx` | The KCSE subjects in their groups, with subject codes. |
| `kmtc-courses-and-entry-points-2026-27.pdf` | Kenya Medical Training College: training opportunities for the 2026/2027 year (March 2026 pre-service intake), with each course's minimum entry requirements. 2 pages. |
| `tvet-cluster-document.pdf` | Minimum subject requirements and grades for technical and vocational (TVET) programmes by category and level. 6 pages. |

The guide in [docs/reference/README.md](docs/reference/README.md) explains each file in detail, including how the workbook calculates cluster points.

## Where it lives

| | Folder | GitHub repository | Server | Address |
|---|---|---|---|---|
| Whole project | this folder | `leonawiti/kuccps` (proposed; **not yet created**) | not set up | not set up |

## Not yet decided or built

- What the application is for, and who uses it (see the open questions in the reference guide).
- Any code, tests or deployment.
- Where the programme and cut-off data would come from in future, and how it would be kept current.
