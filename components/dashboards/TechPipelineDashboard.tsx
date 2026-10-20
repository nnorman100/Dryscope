'use client';

import React, { useState } from 'react';
import { RestorationJob } from '@/lib/types';
import { calculatePricingBreakdown, formatCurrency } from '@/lib/pricing';
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  FileText,
  DollarSign,
  Search,
  Filter,
  Wrench,
  QrCode,
  ArrowRight,
  Plus,
  Copy,
  ExternalLink,
  MapPin,
  Calendar,
  Building,
  User,
} from 'lucide-react';

interface TechPipelineDashboardProps {
  jobs: RestorationJob[];
  activeJob: RestorationJob;
  onSelectJob: (job: RestorationJob) => void;
  onOpenScopingWorkspace: (job?: RestorationJob) => void;
  onCreateNewEstimate: () => void;
  onNavigateToPortal: () => void;
}

export function TechPipelineDashboard({
  jobs,
  activeJob,
  onSelectJob,
  onOpenScopingWorkspace,
  onCreateNewEstimate,
  onNavigateToPortal,
}: TechPipelineDashboardProps) {
  const [filterTab, setFilterTab] = useState<'all' | 'in_progress' | 'review' | 'authorized' | 'completed'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Non-archived jobs for technician
  const activeJobs = jobs.filter((j) => !j.isArchived);

  // Filtered jobs
  const filteredJobs = activeJobs.filter((j) => {
    if (filterTab === 'in_progress' && j.status !== 'Draft' && j.status !== 'In Progress') return false;
    if (filterTab === 'review' && j.status !== 'Ready for Review') return false;
    if (filterTab === 'authorized' && j.status !== 'Client Authorized') return false;
    if (filterTab === 'completed' && j.status !== 'Completed') return false;

    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      j.client.name.toLowerCase().includes(term) ||
      j.client.address.toLowerCase().includes(term) ||
      j.client.insuranceCarrier.toLowerCase().includes(term) ||
      j.client.claimNumber.toLowerCase().includes(term) ||
      j.jobId.toLowerCase().includes(term)
    );
  });

  // Calculate Pipeline KPIs
  const inProgressCount = activeJobs.filter((j) => j.status === 'Draft' || j.status === 'In Progress').length;
  const reviewCount = activeJobs.filter((j) => j.status === 'Ready for Review').length;
  const authorizedCount = activeJobs.filter((j) => j.status === 'Client Authorized').length;
  const completedCount = activeJobs.filter((j) => j.status === 'Completed').length;

  const totalClosed = authorizedCount + completedCount;
  const closeRate = activeJobs.length > 0 ? Math.round((totalClosed / activeJobs.length) * 100) : 75;

  const totalPipelineValue = activeJobs.reduce((acc, j) => {
    const p = calculatePricingBreakdown(j);
    return acc + p.highEstimateBound;
  }, 0);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-[#0B192C] text-white p-6 sm:p-7 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              Sales Technician Pipeline
            </span>
            <span className="text-xs text-slate-400">Nate Norman (Senior Sales Tech)</span>
          </div>
          <h2 className="text-2xl font-black text-white mt-1">
            Active Restoration Sales & Scoping Pipeline
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Track all sales proposals in progress, authorized work agreements, and closing metrics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onCreateNewEstimate}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>New Field Estimate</span>
          </button>

          <button
            onClick={() => onOpenScopingWorkspace(activeJob)}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-700 flex items-center gap-1.5"
          >
            <Wrench className="w-3.5 h-3.5 text-amber-400" />
            <span>Open Field Scoping Tool</span>
          </button>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            In-Progress & Drafting
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
            {inProgressCount}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Awaiting complete scope</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Office Review
          </span>
          <div className="text-2xl font-black text-amber-600 mt-1 font-mono">
            {reviewCount}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Submitted for verification</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Authorized & Signed
          </span>
          <div className="text-2xl font-black text-emerald-600 mt-1 font-mono">
            {authorizedCount}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Work authorizations active</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Close / Win Rate
          </span>
          <div className="text-2xl font-black text-blue-600 mt-1 font-mono">
            {closeRate}%
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Signed proposals / visits</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Total Pipeline Volume
          </span>
          <div className="text-xl font-black text-slate-900 mt-1 font-mono">
            {formatCurrency(totalPipelineValue)}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">High bound potential</p>
        </div>
      </div>

      {/* Main Filterable Estimates List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Filter Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto text-xs font-semibold">
            {[
              ['all', `All Estimates (${activeJobs.length})`],
              ['in_progress', `In Progress (${inProgressCount})`],
              ['review', `Office Review (${reviewCount})`],
              ['authorized', `Authorized (${authorizedCount})`],
              ['completed', `Completed (${completedCount})`],
            ].map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilterTab(tab as any)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                  filterTab === tab
                    ? 'bg-slate-900 text-white font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search client, address, claim #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white"
            />
          </div>
        </div>

        {/* List of Estimates */}
        <div className="divide-y divide-slate-100">
          {filteredJobs.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              No sales estimates match the selected filter.
            </div>
          ) : (
            filteredJobs.map((j) => {
              const pricing = calculatePricingBreakdown(j);
              const isSelected = j.id === activeJob.id;

              return (
                <div
                  key={j.id}
                  className={`p-5 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/80 ${
                    isSelected ? 'bg-amber-50/40 border-l-4 border-amber-500' : ''
                  }`}
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{j.client.name}</span>
                      <span className="text-[11px] font-mono text-slate-500 font-medium">
                        #{j.jobId}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          j.category === 'Cat 3 (Black / Mold)'
                            ? 'bg-purple-100 text-purple-900'
                            : j.category === 'Cat 2 (Grey)'
                            ? 'bg-blue-100 text-blue-900'
                            : 'bg-emerald-100 text-emerald-900'
                        }`}
                      >
                        {j.category}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          j.status === 'Client Authorized'
                            ? 'bg-emerald-100 text-emerald-800'
                            : j.status === 'Ready for Review'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {j.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{j.client.address}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {j.client.insuranceCarrier} (Claim: {j.client.claimNumber})
                        </span>
                      </div>
                      <div>
                        Affected Area:{' '}
                        <span className="font-semibold text-slate-700">{pricing.affectedSquareFeet} SF</span>
                      </div>
                    </div>
                  </div>

                  {/* Pricing Range & Action Buttons */}
                  <div className="flex flex-wrap items-center gap-4 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                        Estimated Proposal Range
                      </span>
                      <span className="font-mono font-bold text-sm text-slate-900">
                        {formatCurrency(pricing.lowEstimateBound)} – {formatCurrency(pricing.highEstimateBound)}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {j.equipment.dryingDays} Days • {j.equipment.airMovers} Fans • {j.equipment.dehumidifiers} Dehu
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          onSelectJob(j);
                          onOpenScopingWorkspace(j);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition-all flex items-center gap-1.5 shadow-xs"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>Scope Job</span>
                      </button>

                      <button
                        onClick={() => {
                          onSelectJob(j);
                          onNavigateToPortal();
                        }}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200"
                        title="Client Work Authorization & QR Sign"
                      >
                        <QrCode className="w-4 h-4 text-slate-700" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
