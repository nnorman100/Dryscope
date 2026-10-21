import { createRemoteJWKSet, jwtVerify } from 'jose';
import firebaseConfig from '../firebase-applet-config.json';
import { isStaffRole, isTenantRole } from './roles';
import { UserRole } from './types';

// Server-side checks for the Gemini routes and the Live socket. Firebase ID
// tokens are verified against Google's public keys, so no service account is
// needed. The caller's company and role are then read from their own
// /users/{uid} and /tenants/{tenantId}/members/{uid} docs with their own token,
// which firestore.rules allows.

const projectId = firebaseConfig.projectId;
const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';

const firebaseJwks = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

export interface StaffCaller {
  uid: string;
  email?: string;
  role: UserRole;
  // The caller's company. Superadmins may have none.
  tenantId: string | null;
}

export class AuthError extends Error {
  constructor(message: string, public status: 401 | 403) {
    super(message);
  }
}

const ROLE_CACHE_MS = 5 * 60 * 1000;
const roleCache = new Map<string, { access: Access; expires: number }>();

interface Access {
  role: string | null;
  tenantId: string | null;
}

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

// Reads one Firestore document as the caller. Returns null if it doesn't exist.
async function fetchDocFields(path: string, token: string): Promise<Record<string, any> | null> {
  const url =
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}` +
    `/databases/${encodeURIComponent(databaseId)}/documents/${path}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.ok) {
    const doc = await res.json();
    return doc?.fields ?? {};
  }
  if (res.status === 404) return null;
  // Don't cache transient failures
  throw new AuthError('Could not check account role', 403);
}

async function fetchAccess(uid: string, token: string): Promise<Access> {
  const cached = roleCache.get(uid);
  if (cached && cached.expires > Date.now()) return cached.access;

  const user = await fetchDocFields(`users/${encodeURIComponent(uid)}`, token);
  const tenantId: string | null = user?.tenantId?.stringValue ?? null;
  let role: string | null = null;
  if (user?.platformRole?.stringValue === 'superadmin') {
    role = 'superadmin';
  } else if (tenantId) {
    const member = await fetchDocFields(
      `tenants/${encodeURIComponent(tenantId)}/members/${encodeURIComponent(uid)}`,
      token
    );
    const memberRole = member?.role?.stringValue;
    role = isTenantRole(memberRole) ? memberRole : null;
  }

  const access = { role, tenantId };
  roleCache.set(uid, { access, expires: Date.now() + ROLE_CACHE_MS });
  return access;
}

/**
 * Verify a Firebase ID token and require that its user is staff at a company
 * (or a platform superadmin).
 */
export async function requireStaffToken(token: string | null | undefined): Promise<StaffCaller> {
  if (!token) throw new AuthError('Sign in required', 401);
  const { uid, email } = await verifyFirebaseIdToken(token);
  const { role, tenantId } = await fetchAccess(uid, token);
  if (!isStaffRole(role)) throw new AuthError('This account does not have staff access', 403);
  return { uid, email, role, tenantId };
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
