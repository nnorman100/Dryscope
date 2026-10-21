#!/usr/bin/env node
// Turns public self sign-up off at the Firebase project level, so the
// project itself refuses createUserWithEmailAndPassword (and every other
// sign-up method) with auth/admin-restricted-operation. Accounts are then
// created only by an administrator (docs/sign-in.md).
//
// firebase.json cannot express this setting (its auth block only lists
// providers), so this script patches the Identity Platform project config:
// PATCH https://identitytoolkit.googleapis.com/admin/v2/projects/{project}/config
//   { client: { permissions: { disabledUserSignup: true } } }
//
// Usage:  node scripts/auth-disable-signup.mjs [--project <id>] [--enable]
//         npm run auth:disable-signup
//
// Credentials: the signed-in Firebase CLI account (`npx firebase login`), or
// an OAuth access token in GOOGLE_OAUTH_ACCESS_TOKEN. The same switch is in the
// console under Authentication > Settings > User actions > "Enable create (sign-up)".
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const disabledUserSignup = !args.includes('--enable');
const project =
  flag('--project') ||
  process.env.FIREBASE_PROJECT ||
  JSON.parse(readFileSync(new URL('../.firebaserc', import.meta.url), 'utf8')).projects?.default;

if (!project) {
  console.error('No project: pass --project <id> or set .firebaserc');
  process.exit(2);
}

async function accessToken() {
  if (process.env.GOOGLE_OAUTH_ACCESS_TOKEN) return process.env.GOOGLE_OAUTH_ACCESS_TOKEN;
  // Reuse the Firebase CLI's signed-in account (firebase-tools is a devDependency)
  const auth = require('firebase-tools/lib/auth');
  const account = auth.getGlobalDefaultAccount();
  if (!account?.tokens?.refresh_token) {
    throw new Error('Not signed in to the Firebase CLI. Run `npx firebase login` or set GOOGLE_OAUTH_ACCESS_TOKEN.');
  }
  const tokens = await auth.getAccessToken(account.tokens.refresh_token, []);
  const token = typeof tokens === 'string' ? tokens : tokens?.access_token;
  if (!token) throw new Error('Could not obtain an access token from the Firebase CLI credentials.');
  return token;
}

const token = await accessToken();
const url =
  `https://identitytoolkit.googleapis.com/admin/v2/projects/${encodeURIComponent(project)}/config` +
  `?updateMask=client.permissions.disabledUserSignup`;
const res = await fetch(url, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'x-goog-user-project': project,
  },
  body: JSON.stringify({ client: { permissions: { disabledUserSignup } } }),
});

if (!res.ok) {
  console.error(`Identity Platform config update failed: HTTP ${res.status}`);
  console.error(await res.text());
  process.exit(1);
}
const config = await res.json();
console.log(
  `Project ${project}: self sign-up is now ${config.client?.permissions?.disabledUserSignup ? 'DISABLED' : 'enabled'}.`
);
