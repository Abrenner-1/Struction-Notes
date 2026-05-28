# Runtime Inventory

Repository: struction notes
Scan: 5cbeef0_20260528100903
Scope: repository-wide application security review

## Product Runtime
- React/Vite SPA entry: `src/main.tsx`, `src/App.tsx`, `index.html`, `vite.config.ts`.
- Deployment route fallback: `vercel.json` rewrites `/projects` and `/projects/:path*` to `/`.
- Auth/session: `src/lib/firebase.ts`, `src/hooks/useAuthSession.ts` using Firebase Auth Google popup/redirect and local guest bypass.
- Authorization/data boundary: `firestore.rules`; Firestore client writes across `projects/{projectId}` subcollections.
- Data hooks: `src/hooks/useProjects.ts`, `src/hooks/useGlobalReminders.ts`.
- Primary Firestore surfaces: projects, notes, tasks, pages, scheduleItems, meetings, procurement, submittals, drawings, pcos, compliance, trackers/logs, precon, daily-reports, punch-list, permits, swppp, equipment-om, as-builts, warranties, user profile.
- Guest/local surfaces: browser localStorage namespaces `guest_*` across registers.
- Rich-text surfaces: ReactQuill editors in notes, tasks, meetings, project canvas; rendering in NoteCard/TaskItem and read-only ReactQuill meeting views.
- File/parser surfaces: schedule import via `xlsx`, image uploads via FileReader data URLs, audio worker and object URLs.
- AI surfaces: all `src/services/*Service.ts` create `GoogleGenAI` clients with `process.env.GEMINI_API_KEY`; Vite defines that key into client code.

## Trust Boundaries
- Browser input -> React state -> Firestore/localStorage.
- Authenticated user -> Firestore rules -> own project data.
- Uploaded/pasted document content -> parsers/AI prompts/rich text rendering.
- Client browser -> Google Gemini API.
- Production build env -> client JavaScript bundle.

## Notable Controls
- Firestore default-deny.
- Project ownership checks in most subcollections.
- DOMPurify before `dangerouslySetInnerHTML` in notes/tasks.
- Guest mode does not write to Firestore.
- No custom server runtime or Express route found in source; `express` dependency appears unused.
