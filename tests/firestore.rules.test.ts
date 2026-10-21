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
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore';

let env: RulesTestEnvironment;

const CLIENT_EMAIL = 'homeowner@example.com';

const job = {
  id: 'job-1',
  jobId: 'DS-2026-0001',
  status: 'Ready for Review',
  category: 'Cat 1 (Clean)',
  client: { name: 'Pat Homeowner', email: CLIENT_EMAIL },
  signature: { isSigned: false, termsAccepted: false },
  equipment: { airMovers: 4 },
  createdAt: '2026-10-20T00:00:00Z',
  updatedAt: '2026-10-20T00:00:00Z',
};

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
    await setDoc(doc(db, 'users/admin'), { name: 'Admin', role: 'superadmin' });
    await setDoc(doc(db, 'users/owner'), { name: 'Owner', role: 'owner' });
    await setDoc(doc(db, 'users/office'), { name: 'Office', role: 'office_staff' });
    await setDoc(doc(db, 'users/tech'), { name: 'Tech', role: 'sales_technician' });
    await setDoc(doc(db, 'jobs/job-1'), job);
  });
});

describe('jobs', () => {
  it('are not readable or writable without signing in', async () => {
    await assertFails(getDoc(doc(anon(), 'jobs/job-1')));
    await assertFails(getDocs(collection(anon(), 'jobs')));
    await assertFails(setDoc(doc(anon(), 'jobs/job-2'), { ...job, id: 'job-2' }));
    await assertFails(updateDoc(doc(anon(), 'jobs/job-1'), signedJobUpdate));
  });

  it('are hidden from signed-in users with no staff role or matching email', async () => {
    await assertFails(getDoc(doc(stranger(), 'jobs/job-1')));
    await assertFails(getDocs(collection(stranger(), 'jobs')));
    await assertFails(setDoc(doc(stranger(), 'jobs/job-2'), { ...job, id: 'job-2' }));
  });

  it('can be listed, created and edited by staff', async () => {
    await assertSucceeds(getDocs(collection(tech(), 'jobs')));
    await assertSucceeds(setDoc(doc(tech(), 'jobs/job-2'), { ...job, id: 'job-2' }));
    await assertSucceeds(updateDoc(doc(tech(), 'jobs/job-1'), { 'equipment.airMovers': 6 }));
  });

  it('must keep their id field equal to the document id', async () => {
    await assertFails(setDoc(doc(tech(), 'jobs/job-2'), { ...job, id: 'job-other' }));
  });

  it('can only be deleted by office staff and above', async () => {
    await assertFails(deleteDoc(doc(tech(), 'jobs/job-1')));
    await assertSucceeds(deleteDoc(doc(office(), 'jobs/job-1')));
  });

  it('are readable by the client whose verified email is on the job', async () => {
    await assertSucceeds(getDoc(doc(client(), 'jobs/job-1')));
    await assertSucceeds(
      getDocs(query(collection(client(), 'jobs'), where('client.email', '==', CLIENT_EMAIL)))
    );
  });

  it('cannot be listed in full by a client', async () => {
    await assertFails(getDocs(collection(client(), 'jobs')));
  });

  it('are not readable with an unverified email', async () => {
    await assertFails(getDoc(doc(unverifiedClient(), 'jobs/job-1')));
  });

  it('can be signed by their client', async () => {
    await assertSucceeds(updateDoc(doc(client(), 'jobs/job-1'), signedJobUpdate));
  });

  it('cannot have other fields changed by their client', async () => {
    await assertFails(
      updateDoc(doc(client(), 'jobs/job-1'), { ...signedJobUpdate, 'equipment.airMovers': 1 })
    );
    await assertFails(updateDoc(doc(client(), 'jobs/job-1'), { status: 'Completed' }));
  });

  it('cannot be re-signed once signed', async () => {
    await assertSucceeds(updateDoc(doc(client(), 'jobs/job-1'), signedJobUpdate));
    await assertFails(
      updateDoc(doc(client(), 'jobs/job-1'), {
        ...signedJobUpdate,
        signature: { ...signedJobUpdate.signature, signedByName: 'Someone else' },
      })
    );
  });

  it('cannot be created by a client', async () => {
    await assertFails(setDoc(doc(client(), 'jobs/job-2'), { ...job, id: 'job-2' }));
  });
});

describe('users', () => {
  it('are not readable without signing in', async () => {
    await assertFails(getDoc(doc(anon(), 'users/tech')));
  });

  it('let anyone read their own doc and staff read all', async () => {
    await assertSucceeds(getDoc(doc(client(), 'users/client')));
    await assertFails(getDoc(doc(client(), 'users/tech')));
    await assertSucceeds(getDoc(doc(tech(), 'users/office')));
  });

  it('cannot grant yourself a role', async () => {
    await assertFails(setDoc(doc(stranger(), 'users/stranger'), { name: 'Me', role: 'superadmin' }));
    await assertFails(setDoc(doc(stranger(), 'users/stranger'), { name: 'Me', role: 'sales_technician' }));
    await assertFails(updateDoc(doc(tech(), 'users/tech'), { role: 'owner' }));
  });

  it('let you edit your own profile without changing role', async () => {
    await assertSucceeds(updateDoc(doc(tech(), 'users/tech'), { name: 'Tech Renamed' }));
  });

  it('can be managed by owners, except superadmins', async () => {
    await assertSucceeds(setDoc(doc(owner(), 'users/new'), { name: 'New', role: 'sales_technician' }));
    await assertFails(setDoc(doc(owner(), 'users/new2'), { name: 'New', role: 'superadmin' }));
    await assertFails(updateDoc(doc(owner(), 'users/admin'), { name: 'Hijacked' }));
    await assertFails(deleteDoc(doc(owner(), 'users/admin')));
  });

  it('cannot be managed by office staff or techs', async () => {
    await assertFails(setDoc(doc(office(), 'users/new'), { name: 'New', role: 'sales_technician' }));
    await assertFails(updateDoc(doc(tech(), 'users/office'), { role: 'client' }));
  });

  it('can be managed by superadmins', async () => {
    await assertSucceeds(setDoc(doc(admin(), 'users/new'), { name: 'New', role: 'owner' }));
    await assertSucceeds(updateDoc(doc(admin(), 'users/owner'), { role: 'office_staff' }));
  });
});

describe('other collections', () => {
  it('are closed, including the old public test doc', async () => {
    await assertFails(getDoc(doc(anon(), 'test/connection')));
    await assertFails(setDoc(doc(tech(), 'test/connection'), { ok: true }));
  });
});
