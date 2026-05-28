# Validation Report

## Scope

- Repository: `Abrenner-1/Struction-Notes`
- Local commit: `5cbeef0`
- Application shape: Vite/React single-page app with Firebase Auth/Firestore and browser-side AI helpers.
- Validation mode: static review plus dependency audit evidence. No exploit payloads were run against production.

## Validated Findings

### V1: Gemini API key is bundled into client JavaScript

- Candidate: `secret-exposure:vite.config.ts:11`
- Status: Validated
- Confidence: High
- Evidence:
  - `vite.config.ts:10-12` uses Vite `define` to replace `process.env.GEMINI_API_KEY` with `env.GEMINI_API_KEY` during bundling.
  - `src/services/*Service.ts:3` and `src/services/importService.ts:4` instantiate `GoogleGenAI` from browser-imported source files.
  - `.env.example:1-2` documents `GEMINI_API_KEY` as the key used by AI-assisted workflows, not as a public `VITE_` browser value.
- Security impact:
  - A production key configured at build time becomes recoverable from client assets.
  - Anyone who can load the app can reuse the key outside the intended UI unless the key is externally restricted.
  - AI prompts include project data and imported schedule data from the browser.
- Recommended fix:
  - Move Gemini calls behind an authenticated backend or serverless function.
  - Remove the `define` mapping for `process.env.GEMINI_API_KEY`.
  - Rotate any key that has been built into deployed assets.
  - Add provider-side API restrictions, quotas, monitoring, and per-user rate limits.

### V2: User-uploaded schedules reach vulnerable SheetJS parser

- Candidate: `parser-dependency:src/services/importService.ts:15`
- Status: Validated
- Confidence: High
- Evidence:
  - `src/components/ScheduleImportModal.tsx:106` accepts `.xlsx,.xls,.csv`.
  - `src/components/ScheduleImportModal.tsx:43` passes the selected file into `parseExcelToRawData`.
  - `src/services/importService.ts:15` parses untrusted bytes with `XLSX.read(data, { type: 'binary' })`.
  - `src/services/importService.ts:25` reads the file as a binary string.
  - `package-lock.json` installs `xlsx@0.18.5`.
  - `npm audit` reports high-severity SheetJS advisories for prototype pollution and ReDoS with no compatible npm fix for the currently installed package.
- Security impact:
  - Malicious construction schedule files can be parsed inside an authenticated browser session.
  - Practical impact is most likely browser denial of service or corrupted in-page object behavior; integrity risk exists for imported task data.
- Recommended fix:
  - Replace `xlsx@0.18.5` with a maintained/fixed parser.
  - Enforce file size and MIME/extension checks before parsing.
  - Parse in a Web Worker or backend sandbox so parser failure cannot freeze the main app.
  - Treat imported rows as untrusted all the way through AI extraction and Firestore writes.

### V3: Rich text rendering depends on vulnerable Quill HTML behavior

- Candidate: `xss-richtext:src/components/Meetings.tsx:515`
- Status: Validated as dependency/control weakness; exploitability is constrained by current single-owner project model.
- Confidence: Medium
- Evidence:
  - `package-lock.json` installs `react-quill-new@3.8.3` and `quill@2.0.3`.
  - `npm audit` reports a Quill HTML export XSS advisory.
  - `src/components/Meetings.tsx:515-520` renders stored meeting minutes through read-only `ReactQuill`.
  - `src/components/NoteCard.tsx:15-18` and `src/components/TaskItem.tsx:15-17` explicitly sanitize similar rich text with DOMPurify, but the meeting display path does not show the same control.
- Security impact:
  - Stored rich text could become XSS if malicious HTML survives the editor/render path.
  - Current Firestore rules appear to limit writes to the project owner, so cross-user impact was not proven from repository evidence.
- Recommended fix:
  - Sanitize all stored rich-text HTML before rendering, including meetings and canvas pages.
  - Prefer storing Quill Delta and rendering through a constrained renderer.
  - Update or replace vulnerable Quill dependency when a safe path is available.
  - Add a Content Security Policy to reduce script execution impact.

## Checked And Not Reported

- Firestore rules: default deny is present; project and subcollection access is generally owner-scoped. I did not find an obvious cross-project read/write path.
- Express audit rows: source search did not find an Express server, `app.listen`, or route handlers in the deployed app surface.
- Firebase web API key: Firebase client config is not a server secret, but the hardcoded fallback project config should still be cleaned up as a deployment hardening task.
