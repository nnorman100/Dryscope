'use client';

import React from 'react';
import {
  ShieldAlert,
  Server,
  Activity,
  Users,
  Cpu,
  Key,
  Database,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { CompanyWorkspaces } from './CompanyWorkspaces';

export function SuperadminDashboard() {
  const auditEvents = [
    {
      id: 'evt-1',
      action: 'WORK_AUTH_SIGNED',
      company: 'DryScope Disaster Restoration',
      user: 'Dr. Arthur Sterling',
      ip: '198.51.100.24',
      time: '12 mins ago',
      status: 'Success',
    },
    {
      id: 'evt-2',
      action: 'OCR_METER_READING_EXTRACTED',
      company: 'DryScope Disaster Restoration',
      user: 'Nate Norman (Tech)',
      ip: '172.56.21.8',
      time: '28 mins ago',
      status: 'Success',
    },
    {
      id: 'evt-3',
      action: 'ESTIMATE_RANGE_COMPUTED',
      company: 'Cascade Emergency Restoration',
      user: 'David Miller (Owner)',
      ip: '203.0.113.45',
      time: '1 hour ago',
      status: 'Success',
    },
  ];

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
            System health, company workspaces, Gemini 2.5 Flash API quotas, and audit security logs.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono bg-purple-950/60 text-purple-200 border border-purple-800 px-3 py-1.5 rounded-lg">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span>All Services Operational • 99.98% SLA</span>
        </div>
      </div>

      {/* Cloud Health Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Global Tenancies
          </div>
          <div className="text-3xl font-black text-slate-900 font-mono">3 Companies</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">
            36 Active Technician Seats
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            AI Scopes Processed
          </div>
          <div className="text-3xl font-black text-slate-900 font-mono">1,420 Scopes</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Avg processing latency: 1.2s
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Multimodal OCR Vision
          </div>
          <div className="text-3xl font-black text-purple-600 font-mono">4,890 Photos</div>
          <div className="text-[11px] text-slate-500 mt-1">
            99.4% meter digit precision
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Gemini Flash Endpoint
          </div>
          <div className="text-xl font-black text-emerald-600 font-mono">gemini-2.5-flash</div>
          <div className="text-[11px] text-slate-500 mt-1">
            us-central1 ADC Relay
          </div>
        </div>
      </div>

      {/* Tenancy Management */}
      <CompanyWorkspaces />

      {/* Audit Logs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 pb-3 border-b border-slate-100">
          Platform Security & Audit Trail
        </h3>

        <div className="space-y-2">
          {auditEvents.map((evt) => (
            <div
              key={evt.id}
              className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between font-mono"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold text-slate-900">{evt.action}</span>
                  <span className="text-slate-500 font-sans ml-2">
                    by {evt.user} ({evt.company})
                  </span>
                </div>
              </div>
              <div className="text-slate-400 text-[11px]">
                IP: {evt.ip} • {evt.time}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
