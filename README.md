# DryScope

Field scoping and estimating for water and mold mitigation companies. A
technician walks a loss, dictates or photographs what they find, and DryScope
turns it into a scoped job with moisture and thermal readings, drying logs,
equipment counts and the client-facing documents. Each restoration company
works in its own tenant on one Firebase project.

**Stack:** Next.js 15 (App Router) with a custom `server.ts` that also hosts
the Gemini Live voice relay at `/api/live-ws`; Firebase Authentication
(email/password) and Cloud Firestore; Gemini for dictation parsing, photo
analysis and the live walkthrough; Google Maps Platform for addresses and job
maps. Deployed to Firebase App Hosting on project `dryscope-d6f72`.

## Local development

Requirements: Node 22, npm, and Java 21+ (only for the Firestore emulator used
by the rules tests).

```bash
npm ci
cp .env.example .env.local   # fill in GEMINI_API_KEY and NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
npm run dev                  # http://localhost:3000
```

Without `GEMINI_API_KEY` the app runs, but dictation parsing, photo analysis
and the Live walkthrough answer with a clear error instead of a result. Without
`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` the address field is plain text and the map
panels show a notice.

Signing in locally uses the real Firebase project; see `docs/sign-in.md` for
how accounts are created (there is no public sign-up).

## Checks

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run build        # next build
npm run test:rules   # Firestore security rules against the emulator
```

The GitHub Actions workflow in `.github/workflows/ci.yml` runs the same four
steps on every push to `main` and every pull request.

## Deploying

The app runs on Firebase App Hosting (backend `dryscope`, region
`us-central1`, same region as the `(default)` Firestore database). The
`apphosting` block in `firebase.json` and `apphosting.yaml` hold the
configuration. One-time project setup, in order:

1. Create the `(default)` Firestore database in `us-central1`, then deploy the
   rules and indexes:
   `npx firebase deploy --only firestore --project dryscope-d6f72`
2. Deploy the auth provider and turn self sign-up off:
   `npx firebase deploy --only auth --project dryscope-d6f72` and
   `npm run auth:disable-signup`
3. Create the backend connected to this repository's `main` branch:
   `npx firebase apphosting:backends:create --project dryscope-d6f72 --backend dryscope --primary-region us-central1 --app 1:831884399057:web:64f64f935e117aca9210f0`
4. Create and grant the secrets referenced by `apphosting.yaml`:
   `npx firebase apphosting:secrets:set gemini-api-key` and
   `npx firebase apphosting:secrets:set maps-api-key` (each followed by
   `apphosting:secrets:grantaccess <name> --backend dryscope`). The Maps key must be restricted by
   HTTP referrer to the hosted domain.
5. Roll out (a push to `main` does this once the backend is connected, or
   `npx firebase apphosting:rollouts:create dryscope`), then add the
   `*.hosted.app` host to Authentication > Settings > Authorized domains.
6. Create the first superadmin (`docs/sign-in.md`) and the first company
   (`docs/multi-company.md`).

Later deploys from source without the GitHub connection:
`npx firebase deploy --only apphosting --project dryscope-d6f72`.

## Docs

- `docs/sign-in.md`: authentication, accounts, no public sign-up
- `docs/multi-company.md`: tenant layout, Firestore rules, first company
