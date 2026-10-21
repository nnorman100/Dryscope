// Firestore security rules tests. Run with `npm run test:rules`, which starts
// the Firestore emulator (needs Java) and runs this file against it.
import { after, before, beforeEach, describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  collectionGroup,
  getDocs,
  query,
  where,
} from 'firebase/firestore';

let env: RulesTestEnvironment;

const CLIENT_EMAIL = 'homeowner@example.com';

// Two companies: ADR, and another restoration company that must never see ADR's data
const A = 'adr';
const B = 'other-co';
const JOB = `tenants/${A}/jobs/job-1`;
const JOBS = `tenants/${A}/jobs`;

const job = {
  id: 'job-1',
  tenantId: A,
  jobId: 'DS-2026-0001',
  status: 'Ready for Review',
  category: 'Cat 1 (Clean)',
  client: { name: 'Pat Homeowner', email: CLIENT_EMAIL },
  signature: { isSigned: false, termsAccepted: false },
  equipment: { airMovers: 4 },
  createdAt: '2026-10-20T00:00:00Z',
  updatedAt: '2026-10-20T00:00:00Z',
};

const newJob = (id = 'job-2', tenantId = A) => ({ ...job, id, tenantId });

const signedJobUpdate = {
  status: 'Client Authorized',
  signature: { isSigned: true, termsAccepted: true, signedByName: 'Pat Homeowner' },
  updatedAt: '2026-10-21T00:00:00Z',
};

function as(uid: string, claims: Record<string, unknown> = {}) {
  return env.authenticatedContext(uid, claims).firestore();
}

const tech = () => as('tech', { email: 'tech@company.com', email_verified: true });
const office = () => as('office', { email: 'office@company.com', email_verified: true });
const owner = () => as('owner', { email: 'owner@company.com', email_verified: true });
const admin = () => as('admin', { email: 'admin@company.com', email_verified: true });
const otherOwner = () => as('otherOwner', { email: 'owner@other.com', email_verified: true });
const otherTech = () => as('otherTech', { email: 'tech@other.com', email_verified: true });
const client = () => as('client', { email: CLIENT_EMAIL, email_verified: true });
const unverifiedClient = () => as('client2', { email: CLIENT_EMAIL, email_verified: false });
const stranger = () => as('stranger', { email: 'someone@else.com', email_verified: true });
const anon = () => env.unauthenticatedContext().firestore();

before(async () => {
  const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':');
  env = await initializeTestEnvironment({
    projectId: 'demo-dryscope',
    firestore: { host, port: Number(port), rules: readFileSync('firestore.rules', 'utf8') },
  });
});

after(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, `tenants/${A}`), { name: 'Alert Disaster Restoration', orgSlug: 'adr' });
    await setDoc(doc(db, `tenants/${B}`), { name: 'Other Co', orgSlug: 'other' });

    await setDoc(doc(db, 'users/admin'), { platformRole: 'superadmin' });
    for (const [uid, tenantId, role] of [
      ['owner', A, 'owner'],
      ['office', A, 'office_staff'],
      ['tech', A, 'sales_technician'],
      ['otherOwner', B, 'owner'],
      ['otherTech', B, 'sales_technician'],
    ]) {
      await setDoc(doc(db, `users/${uid}`), { tenantId });
      await setDoc(doc(db, `tenants/${tenantId}/members/${uid}`), { name: uid, role });
    }

    await setDoc(doc(db, JOB), job);
    await setDoc(doc(db, `tenants/${B}/jobs/b-job`), { ...job, id: 'b-job', tenantId: B, client: { email: 'x@y.com' } });
  });
});

describe('jobs', () => {
  it('are not readable or writable without signing in', async () => {
    await assertFails(getDoc(doc(anon(), JOB)));
    await assertFails(getDocs(collection(anon(), JOBS)));
    await assertFails(setDoc(doc(anon(), `${JOBS}/job-2`), newJob()));
    await assertFails(updateDoc(doc(anon(), JOB), signedJobUpdate));
  });

  it('are hidden from signed-in users with no company or matching email', async () => {
    await assertFails(getDoc(doc(stranger(), JOB)));
    await assertFails(getDocs(collection(stranger(), JOBS)));
    await assertFails(setDoc(doc(stranger(), `${JOBS}/job-2`), newJob()));
  });

  it('can be listed, created and edited by their company staff', async () => {
    await assertSucceeds(getDocs(collection(tech(), JOBS)));
    await assertSucceeds(setDoc(doc(tech(), `${JOBS}/job-2`), newJob()));
    await assertSucceeds(updateDoc(doc(tech(), JOB), { 'equipment.airMovers': 6 }));
  });

  it('must keep their id and company fields equal to their path', async () => {
    await assertFails(setDoc(doc(tech(), `${JOBS}/job-2`), { ...newJob(), id: 'job-other' }));
    await assertFails(setDoc(doc(tech(), `${JOBS}/job-2`), newJob('job-2', B)));
    await assertFails(updateDoc(doc(tech(), JOB), { tenantId: B }));
  });

  it('can only be deleted by office staff and above', async () => {
    await assertFails(deleteDoc(doc(tech(), JOB)));
    await assertSucceeds(deleteDoc(doc(office(), JOB)));
  });

  it('are readable by the client whose verified email is on the job', async () => {
    await assertSucceeds(getDoc(doc(client(), JOB)));
    await assertSucceeds(getDocs(query(collection(client(), JOBS), where('client.email', '==', CLIENT_EMAIL))));
    await assertSucceeds(getDocs(query(collectionGroup(client(), 'jobs'), where('client.email', '==', CLIENT_EMAIL))));
  });

  it('cannot be listed in full by a client', async () => {
    await assertFails(getDocs(collection(client(), JOBS)));
    await assertFails(getDocs(collectionGroup(client(), 'jobs')));
  });

  it('are not readable with an unverified email', async () => {
    await assertFails(getDoc(doc(unverifiedClient(), JOB)));
  });

  it('can be signed by their client', async () => {
    await assertSucceeds(updateDoc(doc(client(), JOB), signedJobUpdate));
  });

  it('cannot have other fields changed by their client', async () => {
    await assertFails(updateDoc(doc(client(), JOB), { ...signedJobUpdate, 'equipment.airMovers': 1 }));
    await assertFails(updateDoc(doc(client(), JOB), { status: 'Completed' }));
  });

  it('cannot be re-signed once signed', async () => {
    await assertSucceeds(updateDoc(doc(client(), JOB), signedJobUpdate));
    await assertFails(
      updateDoc(doc(client(), JOB), {
        ...signedJobUpdate,
        signature: { ...signedJobUpdate.signature, signedByName: 'Someone else' },
      })
    );
  });

  it('cannot be created by a client', async () => {
    await assertFails(setDoc(doc(client(), `${JOBS}/job-2`), newJob()));
  });
});

describe('companies are kept apart', () => {
  it("staff cannot read, list, create, edit or delete another company's jobs", async () => {
    await assertFails(getDoc(doc(otherTech(), JOB)));
    await assertFails(getDocs(collection(otherTech(), JOBS)));
    await assertFails(setDoc(doc(otherTech(), `${JOBS}/job-2`), newJob()));
    await assertFails(updateDoc(doc(otherTech(), JOB), { 'equipment.airMovers': 1 }));
    await assertFails(deleteDoc(doc(otherOwner(), JOB)));
  });

  it("staff cannot read another company's profile or members", async () => {
    await assertFails(getDoc(doc(otherTech(), `tenants/${A}`)));
    await assertFails(getDoc(doc(otherTech(), `tenants/${A}/members/tech`)));
    await assertFails(getDocs(collection(otherOwner(), `tenants/${A}/members`)));
  });

  it('an owner cannot add themselves or anyone to another company', async () => {
    await assertFails(setDoc(doc(otherOwner(), `tenants/${A}/members/otherOwner`), { role: 'owner' }));
    await assertFails(setDoc(doc(otherOwner(), `tenants/${A}/members/new`), { role: 'sales_technician' }));
    await assertFails(setDoc(doc(otherOwner(), 'users/new'), { tenantId: A }));
    await assertFails(updateDoc(doc(otherOwner(), 'users/otherOwner'), { tenantId: A }));
  });

  it('superadmins can reach every company', async () => {
    await assertSucceeds(getDocs(collection(admin(), JOBS)));
    await assertSucceeds(getDocs(collection(admin(), `tenants/${B}/jobs`)));
    await assertSucceeds(setDoc(doc(admin(), 'tenants/new-co'), { name: 'New Co', orgSlug: 'new' }));
  });

  it('only superadmins create or change companies', async () => {
    await assertFails(setDoc(doc(owner(), 'tenants/new-co'), { name: 'New Co' }));
    await assertFails(updateDoc(doc(owner(), `tenants/${A}`), { name: 'Renamed' }));
  });
});

describe('members', () => {
  it('can be read by their own company staff and by themselves', async () => {
    await assertSucceeds(getDoc(doc(tech(), `tenants/${A}/members/office`)));
    await assertSucceeds(getDocs(collection(tech(), `tenants/${A}/members`)));
    await assertSucceeds(getDoc(doc(stranger(), `tenants/${A}/members/stranger`)));
  });

  it('cannot grant yourself a role', async () => {
    await assertFails(setDoc(doc(stranger(), `tenants/${A}/members/stranger`), { role: 'owner' }));
    await assertFails(updateDoc(doc(tech(), `tenants/${A}/members/tech`), { role: 'owner' }));
  });

  it('let you edit your own profile without changing role', async () => {
    await assertSucceeds(updateDoc(doc(tech(), `tenants/${A}/members/tech`), { name: 'Tech Renamed' }));
  });

  it('can be managed by their company owner', async () => {
    await assertSucceeds(setDoc(doc(owner(), `tenants/${A}/members/new`), { role: 'sales_technician' }));
    await assertSucceeds(updateDoc(doc(owner(), `tenants/${A}/members/tech`), { role: 'office_staff' }));
    await assertSucceeds(deleteDoc(doc(owner(), `tenants/${A}/members/office`)));
  });

  it('only hold company roles', async () => {
    await assertFails(setDoc(doc(owner(), `tenants/${A}/members/new`), { role: 'superadmin' }));
    await assertFails(setDoc(doc(owner(), `tenants/${A}/members/new`), { role: 'client' }));
  });

  it('cannot be managed by office staff or techs', async () => {
    await assertFails(setDoc(doc(office(), `tenants/${A}/members/new`), { role: 'sales_technician' }));
    await assertFails(updateDoc(doc(tech(), `tenants/${A}/members/office`), { role: 'sales_technician' }));
  });
});

describe('users', () => {
  it('are not readable without signing in', async () => {
    await assertFails(getDoc(doc(anon(), 'users/tech')));
  });

  it('let you read your own doc, and owners read their company', async () => {
    await assertSucceeds(getDoc(doc(client(), 'users/client')));
    await assertSucceeds(getDoc(doc(tech(), 'users/tech')));
    await assertFails(getDoc(doc(tech(), 'users/office')));
    await assertSucceeds(getDoc(doc(owner(), 'users/tech')));
    await assertFails(getDoc(doc(otherOwner(), 'users/tech')));
  });

  it('cannot move yourself to a company or make yourself superadmin', async () => {
    await assertFails(setDoc(doc(stranger(), 'users/stranger'), { tenantId: A }));
    await assertFails(setDoc(doc(stranger(), 'users/stranger'), { platformRole: 'superadmin' }));
    await assertFails(updateDoc(doc(tech(), 'users/tech'), { tenantId: B }));
    await assertFails(updateDoc(doc(owner(), 'users/owner'), { platformRole: 'superadmin' }));
  });

  it('can be placed in their company by an owner', async () => {
    await assertSucceeds(setDoc(doc(owner(), 'users/new'), { tenantId: A }));
    await assertFails(setDoc(doc(owner(), 'users/new2'), { tenantId: B }));
    await assertFails(setDoc(doc(owner(), 'users/new3'), { tenantId: A, platformRole: 'superadmin' }));
    await assertFails(updateDoc(doc(owner(), 'users/admin'), { tenantId: A }));
  });

  it('can be managed by superadmins', async () => {
    await assertSucceeds(setDoc(doc(admin(), 'users/new'), { tenantId: B }));
    await assertSucceeds(updateDoc(doc(admin(), 'users/owner'), { tenantId: B }));
  });
});

describe('other collections', () => {
  it('are closed, including the old top-level jobs and public test doc', async () => {
    await assertFails(getDoc(doc(anon(), 'test/connection')));
    await assertFails(setDoc(doc(tech(), 'test/connection'), { ok: true }));
    await assertFails(getDocs(collection(tech(), 'jobs')));
    await assertFails(setDoc(doc(tech(), 'jobs/job-9'), newJob('job-9')));
  });
});
