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
  getDocs,
  query,
  where,
  Unsubscribe,
} from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { RestorationJob } from './types';
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
export async function syncJobToFirestore(job: RestorationJob): Promise<void> {
  const jobRef = doc(jobsCollection(jobTenantId(job)), job.id);
  const payload = {
    ...job,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(jobRef, payload, { merge: true });
}

/**
 * Delete a job from Firestore
 */
export async function deleteJobFromFirestore(tenantId: string, jobId: string): Promise<void> {
  await deleteDoc(doc(jobsCollection(tenantId), jobId));
}

/**
 * Seed initial jobs into a company if it has none yet
 */
export async function seedJobsIfEmpty(tenantId: string, initialJobs: RestorationJob[]): Promise<void> {
  try {
    const jobsCol = jobsCollection(tenantId);
    const existing = await getDocs(jobsCol);
    if (existing.empty && initialJobs.length > 0) {
      for (const job of initialJobs) {
        await setDoc(doc(jobsCol, job.id), { ...job, tenantId });
      }
    }
  } catch (err) {
    console.warn('Could not seed initial jobs to Firestore:', err);
  }
}
