'use client';

import React, { useRef, useState, useEffect } from 'react';
import { RestorationJob } from '@/lib/types';
import { calculatePricingBreakdown, formatCurrency } from '@/lib/pricing';
import {
  ShieldCheck,
  CheckCircle,
  FileText,
  Clock,
  Printer,
  HeartHandshake,
  AlertCircle,
  Check,
  Undo2,
  Lock,
  User,
  MapPin,
  Sparkles,
} from 'lucide-react';

interface ClientPortalProps {
  job: RestorationJob;
  onUpdateJob: (updated: RestorationJob) => void;
  onOpenDocSuite: () => void;
}

export function ClientPortal({
  job,
  onUpdateJob,
  onOpenDocSuite,
}: ClientPortalProps) {
  const pricing = calculatePricingBreakdown(job);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [signerName, setSignerName] = useState(job.client.name);
  const [agreeTerms, setAgreeTerms] = useState(job.signature.termsAccepted);
  const [isSigned, setIsSigned] = useState(job.signature.isSigned);

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (isSigned) return;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0B192C';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || isSigned) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleAdoptAndSign = () => {
    if (!agreeTerms) return;
    const canvas = canvasRef.current;
    const signatureData = canvas?.toDataURL() || '';

    const updatedJob: RestorationJob = {
      ...job,
      status: 'Client Authorized',
      signature: {
        isSigned: true,
        signatureDataUrl: signatureData,
        signedByName: signerName,
        signedAt: new Date().toISOString(),
        termsAccepted: true,
      },
      updatedAt: new Date().toISOString(),
    };

    onUpdateJob(updatedJob);
    setIsSigned(true);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Reassuring Header Banner */}
      <div className="bg-gradient-to-r from-[#0B192C] to-[#163056] text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">
              <HeartHandshake className="w-3.5 h-3.5" />
              Homeowner Recovery Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Emergency Action Plan & Work Authorization
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              Prepared by DryScope Restoration for{' '}
              <span className="font-bold text-white">{job.client.name}</span> at{' '}
              <span className="text-emerald-300">{job.client.address}</span>.
            </p>
          </div>

          <button
            onClick={onOpenDocSuite}
            className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 flex items-center gap-2 self-start sm:self-auto"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>Download Official PDF</span>
          </button>
        </div>
      </div>

      {/* Peace of Mind & What to Expect */}
      <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-6 text-xs text-slate-700 space-y-3">
        <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Our Priority: Stopping Moisture Spread & Restoring Normalcy</span>
        </div>
        <p className="leading-relaxed">
          Water and moisture spread rapidly into wall cavities and under floorboards if not addressed immediately. Our certified technicians have extracted standing water and placed medical-grade dehumidification equipment to dry the framing structures before mold or structural damage can take hold.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-[11px] font-medium text-emerald-950">
          <div className="bg-white p-3 rounded-xl border border-emerald-200 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Direct insurance billing handled</span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-emerald-200 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Daily moisture monitoring visits</span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-emerald-200 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>IICRC certified drying protocols</span>
          </div>
        </div>
      </div>

      {/* Plain-English Low-High Estimate Range Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Estimated Mitigation Investment
            </span>
            <div className="text-3xl sm:text-4xl font-black text-[#0B192C] font-mono mt-1">
              {formatCurrency(pricing.lowEstimateBound)} – {formatCurrency(pricing.highEstimateBound)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Subject to standard policy coverage under your carrier ({job.client.insuranceCarrier})
            </p>
          </div>

          <div className="text-right sm:border-l sm:border-slate-200 sm:pl-6">
            <span className="text-xs text-slate-500">Your Policy Deductible:</span>
            <div className="text-xl font-black text-slate-900 font-mono mt-0.5">
              ${job.client.deductible.toFixed(2)}
            </div>
            <span className="text-[11px] text-emerald-700 font-semibold">
              Carrier Claim #{job.client.claimNumber}
            </span>
          </div>
        </div>

        <div className="py-4 text-xs text-slate-600 leading-relaxed border-b border-slate-100">
          <strong className="text-slate-900">Why is there a Low–High Range?</strong>
          <p className="mt-1">
            Structural drying is governed by psychrometric science. High-density building materials (like hardwood and subfloor framing) release water at varying speeds depending on ambient weather conditions. The lower number reflects optimal 3-day drying; the upper bracket covers potential dense cavity moisture requiring extended dehumidification cycles.
          </p>
        </div>

        {/* Equipment & Services Included */}
        <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 text-[11px]">Drying Cycle:</span>
            <p className="font-bold text-slate-900">{job.equipment.dryingDays} Days Targeted</p>
          </div>
          <div>
            <span className="text-slate-400 text-[11px]">Air Movers Placed:</span>
            <p className="font-bold text-slate-900">{job.equipment.airMovers} Centrifugal Fans</p>
          </div>
          <div>
            <span className="text-slate-400 text-[11px]">Dehumidifiers:</span>
            <p className="font-bold text-slate-900">{job.equipment.dehumidifiers} Commercial LGR</p>
          </div>
          <div>
            <span className="text-slate-400 text-[11px]">Sanitization:</span>
            <p className="font-bold text-slate-900">Botanical Antimicrobial</p>
          </div>
        </div>
      </div>

      {/* Photo Evidence Gallery (Layman's Explanations) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 mb-1">
          Inspection Photo Evidence Gallery
        </h3>
        <p className="text-xs text-slate-500 mb-6">
          Clear visual evidence taken by our technician during on-site documentation.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {job.photos.map((photo) => (
            <div
              key={photo.id}
              className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 flex flex-col"
            >
              <div className="h-44 bg-slate-900 relative overflow-hidden flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.dataUrl}
                  alt={photo.caption}
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/75 text-white text-[10px] font-mono">
                  {photo.category.replace('_', ' ').toUpperCase()}
                </span>
                {photo.meterReading && (
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-mono font-bold">
                    {photo.meterReading}
                  </span>
                )}
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 mb-1">
                    {photo.caption}
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {photo.clientSummary}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200/60 text-[10px] text-slate-400 flex justify-between">
                  <span>{photo.roomName}</span>
                  <span>{photo.timestamp}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Digital Signature & Work Authorization Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
          <FileText className="w-5 h-5 text-emerald-600" />
          <h3 className="text-base font-bold text-slate-900">
            Digital Work Authorization & Assignment of Insurance Benefits
          </h3>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 max-h-36 overflow-y-auto leading-relaxed mb-6 font-mono text-[11px]">
          <p className="font-bold text-slate-900 mb-1">
            AUTHORIZATION TO COMMENCE EMERGENCY MITIGATION WORK:
          </p>
          <p className="mb-2">
            The undersigned property owner/authorized representative hereby engages DryScope Restoration to furnish all necessary labor, equipment, and materials to stabilize and dry the property located at {job.client.address}.
          </p>
          <p className="font-bold text-slate-900 mb-1">
            DIRECT PAYMENT & ASSIGNMENT OF INSURANCE BENEFITS:
          </p>
          <p className="mb-2">
            Owner authorizes {job.client.insuranceCarrier} to pay DryScope Restoration directly for all covered mitigation, moisture extraction, and structural drying services up to the limit of coverage. Owner remains responsible only for the policy deductible (${job.client.deductible.toFixed(2)}) and any non-covered exclusions.
          </p>
          <p className="font-bold text-slate-900 mb-1">
            EMERGENCY MITIGATION WAIVER OF RESCISSION:
          </p>
          <p>
            Due to the immediate risk of structural deterioration, secondary microbial growth, and electrical hazard, Owner hereby requests immediate performance of emergency dryout services and waives any standard non-emergency right of rescission to avoid progressive property damage.
          </p>
        </div>

        {/* Signature Status or Canvas Pad */}
        {isSigned ? (
          <div className="p-6 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-600 text-white mx-auto flex items-center justify-center">
              <Check className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-emerald-950">
                Work Authorization Legally Executed
              </h4>
              <p className="text-xs text-emerald-800 mt-1">
                Signed by <span className="font-bold">{job.signature.signedByName || signerName}</span> on{' '}
                {job.signature.signedAt ? new Date(job.signature.signedAt).toLocaleString() : 'Not recorded'}
              </p>
              <div className="text-[11px] text-emerald-700 font-mono mt-1">
                Audit Record ID: DS-SIG-{job.jobId} • IP: {job.signature.ipAddress || 'Not recorded'}
              </div>
            </div>

            {job.signature.signatureDataUrl && (
              <div className="mt-4 pt-3 border-t border-emerald-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={job.signature.signatureDataUrl}
                  alt="Recorded Signature"
                  className="max-h-20 mx-auto object-contain bg-white/70 p-2 rounded-lg border border-emerald-200"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Legal Name of Property Owner / Authorized Agent
                </label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  className="w-full p-2.5 text-xs font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Signing Date
                </label>
                <div
                  suppressHydrationWarning
                  className="p-2.5 text-xs font-mono bg-slate-100 rounded-xl text-slate-700 border border-slate-200"
                >
                  {job.signature.signedAt
                    ? new Date(job.signature.signedAt).toISOString().split('T')[0]
                    : new Date().toISOString().split('T')[0]} • On-Site Device
                </div>
              </div>
            </div>

            {/* Signature Canvas */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Sign with finger or stylus inside box below:
                </label>
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1 font-semibold"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>Clear Signature</span>
                </button>
              </div>

              <div className="border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50/50 p-2 overflow-hidden touch-none">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={160}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-36 bg-white rounded-xl border border-slate-200 cursor-crosshair touch-none"
                />
              </div>
            </div>

            {/* Terms checkbox */}
            <label className="flex items-start gap-2.5 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs text-slate-600 leading-relaxed">
                I confirm that I am the owner or authorized agent for {job.client.address}. I have read and agree to the Emergency Mitigation Work Authorization, Direct Pay Assignment, and waiver of rescission to commence immediate water damage mitigation.
              </span>
            </label>

            {/* Sign Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleAdoptAndSign}
                disabled={!agreeTerms || !hasDrawn}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Adopt Signature & Authorize Emergency Work</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
