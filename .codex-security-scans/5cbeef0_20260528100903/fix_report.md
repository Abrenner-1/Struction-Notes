# Security Fix Report

## Fixed Findings

### Gemini API key in client bundle

- Moved browser AI calls from direct `@google/genai` usage to `src/services/geminiClient.ts`.
- Added `api/gemini.ts` and `server/gemini.ts` so `GEMINI_API_KEY` is read only server-side.
- Added Firebase ID token verification for `/api/gemini`.
- Removed the Vite `define` injection of `process.env.GEMINI_API_KEY`.

### Vulnerable spreadsheet parsing

- Removed `xlsx`, `express`, and `@types/express`.
- Replaced schedule parsing with `read-excel-file/browser` for `.xlsx` and `papaparse` for `.csv`.
- Added a 20 MB import size limit and blocks legacy `.xls` files because the safe replacement parser does not support that old format.

### Rich-text XSS risk

- Added shared `sanitizeRichText()` helper.
- Applied sanitization to notes, tasks, meeting minutes, and project note page content.
- Downgraded `react-quill-new` to `3.7.0` and pinned `quill` to `2.0.2` through npm overrides so `npm audit` is clean.

## Data Preservation

- No Firestore collections, document paths, or stored field names were changed.
- Existing saved notes, tasks, meetings, pages, registers, and project data keep the same schema.
- Existing rich-text content is sanitized at render/save boundaries; unsafe markup may be stripped, but valid text and formatting remain in the same fields.

## Validation

- `npm.cmd run security:check`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd audit --audit-level=low`: passed, found 0 vulnerabilities.
- `npm.cmd run build`: passed.
- `npm.cmd run test:e2e`: passed, 2 tests.

## Remaining Notes

- AI features now require a signed-in Firebase user. Guest bypass users cannot call `/api/gemini` unless `ALLOW_UNVERIFIED_AI_REQUESTS=true` is explicitly set, which should not be used in production.
- Schedule import now supports `.xlsx` and `.csv`; legacy `.xls` files must be saved as `.xlsx` or `.csv` first.
