# Struction Notes

Struction Notes is a React/Vite field operations app for construction project tracking, site notes, tasks, registers, procurement, meetings, daily reports, audio capture, and AI-assisted document workflows.

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Firebase Authentication and Firestore
- Gemini API integrations

## Prerequisites

- Node.js 18 or newer
- npm
- Firebase project configuration
- Gemini API key for AI features

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` from `.env.example` and add your keys.

   At minimum, AI features expect this server-only value:

   ```bash
   GEMINI_API_KEY="your_gemini_api_key"
   ```

   AI requests are served through `/api/gemini`, which verifies the signed-in Firebase user before calling Gemini.

   Firebase values can also be provided with these environment variables:

   ```bash
   VITE_FIREBASE_PROJECT_ID=""
   FIREBASE_PROJECT_ID=""
   VITE_FIREBASE_APP_ID=""
   VITE_FIREBASE_API_KEY=""
   VITE_FIREBASE_AUTH_DOMAIN=""
   VITE_FIREBASE_DATABASE_ID=""
   VITE_FIREBASE_STORAGE_BUCKET=""
   ```

3. Start the local dev server:

   ```bash
   npm run dev
   ```

   On Windows PowerShell, if script execution policy blocks `npm`, use:

   ```bash
   npm.cmd run dev
   ```

4. Open:

   ```text
   http://localhost:3000
   ```

## Scripts

- `npm run dev` starts Vite on port 3000.
- `npm run lint` runs TypeScript validation with `tsc --noEmit`.
- `npm run security:check` verifies the client bundle does not import server-only AI secrets or the removed vulnerable parser.
- `npm run build` creates a production build in `dist/`.
- `npm run preview` previews the production build.
- `npm run clean` removes `dist/`.

## Validation

Before committing changes, run:

```bash
npm run lint
npm run security:check
npm run build
```

## Repository

Remote origin:

```text
https://github.com/Abrenner-1/Struction-Notes.git
```
