import { createRemoteJWKSet, jwtVerify } from 'jose';
import firebaseConfig from '../firebase-applet-config.json';
import { isStaffRole } from './roles';
import { UserRole } from './types';

// Server-side checks for the Gemini routes and the Live socket. Firebase ID
// tokens are verified against Google's public keys, so no service account is
// needed. The caller's role is then read from their own /users/{uid} doc with
// their own token, which firestore.rules allows.

const projectId = firebaseConfig.projectId;
const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';

const firebaseJwks = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

export interface StaffCaller {
  uid: string;
  email?: string;
  role: UserRole;
}

export class AuthError extends Error {
  constructor(message: string, public status: 401 | 403) {
    super(message);
  }
}

const ROLE_CACHE_MS = 5 * 60 * 1000;
const roleCache = new Map<string, { role: string | null; expires: number }>();

export async function verifyFirebaseIdToken(token: string): Promise<{ uid: string; email?: string }> {
  try {
    const { payload } = await jwtVerify(token, firebaseJwks, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      algorithms: ['RS256'],
    });
    if (!payload.sub) throw new Error('Token has no subject');
    return { uid: payload.sub, email: typeof payload.email === 'string' ? payload.email : undefined };
  } catch {
    throw new AuthError('Invalid or expired sign-in token', 401);
  }
}

async function fetchRole(uid: string, token: string): Promise<string | null> {
  const cached = roleCache.get(uid);
  if (cached && cached.expires > Date.now()) return cached.role;

  const url =
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}` +
    `/databases/${encodeURIComponent(databaseId)}/documents/users/${encodeURIComponent(uid)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

  let role: string | null = null;
  if (res.ok) {
    const doc = await res.json();
    role = doc?.fields?.role?.stringValue ?? null;
  } else if (res.status !== 404) {
    // Don't cache transient failures
    throw new AuthError('Could not check account role', 403);
  }

  roleCache.set(uid, { role, expires: Date.now() + ROLE_CACHE_MS });
  return role;
}

/**
 * Verify a Firebase ID token and require that its user has a staff role.
 */
export async function requireStaffToken(token: string | null | undefined): Promise<StaffCaller> {
  if (!token) throw new AuthError('Sign in required', 401);
  const { uid, email } = await verifyFirebaseIdToken(token);
  const role = await fetchRole(uid, token);
  if (!isStaffRole(role)) throw new AuthError('This account does not have staff access', 403);
  return { uid, email, role };
}

export function bearerToken(authorizationHeader: string | null | undefined): string | null {
  if (!authorizationHeader) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authorizationHeader.trim());
  return match ? match[1] : null;
}

/**
 * For Next route handlers: returns the caller, or a JSON error response to send.
 */
export async function requireStaffRequest(
  req: Request
): Promise<{ caller: StaffCaller; errorResponse?: undefined } | { caller?: undefined; errorResponse: Response }> {
  try {
    const caller = await requireStaffToken(bearerToken(req.headers.get('authorization')));
    return { caller };
  } catch (err) {
    const status = err instanceof AuthError ? err.status : 401;
    const message = err instanceof Error ? err.message : 'Sign in required';
    return { errorResponse: Response.json({ error: message }, { status }) };
  }
}
