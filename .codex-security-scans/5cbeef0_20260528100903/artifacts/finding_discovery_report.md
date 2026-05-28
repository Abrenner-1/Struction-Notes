# Finding Discovery Report

## Candidate C1: Gemini API key is bundled into client JavaScript

- Instance key: `secret-exposure:vite.config.ts:11`
- Affected locations:
  - root_control: `vite.config.ts:10-12`
  - sink: `src/services/*Service.ts:3-4` and `src/services/importService.ts:4`
  - source: `.env.example:1-2`
- Attacker-controlled source: public browser access to compiled JS and network calls from the app.
- Broken control: server-side API key is loaded with Vite `loadEnv` and explicitly defined into client-side code as `process.env.GEMINI_API_KEY`.
- Impact: exposure and abuse of Gemini API key, quota/billing abuse, and direct calls outside the app; also sends private project content directly from browser to AI service.
- Plausibility: multiple UI components import services that instantiate `GoogleGenAI` in browser code, and `vite.config.ts` replaces the key at build time.
- Closest control: none in repo; no backend proxy, key scoping, token exchange, or per-user rate limiting is present.
- Taxonomy: CWE-798, CWE-200.

## Candidate C2: User-uploaded schedules reach vulnerable SheetJS parser

- Instance key: `parser-dependency:src/services/importService.ts:15`
- Affected locations:
  - entrypoint/wrapper: `src/components/ScheduleImportModal.tsx:31-47`, `src/components/ScheduleImportModal.tsx:102-107`
  - sink: `src/services/importService.ts:15`, `src/services/importService.ts:25`
  - dependency: `package-lock.json` installed `xlsx@0.18.5`
- Attacker-controlled source: a selected `.xlsx`, `.xls`, or `.csv` schedule file.
- Vulnerable sink: `XLSX.read(data, { type: 'binary' })` and `XLSX.utils.sheet_to_json(...)` on untrusted file bytes.
- Impact: browser-side prototype pollution or ReDoS/availability impact in an authenticated app session; potential integrity impact on parsed/imported task data.
- Plausibility: `npm audit` reports high SheetJS advisories for installed version; the app exposes a normal file upload path that feeds this parser.
- Closest control: browser `accept` attribute only; no file size/type enforcement, sandbox worker isolation, parser replacement, or dependency fix is present.
- Taxonomy: CWE-1321, CWE-1333.

## Candidate C3: Rich text rendering depends on vulnerable Quill HTML behavior

- Instance key: `xss-richtext:src/components/Meetings.tsx:515`
- Affected locations:
  - entrypoint/wrapper: `src/components/Meetings.tsx:531-535`, `src/views/ProjectCanvas.tsx:333-340`, note/task modals using ReactQuill
  - sink: `src/components/Meetings.tsx:515-520`
  - safe sibling controls: `src/components/NoteCard.tsx:15-18`, `src/components/NoteCard.tsx:158`; `src/components/TaskItem.tsx:15-17`, `src/components/TaskItem.tsx:73`
  - dependency: `quill@2.0.3` via `react-quill-new@3.8.3`
- Attacker-controlled source: rich-text meeting minutes or page/note/task content created through the app or direct Firestore writes by an authenticated project owner.
- Vulnerable sink/control: read-only `ReactQuill` renders stored meeting minutes without explicit DOMPurify sanitization; dependency audit flags Quill HTML export XSS.
- Impact: possible stored XSS in the authenticated app origin if malicious rich text survives Quill parsing/rendering; currently constrained because app lacks cross-user project sharing in repo evidence.
- Plausibility: audit confirms vulnerable Quill version; notes/tasks have explicit sanitizer controls but meeting read-only display does not.
- Closest control: Firestore project ownership, no collaboration evidence; React rendering escaping for non-HTML fields; DOMPurify only on NoteCard/TaskItem.
- Taxonomy: CWE-79.

## Suppressed/Deferred Rows

- Firestore tenant isolation: suppressed as reportable finding. Rules use default deny, owner checks, projectId consistency, ownerId/authorId checks, and project-owner `get()` controls for subcollections. No unowned collection path was found.
- Express/qs/body-parser/ws audit rows: suppressed for app exploitability because source search found no Express server or route listener in the deployed SPA.
- Firebase API key in `src/lib/firebase.ts`: informational unless API restrictions are missing; Firebase web config is public by design, and Firestore rules are the meaningful data boundary.
