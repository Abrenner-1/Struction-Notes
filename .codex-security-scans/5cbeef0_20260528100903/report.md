# Security Scan Report

## Executive Summary

The main security issue is that AI provider access is implemented in browser code. If a real Gemini key is configured for production, Vite will inline it into the client bundle and every user can recover it. The second major issue is the schedule import path, which parses user-selected spreadsheet files with a known-vulnerable `xlsx` version. A third lower-confidence issue exists around rich-text rendering and vulnerable Quill dependency behavior.

Firestore rules were reviewed and appear to use default deny plus owner-scoped project/subcollection checks. I did not find an obvious cross-project authorization bypass in the rules.

## Findings

### High: Gemini API key can be exposed in the browser bundle

- Affected:
  - `vite.config.ts:10-12`
  - `src/services/importService.ts:4`
  - `src/services/*Service.ts:3`
  - `.env.example:1-2`
- Why it matters:
  - Vite `define` replaces `process.env.GEMINI_API_KEY` at build time.
  - The resulting app is client-side JavaScript, so the key cannot remain secret.
  - Browser-side AI calls also expose project prompt data directly from the client.
- Fix:
  - Move all Gemini calls to an authenticated backend/serverless endpoint.
  - Remove the Vite `define` key injection.
  - Rotate any key that has already been built into deployed assets.
  - Add API restrictions, quotas, monitoring, and per-user rate limits.

### High: Schedule imports use vulnerable `xlsx@0.18.5`

- Affected:
  - `src/components/ScheduleImportModal.tsx:43`
  - `src/components/ScheduleImportModal.tsx:106`
  - `src/services/importService.ts:15`
  - `src/services/importService.ts:25`
  - `package.json:41`
  - `package-lock.json:5851-5866`
- Why it matters:
  - Normal app workflow accepts `.xlsx`, `.xls`, and `.csv` files.
  - Those files are parsed on the main browser thread by SheetJS `xlsx@0.18.5`.
  - `npm audit` reports high-severity prototype pollution and ReDoS advisories for this package.
- Fix:
  - Replace the parser with a maintained/fixed spreadsheet parser.
  - Add file size/type limits before parsing.
  - Parse in a Web Worker or backend sandbox.
  - Treat parsed rows as untrusted before sending to AI or Firestore.

### Medium: Rich-text render paths depend on vulnerable Quill behavior

- Affected:
  - `package.json:38`
  - `package-lock.json:4528-4628`
  - `src/components/Meetings.tsx:515-535`
  - `src/views/ProjectCanvas.tsx:333-340`
- Why it matters:
  - `react-quill-new@3.8.3` pulls in `quill@2.0.3`, which `npm audit` flags for XSS behavior.
  - Notes and tasks explicitly sanitize rendered HTML with DOMPurify, but meeting display does not show the same explicit sanitizer.
  - Current impact appears constrained by owner-only project rules, but this becomes more serious if collaboration/sharing/imported rich text is added.
- Fix:
  - Sanitize all rich-text HTML before render.
  - Consider storing Quill Delta instead of raw HTML.
  - Update/replace the vulnerable editor dependency when a safe path is available.
  - Add a CSP to reduce XSS blast radius.

### Low: Production hardening cleanup

- `src/lib/firebase.ts:20-26` has a hardcoded fallback Firebase web config. Firebase web keys are public by design, but production should fail closed when env vars are missing and should rely on restricted Firebase/Google Cloud settings.
- `express` and `@types/express` are present in dependencies but no Express server was found in source. Remove them if unused to reduce dependency risk and audit noise.

## Checks Performed

- Static search across source, config, Firestore rules, and package metadata.
- Reviewed Firestore owner-scoping and default deny behavior.
- Ran `npm audit --json`; notable audit rows included `xlsx`, `quill`, `protobufjs`, `express`, and `ws`.
- Source search did not find `eval`, shell execution, Express route handlers, or obvious open redirect sinks.

## Artifacts

- `artifacts/threat_model.md`
- `artifacts/finding_discovery_report.md`
- `artifacts/validation_report.md`
- `artifacts/attack_path_analysis_report.md`
- `artifacts/repository_coverage_ledger.md`
- `artifacts/runtime_inventory.md`
