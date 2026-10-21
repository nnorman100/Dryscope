import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore,
  doc,
  getDocFromServer,
  collection,
  collectionGroup,
  onSnapshot,
  setDoc,
  deleteDoc,
  query,
  where,
  Unsubscribe,
} from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { RestorationJob, Tenant } from './types';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
const app: FirebaseApp = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApp();

export const auth: Auth = getAuth(app);

// Database ID specified in firebase-applet-config.json
const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';

let dbInstance: Firestore | null = null;

export function getDb(): Firestore {
  if (dbInstance) return dbInstance;

  if (typeof window !== 'undefined') {
    try {
      dbInstance = initializeFirestore(
        app,
        {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager(),
          }),
        },
        databaseId
      );
    } catch {
      // If already initialized or unsupported, fallback to getFirestore
      dbInstance = getFirestore(app, databaseId);
    }
  } else {
    dbInstance = getFirestore(app, databaseId);
  }

  return dbInstance;
}

export const db = getDb();

/**
 * Validate Connection to Firestore per architectural standard
 */
export async function testConnection(): Promise<boolean> {
  try {
    const firestore = getDb();
    await getDocFromServer(doc(firestore, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore is running in offline-first mode.');
    }
    // Document might not exist yet, which is fine (means connection succeeded)
    return true;
  }
}

// A company's jobs live at tenants/{tenantId}/jobs/{jobId}
function jobsCollection(tenantId: string) {
  return collection(getDb(), 'tenants', tenantId, 'jobs');
}

function jobTenantId(job: RestorationJob): string {
  if (!job.tenantId) throw new Error(`Job ${job.id} has no company (tenantId)`);
  return job.tenantId;
}

/**
 * Subscribe to real-time changes across one company's restoration jobs.
 * Offline-first: emits local cache immediately, then syncs with remote cloud state.
 */
export function subscribeToJobs(
  tenantId: string,
  onUpdate: (jobs: RestorationJob[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const jobsCol = jobsCollection(tenantId);

  return onSnapshot(
    jobsCol,
    (snapshot) => {
      const jobsList: RestorationJob[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && data.id) {
          jobsList.push(data as RestorationJob);
        }
      });
      // Sort in-memory to prevent requiring composite index before creation
      jobsList.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
      onUpdate(jobsList);
    },
    (err) => {
      console.warn('Firestore onSnapshot error, falling back to local operations:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribe to the jobs a signed-in client may see, at any company: those whose
 * client email is their own. The equality filter is what lets firestore.rules
 * allow the collection group query.
 */
export function subscribeToClientJobs(
  email: string,
  onUpdate: (jobs: RestorationJob[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const firestore = getDb();
  const jobsQuery = query(collectionGroup(firestore, 'jobs'), where('client.email', '==', email));

  return onSnapshot(
    jobsQuery,
    (snapshot) => {
      const jobsList: RestorationJob[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && data.id) {
          jobsList.push(data as RestorationJob);
        }
      });
      jobsList.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
      onUpdate(jobsList);
    },
    (err) => {
      console.warn('Firestore client jobs error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Real-time save / sync of a single restoration job to Firestore
 */
// Firestore rejects undefined field values; optional job fields left unset are omitted instead
function withoutUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.filter((v) => v !== undefined).map(withoutUndefined) as T;
  }
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, withoutUndefined(v)])
    ) as T;
  }
  return value;
}

// Firestore refuses documents over 1 MiB; photos and signatures are stored inline
const MAX_JOB_DOCUMENT_BYTES = 1_000_000;

function jobPayload(job: RestorationJob) {
  return withoutUndefined({
    ...job,
    updatedAt: new Date().toISOString(),
  });
}

function sizeError(payload: object): string | null {
  const bytes = new TextEncoder().encode(JSON.stringify(payload)).length;
  return bytes > MAX_JOB_DOCUMENT_BYTES
    ? `Not saved: this job would be ${Math.round(bytes / 1024)} KB, over the 1 MB limit. Remove a photo or use a smaller one.`
    : null;
}

/**
 * Why this job cannot be saved, or null when it fits
 */
export function jobSaveError(job: RestorationJob): string | null {
  return sizeError(jobPayload(job));
}

export async function syncJobToFirestore(job: RestorationJob): Promise<void> {
  const jobRef = doc(jobsCollection(jobTenantId(job)), job.id);
  const payload = jobPayload(job);
  const error = sizeError(payload);
  if (error) throw new Error(error);
  // Each supplied top-level field (e.g. gpsCoordinates) is replaced whole; omitted fields are kept
  await setDoc(jobRef, payload, { mergeFields: Object.keys(payload) });
}

/**
 * Delete a job from Firestore
 */
export async function deleteJobFromFirestore(tenantId: string, jobId: string): Promise<void> {
  await deleteDoc(doc(jobsCollection(tenantId), jobId));
}

/**
 * Subscribe to every company (superadmins only; firestore.rules refuses anyone else).
 */
export function subscribeToTenants(
  onUpdate: (tenants: Tenant[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(getDb(), 'tenants'),
    (snapshot) => {
      const list = snapshot.docs.map((d) => ({ ...(d.data() as Omit<Tenant, 'id'>), id: d.id }));
      list.sort((a, b) => a.name.localeCompare(b.name));
      onUpdate(list);
    },
    (err) => {
      console.warn('Could not load companies:', err);
      if (onError) onError(err);
    }
  );
}

// Company web names become document IDs and, later, /[orgSlug]/ addresses
export const ORG_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

/**
 * Create a company. The web name is also its tenantId. Superadmins only.
 */
export async function createTenant(name: string, orgSlug: string, createdBy: string): Promise<Tenant> {
  if (!name.trim()) throw new Error('Enter the company name');
  if (!ORG_SLUG_PATTERN.test(orgSlug)) {
    throw new Error('Web name: lowercase letters, numbers and dashes only');
  }
  const ref = doc(getDb(), 'tenants', orgSlug);
  if ((await getDocFromServer(ref)).exists()) throw new Error(`A company already uses "${orgSlug}"`);
  const tenant: Omit<Tenant, 'id'> = {
    name: name.trim(),
    orgSlug,
    createdAt: new Date().toISOString(),
    createdBy,
  };
  await setDoc(ref, tenant);
  return { ...tenant, id: orgSlug };
}

/**
 * Make a company the one this person works in (users/{uid}.tenantId).
 */
export async function setUserTenant(uid: string, tenantId: string): Promise<void> {
  await setDoc(doc(getDb(), 'users', uid), { tenantId }, { merge: true });
}
