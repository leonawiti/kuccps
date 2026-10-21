# KUCCPS: frontend

The web app: React 19, TypeScript, Vite, Tailwind, tested with Vitest and Testing Library. It talks only to the API in [`../backend`](../backend/README.md).

```
npm install
npm run dev          # http://localhost:5173, forwards /api to http://localhost:8000
npm test             # 184 tests
npm run build        # type check, then a production build in dist/
```

## Screens

| Screen | What it does |
|---|---|
| **Check my courses** | Enter KCSE grades (live total and mean grade), choose flexible or classic bands, search and filter by university and career family, set preferences, and see Best fit / Safe / Stretch / Excluded / No cut-off data with the numbers behind each programme. |
| **My four choices** | Pick up to four programmes (from the results or by search), see each one's band, reorder them, and get advice on the mix. |
| **Colleges and TVET** | The 36 KMTC courses and 70 TVET programmes sorted into eligible, near miss and not eligible, with filters, what each course asks for, the exact shortfalls, and the source page and printed text. |
| **Class analysis** | Paste or upload a mark sheet (CSV; a template can be downloaded) and see the grade spread, reach by career family, subject averages, who needs support (and whether they have a KMTC or TVET route) and a sortable table that can be downloaded or printed. Nothing is stored. |
| **Report** | A printable learner report: results, the four choices, best fit, safe and stretch courses, career families, KMTC and TVET options, and how to read it. "Print or save as PDF" uses the browser's print window. |
| **About** | How the calculation works, the bands, privacy, and the limits of the data. |

## Notes on how it is built

- `src/lib/` is plain logic with its own tests: the API client, the grade form's rules and live preview, the CSV reader, class table sorting and export, the four-choices list rules, formatting.
- A learner's grades and choices are kept in the browser's `localStorage` only, validated on the way back in, and the app works if storage is blocked.
- Every band is named in words as well as coloured. Controls have labels, results announce themselves, and dark mode follows the device or the Theme button. Layouts work on a phone.
- The print styles hide navigation and controls and set A4 margins (see `src/index.css`).
- `src/testkit.tsx` holds test fixtures and a pretend server; it is not part of the built app.

## Tested how

Unit and screen tests, plus deliberately breaking the code to prove the tests notice (recorded in [`../docs/DEVLOG.md`](../docs/DEVLOG.md)). The app was also run in a real Chrome, driven over the DevTools protocol: grades entered, search run, choices added, class pasted, report printed to PDF (5 pages), and a phone-width view, with no errors in the browser console.

Not checked: Safari and Firefox, a screen reader, and the printed report on paper.
