'use client';

import React, { useState } from 'react';
import { RestorationJob } from '@/lib/types';
import { formatCurrency, calculatePricingBreakdown } from '@/lib/pricing';
import {
  Archive,
  Search,
  Filter,
  FileText,
  Printer,
  Copy,
  Calendar,
  Building,
  MapPin,
  CheckCircle2,
  DollarSign,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Eye,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';

interface OfficeArchiveVaultProps {
  jobs: RestorationJob[];
  onSelectJob: (job: RestorationJob) => void;
  onRestoreJob: (job: RestorationJob) => void;
  onOpenDocSuite: (job: RestorationJob) => void;
  onBackToActive: () => void;
}

export function OfficeArchiveVault({
  jobs,
  onSelectJob,
  onRestoreJob,
  onOpenDocSuite,
  onBackToActive,
}: OfficeArchiveVaultProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCarrier, setSelectedCarrier] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [inspectingJob, setInspectingJob] = useState<RestorationJob | null>(null);

  // Filter archived jobs
  const archivedJobs = jobs.filter((j) => j.isArchived || j.status === 'Archived');

  const filteredArchived = archivedJobs.filter((j) => {
    if (selectedCarrier !== 'all' && !j.client.insuranceCarrier.toLowerCase().includes(selectedCarrier.toLowerCase())) {
      return false;
    }
    if (selectedCategory !== 'all' && !j.category.toLowerCase().includes(selectedCategory.toLowerCase())) {
      return false;
    }

    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      j.client.name.toLowerCase().includes(term) ||
      j.client.address.toLowerCase().includes(term) ||
      j.client.claimNumber.toLowerCase().includes(term) ||
      j.client.insuranceCarrier.toLowerCase().includes(term) ||
      j.jobId.toLowerCase().includes(term)
    );
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-[#0B192C] text-white p-6 sm:p-7 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1 border border-emerald-500/30">
              <Archive className="w-3.5 h-3.5" />
              Office Claims Archive & Database Vault
            </span>
            <span className="text-xs text-slate-400">Restoration Records Retrieval</span>
          </div>
          <h2 className="text-2xl font-black text-white mt-1">
            Archived Historical Estimates Database
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Query, inspect, and retrieve past closed restoration claims, signed authorizations, and unit pricing records.
          </p>
        </div>

        <button
          onClick={onBackToActive}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-700 flex items-center gap-1.5 self-start md:self-auto"
        >
          <FolderOpen className="w-4 h-4 text-emerald-400" />
          <span>Active Estimating Studio</span>
        </button>
      </div>

      {/* Database Search & Multi-Criteria Filtering */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Main Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search database by Policyholder Name, Claim #, Address, Carrier, or Job ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
            />
          </div>

          {/* Carrier Filter */}
          <select
            value={selectedCarrier}
            onChange={(e) => setSelectedCarrier(e.target.value)}
            aria-label="Filter by Insurance Carrier"
            className="text-xs border border-slate-300 rounded-xl px-3 py-2.5 bg-slate-50 font-medium focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="all">All Carriers</option>
            <option value="State Farm">State Farm</option>
            <option value="Travelers">Travelers</option>
            <option value="Chubb">Chubb High Value</option>
            <option value="Liberty Mutual">Liberty Mutual</option>
            <option value="Allstate">Allstate</option>
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            aria-label="Filter by Loss Category"
            className="text-xs border border-slate-300 rounded-xl px-3 py-2.5 bg-slate-50 font-medium focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="all">All Loss Categories</option>
            <option value="Cat 1">Category 1 (Clean)</option>
            <option value="Cat 2">Category 2 (Grey)</option>
            <option value="Cat 3">Category 3 / Mold</option>
          </select>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Showing <strong className="text-slate-800">{filteredArchived.length}</strong> archived records from the database
          </span>
          <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            Immutable Audit Trail Enabled
          </span>
        </div>
      </div>

      {/* Archived Estimates Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredArchived.length === 0 ? (
          <div className="md:col-span-2 p-12 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
            No historical estimates found matching the query.
          </div>
        ) : (
          filteredArchived.map((job) => {
            const pricing = calculatePricingBreakdown(job);

            return (
              <div
                key={job.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-slate-500">
                        {job.jobId}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          job.category === 'Cat 3 (Black / Mold)'
                            ? 'bg-purple-100 text-purple-900'
                            : job.category === 'Cat 2 (Grey)'
                            ? 'bg-blue-100 text-blue-900'
                            : 'bg-emerald-100 text-emerald-900'
                        }`}
                      >
                        {job.category}
                      </span>
                    </div>

                    <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Closed: {job.archivedAt ? new Date(job.archivedAt).toLocaleDateString() : '2025'}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-slate-900">
                    {job.client.name}
                  </h3>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{job.client.address}</span>
                  </div>

                  <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Carrier:</span>
                      <span className="font-semibold text-slate-800">
                        {job.client.insuranceCarrier}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Claim #:</span>
                      <span className="font-mono text-slate-800">
                        {job.client.claimNumber}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Desk Adjuster:</span>
                      <span className="text-slate-700">
                        {job.client.adjusterName || 'Carrier Assigned'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Settled Contract Amount:</span>
                      <span className="font-mono font-black text-emerald-700">
                        {job.settledAmount
                          ? formatCurrency(job.settledAmount)
                          : formatCurrency(pricing.itemizedSubtotal)}
                      </span>
                    </div>
                  </div>

                  {/* Summary of Scoped Rooms */}
                  <div className="mt-3 text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-700">Scope Snapshot: </span>
                    {job.dimensions.map((d) => d.roomName).join(', ')} ({pricing.affectedSquareFeet} SF affected, {job.equipment.dryingDays} drying days).
                  </div>
                </div>

                {/* Vault Card Actions */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setInspectingJob(job)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span>Inspect Scope</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenDocSuite(job)}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1"
                      title="Download historical 4-document PDF"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-500" />
                      <span>Reprint PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onRestoreJob(job)}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
                      title="Clone or restore to active jobs for supplementary claim"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Clone / Restore</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Inspect Scope Modal */}
      {inspectingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Historical Scope Snapshot: {inspectingJob.jobId}
                </h3>
                <p className="text-xs text-slate-500">
                  {inspectingJob.client.name} • {inspectingJob.client.address}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectingJob(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2">
                  1. Room Dimensions & Flood Cuts:
                </h4>
                <div className="space-y-1.5">
                  {inspectingJob.dimensions.map((dim, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex justify-between">
                      <span className="font-semibold text-slate-900">{dim.roomName}</span>
                      <span className="font-mono text-slate-600">
                        {dim.lengthFt}&apos; × {dim.widthFt}&apos; × {dim.heightFt}&apos; ({dim.floodCutHeightInches ? `${dim.floodCutHeightInches}" Flood Cut` : 'No cut'})
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2">
                  2. Equipment Deployment History:
                </h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-[10px] text-slate-400">Air Movers</div>
                    <div className="font-bold font-mono text-sm text-slate-900">{inspectingJob.equipment.airMovers}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-[10px] text-slate-400">Dehumidifiers</div>
                    <div className="font-bold font-mono text-sm text-slate-900">{inspectingJob.equipment.dehumidifiers}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-[10px] text-slate-400">Drying Days</div>
                    <div className="font-bold font-mono text-sm text-slate-900">{inspectingJob.equipment.dryingDays}</div>
                  </div>
                </div>
              </div>

              {inspectingJob.technicianNotes && (
                <div>
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1">
                    3. Technician Field Notes:
                  </h4>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 font-mono text-[11px]">
                    {inspectingJob.technicianNotes}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onOpenDocSuite(inspectingJob);
                    setInspectingJob(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"
                >
                  Reprint 4-Doc Suite PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
