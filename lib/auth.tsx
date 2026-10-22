'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  User,
  onIdTokenChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { isStaffRole, isTenantRole } from './roles';
import { UserAccount } from './types';

export type AuthStatus = 'loading' | 'signed_out' | 'signed_in';

interface AuthContextValue {
  status: AuthStatus;
  firebaseUser: User | null;
  // The signed-in person's account. Staff come from their company's
  // tenants/{tenantId}/members/{uid} doc; anyone else
  // is a client, matched to jobs by their verified email.
  account: UserAccount | null;
  // Clients only see their jobs once Firebase reports their email as verified
  emailVerified: boolean;
  // Re-reads the user and refreshes their token, e.g. after they verify their email
  refreshUser: () => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  // There is no sign-up: accounts are created by the company (docs/sign-in.md)
  // and the Firebase project itself refuses self-registration.
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadAccount(user: User): Promise<UserAccount> {
  try {
    // users/{uid} says which company the person belongs to; their role and
    // profile live in that company's members/{uid} doc
    const userSnap = await getDoc(doc(db, 'users', user.uid));
    const userData = userSnap.exists() ? userSnap.data() : null;
    const tenantId: string | undefined = userData?.tenantId || undefined;
    const isSuperadmin = userData?.platformRole === 'superadmin';

    let member: Record<string, any> | null = null;
    let companyName = '';
    if (tenantId) {
      const [memberSnap, tenantSnap] = await Promise.all([
        getDoc(doc(db, 'tenants', tenantId, 'members', user.uid)),
        getDoc(doc(db, 'tenants', tenantId)),
      ]);
      member = memberSnap.exists() ? memberSnap.data() : null;
      companyName = tenantSnap.exists() ? tenantSnap.data().name || '' : '';
    }

    const role = isSuperadmin ? 'superadmin' : isTenantRole(member?.role) ? member?.role : null;
    if (isStaffRole(role)) {
      return {
        id: user.uid,
        name: member?.name || user.displayName || user.email || 'Staff member',
        email: member?.email || user.email || '',
        role,
        tenantId,
        title: member?.title || '',
        companyName,
        phone: member?.phone,
        avatarColor: member?.avatarColor,
      };
    }
  } catch (err) {
    console.warn('Could not load user profile; treating as client:', err);
  }

  return {
    id: user.uid,
    name: user.displayName || user.email || 'Client',
    email: user.email || '',
    role: 'client',
    title: 'Property Owner',
    companyName: '',
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);

  useEffect(() => {
    // Fires on sign-in, sign-out and token refresh, so a newly verified email
    // or a role change is picked up without signing out
    return onIdTokenChanged(auth, async (user) => {
      if (!user) {
        setFirebaseUser(null);
        setAccount(null);
        setEmailVerified(false);
        setStatus('signed_out');
        return;
      }
      const loaded = await loadAccount(user);
      setFirebaseUser(user);
      setAccount(loaded);
      setEmailVerified(user.emailVerified);
      setStatus('signed_in');
    });
  }, []);

  const value: AuthContextValue = {
    status,
    firebaseUser,
    account,
    emailVerified,
    refreshUser: async () => {
      if (!auth.currentUser) return;
      await auth.currentUser.reload();
      await auth.currentUser.getIdToken(true);
    },
    resendVerificationEmail: async () => {
      if (auth.currentUser) await sendEmailVerification(auth.currentUser);
    },
    signInWithGoogle: async () => {
      await signInWithPopup(auth, new GoogleAuthProvider());
    },
    signInWithEmail: async (email, password) => {
      await signInWithEmailAndPassword(auth, email, password);
    },
    resetPassword: async (email) => {
      await sendPasswordResetEmail(auth, email);
    },
    signOut: async () => {
      await firebaseSignOut(auth);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/**
 * The current user's Firebase ID token, for calls to our own API routes and the
 * Gemini Live socket. Throws if nobody is signed in.
 */
export async function getIdToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');
  return user.getIdToken();
}

/**
 * fetch() with the signed-in user's ID token attached as a Bearer header.
 */
export async function authedFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = await getIdToken();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
