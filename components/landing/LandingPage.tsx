'use client';

import React, { useState } from 'react';
import {
  Mic,
  Eye,
  FileSpreadsheet,
  QrCode,
  ShieldCheck,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Calculator,
  Building2,
  Wrench,
  User,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Cpu,
  Layers,
  FileText,
  Clock,
  PhoneCall,
  Archive,
  ThermometerSnowflake,
} from 'lucide-react';
import { formatCurrency, RATES } from '@/lib/pricing';

interface LandingPageProps {
  onNavigate: (view: string) => void;
  onOpenLogin: () => void;
}

export function LandingPage({ onNavigate, onOpenLogin }: LandingPageProps) {
  // Interactive Calculator State on Landing Page
  const [calcSqFt, setCalcSqFt] = useState<number>(145);
  const [calcCategory, setCalcCategory] = useState<'Cat 1' | 'Cat 2' | 'Cat 3'>('Cat 2');
  const [calcFinished, setCalcFinished] = useState<boolean>(true);
  const [calcAfterHours, setCalcAfterHours] = useState<boolean>(true);
  const [calcFans, setCalcFans] = useState<number>(3);
  const [calcDehus, setCalcDehus] = useState<number>(1);
  const [calcDays, setCalcDays] = useState<number>(3);

  // Calculate live preview math
  const getRate = () => {
    if (calcCategory === 'Cat 1') return calcFinished ? RATES.CAT1_FINISHED : RATES.CAT1_UNFINISHED;
    if (calcCategory === 'Cat 2') return calcFinished ? RATES.CAT2_FINISHED : RATES.CAT2_UNFINISHED;
    return calcFinished ? RATES.CAT3_FINISHED : RATES.CAT3_UNFINISHED;
  };

  const demoRate = getRate();
  const demoTotal = calcSqFt * demoRate;
  const baseline = 1180.20;
  const equipTotal = (calcFans * RATES.AIR_MOVER_PER_DAY + calcDehus * RATES.DEHUMIDIFIER_PER_DAY) * calcDays;
  const laborHours = 4 + 1 * calcDays;
  const laborTotal = laborHours * RATES.LABOR_RATE_PER_HOUR;
  const afterHoursFee = calcAfterHours ? 200 : 0;
  const itemizedSubtotal = demoTotal + baseline + equipTotal + laborTotal + afterHoursFee;

  const multiplier = calcSqFt <= 1000 ? 1.5 : 1.2;
  const lowBound = calcAfterHours
    ? baseline + equipTotal + afterHoursFee + (demoTotal + laborTotal) * 1.2
    : baseline + equipTotal + (demoTotal + laborTotal);
  const highBound = calcAfterHours
    ? baseline + equipTotal + afterHoursFee + (demoTotal + laborTotal) * 1.2 * multiplier
    : baseline + equipTotal + (demoTotal + laborTotal) * multiplier;

  return (
    <div className="w-full bg-white text-slate-900">
      {/* 1. Hero Section with Semantic H1 and Trust Signals */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0B192C] via-[#10243E] to-[#0B192C] text-white pt-16 pb-24 sm:pt-20 sm:pb-32">
        {/* Background Ambient Glows */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            {/* Standard Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-6 animate-pulse">
              <Sparkles className="w-3.5 h-3.5" />
              <span>IICRC S500 & S520 Certified Scoping Intelligence</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
              Instant Field Scoping & Defensible Claims for{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">
                Disaster Restoration
              </span>
            </h1>

            <p className="mt-6 text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto">
              DryScope enables sales technicians and estimators to dictate damage on site,
              capture moisture and thermal readings with multimodal OCR vision, and instantly produce
              audit-proof insurance scopes and client work authorizations.
            </p>

            {/* Role Action Launch Bar */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              <button
                onClick={() => onNavigate('tech_pipeline')}
                className="px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm transition-all transform hover:-translate-y-0.5 shadow-lg shadow-amber-500/25 flex items-center gap-2"
              >
                <TrendingUp className="w-4 h-4 text-slate-950" />
                <span>Sales Estimates Pipeline</span>
              </button>

              <button
                onClick={() => onNavigate('tech')}
                className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm transition-all transform hover:-translate-y-0.5 shadow-lg shadow-emerald-500/25 flex items-center gap-2"
              >
                <Wrench className="w-4 h-4 text-slate-950" />
                <span>Field Scoping Tool</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => onNavigate('office')}
                className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs sm:text-sm transition-all border border-slate-700 flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Office Matrix</span>
              </button>

              <button
                onClick={() => onNavigate('office_archive')}
                className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs sm:text-sm transition-all border border-slate-700 flex items-center gap-2"
              >
                <Archive className="w-4 h-4 text-emerald-400" />
                <span>Archived Vault</span>
              </button>

              <button
                onClick={() => onNavigate('client')}
                className="px-5 py-3 rounded-xl bg-teal-900/60 hover:bg-teal-900/80 text-teal-200 font-semibold text-xs sm:text-sm transition-all border border-teal-700/50 flex items-center gap-2"
              >
                <User className="w-4 h-4" />
                <span>Client Portal</span>
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left border-t border-slate-800/80 pt-8">
              <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800">
                <div className="text-2xl font-black text-emerald-400">$1,180.20</div>
                <div className="text-xs text-slate-400 font-medium">Standard Baseline Package</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800">
                <div className="text-2xl font-black text-white">0% Hallucination</div>
                <div className="text-xs text-slate-400 font-medium">Strict Raw Extraction Rules</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800">
                <div className="text-2xl font-black text-emerald-400">100% Cell-Traced</div>
                <div className="text-xs text-slate-400 font-medium">Workbook Exact Math Match</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800">
                <div className="text-2xl font-black text-white">4-Doc Suite</div>
                <div className="text-xs text-slate-400 font-medium">Instant PDF & QR Signing</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Interactive Bento Grid: Core Capabilities */}
      <section className="py-20 bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-2">
              End-to-End Restoration Architecture
            </h2>
            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Engineered for On-Site Technicians, Calibrated for Insurance Adjusters
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Bento Card 1: Voice Field Scoping */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mb-4">
                  <Mic className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  Push-to-Talk Scoping
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Technicians speak naturally: &quot;14 by 10 with 8-foot ceiling, drywall reading 34.5% WME, 24-inch flood cut, 4 air movers, 1 dehu.&quot;
                </p>
                <div className="space-y-1 text-[11px] text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-mono">
                  <div className="text-emerald-700">✓ Extracts exact room dimensions</div>
                  <div className="text-emerald-700">✓ Maps standard IICRC directives</div>
                  <div className="text-emerald-700">✓ Zero speculative calculations</div>
                </div>
              </div>
              <button
                onClick={() => onNavigate('tech')}
                className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 hover:text-amber-900 cursor-pointer"
              >
                <span>Test live voice recorder</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Bento Card 2: Multimodal Meter & Thermal Vision */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center mb-4">
                  <Eye className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  Meter & FLIR OCR
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Snap a photo of any Protimeter, Tramex, Delmhorst display or FLIR infrared screen. The vision engine extracts the exact digits and substrate.
                </p>
                <div className="space-y-1 text-[11px] text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-mono">
                  <div className="text-emerald-700">✓ Reads % WME & Pinless values</div>
                  <div className="text-emerald-700">✓ Detects thermal Delta T (°F)</div>
                  <div className="text-emerald-700">✓ Auto-GPS pinned to photo EXIF</div>
                </div>
              </div>
              <button
                onClick={() => onNavigate('tech')}
                className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-blue-800 hover:text-blue-900 cursor-pointer"
              >
                <span>Inspect photo evidence</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Bento Card 3: Psychrometric & GPP Grain Depression */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="w-11 h-11 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center mb-4">
                  <ThermometerSnowflake className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  Psychrometric & GPP
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Track thermodynamic moisture load (GPP), dew point margins, and dehumidifier grain depression across ambient air and drying chambers per IICRC S500.
                </p>
                <div className="space-y-1 text-[11px] text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-mono">
                  <div className="text-emerald-700">✓ 4 Drying Zones (Outside, Intake, Exhaust)</div>
                  <div className="text-emerald-700">✓ Grain Depression (ΔGPP) Benchmark</div>
                  <div className="text-emerald-700">✓ Open vs Closed System Recommendation</div>
                </div>
              </div>
              <button
                onClick={() => onNavigate('tech')}
                className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 hover:text-teal-900 cursor-pointer"
              >
                <span>Launch psychrometric calc</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Bento Card 4: Exact Workbook Estimating Matrix */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-4">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  Cell-Traced Spreadsheet
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Replicates the exact formulas from the master workbook. Category 1-3 rates ($1.21 - $8.39/SF), baseline charges, and Cell D29 labor hours.
                </p>
                <div className="space-y-1 text-[11px] text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-mono">
                  <div className="text-emerald-700">✓ Baseline $1,180.20 standard items</div>
                  <div className="text-emerald-700">✓ 2x Cabinetry demo multiplier</div>
                  <div className="text-emerald-700">✓ Low-High proposal range bracket</div>
                </div>
              </div>
              <button
                onClick={() => onNavigate('office')}
                className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-900 cursor-pointer"
              >
                <span>Open office matrix</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Live Interactive Estimator Preview on Landing Page */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#0B192C] text-white rounded-3xl p-6 sm:p-10 lg:p-12 shadow-xl border border-slate-800">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Controls */}
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-3">
                    <Calculator className="w-3.5 h-3.5" />
                    Live Workbook Formula Test
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-white">
                    Simulate the Exact Workbook Matrix
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1">
                    Toggle water loss category, area, finish, and after-hours to witness cell-traced pricing in real-time.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Category */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Water Loss Category (IICRC S500)
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['Cat 1', 'Cat 2', 'Cat 3'] as const).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setCalcCategory(cat)}
                          className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                            calcCategory === cat
                              ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                              : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Finish Type */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Finish Level
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCalcFinished(true)}
                        className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                          calcFinished
                            ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                            : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        Finished
                      </button>
                      <button
                        type="button"
                        onClick={() => setCalcFinished(false)}
                        className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                          !calcFinished
                            ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                            : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        Unfinished
                      </button>
                    </div>
                  </div>
                </div>

                {/* Affected Sq Ft Slider */}
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1.5">
                    <span>Affected Area:</span>
                    <span className="text-emerald-400 font-mono text-sm">{calcSqFt} SF</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="1200"
                    step="5"
                    value={calcSqFt}
                    onChange={(e) => setCalcSqFt(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                    <span>20 SF (Small Bath)</span>
                    <span>145 SF (Standard Example)</span>
                    <span>1,200 SF (Whole Floor)</span>
                  </div>
                </div>

                {/* Toggles */}
                <div className="flex flex-wrap gap-3 pt-2">
                  <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={calcAfterHours}
                      onChange={(e) => setCalcAfterHours(e.target.checked)}
                      className="rounded text-emerald-500 focus:ring-emerald-400"
                    />
                    <span>After-Hours Dispatch (+$200 fee)</span>
                  </label>

                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-200">
                    <span>Equip:</span>
                    <span className="font-mono text-emerald-400 font-bold">{calcFans} Fans, {calcDehus} Dehu, {calcDays} Days</span>
                  </div>
                </div>
              </div>

              {/* Right Output Card */}
              <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-[#10243E] p-6 sm:p-7 rounded-2xl border border-slate-700 shadow-2xl">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Live Range Output
                  </span>
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                    {multiplier}x High Multiplier
                  </span>
                </div>

                <div className="my-5 text-center">
                  <div className="text-xs text-slate-400 uppercase font-semibold">
                    Homeowner Proposal Range
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1 font-mono">
                    {formatCurrency(lowBound)} – {formatCurrency(highBound)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Base Itemized Subtotal: <span className="font-semibold text-white">{formatCurrency(itemizedSubtotal)}</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs border-t border-slate-800 pt-4">
                  <div className="flex justify-between text-slate-300">
                    <span>Demolition Rate:</span>
                    <span className="font-mono font-semibold">${demoRate.toFixed(2)} / SF</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Demolition Total:</span>
                    <span className="font-mono font-semibold">{formatCurrency(demoTotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Baseline Charges (4 items):</span>
                    <span className="font-mono font-semibold">$1,180.20</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Equipment ({calcDays} Days):</span>
                    <span className="font-mono font-semibold">{formatCurrency(equipTotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Cell D29 Labor ({laborHours} hrs @ $47.46):</span>
                    <span className="font-mono font-semibold">{formatCurrency(laborTotal)}</span>
                  </div>
                  {calcAfterHours && (
                    <div className="flex justify-between text-amber-300 font-semibold">
                      <span>After Hours Emergency Fee:</span>
                      <span className="font-mono">$200.00</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => onNavigate('office')}
                  className="w-full mt-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                  <span>Edit in Full Estimator Studio</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Google Search AI-Optimization FAQ Section */}
      <section className="py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-2">
              Industry Standards & FAQ
            </h2>
            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Frequently Asked Questions on Restoration Scoping
            </p>
          </div>

          <div className="space-y-4">
            <details className="group bg-white p-5 rounded-xl border border-slate-200 open:ring-1 open:ring-emerald-500 transition-all">
              <summary className="font-bold text-sm text-slate-900 cursor-pointer list-none flex items-center justify-between">
                <span>How does DryScope enforce the Strict Anti-Calculation Rule for technicians?</span>
                <span className="text-emerald-600 transition-transform group-open:rotate-90">›</span>
              </summary>
              <div className="mt-3 text-xs text-slate-600 leading-relaxed pl-2 border-l-2 border-emerald-500">
                Technicians on site must capture raw measurements (e.g., room dimensions, linear feet of baseboard, moisture meter percentages). DryScope strictly forbids the AI from synthesizing speculative square footages or dollar estimates during field intake. Official pricing is generated exclusively by the cell-traced office matrix.
              </div>
            </details>

            <details className="group bg-white p-5 rounded-xl border border-slate-200 open:ring-1 open:ring-emerald-500 transition-all">
              <summary className="font-bold text-sm text-slate-900 cursor-pointer list-none flex items-center justify-between">
                <span>What are the exact components of the $1,180.20 baseline charge?</span>
                <span className="text-emerald-600 transition-transform group-open:rotate-90">›</span>
              </summary>
              <div className="mt-3 text-xs text-slate-600 leading-relaxed pl-2 border-l-2 border-emerald-500">
                The baseline charge consists of 4 line items verified from the estimating matrix workbook: Emergency Trip Call ($133.95), Monitoring Allowance (13.25 hours @ $47.46/hr = $628.85), Haul Load ($159.53), and HEPA Filter ($183.12). These total exactly $1,180.20 after cent rounding.
              </div>
            </details>

            <details className="group bg-white p-5 rounded-xl border border-slate-200 open:ring-1 open:ring-emerald-500 transition-all">
              <summary className="font-bold text-sm text-slate-900 cursor-pointer list-none flex items-center justify-between">
                <span>How does the On-Site QR Code Signature process work for clients?</span>
                <span className="text-emerald-600 transition-transform group-open:rotate-90">›</span>
              </summary>
              <div className="mt-3 text-xs text-slate-600 leading-relaxed pl-2 border-l-2 border-emerald-500">
                The field technician taps &quot;Generate QR Code&quot; on their mobile device. The client points their smartphone camera at the screen, immediately opening their private Client Recovery Portal where they review the emergency scope, inspect photos, and sign the Work Authorization with their finger.
              </div>
            </details>

            <details className="group bg-white p-5 rounded-xl border border-slate-200 open:ring-1 open:ring-emerald-500 transition-all">
              <summary className="font-bold text-sm text-slate-900 cursor-pointer list-none flex items-center justify-between">
                <span>What deliverables are included in the 4-Document Suite?</span>
                <span className="text-emerald-600 transition-transform group-open:rotate-90">›</span>
              </summary>
              <div className="mt-3 text-xs text-slate-600 leading-relaxed pl-2 border-l-2 border-emerald-500">
                The 4-Document Suite includes: (1) Homeowner Work Authorization & Proposal with legal emergency dryout agreement, (2) Itemized Insurance Adjuster Scope with raw room dimensions and unit pricing codes, (3) Adjuster Scope Defense Letter citing IICRC S500/S520 standards, and (4) Moisture Reading & Thermal Log with drying chamber records.
              </div>
            </details>
          </div>
        </div>
      </section>

      {/* 5. Footer with Emergency Services Information */}
      <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-sm">
              DS
            </div>
            <div>
              <p className="text-white font-bold text-sm">DryScope Platform</p>
              <p className="text-[11px] text-slate-500">
                IICRC Certified Mitigation & Structural Drying Scoping
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => onNavigate('tech')}
              className="hover:text-emerald-400 transition-colors"
            >
              Field Tech
            </button>
            <button
              onClick={() => onNavigate('office')}
              className="hover:text-emerald-400 transition-colors"
            >
              Office Matrix
            </button>
            <button
              onClick={() => onNavigate('owner')}
              className="hover:text-emerald-400 transition-colors"
            >
              Owner Exec
            </button>
            <button
              onClick={() => onNavigate('client')}
              className="hover:text-emerald-400 transition-colors"
            >
              Client Portal
            </button>
            <button
              onClick={onOpenLogin}
              className="text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
            >
              Universal Login
            </button>
          </div>

          <div className="text-[11px] text-slate-500">
            © 2026 DryScope. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
