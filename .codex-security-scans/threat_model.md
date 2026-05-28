# Threat Model: Struction Notes

## Overview

Struction Notes is a React/Vite field management application for construction project data. It uses Firebase Authentication for Google sign-in, Firestore for project-owned records, browser localStorage for guest/local mode, rich text editing through React Quill, document/spreadsheet/image/audio import paths, and client-side Gemini-assisted service modules for generated summaries and register data.

Primary assets are project records, notes, tasks, meeting minutes, procurement logs, registers, drawings metadata, compliance records, punch items, uploaded/embedded images, AI-generated construction summaries, user profile metadata, Firebase configuration, and any future document extraction/index data. The production app is expected to run as a browser SPA on structionnotes.com with Vercel rewrites and Firebase security rules enforcing tenant boundaries.

## Threat Model, Trust Boundaries, and Assumptions

Trust boundaries:

- Browser/user boundary: all form fields, rich text, imported schedules, images, audio, spreadsheet content, and future PDF extraction results are attacker-controlled if a malicious or compromised user can enter them.
- Firebase Auth boundary: authenticated Google users must only read/write their own project documents and subcollections.
- Firestore rules boundary: the backend authorization control is Firestore security rules, not React UI state.
- AI provider boundary: any Gemini prompt content may contain private project data and should be treated as leaving the app boundary unless proxied and governed by explicit privacy controls.
- Local guest mode boundary: localStorage data is not server trusted and is accessible to scripts running in the origin.
- Build/deployment boundary: Vite environment replacement can expose any variable bundled into client JavaScript.

Assumptions:

- Firebase API keys are public identifiers, but unrestricted keys and hardcoded production project ids can still enable unintended quota use or direct access attempts.
- Firestore rules are deployed as shown in `firestore.rules`; if production rules differ, server-side exposure changes.
- The app does not currently include a backend API route layer, so client code and Firestore rules are the effective enforcement surfaces.
- Guest mode is intended as local-only and does not authorize cloud writes.

## Attack Surface, Mitigations, and Attacker Stories

Relevant attack surfaces:

- Firebase Auth and Firestore document/subcollection rules.
- Rich text inputs rendered through `dangerouslySetInnerHTML` in note and task cards.
- Spreadsheet import through `xlsx` and FileReader.
- Image/audio data URL handling and local object URLs.
- Gemini service modules using API keys and prompt construction.
- Offline persistence and localStorage guest data.
- Vercel/Vite SPA routing and static asset delivery.

Existing mitigations:

- Firestore has default-deny and most project subcollections require authenticated project ownership.
- Note/task HTML display uses DOMPurify before `dangerouslySetInnerHTML`.
- Project and subcollection rules validate several required fields, owner ids, createdAt stability, and project id consistency.
- Guest data stays in localStorage instead of Firestore.

Realistic attacker stories:

- A signed-in user attempts direct Firestore writes against another user's project or malformed subcollection documents.
- A malicious project collaborator/user enters rich text or imported document content attempting stored XSS.
- A public visitor extracts bundled secrets or uses exposed client configuration to call third-party APIs.
- A malicious file or spreadsheet triggers parser-side vulnerabilities or formula/content injection when imported/exported.
- A user with local browser access reads guest localStorage project data.

Out of scope or lower likelihood:

- Server-side RCE is lower risk in the current SPA because no custom server runtime is deployed from this repo for request handling.
- CSRF is lower risk for Firestore SDK operations because Firebase Auth SDK tokens and Firestore rules are primary enforcement, though third-party script compromise remains high impact.

## Severity Calibration (Critical, High, Medium, Low)

Critical:

- A Firestore rule bypass that permits cross-user project reads/writes of all records.
- A production-bundled private AI/service key that allows arbitrary third-party API use or data exfiltration at scale.

High:

- Stored XSS in rich text or imported document content that executes for authenticated users and can read/write Firestore through their session.
- Broken Firestore ownership checks on project subcollections containing project confidential data.
- Unrestricted client-side AI calls that expose private project content to unintended services or exhaust paid quota.

Medium:

- Dependency vulnerabilities reachable through user-controlled file imports or rich text parsing.
- Missing size/type limits allowing client-side denial of service from large images, spreadsheets, or future PDFs.
- Excessive error logging of user auth/profile metadata.

Low:

- Public Firebase config exposure when rules and key restrictions are correctly configured.
- Local guest data visibility to someone with same-browser access.
- Missing security headers that mainly increase impact of other browser-side bugs.
