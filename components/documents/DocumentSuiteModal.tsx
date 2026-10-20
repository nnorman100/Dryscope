'use client';

import React, { useState } from 'react';
import { RestorationJob } from '@/lib/types';
import { calculatePricingBreakdown, formatCurrency, RATES } from '@/lib/pricing';
import {
  X,
  Printer,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Building2,
  FileCheck,
  Thermometer,
  Layers,
  ArrowDownToLine,
} from 'lucide-react';

interface DocumentSuiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: RestorationJob;
}

export function DocumentSuiteModal({
  isOpen,
  onClose,
  job,
}: DocumentSuiteModalProps) {
  const [activeDoc, setActiveDoc] = useState<'proposal' | 'itemized' | 'defense' | 'moisture'>(
    'proposal'
  );
  const pricing = calculatePricingBreakdown(job);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs print:static print:p-0 print:bg-white">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        {/* Top Control Bar (Hidden in Print) */}
        <div className="bg-[#0B192C] text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 print:hidden shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-sm">
              DS
            </div>
            <div>
              <h2 className="text-sm font-bold">ADR Official 4-Document Insurance Suite</h2>
              <p className="text-[11px] text-slate-400">
                Job #{job.jobId} • {job.client.name} • {job.category}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigator (Hidden in Print) */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 py-2 flex items-center gap-2 overflow-x-auto print:hidden shrink-0">
          <button
            onClick={() => setActiveDoc('proposal')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeDoc === 'proposal'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1. Homeowner Work Authorization
          </button>
          <button
            onClick={() => setActiveDoc('itemized')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeDoc === 'itemized'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            2. Itemized Adjuster Scope
          </button>
          <button
            onClick={() => setActiveDoc('defense')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeDoc === 'defense'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            3. Scope Defense Letter (IICRC)
          </button>
          <button
            onClick={() => setActiveDoc('moisture')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeDoc === 'moisture'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            4. Moisture & Thermal Log
          </button>
        </div>

        {/* Document Content Viewport */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 text-slate-900 bg-white print:p-0 print:overflow-visible font-sans">
          {/* Document Header (Consistent across all 4) */}
          <div className="border-b-2 border-slate-900 pb-5 mb-6 flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-[#0B192C]">
                  ALERT DISASTER <span className="text-emerald-600">RESTORATION</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                IICRC Certified Water, Fire, and Mold Remediation Contractors
              </p>
              <p className="text-xs text-slate-500">
                Direct Dispatch: (555) 234-8900 • 24/7 Emergency Line
              </p>
            </div>

            <div className="text-right text-xs">
              <div className="font-mono font-bold text-slate-900">
                JOB ID: {job.jobId}
              </div>
              <div className="text-slate-500" suppressHydrationWarning>
                DATE: {job.createdAt ? job.createdAt.split('T')[0] : '2026-10-20'}
              </div>
              <div className="text-slate-500 font-medium">
                CARRIER: {job.client.insuranceCarrier}
              </div>
              <div className="text-slate-500">
                CLAIM: #{job.client.claimNumber}
              </div>
            </div>
          </div>

          {/* DOCUMENT 1: Homeowner Work Authorization & Proposal */}
          {activeDoc === 'proposal' && (
            <div className="space-y-6 text-xs text-slate-800 leading-relaxed">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    DOCUMENT 1: EMERGENCY WORK AUTHORIZATION & PROPOSAL
                  </h3>
                  <p className="text-xs text-slate-600">
                    Client: {job.client.name} • Location: {job.client.address}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Estimated Proposal Range
                  </span>
                  <span className="text-xl font-black text-emerald-700 font-mono">
                    {formatCurrency(pricing.lowEstimateBound)} – {formatCurrency(pricing.highEstimateBound)}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-1">1. EMERGENCY SCOPE OF SERVICES</h4>
                <p>
                  Alert Disaster Restoration is hereby authorized to perform urgent mitigation, water extraction, controlled demolition of wet non-salvageable substrates, and deploy structural drying chambers according to IICRC S500 Standard for Professional Water Damage Restoration.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="font-bold text-slate-900 block mb-1">Loss Specifications:</span>
                  <div>• Category: {job.category}</div>
                  <div>• Finish Level: {job.finishType}</div>
                  <div>• Affected Area: {pricing.affectedSquareFeet} SF</div>
                  <div>• Target Duration: {job.equipment.dryingDays} Days</div>
                </div>
                <div>
                  <span className="font-bold text-slate-900 block mb-1">Equipment Placed:</span>
                  <div>• {job.equipment.airMovers} Centrifugal Air Movers</div>
                  <div>• {job.equipment.dehumidifiers} LGR Dehumidifiers</div>
                  <div>• {job.equipment.airScrubbers} HEPA Air Scrubbers</div>
                  <div>• Botanical Antimicrobial Wash</div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-1">2. DIRECT PAYMENT AUTHORIZATION</h4>
                <p>
                  The Owner agrees that ADR shall bill {job.client.insuranceCarrier} directly. The Owner assigns all rights and benefits under the policy for mitigation services rendered, deductible responsibility ($
                  {job.client.deductible.toFixed(2)}) remains with the policyholder.
                </p>
              </div>

              {/* Signature Block */}
              <div className="border-t border-slate-300 pt-6 mt-8">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <span className="text-[11px] font-bold text-slate-700 block mb-2">
                      PROPERTY OWNER / AUTHORIZED SIGNATURE:
                    </span>
                    {job.signature.isSigned ? (
                      <div className="border border-emerald-300 bg-emerald-50/50 p-3 rounded-lg">
                        {job.signature.signatureDataUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={job.signature.signatureDataUrl}
                            alt="Signature"
                            className="h-12 object-contain"
                          />
                        )}
                        <div className="font-bold text-xs text-slate-900 mt-1">
                          {job.signature.signedByName || job.client.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Timestamp: {job.signature.signedAt} • IP: {job.signature.ipAddress}
                        </div>
                      </div>
                    ) : (
                      <div className="h-16 border-b-2 border-slate-900 flex items-end pb-1 text-slate-400">
                        X __________________________________________________
                      </div>
                    )}
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-700 block mb-2">
                      ADR CERTIFIED TECHNICIAN:
                    </span>
                    <div className="border border-slate-200 bg-slate-50 p-3 rounded-lg">
                      <div className="font-bold text-xs text-slate-900">
                        Nate Norman, Senior Restoration Field Tech
                      </div>
                      <div className="text-[10px] text-slate-500">
                        IICRC Certification #WRT-49102-S500
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-1">
                        GPS Fix: {job.gpsCoordinates?.latitude.toFixed(4) || '44.0462'}, {job.gpsCoordinates?.longitude.toFixed(4) || '-123.0220'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DOCUMENT 2: Itemized Adjuster Scope */}
          {activeDoc === 'itemized' && (
            <div className="space-y-6 text-xs text-slate-800">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h3 className="text-base font-black text-slate-900">
                  DOCUMENT 2: ITEMIZED INSURANCE ADJUSTER SCOPE & CLAIM AUDIT
                </h3>
                <p className="text-xs text-slate-600">
                  Calculated via Cell-Traced Residential Estimate Tool formulas
                </p>
              </div>

              {/* Raw dimensions */}
              <div>
                <h4 className="font-bold text-slate-900 mb-2">RAW ROOM MEASUREMENTS:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {job.dimensions.map((dim, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="font-bold text-slate-900">{dim.roomName}</div>
                      <div>Dimensions: {dim.lengthFt}&apos; × {dim.widthFt}&apos; × {dim.heightFt}&apos;</div>
                      <div>Baseboard Demo: {dim.linearFtBaseboard} LF</div>
                      <div>Flood Cut: {dim.floodCutHeightInches ? `${dim.floodCutHeightInches}"` : 'None'}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Table */}
              <table className="w-full text-xs text-left border border-slate-200">
                <thead className="bg-slate-100 uppercase font-bold text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">ADR Item Code</th>
                    <th className="p-2.5">Description</th>
                    <th className="p-2.5 text-right">Quantity</th>
                    <th className="p-2.5 text-right">Rate</th>
                    <th className="p-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  <tr>
                    <td className="p-2 font-bold">WTR-DEMO-{job.category.slice(0, 5)}</td>
                    <td className="p-2 font-sans">{job.category} ({job.finishType}) Demolition</td>
                    <td className="p-2 text-right">{pricing.affectedSquareFeet} SF</td>
                    <td className="p-2 text-right">${pricing.demolitionRatePerSqFt.toFixed(2)}</td>
                    <td className="p-2 text-right font-bold">{formatCurrency(pricing.demolitionTotal)}</td>
                  </tr>
                  <tr>
                    <td className="p-2">WTR-EMERG-TRIP</td>
                    <td className="p-2 font-sans">Emergency Initial Dispatch & Inspection</td>
                    <td className="p-2 text-right">1.0 Call</td>
                    <td className="p-2 text-right">$133.95</td>
                    <td className="p-2 text-right">$133.95</td>
                  </tr>
                  <tr>
                    <td className="p-2">WTR-MONITOR-BASE</td>
                    <td className="p-2 font-sans">Psychrometric Daily Monitoring Allowance</td>
                    <td className="p-2 text-right">13.25 Hrs</td>
                    <td className="p-2 text-right">$47.46</td>
                    <td className="p-2 text-right">$628.85</td>
                  </tr>
                  <tr>
                    <td className="p-2">WTR-HAUL-LOAD</td>
                    <td className="p-2 font-sans">Contaminated Debris Disposal & Haul</td>
                    <td className="p-2 text-right">1.0 Load</td>
                    <td className="p-2 text-right">$159.53</td>
                    <td className="p-2 text-right">$159.53</td>
                  </tr>
                  <tr>
                    <td className="p-2">WTR-FILT-HEPA</td>
                    <td className="p-2 font-sans">HEPA 500 Media Air Filter Replacement</td>
                    <td className="p-2 text-right">1.0 Each</td>
                    <td className="p-2 text-right">$183.12</td>
                    <td className="p-2 text-right">$183.12</td>
                  </tr>
                  <tr>
                    <td className="p-2">EQ-FAN-CENT</td>
                    <td className="p-2 font-sans">Centrifugal Air Movers ({job.equipment.dryingDays} Days)</td>
                    <td className="p-2 text-right">{job.equipment.airMovers * job.equipment.dryingDays} Unit-Days</td>
                    <td className="p-2 text-right">$29.25</td>
                    <td className="p-2 text-right font-bold">{formatCurrency(pricing.equipmentCharges.airMoversTotal)}</td>
                  </tr>
                  <tr>
                    <td className="p-2">EQ-DEHU-LGR</td>
                    <td className="p-2 font-sans">LGR Dehumidifier ({job.equipment.dryingDays} Days)</td>
                    <td className="p-2 text-right">{job.equipment.dehumidifiers * job.equipment.dryingDays} Unit-Days</td>
                    <td className="p-2 text-right">$101.25</td>
                    <td className="p-2 text-right font-bold">{formatCurrency(pricing.equipmentCharges.dehumidifiersTotal)}</td>
                  </tr>
                  <tr>
                    <td className="p-2">LAB-D29-ONST</td>
                    <td className="p-2 font-sans">Cell D29 Direct Field Labor ({pricing.laborCharges.totalHoursD29} hrs)</td>
                    <td className="p-2 text-right">{pricing.laborCharges.totalHoursD29} Hrs</td>
                    <td className="p-2 text-right">$47.46</td>
                    <td className="p-2 text-right font-bold">{formatCurrency(pricing.laborCharges.totalLabor)}</td>
                  </tr>
                  {job.afterHours && (
                    <tr className="bg-amber-50">
                      <td className="p-2 font-bold text-amber-900">SRCH-AFTER-HRS</td>
                      <td className="p-2 font-sans text-amber-900">Emergency After-Hours Job Fee</td>
                      <td className="p-2 text-right">1.0 Fee</td>
                      <td className="p-2 text-right">$200.00</td>
                      <td className="p-2 text-right font-bold">$200.00</td>
                    </tr>
                  )}
                  <tr className="bg-slate-100 font-bold text-slate-900 text-xs">
                    <td colSpan={4} className="p-2.5 text-right font-sans">
                      ITEMIZED CLAIM BASELINE TOTAL:
                    </td>
                    <td className="p-2.5 text-right">
                      {formatCurrency(pricing.itemizedSubtotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* DOCUMENT 3: Scope Defense Letter */}
          {activeDoc === 'defense' && (
            <div className="space-y-6 text-xs text-slate-800 leading-relaxed">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h3 className="text-base font-black text-slate-900">
                  DOCUMENT 3: IICRC S500 / S520 SCOPE DEFENSE JUSTIFICATION
                </h3>
                <p className="text-xs text-slate-600">
                  To: Desk Adjuster Marcus Bradley • Carrier: {job.client.insuranceCarrier}
                </p>
              </div>

              <div>
                <p className="font-bold text-slate-900 mb-1">
                  RE: Claim #{job.client.claimNumber} • Technical Defense for Flood Cut & Equipment Days
                </p>
                <p>
                  Dear Mr. Bradley,
                </p>
                <p className="mt-2">
                  This letter serves as forensic justification for the emergency mitigation scope deployed at {job.client.address}. All actions were taken in strict compliance with the American National Standards Institute (ANSI) / IICRC S500 Standard for Professional Water Damage Restoration.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <h5 className="font-bold text-slate-900">1. Forensic Justification for Flood Cuts:</h5>
                  <p className="mt-1">
                    Moisture meter readings taken on site registered at 34.5% WME in gypsum drywall, exceeding the dry standard of 12.0% WME. Under S500 §13.5.6, gypsum board subjected to core wicking above 16 inches must be removed to a minimum of 24 inches to allow structural wall cavity drying and inhibit Aspergillus / Penicillium colonization.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <h5 className="font-bold text-slate-900">2. Psychrometric Equipment Calculations:</h5>
                  <p className="mt-1">
                    The placement of 4 centrifugal air movers and 1 LGR dehumidifier adheres to the S500 air exchange formula for Class 2/3 drying environments. Dehumidification capacity must offset the high evaporation rate generated by structural fans to maintain grains per pound (GPP) depression.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <h5 className="font-bold text-slate-900">3. Non-Speculative Scoping:</h5>
                  <p className="mt-1">
                    All measurements in this claim are actual field dimensions verified via laser meter and multimodal OCR. No speculative multipliers or unverified line items are included.
                  </p>
                </div>
              </div>

              <div className="pt-4">
                <p>Sincerely,</p>
                <p className="font-bold text-slate-900 mt-1">Courtney Jenkins & Nate Norman</p>
                <p className="text-slate-500">Alert Disaster Restoration Technical Scoping Division</p>
              </div>
            </div>
          )}

          {/* DOCUMENT 4: Moisture Reading & Thermal Log */}
          {activeDoc === 'moisture' && (
            <div className="space-y-6 text-xs text-slate-800">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h3 className="text-base font-black text-slate-900">
                  DOCUMENT 4: FORENSIC MOISTURE & THERMAL IMAGING LOG
                </h3>
                <p className="text-xs text-slate-600">
                  Psychrometric Record & Calibrated Substrate Data
                </p>
              </div>

              <table className="w-full text-xs text-left border border-slate-200">
                <thead className="bg-slate-100 uppercase font-bold text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Room Location</th>
                    <th className="p-2.5">Substrate Tested</th>
                    <th className="p-2.5">Field Reading</th>
                    <th className="p-2.5">Dry Standard</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {job.moistureReadings.map((m) => (
                    <tr key={m.id}>
                      <td className="p-2 font-sans font-bold">{m.roomName}</td>
                      <td className="p-2 font-sans">{m.substrate}</td>
                      <td className="p-2 font-bold text-red-600">
                        {m.readingValue} {m.unit}
                      </td>
                      <td className="p-2 text-slate-500">{m.dryStandard} {m.unit}</td>
                      <td className="p-2 font-sans">
                        {m.isAffected ? (
                          <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold text-[10px]">
                            AFFECTED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            BASELINE
                          </span>
                        )}
                      </td>
                      <td className="p-2 font-sans text-slate-600">{m.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {job.thermalReadings.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-900 mb-2">THERMAL IMAGING DELTA T LOG:</h4>
                  <div className="space-y-2">
                    {job.thermalReadings.map((tr) => (
                      <div key={tr.id} className="p-3 bg-blue-50/60 rounded-lg border border-blue-200 flex justify-between items-center">
                        <div>
                          <span className="font-bold text-slate-900">{tr.roomName}: </span>
                          <span className="text-slate-600">{tr.perimeterBoundaryDesc}</span>
                        </div>
                        <span className="font-mono font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded">
                          {tr.deltaTFahrenheit}°F Delta T
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {job.psychrometricLogs && job.psychrometricLogs.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-900 mb-2">
                    IICRC S500 PSYCHROMETRIC ATMOSPHERIC LOG & GRAIN DEPRESSION:
                  </h4>
                  <table className="w-full text-xs text-left border border-slate-200">
                    <thead className="bg-slate-100 uppercase font-bold text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="p-2">Date / Day</th>
                        <th className="p-2 text-center">Outside (Temp/RH)</th>
                        <th className="p-2 text-center">Control Area</th>
                        <th className="p-2 text-center">Affected Chamber</th>
                        <th className="p-2 text-center">Dehu Inlet GPP</th>
                        <th className="p-2 text-center">Dehu Outlet GPP</th>
                        <th className="p-2 text-right">Grain Depression (ΔGPP)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[10px]">
                      {job.psychrometricLogs.map((p) => (
                        <tr key={p.id}>
                          <td className="p-2 font-bold font-sans">Day {p.dayNumber} ({p.date})</td>
                          <td className="p-2 text-center">{p.outsideTempF}°F / {p.outsideRH}%</td>
                          <td className="p-2 text-center">{p.unaffectedTempF}°F / {p.unaffectedRH}%</td>
                          <td className="p-2 text-center">{p.affectedTempF}°F / {p.affectedRH}% ({p.affectedGPP} GPP)</td>
                          <td className="p-2 text-center">{p.dehuInletGPP} GPP</td>
                          <td className="p-2 text-center">{p.dehuOutletGPP} GPP</td>
                          <td className="p-2 text-right font-bold text-emerald-700">
                            +{p.grainDepressionDeltaGPP} GPP (Active Extraction)
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {job.photos && job.photos.length > 0 && (
                <div className="pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-slate-900">
                      FORENSIC PHOTO EVIDENCE LEDGER & GEOLOCATION AUDIT ({job.photos.length} PHOTOS):
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono">
                      GPS Device Verification • Google Maps Validated
                    </span>
                  </div>

                  <table className="w-full text-xs text-left border border-slate-200">
                    <thead className="bg-slate-100 uppercase font-bold text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="p-2">Thumbnail</th>
                        <th className="p-2">Room / Area</th>
                        <th className="p-2">Substrate / Reading</th>
                        <th className="p-2">Forensic Scope Description</th>
                        <th className="p-2">GPS Coordinates</th>
                        <th className="p-2 text-right">Google Maps Verification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[10px]">
                      {job.photos.map((photo, idx) => {
                        const lat = photo.gps?.latitude ?? job.gpsCoordinates?.latitude ?? 44.0462;
                        const lng = photo.gps?.longitude ?? job.gpsCoordinates?.longitude ?? -123.022;
                        const gmapsUrl = photo.gps?.mapUrl || `https://www.google.com/maps?q=${lat},${lng}`;

                        return (
                          <tr key={photo.id || idx}>
                            <td className="p-2">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={photo.dataUrl}
                                alt={photo.caption}
                                className="w-12 h-10 object-cover rounded border border-slate-300"
                              />
                            </td>
                            <td className="p-2 font-sans font-bold text-slate-900">
                              {photo.roomName || 'Loss Area'}
                              <span className="block text-[9px] font-normal text-slate-500 font-sans">
                                {photo.category.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="p-2 font-sans">
                              <span className="font-semibold text-slate-800">
                                {photo.substrate || 'Loss Surface'}
                              </span>
                              {photo.meterReading && (
                                <span className="block text-red-700 font-mono font-bold">
                                  {photo.meterReading}
                                </span>
                              )}
                              {photo.thermalDelta && (
                                <span className="block text-blue-700 font-mono font-bold">
                                  {photo.thermalDelta}
                                </span>
                              )}
                            </td>
                            <td className="p-2 font-sans text-slate-600 max-w-xs truncate">
                              {photo.technicalDescription}
                            </td>
                            <td className="p-2 font-mono text-slate-800">
                              {lat.toFixed(5)}°, {lng.toFixed(5)}°
                              <span className="block text-[9px] text-slate-400 font-sans">
                                {photo.gps?.accuracy ? `±${Math.round(photo.gps.accuracy)}m` : '±4m'}
                              </span>
                            </td>
                            <td className="p-2 text-right font-sans">
                              <a
                                href={gmapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:text-emerald-900 hover:underline"
                              >
                                <span>Open Google Maps ↗</span>
                              </a>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
