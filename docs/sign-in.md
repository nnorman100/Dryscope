# Sign-in

Dryscope signs people in with Firebase Authentication, using **email and password**.
The sign-in box (components/auth/LoginModal.tsx) lets people sign in, create an
account and reset a forgotten password. New accounts get a verification email;
clients only see their jobs once their email is verified.

## Turning the provider on

The provider is declared in `firebase.json`:

```json
"auth": { "providers": { "emailPassword": true } }
```

Push it to the Firebase project with:

```bash
npx -y firebase-tools@latest deploy --only auth --project dryscope-d6f72
```

(Or, in the console: Authentication > Sign-in method > Email/Password > Enable.)

## Google sign-in

The Google button is hidden. To bring it back, add a `googleSignIn` block to the
`auth.providers` section of `firebase.json` (see the Firebase auth skill), deploy
`--only auth`, and build the app with `NEXT_PUBLIC_GOOGLE_SIGN_IN=true`.
