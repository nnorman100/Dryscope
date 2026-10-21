'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { MailCheck, SearchX, RefreshCw } from 'lucide-react';

// Shown in the client portal when a signed-in homeowner has nothing to see yet:
// either their email is unverified, or no job carries their email.
export function ClientAccessNotice() {
  const { account, emailVerified, refreshUser, resendVerificationEmail } = useAuth();
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const run = async (action: () => Promise<void>, done: string) => {
    setIsBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage(done);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-16">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 text-center space-y-4">
        {emailVerified ? (
          <>
            <SearchX className="w-10 h-10 text-slate-400 mx-auto" />
            <h1 className="text-lg font-bold text-slate-900">No estimates found yet</h1>
            <p className="text-sm text-slate-600">
              We couldn&apos;t find a job for <strong>{account?.email}</strong>. Ask your DryScope
              contact to use this email on your job, then refresh.
            </p>
          </>
        ) : (
          <>
            <MailCheck className="w-10 h-10 text-emerald-600 mx-auto" />
            <h1 className="text-lg font-bold text-slate-900">Verify your email</h1>
            <p className="text-sm text-slate-600">
              We sent a verification link to <strong>{account?.email}</strong>. Open it, then come
              back and refresh to see your estimate.
            </p>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => run(resendVerificationEmail, 'Verification email sent.')}
              className="text-xs font-semibold text-emerald-700 hover:underline disabled:opacity-60"
            >
              Resend verification email
            </button>
          </>
        )}

        <button
          type="button"
          disabled={isBusy}
          onClick={() => run(refreshUser, '')}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0B192C] hover:bg-slate-900 text-white text-xs font-bold disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin' : ''}`} />
          Refresh
        </button>

        {message && <p className="text-xs text-slate-500">{message}</p>}
      </div>
    </div>
  );
}
