'use client';

import React from 'react';
import { RestorationJob } from '@/lib/types';
import { formatCurrency, RATES } from '@/lib/pricing';
import {
  Building2,
  TrendingUp,
  DollarSign,
  PieChart,
  Users,
  Wrench,
  CheckCircle2,
  MapPin,
  Clock,
  Shield,
  Sliders,
  Sparkles,
} from 'lucide-react';

interface OwnerDashboardProps {
  jobs: RestorationJob[];
  onSelectJob: (job: RestorationJob) => void;
  onNavigateToOffice: () => void;
}

export function OwnerDashboard({
  jobs,
  onSelectJob,
  onNavigateToOffice,
}: OwnerDashboardProps) {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Executive Command Header */}
      <div className="bg-[#0B192C] text-white p-6 sm:p-7 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1 border border-blue-500/30">
              <Building2 className="w-3.5 h-3.5" />
              Owner & Executive Command Center
            </span>
            <span className="text-xs text-slate-400">DryScope Restoration Network</span>
          </div>
          <h2 className="text-2xl font-black text-white mt-1">
            Restoration Pipeline & Profitability Operations
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Real-time financial performance, equipment utilization, and field crew deployment.
          </p>
        </div>

        <button
          onClick={onNavigateToOffice}
          className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all flex items-center gap-2 self-start md:self-auto shadow-md shadow-emerald-500/20"
        >
          <span>Open Estimating Matrix</span>
        </button>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Gross Claims Pipeline</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-slate-900 font-mono">$142,850</div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold mt-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+18.4% vs last month</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Gross Profit Margin</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-3xl font-black text-slate-900 font-mono">64.2%</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            Target benchmark: 60.0%
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Active Deployments</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-black text-slate-900 font-mono">{jobs.length + 8}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            3 Ready for Scope Review
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Equipment Utilization</span>
            <Wrench className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-3xl font-black text-emerald-600 font-mono">86.4%</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            38 / 44 Fans • 12 / 14 Dehus active
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Active Jobs Pipeline */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Current Field Losses & Claims Pipeline
            </h3>
            <span className="text-xs text-slate-400">Real-time status</span>
          </div>

          <div className="space-y-3">
            {jobs.map((j) => (
              <div
                key={j.id}
                onClick={() => onSelectJob(j)}
                className="p-4 rounded-xl border border-slate-200 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/20 cursor-pointer transition-all flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{j.client.name}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        j.category === 'Cat 3 (Black / Mold)'
                          ? 'bg-purple-100 text-purple-900'
                          : j.category === 'Cat 2 (Grey)'
                          ? 'bg-blue-100 text-blue-900'
                          : 'bg-emerald-100 text-emerald-900'
                      }`}
                    >
                      {j.category}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{j.client.address}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-full ${
                      j.status === 'Client Authorized'
                        ? 'bg-emerald-100 text-emerald-800'
                        : j.status === 'Ready for Review'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {j.status}
                  </span>
                  <div className="text-[11px] text-slate-400 font-mono mt-1">
                    {j.jobId}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Team Roster & Rate Tuning */}
        <div className="lg:col-span-5 space-y-6">
          {/* Field Crew Roster */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100 mb-4">
              Restoration Field Crew Roster
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center">
                    NN
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Nate Norman</div>
                    <div className="text-slate-500 text-[11px]">Senior Sales Tech • On Site</div>
                  </div>
                </div>
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Active
                </span>
              </div>

              <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center">
                    CJ
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Courtney Jenkins</div>
                    <div className="text-slate-500 text-[11px]">Office Estimator • Reviewing Scopes</div>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                  In Office
                </span>
              </div>
            </div>
          </div>

          {/* Rate Matrix Settings */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-slate-600" />
                Active Rate Schedule
              </h3>
              <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                Locked
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 text-slate-700 border-b border-slate-100">
                <span>Base Emergency Trip Call:</span>
                <span className="font-mono font-bold">$133.95</span>
              </div>
              <div className="flex justify-between py-1 text-slate-700 border-b border-slate-100">
                <span>Monitoring Base (13.25 hrs @ $47.46):</span>
                <span className="font-mono font-bold">$628.85</span>
              </div>
              <div className="flex justify-between py-1 text-slate-700 border-b border-slate-100">
                <span>Standard Baseline Total:</span>
                <span className="font-mono font-bold text-emerald-600">$1,180.20</span>
              </div>
              <div className="flex justify-between py-1 text-slate-700 border-b border-slate-100">
                <span>Direct Field Labor (D29):</span>
                <span className="font-mono font-bold">$47.46 / hr</span>
              </div>
              <div className="flex justify-between py-1 text-slate-700">
                <span>After Hours Emergency Fee:</span>
                <span className="font-mono font-bold text-amber-600">$200.00</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
