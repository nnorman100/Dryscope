'use client';

import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { CompanyWorkspaces } from './CompanyWorkspaces';

export function SuperadminDashboard() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Superadmin Header */}
      <div className="bg-[#0B192C] text-white p-6 sm:p-7 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-purple-900/40">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1 border border-purple-500/30">
              <ShieldAlert className="w-3.5 h-3.5" />
              Global Platform Superadmin Console
            </span>
            <span className="text-xs text-purple-300">DryScope Cloud OS</span>
          </div>
          <h2 className="text-2xl font-black text-white mt-1">
            Multi-Tenant Restoration Fleet Architecture
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Company workspaces and the platform audit trail.
          </p>
        </div>
      </div>

      {/* Tenancy Management */}
      <CompanyWorkspaces />

      {/* Audit Logs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 pb-3 border-b border-slate-100">
          Platform Security & Audit Trail
        </h3>

        <div className="py-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs">
          No audit events recorded.
        </div>
      </div>
    </div>
  );
}
