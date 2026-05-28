# Repository Coverage Ledger

| Row | Boundary / Shard | Family | Files checked | Disposition | Evidence |
| --- | --- | --- | --- | --- | --- |
| R1 | Client build env -> browser bundle | Secret/data exposure | vite.config.ts, src/services/*.ts, .env.example | reportable | `process.env.GEMINI_API_KEY` is defined into client bundle and used by browser services. |
| R2 | Schedule file upload -> xlsx parser | Parser/dependency exploitation | ScheduleImportModal.tsx, importService.ts, package-lock.json, npm audit | reportable | User-selected Excel/CSV reaches `XLSX.read`; locked `xlsx@0.18.5` has high advisories and no npm fix. |
| R3 | Rich text input -> HTML rendering | XSS | NoteCard.tsx, TaskItem.tsx, Meetings.tsx, ProjectCanvas.tsx, npm audit | reportable-low | Notes/tasks sanitize before HTML sink; meeting read-only Quill and vulnerable quill dependency remain a lower-confidence XSS risk. |
| R4 | Firestore tenant isolation | Authz/IDOR | firestore.rules, useProjects.ts, ProjectView.tsx, register sink search | suppressed | Default-deny and project-owner checks guard listed/read/update/delete subcollections; no cross-project unguarded collection path found. |
| R5 | Server-side routes | SSRF/RCE/path traversal | rg express/server/fetch/shell/eval | not_applicable | No deployed custom server or shell/eval sink found in application source. |
| R6 | Guest localStorage | Data exposure | localStorage sink search | low/deferred | Local-only data can be read by same-origin script/local browser user; not a cloud tenant boundary issue. |
| R7 | CSP/security headers | Browser hardening | vercel.json, index.html | low/deferred | No CSP/headers configured; mainly amplifies XSS rather than standalone exploit. |
