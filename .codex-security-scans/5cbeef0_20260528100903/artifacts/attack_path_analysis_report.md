# Attack Path Analysis Report

## Attack Path AP1: Extract and abuse the Gemini API key

- Root control failure: `vite.config.ts:10-12`
- Sink family: browser-imported `src/services/*Service.ts`
- Severity: High
- Exploit preconditions:
  - App is built with a real `GEMINI_API_KEY`.
  - Attacker can load production JavaScript or inspect browser traffic.
- Path:
  1. Vite replaces `process.env.GEMINI_API_KEY` with the build-time key.
  2. Browser bundle exposes the literal value or an easily recoverable equivalent.
  3. Attacker extracts the key from downloaded assets or devtools.
  4. Attacker calls Gemini APIs outside the app or automates expensive requests through the app context.
- Impact:
  - API cost/quota abuse.
  - Account/provider abuse tied to the application's key.
  - Loss of control over AI request volume and prompt contents.
- Priority rationale:
  - This is structurally reachable in every deployed client bundle using a real key.
  - No app-side authentication or Firestore rule can protect a secret after it is shipped to the browser.

## Attack Path AP2: Malicious schedule file hits vulnerable XLSX parser

- Root control failure: untrusted file parsing in `src/services/importService.ts:15`
- Entry point: `src/components/ScheduleImportModal.tsx:106`
- Severity: High
- Exploit preconditions:
  - Authenticated user imports a malicious or booby-trapped `.xlsx`, `.xls`, or `.csv` file.
  - App uses installed `xlsx@0.18.5`.
- Path:
  1. Attacker supplies a schedule file through normal project workflow.
  2. User selects the file in the schedule import modal.
  3. Browser reads it with `FileReader.readAsBinaryString`.
  4. `XLSX.read` parses the untrusted file in the main app thread.
  5. Known vulnerable parser behavior can cause prototype pollution or regular expression denial of service.
- Impact:
  - Browser tab freeze or app denial of service.
  - Possible corrupted app state during import.
  - Polluted or manipulated imported task data sent to Gemini and then saved.
- Priority rationale:
  - The import workflow is expected to handle files from outside parties.
  - The vulnerable sink is directly reachable from normal UI.

## Attack Path AP3: Stored rich text reaches Quill render paths

- Root control weakness: incomplete rich-text sanitization coverage and vulnerable Quill dependency.
- Sinks:
  - `src/components/Meetings.tsx:515-520`
  - `src/views/ProjectCanvas.tsx:333-340`
- Severity: Medium
- Exploit preconditions:
  - Malicious rich text is stored by a user with project write access or by a future collaboration/import feature.
  - Vulnerable Quill HTML behavior is reachable in the stored/rendered content path.
- Path:
  1. Malicious rich-text payload is saved in a meeting minute or page content field.
  2. Later app view renders the stored value using ReactQuill.
  3. If Quill or surrounding render code permits unsafe HTML behavior, script-capable content executes in the app origin.
- Impact:
  - Account/session actions in the victim's app context.
  - Project data disclosure or modification through existing Firestore permissions.
- Priority rationale:
  - Current repo evidence points to single-owner project access, which limits cross-user impact.
  - The dependency advisory and uneven sanitization mean this should be fixed before collaboration, sharing, or AI/imported rich-text features expand.

## Lower-Priority Hardening

- `src/lib/firebase.ts:20-26` contains a concrete fallback Firebase web config. Firebase API keys are not server secrets, but production should fail closed when required env vars are missing and should restrict allowed domains/providers in Firebase/Google Cloud settings.
- Remove unused server dependencies such as `express` and `@types/express` if the SPA does not need them; this reduces audit noise and dependency attack surface.
