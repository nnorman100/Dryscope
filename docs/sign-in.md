# Sign-in

DryScope signs people in with Firebase Authentication using **email and
password**. The sign-in box (`components/auth/LoginModal.tsx`) offers sign in
and "Forgot password"; there is **no public sign-up**. Staff accounts are created
by the company, and homeowners will sign documents through links without an
account (that flow is later work). Google sign-in stays hidden behind
`NEXT_PUBLIC_GOOGLE_SIGN_IN=true` until its provider is set up.

## Project configuration

Two settings live in the Firebase project `dryscope-d6f72`:

1. **Provider.** `firebase.json` declares email/password:

   ```json
   "auth": { "providers": { "emailPassword": true } }
   ```

   Push it with:

   ```bash
   npx firebase deploy --only auth --project dryscope-d6f72
   ```

2. **Self sign-up off at the project.** `firebase.json` cannot express this, so
   a script patches the Identity Platform config
   (`client.permissions.disabledUserSignup = true`):

   ```bash
   npm run auth:disable-signup   # uses the signed-in Firebase CLI account
   ```

   The same switch is in the console: Authentication > Settings > User actions
   > "Enable create (sign-up)". Once off, any sign-up call fails with
   `auth/admin-restricted-operation`, which the sign-in box explains as
   "New accounts are created by your company".

## Creating the first superadmin

1. In the Firebase console, Authentication > Users > **Add user**: enter the
   email and a temporary password. Copy the new user's UID.
2. In Firestore (database `(default)`), create `users/<uid>` with
   `{ "platformRole": "superadmin" }`.
3. Sign in to the app with that email and the temporary password, then use
   **Forgot password?** to set your own. On the superadmin screen, add the first
   company (see `docs/multi-company.md`).

## Creating staff accounts

There is no invitation screen yet (`docs/multi-company.md`, "Not done yet"),
so an administrator does this by hand for each staff member:

1. Authentication > Users > **Add user** with their email and a temporary
   password (or ask them to use **Forgot password?** on the sign-in box once the
   account exists; the reset email goes to that address).
2. Firestore: `users/<uid>` with `{ "tenantId": "<company>" }` and
   `tenants/<company>/members/<uid>` with `{ "role": "owner" | "office_staff" |
   "sales_technician", "name": "...", "email": "..." }`.
3. Tell them to sign in and reset their password.

## Authorized domains

Password sign-in and the reset emails work through
`dryscope-d6f72.firebaseapp.com`. Add the App Hosting host (`*.hosted.app`) and
any custom domain under Authentication > Settings > Authorized domains before
turning on Google sign-in.
