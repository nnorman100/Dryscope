'use client';

import React, { useState } from 'react';
import { RestorationJob, PsychrometricLog } from '@/lib/types';
import {
  calculatePsychrometrics,
  evaluateGrainDepression,
  calculateVaporPressureDifferential,
  recommendDryingSystem,
} from '@/lib/psychrometrics';
import {
  Gauge,
  ThermometerSnowflake,
  Wind,
  Droplet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Layers,
  BookmarkPlus,
  Trash2,
  HelpCircle,
  FileText,
  RefreshCw,
} from 'lucide-react';

interface PsychrometricCalculatorProps {
  job: RestorationJob;
  onUpdateJob: (updated: RestorationJob) => void;
  onOpenDocSuite?: () => void;
}

export function PsychrometricCalculator({
  job,
  onUpdateJob,
  onOpenDocSuite,
}: PsychrometricCalculatorProps) {
  // 4 Drying Zones State
  const [outsideTemp, setOutsideTemp] = useState<number | null>(null);
  const [outsideRH, setOutsideRH] = useState<number | null>(null);

  const [unaffectedTemp, setUnaffectedTemp] = useState<number | null>(null);
  const [unaffectedRH, setUnaffectedRH] = useState<number | null>(null);

  const [affectedTemp, setAffectedTemp] = useState<number | null>(null);
  const [affectedRH, setAffectedRH] = useState<number | null>(null);

  const [outletTemp, setOutletTemp] = useState<number | null>(null);
  const [outletRH, setOutletRH] = useState<number | null>(null);

  const outsideEntered = outsideTemp !== null && outsideRH !== null;
  const unaffectedEntered = unaffectedTemp !== null && unaffectedRH !== null;
  const affectedEntered = affectedTemp !== null && affectedRH !== null;
  const outletEntered = outletTemp !== null && outletRH !== null;
  const allReadingsEntered = outsideEntered && unaffectedEntered && affectedEntered && outletEntered;

  // Active Day selector for logging
  const currentLoggedCount = job.psychrometricLogs?.length || 0;
  const [activeDayNumber, setActiveDayNumber] = useState<number>(
    currentLoggedCount > 0 ? currentLoggedCount + 1 : 1
  );
  const [logSuccessMessage, setLogSuccessMessage] = useState<string | null>(null);

  // Perform Calculations
  const outsidePsychro = calculatePsychrometrics(outsideTemp ?? 70, outsideRH ?? 55);
  const unaffectedPsychro = calculatePsychrometrics(unaffectedTemp ?? 72, unaffectedRH ?? 50);
  const affectedPsychro = calculatePsychrometrics(affectedTemp ?? 75, affectedRH ?? 60);
  const outletPsychro = calculatePsychrometrics(outletTemp ?? 90, outletRH ?? 40);

  // Grain Depression (Inlet GPP - Outlet GPP)
  // In standard practice, dehu inlet air is drawn from the affected chamber
  const grainDepression = evaluateGrainDepression(
    affectedPsychro.gpp,
    outletPsychro.gpp
  );

  // Vapor Pressure Differential driving evaporation
  const vpDifferential = calculateVaporPressureDifferential(
    affectedPsychro.vaporPressureInHg,
    outletPsychro.vaporPressureInHg
  );

  // System recommendation (Open vs. Closed)
  const systemRec = recommendDryingSystem(
    outsidePsychro.gpp,
    affectedPsychro.gpp
  );

  // Save current readings to job.psychrometricLogs
  const handleSaveToJobLogs = () => {
    if (!allReadingsEntered) return;
    const existingLogs = job.psychrometricLogs || [];
    const newLogId = `psy-day-${activeDayNumber}-${existingLogs.length + 1}`;
    const now = new Date();
    const newLogEntry: PsychrometricLog = {
      id: newLogId,
      dayNumber: activeDayNumber,
      date: now.toLocaleDateString('en-CA'),
      outsideTempF: outsidePsychro.tempF,
      outsideRH: outsidePsychro.rh,
      unaffectedTempF: unaffectedPsychro.tempF,
      unaffectedRH: unaffectedPsychro.rh,
      affectedTempF: affectedPsychro.tempF,
      affectedRH: affectedPsychro.rh,
      affectedGPP: affectedPsychro.gpp,
      dehuInletGPP: affectedPsychro.gpp,
      dehuOutletGPP: outletPsychro.gpp,
      grainDepressionDeltaGPP: grainDepression.deltaGPP,
    };

    // Replace if same day already exists, or append
    const filtered = existingLogs.filter((l) => l.dayNumber !== activeDayNumber);
    const updatedLogs = [...filtered, newLogEntry].sort((a, b) => a.dayNumber - b.dayNumber);

    const updatedJob: RestorationJob = {
      ...job,
      psychrometricLogs: updatedLogs,
      updatedAt: now.toISOString(),
    };

    onUpdateJob(updatedJob);
    setActiveDayNumber(activeDayNumber + 1);
    setLogSuccessMessage(
      `✓ Day ${activeDayNumber} Psychrometric Reading recorded! GPP: ${affectedPsychro.gpp} in / ${outletPsychro.gpp} out (${grainDepression.deltaGPP > 0 ? '+' : ''}${grainDepression.deltaGPP} GPP depression). Synced with Document 4.`
    );
    setTimeout(() => setLogSuccessMessage(null), 5000);
  };

  // Delete an existing log entry
  const handleDeleteLog = (logId: string) => {
    const updatedLogs = (job.psychrometricLogs || []).filter((l) => l.id !== logId);
    onUpdateJob({
      ...job,
      psychrometricLogs: updatedLogs,
      updatedAt: new Date().toISOString(),
    });
  };

  // Maximum GPP for visual comparison bar scaling
  const maxGpp = Math.max(120, affectedPsychro.gpp + 20, outsidePsychro.gpp + 10);

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-[#0B192C] via-slate-900 to-[#102A45] rounded-2xl p-5 sm:p-6 text-white border border-slate-800 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-400 text-slate-950 text-xs font-black uppercase tracking-wider flex items-center gap-1">
                <ThermometerSnowflake className="w-3.5 h-3.5" />
                IICRC S500 Standards Compliant
              </span>
              <span className="text-xs text-slate-400 font-mono">
                ASTM E96 / Psychrometric Engine
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black mt-1 text-white flex items-center gap-2">
              <span>Psychrometric & GPP Grain Depression Calculator</span>
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Track atmospheric moisture load (GPP), dew point margins, and dehumidifier grain depression across ambient air and drying chambers to document structural evaporation efficiency for insurance compliance.
            </p>
          </div>

          {onOpenDocSuite && (
            <button
              type="button"
              onClick={onOpenDocSuite}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-700 flex items-center gap-1.5 self-start md:self-auto shrink-0 shadow-md"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>View Document 4 Log</span>
            </button>
          )}
        </div>

      </div>

      {allReadingsEntered ? (
        <>
      {/* Hero Metric: Dehumidifier Grain Depression Banner */}
      <div
        className={`rounded-2xl p-5 sm:p-6 border shadow-lg transition-all ${
          grainDepression.status === 'optimal'
            ? 'bg-gradient-to-br from-emerald-950/40 via-emerald-900/20 to-slate-900 border-emerald-500/40'
            : grainDepression.status === 'acceptable'
            ? 'bg-gradient-to-br from-amber-950/40 via-amber-900/20 to-slate-900 border-amber-500/40'
            : 'bg-gradient-to-br from-red-950/40 via-red-900/20 to-slate-900 border-red-500/40'
        }`}
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Main Number Readout */}
          <div className="md:col-span-5 space-y-2">
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                  grainDepression.status === 'optimal'
                    ? 'bg-emerald-400 text-slate-950'
                    : grainDepression.status === 'acceptable'
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-red-400 text-slate-950'
                }`}
              >
                {grainDepression.label}
              </span>
              <span className="text-xs text-slate-400">IICRC S500 §12 Benchmark</span>
            </div>

            <div className="flex items-baseline gap-3">
              <span
                className={`text-4xl sm:text-5xl font-black font-mono tracking-tight ${
                  grainDepression.status === 'optimal'
                    ? 'text-emerald-400'
                    : grainDepression.status === 'acceptable'
                    ? 'text-amber-400'
                    : 'text-red-400'
                }`}
              >
                {grainDepression.deltaGPP > 0 ? `+${grainDepression.deltaGPP}` : grainDepression.deltaGPP}{' '}
                <span className="text-xl font-bold font-sans text-slate-300">GPP</span>
              </span>
              <div className="text-xs text-slate-300 font-mono">
                <div>Intake: {grainDepression.inletGPP} GPP</div>
                <div>Exhaust: {grainDepression.outletGPP} GPP</div>
              </div>
            </div>

            {/* Grain Depression Progress Gauge */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span>0 GPP</span>
                <span className="text-amber-400 font-bold">12 GPP (Min Standard)</span>
                <span className="text-emerald-400 font-bold">20+ GPP (Optimal)</span>
              </div>
              <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden relative border border-slate-700">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    grainDepression.status === 'optimal'
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                      : grainDepression.status === 'acceptable'
                      ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                      : 'bg-gradient-to-r from-red-600 to-red-500'
                  }`}
                  style={{
                    width: `${Math.min(100, Math.max(5, (grainDepression.deltaGPP / 35) * 100))}%`,
                  }}
                />
                {/* 12 GPP Marker Line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-amber-300 shadow-sm"
                  style={{ left: `${(12 / 35) * 100}%` }}
                  title="IICRC 12 GPP Minimum Acceptable Threshold"
                />
              </div>
            </div>
          </div>

          {/* IICRC S500 Technical Directive Text */}
          <div className="md:col-span-7 bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 text-xs space-y-3">
            <div className="flex items-start gap-2.5">
              {grainDepression.status === 'optimal' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : grainDepression.status === 'acceptable' ? (
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="font-bold text-slate-200">
                  {grainDepression.status === 'optimal'
                    ? 'Active Deep Desorption (Peak Efficiency)'
                    : grainDepression.status === 'acceptable'
                    ? 'Standard Operational Dehumidification'
                    : 'Performance Anomaly Warning'}
                </div>
                <p className="text-slate-300 leading-relaxed">
                  {grainDepression.recommendation}
                </p>
              </div>
            </div>

            {/* Quick S500 Checks */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[11px]">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-800">
                <span className="text-slate-400">Vapor Pressure Drive:</span>
                <span className="font-mono font-bold text-emerald-400">
                  +{vpDifferential.deltaVpInHg} inHg ({vpDifferential.evaporativePotential})
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-800">
                <span className="text-slate-400">Drying System:</span>
                <span className="font-semibold text-emerald-400">
                  {systemRec.system.split(' ')[0]}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
        </>
      ) : (
        <div className="rounded-2xl p-5 border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-600">
          Enter temperature and relative humidity for all four zones to calculate grain depression.
        </div>
      )}

      {/* 4 Psychrometric Drying Zones Input & Output Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Zone 1: Outside Air / Ambient Reference */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Outside Air
                  </h4>
                  <p className="text-[10px] text-slate-500">Outdoor Ambient Reference</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 font-mono text-[11px] font-bold">
                {outsideEntered ? `${outsidePsychro.gpp} GPP` : '—'}
              </span>
            </div>

            {/* Inputs */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 font-medium">Temperature:</span>
                  <span className="font-mono font-bold text-slate-900">{outsideTemp === null ? '—' : `${outsideTemp}°F`}</span>
                </div>
                <input
                  type="range"
                  min={30}
                  max={110}
                  value={outsideTemp ?? 70}
                  onChange={(e) => setOutsideTemp(Number(e.target.value))}
                  className="w-full accent-sky-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 font-medium">Relative Humidity:</span>
                  <span className="font-mono font-bold text-slate-900">{outsideRH === null ? '—' : `${outsideRH}%`}</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={outsideRH ?? 55}
                  onChange={(e) => setOutsideRH(Number(e.target.value))}
                  className="w-full accent-sky-600 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Derived Values Box */}
          {outsideEntered && (
          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] font-mono bg-slate-50 p-2.5 rounded-xl">
            <div>
              <span className="text-slate-400 block text-[10px]">Dew Point:</span>
              <span className="font-bold text-slate-800">{outsidePsychro.dewPointF}°F</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Vapor Press:</span>
              <span className="font-bold text-slate-800">{outsidePsychro.vaporPressureInHg} inHg</span>
            </div>
            <div className="col-span-2 text-[10px] text-slate-500 font-sans">
              Enthalpy: {outsidePsychro.enthalpyBtuPerLb} BTU/lb
            </div>
          </div>
          )}
        </div>

        {/* Zone 2: Unaffected Room / Control Standard */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Unaffected Room
                  </h4>
                  <p className="text-[10px] text-slate-500">Indoor Control Baseline</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px] font-bold">
                {unaffectedEntered ? `${unaffectedPsychro.gpp} GPP` : '—'}
              </span>
            </div>

            {/* Inputs */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 font-medium">Temperature:</span>
                  <span className="font-mono font-bold text-slate-900">{unaffectedTemp === null ? '—' : `${unaffectedTemp}°F`}</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={95}
                  value={unaffectedTemp ?? 72}
                  onChange={(e) => setUnaffectedTemp(Number(e.target.value))}
                  className="w-full accent-slate-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 font-medium">Relative Humidity:</span>
                  <span className="font-mono font-bold text-slate-900">{unaffectedRH === null ? '—' : `${unaffectedRH}%`}</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={90}
                  value={unaffectedRH ?? 50}
                  onChange={(e) => setUnaffectedRH(Number(e.target.value))}
                  className="w-full accent-slate-600 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Derived Values Box */}
          {unaffectedEntered && (
          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] font-mono bg-slate-50 p-2.5 rounded-xl">
            <div>
              <span className="text-slate-400 block text-[10px]">Dew Point:</span>
              <span className="font-bold text-slate-800">{unaffectedPsychro.dewPointF}°F</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Vapor Press:</span>
              <span className="font-bold text-slate-800">{unaffectedPsychro.vaporPressureInHg} inHg</span>
            </div>
            <div className="col-span-2 text-[10px] text-slate-500 font-sans">
              Dry Standard Goal: &lt;{unaffectedPsychro.gpp} GPP
            </div>
          </div>
          )}
        </div>

        {/* Zone 3: Affected Drying Chamber (Dehu Intake) */}
        <div className="bg-white rounded-2xl border-2 border-amber-400/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between relative">
          <span className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider">
            Wet Chamber Intake
          </span>
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-xs">
                  3
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Affected Chamber
                  </h4>
                  <p className="text-[10px] text-slate-500">Dehumidifier Inlet Air</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-mono text-[11px] font-black">
                {affectedEntered ? `${affectedPsychro.gpp} GPP` : '—'}
              </span>
            </div>

            {/* Inputs */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 font-medium">Temperature:</span>
                  <span className="font-mono font-bold text-slate-900">{affectedTemp === null ? '—' : `${affectedTemp}°F`}</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={100}
                  value={affectedTemp ?? 75}
                  onChange={(e) => setAffectedTemp(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 font-medium">Relative Humidity:</span>
                  <span className="font-mono font-bold text-slate-900">{affectedRH === null ? '—' : `${affectedRH}%`}</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={100}
                  value={affectedRH ?? 60}
                  onChange={(e) => setAffectedRH(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Derived Values Box */}
          {affectedEntered && unaffectedEntered && (
          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] font-mono bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/50">
            <div>
              <span className="text-amber-800 block text-[10px]">Dew Point:</span>
              <span className="font-bold text-amber-950">{affectedPsychro.dewPointF}°F</span>
            </div>
            <div>
              <span className="text-amber-800 block text-[10px]">Vapor Press:</span>
              <span className="font-bold text-amber-950">{affectedPsychro.vaporPressureInHg} inHg</span>
            </div>
            <div className="col-span-2 text-[10px] text-amber-900 font-sans font-medium">
              +{affectedPsychro.gpp - unaffectedPsychro.gpp} GPP above dry standard
            </div>
          </div>
          )}
        </div>

        {/* Zone 4: Dehumidifier Exhaust Air (Outlet) */}
        <div className="bg-white rounded-2xl border-2 border-emerald-500/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between relative">
          <span className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] uppercase tracking-wider">
            Dehu Outlet / Exhaust
          </span>
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold text-xs">
                  4
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Dehu Exhaust
                  </h4>
                  <p className="text-[10px] text-slate-500">Processed Outflow Air</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-mono text-[11px] font-black">
                {outletEntered ? `${outletPsychro.gpp} GPP` : '—'}
              </span>
            </div>

            {/* Inputs */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 font-medium">Temperature (Warmer):</span>
                  <span className="font-mono font-bold text-slate-900">{outletTemp === null ? '—' : `${outletTemp}°F`}</span>
                </div>
                <input
                  type="range"
                  min={65}
                  max={115}
                  value={outletTemp ?? 90}
                  onChange={(e) => setOutletTemp(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 font-medium">RH (Target 20-40%):</span>
                  <span className="font-mono font-bold text-slate-900">{outletRH === null ? '—' : `${outletRH}%`}</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={70}
                  value={outletRH ?? 40}
                  onChange={(e) => setOutletRH(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Derived Values Box */}
          {outletEntered && affectedEntered && (
          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] font-mono bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200/50">
            <div>
              <span className="text-emerald-800 block text-[10px]">Dew Point:</span>
              <span className="font-bold text-emerald-950">{outletPsychro.dewPointF}°F</span>
            </div>
            <div>
              <span className="text-emerald-800 block text-[10px]">Vapor Press:</span>
              <span className="font-bold text-emerald-950">{outletPsychro.vaporPressureInHg} inHg</span>
            </div>
            <div className="col-span-2 text-[10px] text-emerald-900 font-sans font-medium">
              Δ {grainDepression.deltaGPP} GPP Grain Depression
            </div>
          </div>
          )}
        </div>
      </div>

      {allReadingsEntered && (
        <>
      {/* Visual Comparative GPP Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>Comparative Drying Zone Moisture Gradient (GPP)</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Visualizing atmospheric water grains per pound across all 4 psychrometric inspection points.
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            Target Standard: ≤ {unaffectedPsychro.gpp} GPP
          </span>
        </div>

        <div className="space-y-4">
          {/* 1. Outside */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-slate-700">Outside Air (Ambient Reference)</span>
              <span className="font-mono font-bold text-sky-700">{outsidePsychro.gpp} GPP</span>
            </div>
            <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-500 rounded-full transition-all duration-300"
                style={{ width: `${(outsidePsychro.gpp / maxGpp) * 100}%` }}
              />
            </div>
          </div>

          {/* 2. Unaffected */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-slate-700">Unaffected Control Room (Dry Baseline Target)</span>
              <span className="font-mono font-bold text-slate-700">{unaffectedPsychro.gpp} GPP</span>
            </div>
            <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden">
              <div
                className="h-full bg-slate-500 rounded-full transition-all duration-300"
                style={{ width: `${(unaffectedPsychro.gpp / maxGpp) * 100}%` }}
              />
            </div>
          </div>

          {/* 3. Affected Chamber */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Affected Drying Chamber (Intake Moisture Load)
              </span>
              <span className="font-mono font-black text-amber-700">{affectedPsychro.gpp} GPP</span>
            </div>
            <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-300"
                style={{ width: `${(affectedPsychro.gpp / maxGpp) * 100}%` }}
              />
            </div>
          </div>

          {/* 4. Dehu Exhaust */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Dehumidifier Exhaust (Processed Dry Air)
              </span>
              <span className="font-mono font-black text-emerald-700">
                {outletPsychro.gpp} GPP (Grain Depression: +{grainDepression.deltaGPP} GPP)
              </span>
            </div>
            <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${(outletPsychro.gpp / maxGpp) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
        </>
      )}

      {/* Save Today's Reading & Daily Psychrometric Drying Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BookmarkPlus className="w-4 h-4 text-emerald-600" />
              <span>IICRC S500 Daily Atmospheric Drying Record</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Saves daily grain depression to the official project log for insurance carrier justification.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
              <span className="text-slate-500">Log As:</span>
              <select
                value={activeDayNumber}
                onChange={(e) => setActiveDayNumber(Number(e.target.value))}
                className="bg-transparent font-bold text-slate-900 font-mono focus:outline-hidden cursor-pointer"
              >
                {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                  <option key={day} value={day}>
                    Day {day}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleSaveToJobLogs}
              disabled={!allReadingsEntered}
              title={allReadingsEntered ? undefined : 'Enter all eight readings first'}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              <span>Record Day {activeDayNumber} Log</span>
            </button>
          </div>
        </div>

        {logSuccessMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{logSuccessMessage}</span>
          </div>
        )}

        {/* Existing Logs Table */}
        {job.psychrometricLogs && job.psychrometricLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-100 uppercase font-bold text-[10px] text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="p-3">Day / Date</th>
                  <th className="p-3 text-center">Outside Air</th>
                  <th className="p-3 text-center">Control Baseline</th>
                  <th className="p-3 text-center">Affected Chamber</th>
                  <th className="p-3 text-center">Dehu Outlet</th>
                  <th className="p-3 text-center">Grain Depression (ΔGPP)</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {job.psychrometricLogs.map((log) => {
                  const isOptimal = log.grainDepressionDeltaGPP >= 20;
                  const isAcceptable = log.grainDepressionDeltaGPP >= 12;

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-bold font-sans text-slate-900">
                        Day {log.dayNumber}{' '}
                        <span className="text-[10px] font-normal text-slate-500 block">
                          {log.date}
                        </span>
                      </td>
                      <td className="p-3 text-center text-slate-600">
                        {log.outsideTempF}°F / {log.outsideRH}%
                      </td>
                      <td className="p-3 text-center text-slate-600">
                        {log.unaffectedTempF}°F / {log.unaffectedRH}%
                      </td>
                      <td className="p-3 text-center font-bold text-amber-700">
                        {log.affectedTempF}°F / {log.affectedRH}%{' '}
                        <span className="block text-[10px] font-mono">({log.affectedGPP} GPP)</span>
                      </td>
                      <td className="p-3 text-center font-bold text-emerald-700">
                        {log.dehuOutletGPP} GPP
                      </td>
                      <td className="p-3 text-center font-black">
                        <span
                          className={`px-2 py-0.5 rounded ${
                            isOptimal
                              ? 'bg-emerald-100 text-emerald-900'
                              : isAcceptable
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-red-100 text-red-900'
                          }`}
                        >
                          +{log.grainDepressionDeltaGPP} GPP
                        </span>
                      </td>
                      <td className="p-3 text-center font-sans">
                        {isOptimal ? (
                          <span className="text-emerald-700 font-bold text-[10px]">Optimal</span>
                        ) : isAcceptable ? (
                          <span className="text-amber-700 font-bold text-[10px]">Acceptable</span>
                        ) : (
                          <span className="text-red-700 font-bold text-[10px]">Low Delta</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteLog(log.id)}
                          className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Remove Log Entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 mx-auto flex items-center justify-center mb-2">
              <ThermometerSnowflake className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-slate-800">
              No Psychrometric Logs Saved Yet
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Adjust the atmospheric sliders above and click &quot;Record Day 1 Log&quot; to establish the baseline drying curve.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
