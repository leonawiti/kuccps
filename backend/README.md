# KUCCPS: backend

A small Django REST API in front of a pure-Python calculation engine. It is **stateless**: no accounts, no database tables of its own, and nothing about a learner is stored. Each request carries the grades and gets the answer back.

## Layout

| Folder | What it holds |
|---|---|
| `engine/` | The calculation, with no Django in it. `grades` (scale, parsing, best-seven total, mean grade), `subjects` (34 KCSE subjects in groups 1 to 5), `requirements` (reads the workbook's subject slots), `cluster` (cluster points and which subjects fill a programme's four slots), `bands` (classic and flexible), `recommend` (evaluate, rank, analyse four choices, preference weighting), `careers` (CBE pathways), `classes` (class analysis), `colleges` (KMTC and TVET eligibility). |
| `catalogue/` | `colleges_data.py` and `colleges_tvet.py` hold the KMTC and TVET programmes (typed in by hand from the PDFs, each with its page and printed text). Also builds `catalogue/data/degrees.json` from the workbook (`build.py`, command `build_catalogue`) and loads it for the API (`loader.py`). `build-report.json` lists what could not be read. |
| `advisor/` | The API: serializers (input checks), views, URLs, error handling. |
| `config/` | Django settings (read from the environment), URLs, WSGI. |

## Running it

```
python -m venv venv
venv/Scripts/python.exe -m pip install -r requirements.txt -r requirements-dev.txt
venv/Scripts/python.exe manage.py test                 # 188 tests
DEBUG=1 venv/Scripts/python.exe manage.py runserver 8000
```

`degrees.json` is already built. To rebuild it from the workbook (this is the only thing that needs `openpyxl`, in `requirements-dev.txt`):

```
DEBUG=1 venv/Scripts/python.exe manage.py build_catalogue
```

Settings come from the environment. `SECRET_KEY` is required unless `DEBUG` is set or tests are running. `ALLOWED_HOSTS` is read from the environment too (set it to the real host name in production). Anonymous requests are rate limited (60 a minute, in `config/settings.py`).

## The API

| Request | Purpose |
|---|---|
| `GET /api/meta/` | Subjects, grades and points, the mean-grade table, bands, career families, and the catalogue's size, universities and build report. |
| `GET /api/programmes/?q=&institution=&pathway=&limit=` | Search programmes. |
| `POST /api/eligibility/` | `{grades, mode, fill, institutions, pathways, q, limit, preferences}`: every matching programme grouped by band (best fit, safe, stretch, excluded, no data) with counts and per-band limits. |
| `POST /api/choices/` | `{grades, mode, choices: [codes]}`: one to four choices evaluated in order, with advice. |
| `POST /api/class/` | `{learners: [{name, grades}], mode}`: class analysis, at most 300 learners, including how many KMTC/TVET programmes each learner is eligible for. |
| `POST /api/colleges/` | `{grades, providers, levels, q, limit}`: the 106 KMTC and TVET programmes sorted into eligible, near miss and not eligible, each with the exact shortfalls, its page and printed requirement. |

`grades` is `{subject: grade}`; a subject can be given by key (`MAT A`), number (`121`) or name. `mode` is `flexible` (default) or `classic`. Errors are 400 with a message; a missing catalogue is 503 with the command to build it.

## How an answer is worked out

1. The learner's four cluster subjects for a programme are chosen so the total is highest, each slot taking a different subject that meets its minimum grade. If any slot cannot be met, the programme is **Excluded** whatever the points.
2. Cluster points = 48 × √((r ÷ 48) × (t ÷ 84)), where r is the points in the four cluster subjects and t the total of the best seven subjects.
3. Margin = cluster points − the latest published cut-off. The band follows the margin and the band width (see `engine/bands.py`).

KMTC and TVET have no cut-offs: a programme is **eligible** when the KCSE mean grade reaches its minimum and every subject rule is met by a different subject, **near** when it would be met with every minimum one grade lower, and **not eligible** otherwise (`engine/colleges.py`).

The reasoning, assumptions and every decision are in [../docs/DEVLOG.md](../docs/DEVLOG.md).

## How it was tested

Every behaviour has a test written to fail first (or proven by breaking the code on purpose afterwards: change one thing in the code and confirm a test fails). The catalogue is also checked by `catalogue/test_real_catalogue.py` (unique codes, cut-offs between 0 and 48, known subjects and grades). A mutation runner is not part of the repository; the DEVLOG records the checks and what they found.

The front end half is in [`../frontend`](../frontend/README.md).
