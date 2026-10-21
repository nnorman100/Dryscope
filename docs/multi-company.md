# Companies (tenants)

Dryscope serves many restoration companies from one Firebase project
(`mitigation-project`). Each company's data is kept apart under its own path,
following the Build Playbook in the Firebase LLM Wiki.

## Data layout

| Path | What it holds | Who writes it |
| --- | --- | --- |
| `tenants/{tenantId}` | Company profile: `name`, `orgSlug` | Superadmins |
| `tenants/{tenantId}/members/{uid}` | A staff member's `role` (`owner`, `office_staff`, `sales_technician`) and profile (`name`, `email`, `title`, `phone`) | The company's owners, superadmins |
| `tenants/{tenantId}/jobs/{jobId}` | Restoration jobs. Each job also stores its `tenantId`. | The company's staff; its client may only sign |
| `users/{uid}` | Which company a person belongs to (`tenantId`), and `platformRole: "superadmin"` for platform admins | Owners (their own company only), superadmins |

Access always comes from the signed-in user's own `members` doc, never from
anything in the request. Clients (homeowners) aren't members: they see jobs at
any company whose `client.email` equals their verified email, through a
collection group query on `jobs`.

One person belongs to one company for now (the playbook's default).

## Setting up the first company (ADR)

Do this by hand in the Firebase console, in the Firestore database named in
`firebase.json`, after you have signed in to the app once so your user exists
in Authentication (copy your UID from there).

1. `tenants/adr`: `{ name: "Alert Disaster Restoration", orgSlug: "adr" }`
2. `users/<your uid>`: `{ tenantId: "adr", platformRole: "superadmin" }`
3. `tenants/adr/members/<your uid>`: `{ role: "owner", name: "<your name>", email: "<your email>" }`

To add a staff member to a company, create `users/<their uid>` with
`{ tenantId: "<company>" }` and `tenants/<company>/members/<their uid>` with
their role.

## Deploying

Deploy the app first, then the rules and the index, and name the project every
time, since ClaimGuard shares it:

```sh
firebase deploy --project mitigation-project --only firestore
```

The collection group index on `jobs.client.email` in `firestore.indexes.json`
must finish building before clients can see their jobs.

## Not done yet

- Company and role are read from Firestore docs. The playbook's target is
  `tenantId` and `role` custom claims on the sign-in token, set by server code
  with the Admin SDK; that needs the App Hosting backend first.
- No `/[orgSlug]/...` web addresses, no invite flow, and no screen for
  creating companies or members yet.
- Jobs in the old top-level `jobs` collection aren't moved. Staff can no
  longer reach them.
