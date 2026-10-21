'use client';

import React, { useEffect, useState } from 'react';
import { Building, CheckCircle2, Plus } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { createTenant, setUserTenant, subscribeToTenants } from '@/lib/firebase';
import { Tenant } from '@/lib/types';

// Turns "Alert Disaster Restoration" into "alert-disaster-restoration"
function suggestSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
}

/**
 * Superadmin list of restoration companies, with adding a company and
 * choosing which one you work in.
 */
export function CompanyWorkspaces() {
  const { account, refreshUser } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadError, setLoadError] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(
    () => subscribeToTenants(setTenants, () => setLoadError('Could not load companies.')),
    []
  );

  const switchTo = async (tenantId: string) => {
    if (!account) return;
    setBusy(true);
    setError('');
    try {
      await setUserTenant(account.id, tenantId);
      // Reloads the account so jobs switch to the chosen company
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not switch company');
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;
    setBusy(true);
    setError('');
    try {
      const tenant = await createTenant(name, slug, account.id);
      setName('');
      setSlug('');
      setSlugEdited(false);
      // Your first company becomes the one you work in
      if (!account.tenantId) await switchTo(tenant.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add company');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 pb-3 border-b border-slate-100">
        Restoration Company Workspaces
      </h3>

      <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugEdited) setSlug(suggestSlug(e.target.value));
          }}
          placeholder="Company name"
          className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-xs"
        />
        <input
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value.toLowerCase());
            setSlugEdited(true);
          }}
          placeholder="web-name"
          className="sm:w-48 px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono"
        />
        <button
          type="submit"
          disabled={busy || !name.trim() || !slug}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 text-white text-xs font-bold disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" />
          Add company
        </button>
      </form>

      {(error || loadError) && <p className="text-xs text-red-600 mb-3">{error || loadError}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-bold border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-4">Company Name</th>
              <th className="py-2.5 px-4">Web Name</th>
              <th className="py-2.5 px-4">Added</th>
              <th className="py-2.5 px-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {tenants.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 px-4 text-slate-500">
                  No companies yet. Add the first one above.
                </td>
              </tr>
            )}
            {tenants.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50/50">
                <td className="py-3 px-4 font-bold text-slate-900">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-purple-600" />
                    <span>{t.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4 font-mono text-slate-600">{t.orgSlug}</td>
                <td className="py-3 px-4 text-slate-700">
                  {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : ''}
                </td>
                <td className="py-3 px-4 text-right">
                  {account?.tenantId === t.id ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                      <CheckCircle2 className="w-3 h-3" />
                      Working here
                    </span>
                  ) : (
                    <button
                      onClick={() => switchTo(t.id)}
                      disabled={busy}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Work in this company
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
