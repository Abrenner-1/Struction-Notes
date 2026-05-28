# Seed Research

No user-provided CVE/GHSA id was supplied. Dependency seed research came from `npm audit --json` on May 28, 2026.

Relevant advisories from audit:

- xlsx / SheetJS: GHSA-4r6h-8v6p-xvw6 prototype pollution, high, `<0.19.3`; GHSA-5pgg-2g8v-p4x9 ReDoS, high, `<0.20.2`; installed `xlsx@0.18.5`.
- quill: GHSA-v3m3-f69x-jf25 XSS via HTML export, low; installed `quill@2.0.3` via `react-quill-new@3.8.3`.
- protobufjs: multiple advisories, installed `protobufjs@7.5.5` via `@google/genai`; reachable through AI client dependency but no direct protobuf parsing entrypoint found in first-party code.
- express/qs/body-parser/ws: audit reports advisories, but first-party source has no Express server import/listener; dependency appears unused in deployed SPA.
