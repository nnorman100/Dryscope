'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import jsQR from 'jsqr';
import { RestorationJob, ScannedAssetTag } from '@/lib/types';
import { parseAndApplyQrAssetTag, playScanSuccessSound } from '@/lib/qrAssetParser';
import {
  Camera,
  Upload,
  X,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Wrench,
  Layers,
  ArrowRight,
  ShieldCheck,
  SwitchCamera,
  Undo2,
  FileText,
  Barcode,
} from 'lucide-react';

interface QrAssetScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: RestorationJob;
  onUpdateJob: (updated: RestorationJob) => void;
}

export function QrAssetScannerModal({
  isOpen,
  onClose,
  job,
  onUpdateJob,
}: QrAssetScannerModalProps) {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [retryCount, setRetryCount] = useState<number>(0);
  const [lastScannedResult, setLastScannedResult] = useState<{
    summary: string;
    details: string;
    tag: ScannedAssetTag;
    previousJobState: RestorationJob;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const isCooldownRef = useRef<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stop camera media stream and animation loop (purely external DOM/media cleanup, no setState)
  const stopCameraTracks = useCallback(() => {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Handle a successfully decoded QR string
  const handleDecodedString = useCallback(
    (decodedText: string) => {
      if (isCooldownRef.current) return;
      isCooldownRef.current = true;

      playScanSuccessSound();

      const previousJob = { ...job };
      const parsed = parseAndApplyQrAssetTag(decodedText, job);

      setLastScannedResult({
        summary: parsed.summary,
        details: parsed.appliedChangesDescription,
        tag: parsed.tag,
        previousJobState: previousJob,
      });

      onUpdateJob(parsed.updatedJob);

      // Cooldown to avoid repeat scans of the exact same code
      setTimeout(() => {
        isCooldownRef.current = false;
      }, 1800);
    },
    [job, onUpdateJob]
  );

  // Live Camera Scan Loop using jsQR on Canvas
  const startScanLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const scanFrame = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data && !isCooldownRef.current) {
          handleDecodedString(code.data);
        }
      }

      scanLoopRef.current = requestAnimationFrame(scanFrame);
    };

    scanLoopRef.current = requestAnimationFrame(scanFrame);
  }, [handleDecodedString]);

  // Start Camera Stream
  // Toggle Camera Facing Mode
  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Start or stop camera feed when modal visibility, tab, or camera direction changes
  useEffect(() => {
    let isCancelled = false;

    if (isOpen && activeTab === 'camera') {
      const initCamera = async () => {
        try {
          if (!navigator?.mediaDevices?.getUserMedia) {
            if (!isCancelled) {
              setCameraError('Camera access is not supported by your browser.');
            }
            return;
          }

          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: facingMode },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });

          if (isCancelled) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }

          streamRef.current = stream;

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.setAttribute('playsinline', 'true');
            await videoRef.current.play();
            if (!isCancelled) {
              setIsScanning(true);
              setCameraError(null);
              startScanLoop();
            }
          }
        } catch (err: any) {
          if (isCancelled) return;
          console.warn('Camera stream error:', err);
          let msg = 'Unable to access camera feed.';
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            msg = 'Camera permission denied. Please allow camera permissions or upload a photo of the QR tag.';
          } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            msg = 'No camera device found on this system.';
          }
          setCameraError(msg);
          setIsScanning(false);
        }
      };

      initCamera();
    } else {
      stopCameraTracks();
    }

    return () => {
      isCancelled = true;
      stopCameraTracks();
    };
  }, [isOpen, activeTab, facingMode, retryCount, startScanLoop, stopCameraTracks]);

  const handleSelectTab = (tab: 'camera' | 'upload') => {
    if (tab !== 'camera') {
      stopCameraTracks();
      setIsScanning(false);
    }
    setActiveTab(tab);
  };

  const handleClose = () => {
    stopCameraTracks();
    setIsScanning(false);
    onClose();
  };

  // Decode from File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = img.width;
        offscreenCanvas.height = img.height;
        const ctx = offscreenCanvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          handleDecodedString(code.data);
        } else {
          setCameraError(
            'No QR code detected in the uploaded photo. Ensure the barcode is clear, focused, and well-lit.'
          );
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Revert / Undo last scan
  const handleUndoLastScan = () => {
    if (lastScannedResult?.previousJobState) {
      onUpdateJob(lastScannedResult.previousJobState);
      setLastScannedResult(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#0B192C] text-white p-5 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Field Asset & Room Tag Scanner
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Auto-Scope Engine
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Scan equipment barcodes or room boundary markers to automatically populate the job scope.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors text-xs font-bold"
          >
            ✕
          </button>
        </div>

        {/* Tab Selector */}
        <div className="bg-slate-100 p-2 border-b border-slate-200 flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => handleSelectTab('camera')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'camera'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Camera className="w-4 h-4 text-emerald-600" />
            <span>Live Camera Scanner</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab('upload')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'upload'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Upload className="w-4 h-4 text-blue-600" />
            <span>Photo Upload</span>
          </button>
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* TAB 1: Live Camera Viewport */}
          {activeTab === 'camera' && (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-4/3 sm:aspect-16/10 flex items-center justify-center border-2 border-slate-900 shadow-inner">
                {/* Hidden canvas used for pixel analysis */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Video Element */}
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />

                {/* Scanning Reticle & Laser Line Overlay */}
                {isScanning && !cameraError && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    {/* Reticle bounds */}
                    <div className="relative w-64 h-64 sm:w-72 sm:h-72 border-2 border-emerald-400/80 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] flex items-center justify-center overflow-hidden">
                      {/* Corner Target Markers */}
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                      {/* Animated Laser Scanning Beam */}
                      <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-[bounce_2s_infinite]" />

                      <span className="text-[11px] font-bold text-white/90 bg-black/60 px-2 py-0.5 rounded-full absolute bottom-3">
                        Align QR Tag Inside Frame
                      </span>
                    </div>
                  </div>
                )}

                {/* Camera Fallback / Error State */}
                {cameraError && (
                  <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center bg-slate-900/90 text-white space-y-3">
                    <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-amber-300">Camera Unavailable</h4>
                      <p className="text-xs text-slate-300 max-w-sm mt-1">{cameraError}</p>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setRetryCount((c) => c + 1)}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700 cursor-pointer"
                      >
                        Retry Camera
                      </button>
                    </div>
                  </div>
                )}

                {/* Flip camera button */}
                {!cameraError && (
                  <button
                    type="button"
                    onClick={toggleCameraFacing}
                    className="absolute top-3 right-3 p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white text-xs font-semibold flex items-center gap-1.5 backdrop-blur-xs transition-colors border border-white/20"
                    title="Switch camera"
                  >
                    <SwitchCamera className="w-4 h-4" />
                    <span className="hidden sm:inline">Flip Camera</span>
                  </button>
                )}
              </div>

              <div className="text-center text-xs text-slate-500">
                Hold your device camera up to any Phoenix, Dri-Eaz, or DryScope room barcode. Auto-detection triggers immediately.
              </div>
            </div>
          )}

          {/* TAB 2: Photo / Image File Upload */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-emerald-50/30 flex flex-col items-center justify-center gap-3"
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-xs">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">
                    Upload or Drop QR Code Photo
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    Select a photo from your camera roll, clipboard screenshot, or digital asset catalog to scan.
                  </p>
                </div>
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs"
                >
                  Choose Image File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {cameraError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{cameraError}</span>
                </div>
              )}
            </div>
          )}

          {/* Real-time Scan Notification & Undo Toast */}
          {lastScannedResult && (
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                    <span>{lastScannedResult.summary}</span>
                    <span className="text-[10px] font-normal text-emerald-700 font-mono">
                      (Just Scanned)
                    </span>
                  </h4>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    {lastScannedResult.details}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleUndoLastScan}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-emerald-300 flex items-center gap-1.5 transition-colors self-end sm:self-auto shrink-0 shadow-2xs"
              >
                <Undo2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Undo Scan</span>
              </button>
            </div>
          )}

          {/* Current Scanned Asset Inventory Summary */}
          {job.scannedAssets && job.scannedAssets.length > 0 && (
            <div className="pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Scanned On-Site Assets ({job.scannedAssets.length} Registered)
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Synced to Job Ledger
                </span>
              </div>

              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {job.scannedAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-[10px] font-bold ${
                          asset.tagType === 'equipment'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {asset.tagType === 'equipment' ? 'EQ' : 'RM'}
                      </div>
                      <div className="truncate">
                        <span className="font-semibold text-slate-900">
                          {asset.model || asset.roomName || asset.serialNumber}
                        </span>
                        {asset.serialNumber && (
                          <span className="text-slate-500 ml-1.5 font-mono text-[11px]">
                            SN: {asset.serialNumber}
                          </span>
                        )}
                        {asset.notes && (
                          <span className="text-slate-400 ml-1.5 text-[10px]">
                            • {asset.notes}
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {asset.scannedAt.split('T')[1]?.slice(0, 5) || 'Just now'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            Total Deployed: <span className="font-bold text-slate-900">{job.equipment.airMovers} Fans</span>,{' '}
            <span className="font-bold text-slate-900">{job.equipment.dehumidifiers} Dehus</span>,{' '}
            <span className="font-bold text-slate-900">{job.equipment.airScrubbers} Scrubbers</span>.
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs"
          >
            Done Scanning
          </button>
        </div>
      </div>
    </div>
  );
}
