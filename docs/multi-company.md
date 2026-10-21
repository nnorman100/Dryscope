# Companies (tenants)

Dryscope serves many restoration companies from one Firebase project
(`dryscope-d6f72`, its own project, separate from ClaimGuard). Each company's data is kept apart under its own path,
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

Create the first superadmin by hand as described in `docs/sign-in.md`
("Creating the first superadmin"); there is no public sign-up.

Then sign in to the app. On the superadmin screen, under Restoration Company
Workspaces, add "Alert Disaster Restoration" (web name `adr`). Your first
company becomes the one you work in; "Work in this company" switches between
companies later.

To add a staff member to a company, follow `docs/sign-in.md` ("Creating staff
accounts"). There is no screen for this yet.

## Deploying

The rules and the index deploy with the one-time project setup in the README
("Deploying"). The collection group index on `jobs.client.email` in `firestore.indexes.json`
must finish building before clients can see their jobs.

## Not done yet

- Company and role are read from Firestore docs. The playbook's target is
  `tenantId` and `role` custom claims on the sign-in token, set by server code
  with the Admin SDK; that needs the App Hosting backend first.
- No `/[orgSlug]/...` web addresses, no invite flow, and no screen for
  adding staff members yet.
- Jobs in the old top-level `jobs` collection aren't moved. Staff can no
  longer reach them.
