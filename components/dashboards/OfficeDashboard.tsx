'use client';

import React from 'react';
import { RestorationJob } from '@/lib/types';
import { calculatePricingBreakdown, formatCurrency, RATES } from '@/lib/pricing';
import {
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Printer,
  Sparkles,
  Layers,
  Send,
  AlertCircle,
  TrendingUp,
  FileCheck,
  UserCheck,
  DollarSign,
  Briefcase,
  Archive,
} from 'lucide-react';

interface OfficeDashboardProps {
  job: RestorationJob;
  onUpdateJob: (updated: RestorationJob) => void;
  onOpenDocSuite: () => void;
  onNavigateToPortal: () => void;
  onOpenArchive?: () => void;
}

export function OfficeDashboard({
  job,
  onUpdateJob,
  onOpenDocSuite,
  onNavigateToPortal,
  onOpenArchive,
}: OfficeDashboardProps) {
  const pricing = calculatePricingBreakdown(job);

  const handleStatusChange = (newStatus: RestorationJob['status']) => {
    onUpdateJob({
      ...job,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleCategoryChange = (category: RestorationJob['category']) => {
    onUpdateJob({
      ...job,
      category,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleFinishChange = (finishType: RestorationJob['finishType']) => {
    onUpdateJob({
      ...job,
      finishType,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5" />
              Office Claims Coordinator & Estimator Studio
            </span>
            <span className="text-xs text-slate-500">Job #{job.jobId}</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 mt-1">
            Scope Review & Cell-Traced Estimating Matrix
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Insured: <span className="font-semibold text-slate-900">{job.client.name}</span> • Carrier: {job.client.insuranceCarrier} • Claim: {job.client.claimNumber}
          </p>
        </div>

        {/* Status Pipeline & Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {(
              [
                'Draft',
                'Ready for Review',
                'Client Authorized',
                'In Progress',
                'Completed',
              ] as RestorationJob['status'][]
            ).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => handleStatusChange(st)}
                className={`px-2.5 py-1.5 rounded-lg transition-all ${
                  job.status === st
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {onOpenArchive && (
            <button
              onClick={onOpenArchive}
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-all border border-slate-200 flex items-center gap-1.5"
            >
              <Archive className="w-3.5 h-3.5 text-emerald-600" />
              <span>Archived Vault</span>
            </button>
          )}

          <button
            onClick={onOpenDocSuite}
            className="px-4 py-2.5 rounded-xl bg-[#0B192C] hover:bg-slate-900 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-blue-950/20"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-400" />
            <span>DryScope 4-Doc Suite</span>
          </button>
        </div>
      </div>

      {/* Live Spreadsheet Estimator Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Top Controls */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 font-black flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">
                  Residential Estimate Tool (Master Workbook Math)
                </h3>
                <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded">
                  Oct 2026 Audit
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Formula verified: Cells M19, M29, M35, M48, M54, M70, D27:F33, D18, E17:H19
              </p>
            </div>
          </div>

          {/* Quick Matrix Multipliers */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Dropdown */}
            <select
              value={job.category}
              onChange={(e) => handleCategoryChange(e.target.value as any)}
              aria-label="Loss Category Selection"
              className="bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-1.5 font-semibold focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="Cat 1 (Clean)">Cat 1 (Clean)</option>
              <option value="Cat 2 (Grey)">Cat 2 (Grey)</option>
              <option value="Cat 3 (Black / Mold)">Cat 3 (Black / Mold)</option>
            </select>

            {/* Finish Type */}
            <select
              value={job.finishType}
              onChange={(e) => handleFinishChange(e.target.value as any)}
              aria-label="Finish Type Selection"
              className="bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-1.5 font-semibold focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="Finished">Finished</option>
              <option value="Unfinished">Unfinished</option>
            </select>

            {/* Cabinetry Demo 2x Toggle */}
            <label className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-xs cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={job.cabinetryMultiplier}
                onChange={(e) =>
                  onUpdateJob({
                    ...job,
                    cabinetryMultiplier: e.target.checked,
                    updatedAt: new Date().toISOString(),
                  })
                }
                className="rounded text-emerald-500 focus:ring-emerald-400"
              />
              <span>Cabinets x2 (A10)</span>
            </label>

            {/* After Hours $200 Toggle */}
            <label className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-xs cursor-pointer text-amber-300">
              <input
                type="checkbox"
                checked={job.afterHours}
                onChange={(e) =>
                  onUpdateJob({
                    ...job,
                    afterHours: e.target.checked,
                    updatedAt: new Date().toISOString(),
                  })
                }
                className="rounded text-amber-500 focus:ring-amber-400"
              />
              <span>After-Hours (+$200)</span>
            </label>
          </div>
        </div>

        {/* Live Calculation Output Bar */}
        <div className="bg-emerald-50/80 border-b border-emerald-200 p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Itemized Base Subtotal
            </span>
            <div className="text-2xl font-black text-slate-900 font-mono mt-0.5">
              {formatCurrency(pricing.itemizedSubtotal)}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Strict audit baseline before proposal allowance
            </p>
          </div>

          <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-2xs sm:col-span-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                Client Low–High Proposal Range (Cells C22:D22)
              </span>
              <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                {pricing.multiplierUsed}x Range Multiplier
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono mt-0.5">
              {formatCurrency(pricing.lowEstimateBound)} – {formatCurrency(pricing.highEstimateBound)}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Displayed on Homeowner Emergency Work Authorization agreement
            </p>
          </div>
        </div>

        {/* Itemized Line-Item Spreadsheet Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Line Item Description</th>
                <th className="py-3 px-4">Workbook Cell</th>
                <th className="py-3 px-4 text-right">Quantity</th>
                <th className="py-3 px-4 text-right">Unit Rate</th>
                <th className="py-3 px-4 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {/* 1. Demolition */}
              <tr className="bg-slate-50/50">
                <td className="py-2.5 px-4 font-bold text-slate-900">
                  {job.category} ({job.finishType}) Demolition & Extraction
                </td>
                <td className="py-2.5 px-4 font-mono text-slate-500">M19 / M29 / M70</td>
                <td className="py-2.5 px-4 text-right font-mono">
                  {pricing.affectedSquareFeet} SF
                </td>
                <td className="py-2.5 px-4 text-right font-mono">
                  ${pricing.demolitionRatePerSqFt.toFixed(2)} / SF
                </td>
                <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                  {formatCurrency(pricing.demolitionTotal)}
                </td>
              </tr>

              {/* 2. Baseline Charges */}
              <tr>
                <td className="py-2.5 px-4 pl-6 text-slate-700">
                  • Emergency Call & Initial Dispatch
                </td>
                <td className="py-2.5 px-4 font-mono text-slate-400">D27</td>
                <td className="py-2.5 px-4 text-right font-mono">1.0 Call</td>
                <td className="py-2.5 px-4 text-right font-mono">$133.95</td>
                <td className="py-2.5 px-4 text-right font-mono">$133.95</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 pl-6 text-slate-700">
                  • Psychrometric Monitoring Allowance (13.25 hrs)
                </td>
                <td className="py-2.5 px-4 font-mono text-slate-400">D28:F28</td>
                <td className="py-2.5 px-4 text-right font-mono">13.25 Hrs</td>
                <td className="py-2.5 px-4 text-right font-mono">$47.46 / hr</td>
                <td className="py-2.5 px-4 text-right font-mono">$628.85</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 pl-6 text-slate-700">
                  • Debris Haul & Landfill Dump Charge
                </td>
                <td className="py-2.5 px-4 font-mono text-slate-400">D32</td>
                <td className="py-2.5 px-4 text-right font-mono">1.0 Load</td>
                <td className="py-2.5 px-4 text-right font-mono">$159.53</td>
                <td className="py-2.5 px-4 text-right font-mono">$159.53</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 pl-6 text-slate-700">
                  • HEPA 500 Media Air Filtration Replacement
                </td>
                <td className="py-2.5 px-4 font-mono text-slate-400">D33</td>
                <td className="py-2.5 px-4 text-right font-mono">1.0 Filter</td>
                <td className="py-2.5 px-4 text-right font-mono">$183.12</td>
                <td className="py-2.5 px-4 text-right font-mono">$183.12</td>
              </tr>
              <tr className="bg-slate-50 font-semibold text-slate-900">
                <td className="py-2 px-4 pl-6">Baseline Standard Items Subtotal</td>
                <td className="py-2 px-4 font-mono text-slate-500">D27:F33</td>
                <td className="py-2 px-4 text-right font-mono">4 Items</td>
                <td className="py-2 px-4 text-right font-mono">—</td>
                <td className="py-2 px-4 text-right font-mono font-bold">
                  {formatCurrency(pricing.baselineCharges.totalBaseline)}
                </td>
              </tr>

              {/* 3. Equipment Charges */}
              <tr>
                <td className="py-2.5 px-4">
                  Centrifugal Air Movers (Axial/Vortex Fans)
                </td>
                <td className="py-2.5 px-4 font-mono text-slate-400">E37:E39</td>
                <td className="py-2.5 px-4 text-right font-mono">
                  {job.equipment.airMovers} units × {job.equipment.dryingDays} days
                </td>
                <td className="py-2.5 px-4 text-right font-mono">
                  ${RATES.AIR_MOVER_PER_DAY.toFixed(2)} / day
                </td>
                <td className="py-2.5 px-4 text-right font-mono font-bold">
                  {formatCurrency(pricing.equipmentCharges.airMoversTotal)}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-4">
                  Low Grain Refrigerant (LGR) Dehumidifiers
                </td>
                <td className="py-2.5 px-4 font-mono text-slate-400">E41:E43</td>
                <td className="py-2.5 px-4 text-right font-mono">
                  {job.equipment.dehumidifiers} units × {job.equipment.dryingDays} days
                </td>
                <td className="py-2.5 px-4 text-right font-mono">
                  ${RATES.DEHUMIDIFIER_PER_DAY.toFixed(2)} / day
                </td>
                <td className="py-2.5 px-4 text-right font-mono font-bold">
                  {formatCurrency(pricing.equipmentCharges.dehumidifiersTotal)}
                </td>
              </tr>
              {job.equipment.airScrubbers > 0 && (
                <tr>
                  <td className="py-2.5 px-4">HEPA Air Scrubbers / Negative Air</td>
                  <td className="py-2.5 px-4 font-mono text-slate-400">E44</td>
                  <td className="py-2.5 px-4 text-right font-mono">
                    {job.equipment.airScrubbers} units × {job.equipment.dryingDays} days
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono">
                    ${RATES.AIR_SCRUBBER_PER_DAY.toFixed(2)} / day
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold">
                    {formatCurrency(pricing.equipmentCharges.airScrubbersTotal)}
                  </td>
                </tr>
              )}

              {/* 4. Cell D29 Labor Hours */}
              <tr className="bg-slate-50/50">
                <td className="py-2.5 px-4 font-bold text-slate-900">
                  Direct Field Mitigation Labor (Cell D29 Formula)
                </td>
                <td className="py-2.5 px-4 font-mono text-slate-500">D29 / E24</td>
                <td className="py-2.5 px-4 text-right font-mono">
                  {pricing.laborCharges.totalHoursD29} Total Hours
                </td>
                <td className="py-2.5 px-4 text-right font-mono">
                  ${pricing.laborCharges.ratePerHour.toFixed(2)} / hr
                </td>
                <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                  {formatCurrency(pricing.laborCharges.totalLabor)}
                </td>
              </tr>

              {/* 5. After Hours Fee if active */}
              {job.afterHours && (
                <tr className="bg-amber-50/60 text-amber-900">
                  <td className="py-2.5 px-4 font-bold">
                    Emergency After-Hours Job Surcharge
                  </td>
                  <td className="py-2.5 px-4 font-mono">D18</td>
                  <td className="py-2.5 px-4 text-right font-mono">1.0 Surcharge</td>
                  <td className="py-2.5 px-4 text-right font-mono">$200.00</td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold">
                    $200.00
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
