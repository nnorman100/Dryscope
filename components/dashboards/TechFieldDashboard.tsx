'use client';

import React, { useState, useRef, useEffect } from 'react';
import { RestorationJob, PhotoEvidence, MoistureReading } from '@/lib/types';
import {
  Mic,
  MicOff,
  Camera,
  Upload,
  Sparkles,
  MapPin,
  Search,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Droplets,
  Biohazard,
  QrCode,
  FileCheck,
  RefreshCw,
  Plus,
  Trash2,
  Navigation,
  ThermometerSnowflake,
  Gauge,
  ArrowRight,
  Wrench,
  TrendingUp,
  Droplet,
  Wind,
  Layers,
  FileText,
  ExternalLink,
  Compass,
  Crosshair,
  Maximize2,
  Copy,
  Map,
  Globe,
  Radio,
  Barcode,
  Volume2,
  Headphones,
} from 'lucide-react';
import QRCode from 'qrcode';
import { PsychrometricCalculator } from './PsychrometricCalculator';
import { QrAssetScannerModal } from './QrAssetScannerModal';
import { RapidTapScopingHud } from './RapidTapScopingHud';
import { playConfirmationChime, speakAssistantFeedback } from '@/lib/audioChime';
import {
  usePhotoGeolocation,
  buildGoogleMapsUrl,
  buildGoogleMapsSatelliteUrl,
  buildGoogleMapsDirectionsUrl,
  buildGoogleMapsEmbedUrl,
  formatCoordinatesDMS,
} from '@/hooks/usePhotoGeolocation';
import { AddressAutocompleteInput } from '@/components/maps/AddressAutocompleteInput';
import { JobLocationMap } from '@/components/maps/JobLocationMap';
import { ParsedPlaceDetails, getDirectionsUrl } from '@/lib/maps-config';
import { GeminiLiveScopingBar } from '@/components/voice/GeminiLiveScopingBar';
import { authedFetch } from '@/lib/auth';

interface TechFieldDashboardProps {
  job: RestorationJob;
  onUpdateJob: (updated: RestorationJob) => void;
  onNavigateToPortal: () => void;
  onNavigateToPipeline?: () => void;
  onOpenDocSuite?: () => void;
}

export function TechFieldDashboard({
  job,
  onUpdateJob,
  onNavigateToPortal,
  onNavigateToPipeline,
  onOpenDocSuite,
}: TechFieldDashboardProps) {
  // Sub-tab navigation state
  const [activeSubTab, setActiveSubTab] = useState<'scoping' | 'psychrometrics' | 'all'>('scoping');
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isHandsFreeMode, setIsHandsFreeMode] = useState(false);
  const [transcript, setTranscript] = useState(job.rawTranscript || '');
  const [isParsingScope, setIsParsingScope] = useState(false);
  const [parseMessage, setParseMessage] = useState<string | null>(null);
  const silenceTimerRef = useRef<any>(null);
  const isHandsFreeRef = useRef<boolean>(false);

  // Photo Inspection & Geolocation Hook
  const {
    isLocating: isGpsLocating,
    currentCoords: liveGpsCoords,
    geoError,
    captureLocation,
  } = usePhotoGeolocation();

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const [photoCategory, setPhotoCategory] = useState<'damage' | 'moisture_meter' | 'thermal'>('moisture_meter');
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [analyzedResult, setAnalyzedResult] = useState<any>(null);
  const [photoAnalysisError, setPhotoAnalysisError] = useState<string | null>(null);
  const [selectedMapPhoto, setSelectedMapPhoto] = useState<PhotoEvidence | null>(null);
  const [copiedCoordId, setCopiedCoordId] = useState<string | null>(null);
  const [previewEnlargePhoto, setPreviewEnlargePhoto] = useState<PhotoEvidence | null>(null);
  const [gpsCalibrateMessage, setGpsCalibrateMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // QR Code Modal State for On-Site Client Signing
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Asset & Room Tag Scanner Modal State
  const [showAssetScanner, setShowAssetScanner] = useState(false);

  // Google Maps address autocomplete and property map state
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [tempAddress, setTempAddress] = useState(job.client.address);
  const [prevJobAddress, setPrevJobAddress] = useState(job.client.address);
  if (job.client.address !== prevJobAddress) {
    setPrevJobAddress(job.client.address);
    setTempAddress(job.client.address);
  }
  const handleParseScopeWithAIRef = useRef<((isAutoHandsFree?: boolean, overrideTranscript?: string) => Promise<void>) | null>(null);

  const handleAddressSelected = (details: ParsedPlaceDetails) => {
    const updatedJob: RestorationJob = {
      ...job,
      client: {
        ...job.client,
        address: details.streetAddress || details.formattedAddress,
        cityStateZip: details.cityStateZip || job.client.cityStateZip,
      },
      gpsCoordinates: {
        latitude: details.lat,
        longitude: details.lng,
        address: details.formattedAddress,
        mapUrl: getDirectionsUrl(details.lat, details.lng, details.formattedAddress),
      },
      updatedAt: new Date().toISOString(),
    };
    onUpdateJob(updatedJob);
    setIsEditingAddress(false);
    setGpsCalibrateMessage(
      `✓ Address synced with Google Maps: ${details.formattedAddress}`
    );
    setTimeout(() => setGpsCalibrateMessage(null), 4000);
  };

  const handleRecalibrateMapGps = (coords: { latitude: number; longitude: number; accuracy?: number }) => {
    const updatedJob: RestorationJob = {
      ...job,
      gpsCoordinates: {
        latitude: coords.latitude,
        longitude: coords.longitude,
        address: job.client.address,
        accuracy: coords.accuracy,
        mapUrl: getDirectionsUrl(coords.latitude, coords.longitude, job.client.address),
      },
      updatedAt: new Date().toISOString(),
    };
    onUpdateJob(updatedJob);
    setGpsCalibrateMessage(
      `✓ GPS Calibrated: ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}${coords.accuracy ? ` (±${Math.round(coords.accuracy)}m)` : ''}`
    );
    setTimeout(() => setGpsCalibrateMessage(null), 4000);
  };

  // Speech recognition fallback
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = (event: any) => {
          let current = '';
          for (let i = 0; i < event.results.length; i++) {
            current += event.results[i][0].transcript + ' ';
          }
          const trimmed = current.trim();
          setTranscript(trimmed);

          // In hands-free mode, 2.2s of silence automatically triggers scope parsing
          if (isHandsFreeRef.current && trimmed.length > 10) {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = setTimeout(() => {
              handleParseScopeWithAIRef.current?.(true, trimmed);
            }, 2200);
          }
        };
        recognition.onend = () => {
          if (isHandsFreeRef.current) {
            try {
              recognition.start();
            } catch (e) {}
          } else {
            setIsRecording(false);
          }
        };
        recognition.onerror = (e: any) => {
          console.log('Speech recognition event:', e.error);
        };
        recognitionRef.current = recognition;
      }
    }
  }, []);

  // Generate QR Code for on-site client signing
  const handleOpenQrModal = async () => {
    setShowQrModal(true);
    try {
      const portalUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}?role=client&jobId=${job.id}#portal`
          : 'https://dryscope.io/portal';
      const url = await QRCode.toDataURL(portalUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0B192C',
          light: '#FFFFFF',
        },
      });
      setQrDataUrl(url);
    } catch (err) {
      console.error('QR code generation error:', err);
    }
  };

  // Toggle Push-to-Talk Mic
  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      try {
        recognitionRef.current?.stop();
      } catch (e) {}
    } else {
      setIsRecording(true);
      try {
        recognitionRef.current?.start();
      } catch (e) {
        // Mock streaming soundwave if native speech recognition is not supported or permitted
      }
    }
  };

  // Toggle Hands-Free Continuous Conversation Mode
  const toggleHandsFreeMode = () => {
    const nextState = !isHandsFreeMode;
    setIsHandsFreeMode(nextState);
    isHandsFreeRef.current = nextState;

    if (nextState) {
      setIsRecording(true);
      playConfirmationChime();
      speakAssistantFeedback('Hands-free live walkthrough active. Speak room specifications freely.');
      try {
        recognitionRef.current?.start();
      } catch (e) {}
    } else {
      setIsRecording(false);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      try {
        recognitionRef.current?.stop();
      } catch (e) {}
      speakAssistantFeedback('Hands-free mode paused.');
    }
  };

  // Call server-side /api/scope
  const handleParseScopeWithAI = async (isAutoHandsFree: boolean = false, overrideTranscript?: string) => {
    const activeText = overrideTranscript || transcript;
    if (!activeText.trim()) return;
    setIsParsingScope(true);
    setParseMessage(null);

    try {
      const res = await authedFetch('/api/scope', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: activeText, existingJobData: job }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        const updated: RestorationJob = {
          ...job,
          rawTranscript: activeText,
          category: d.category || job.category,
          finishType: d.finishType || job.finishType,
          cabinetryMultiplier: d.cabinetryMultiplier ?? job.cabinetryMultiplier,
          afterHours: d.afterHours ?? job.afterHours,
          dimensions: d.dimensions && d.dimensions.length > 0 ? d.dimensions : job.dimensions,
          actions: d.actions && d.actions.length > 0 ? d.actions : job.actions,
          moistureReadings:
            d.moistureReadings && d.moistureReadings.length > 0
              ? [
                  ...job.moistureReadings,
                  ...d.moistureReadings.map((m: any, idx: number) => ({
                    ...m,
                    id: `mr-ai-${Date.now()}-${idx}`,
                  })),
                ]
              : job.moistureReadings,
          equipment: {
            ...job.equipment,
            ...(d.equipment || {}),
          },
          technicianNotes: d.technicianSummary
            ? `${job.technicianNotes}\n${d.technicianSummary}`.trim()
            : job.technicianNotes,
          updatedAt: new Date().toISOString(),
        };

        onUpdateJob(updated);
        playConfirmationChime();

        const roomCount = d.dimensions?.length || 1;
        const firstRoom = d.dimensions?.[0];
        setParseMessage(
          `✓ Scope parsed: ${roomCount} room(s) logged, Category: ${d.category || job.category}. Zero dollar estimates calculated per strict rule.`
        );

        if (isAutoHandsFree || isHandsFreeMode) {
          const feedback = firstRoom
            ? `${firstRoom.roomName} logged: ${firstRoom.lengthFt} by ${firstRoom.widthFt}, ${d.equipment?.airMovers || 0} air movers, ${d.equipment?.dehumidifiers || 0} dehus.`
            : 'Room scope parsed and synced to cloud.';
          speakAssistantFeedback(feedback);
        }
      } else {
        setParseMessage(`Error: ${json.error || 'Parsing failed'}`);
      }
    } catch (err: any) {
      setParseMessage(`Parsing error: ${err?.message || 'Server error'}`);
    } finally {
      setIsParsingScope(false);
    }
  };

  useEffect(() => {
    handleParseScopeWithAIRef.current = handleParseScopeWithAI;
  });

  // Photo file selection & automatic GPS capture via usePhotoGeolocation hook
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      setPhotoPreview(base64);
      setAnalyzedResult(null);
      setPhotoAnalysisError(null);

      // Automatically capture browser geolocation via the usePhotoGeolocation hook
      const gpsResult = await captureLocation(
        job.client.address,
        job.gpsCoordinates
      );

      const newPhotoId = `photo-${Date.now()}`;
      setActivePhotoId(newPhotoId);

      const categoryLabels: Record<string, string> = {
        moisture_meter: 'Moisture Meter Inspection',
        thermal: 'FLIR Thermal Imaging Screen',
        damage: 'Structural Loss Evidence',
        containment: 'Containment Barrier Verification',
      };

      const newPhoto: PhotoEvidence = {
        id: newPhotoId,
        caption: `${job.dimensions[0]?.roomName || 'Field'} – ${categoryLabels[photoCategory] || 'Field Photo Evidence'}`,
        dataUrl: base64,
        category: photoCategory,
        roomName: job.dimensions[0]?.roomName || 'Loss Area',
        technicalDescription:
          gpsResult?.source === 'browser_geolocation'
            ? 'Photo location from device geolocation.'
            : gpsResult
            ? 'Device location unavailable; photo tagged with the job site location.'
            : 'Photo location not recorded.',
        clientSummary: 'Field inspection photo.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        gps: gpsResult ? {
          latitude: gpsResult.latitude,
          longitude: gpsResult.longitude,
          accuracy: gpsResult.accuracy,
          altitude: gpsResult.altitude,
          address: gpsResult.address || job.client.address,
          mapUrl: gpsResult.mapUrl,
          satelliteUrl: gpsResult.satelliteUrl,
          directionsUrl: gpsResult.directionsUrl,
          capturedAt: gpsResult.capturedAt,
          source: gpsResult.source,
        } : undefined,
      };

      // Store these coordinates within the job's photos array immediately
      const updatedPhotos = [newPhoto, ...job.photos];

      onUpdateJob({
        ...job,
        photos: updatedPhotos,
        gpsCoordinates: gpsResult?.source === 'browser_geolocation'
          ? {
              latitude: gpsResult.latitude,
              longitude: gpsResult.longitude,
              address: gpsResult.address || job.client.address,
              accuracy: gpsResult.accuracy,
              mapUrl: gpsResult.mapUrl,
            }
          : job.gpsCoordinates,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Inspect photo with Gemini Vision and preserve GPS coordinates
  const handleAnalyzePhotoWithAI = async () => {
    if (!photoPreview) return;
    setIsAnalyzingPhoto(true);
    setPhotoAnalysisError(null);

    try {
      const res = await authedFetch('/api/analyze-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: photoPreview,
          categoryHint: photoCategory,
          roomName: job.dimensions[0]?.roomName || 'Loss Area',
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setAnalyzedResult(json.data);

        // Update the photo in job.photos (matching activePhotoId or top photo)
        const targetId = activePhotoId || (job.photos[0] ? job.photos[0].id : null);
        let updatedPhotos = [...job.photos];

        if (targetId) {
          updatedPhotos = updatedPhotos.map((p) => {
            if (p.id === targetId) {
              return {
                ...p,
                caption: `${job.dimensions[0]?.roomName || 'Field'} – ${json.data.substrate || 'Inspection Evidence'}`,
                category: json.data.category || p.category,
                technicalDescription: json.data.technicalDescription || p.technicalDescription,
                clientSummary: json.data.clientSummary || p.clientSummary,
                substrate: json.data.substrate || p.substrate,
                meterReading: json.data.meterReading || p.meterReading,
                thermalDelta: json.data.thermalDelta || p.thermalDelta,
                // Preserves captured GPS coordinates and Google Maps URLs!
              };
            }
            return p;
          });
        }

        let updatedMoisture = [...job.moistureReadings];
        const meterVal =
          json.data.numericReadingValue ??
          (json.data.meterReading ? parseFloat(json.data.meterReading.replace(/[^\d.]/g, '')) : null);
        if (meterVal !== null && !isNaN(meterVal)) {
          updatedMoisture.push({
            id: `mr-vision-${Date.now()}`,
            roomName: job.dimensions[0]?.roomName || 'Field Inspection',
            substrate: json.data.substrate || 'Gypsum / Subfloor',
            readingValue: meterVal,
            unit: '% WME',
            dryStandard: 12.0,
            isAffected: meterVal > 16.0,
            notes: 'Extracted automatically from meter display photo OCR',
          });
        }

        let updatedThermal = [...job.thermalReadings];
        const thermalVal =
          json.data.numericDeltaT ??
          (json.data.thermalDelta ? parseFloat(json.data.thermalDelta.replace(/[^\d.-]/g, '')) : null);
        if (thermalVal !== null && !isNaN(thermalVal)) {
          updatedThermal.push({
            id: `tr-vision-${Date.now()}`,
            roomName: job.dimensions[0]?.roomName || 'Field Inspection',
            deltaTFahrenheit: thermalVal,
            perimeterBoundaryDesc:
              json.data.perimeterBoundaryDesc || 'Cold evaporative cooling thermal anomaly detected along base cavity',
            hotspotOrCold: 'cold_anomaly',
          });
        }

        let updatedActions = [...job.actions];
        if (json.data.standardAction && !updatedActions.includes(json.data.standardAction)) {
          updatedActions.push(json.data.standardAction);
        }

        onUpdateJob({
          ...job,
          photos: updatedPhotos,
          moistureReadings: updatedMoisture,
          thermalReadings: updatedThermal,
          actions: updatedActions,
          updatedAt: new Date().toISOString(),
        });

        playConfirmationChime();
        speakAssistantFeedback(
          `Photo evidence recorded: ${
            json.data.meterReading || json.data.thermalDelta || json.data.substrate || 'Photo evidence'
          } recorded on ${json.data.substrate || 'substrate'}.`
        );
      } else {
        setPhotoAnalysisError(json.error || `Photo analysis failed (HTTP ${res.status})`);
      }
    } catch (err: any) {
      console.error('Photo analysis error:', err);
      setPhotoAnalysisError(`Photo analysis failed: ${err?.message || 'Server error'}`);
    } finally {
      setIsAnalyzingPhoto(false);
    }
  };

  const handleDeletePhoto = (photoId: string) => {
    const updated = job.photos.filter((p) => p.id !== photoId);
    onUpdateJob({ ...job, photos: updated });
    if (activePhotoId === photoId) {
      setActivePhotoId(null);
      setPhotoPreview(null);
      setAnalyzedResult(null);
      setPhotoAnalysisError(null);
    }
  };

  const handleCopyCoordinates = (photo: PhotoEvidence) => {
    if (!photo.gps) return;
    const text = `${photo.gps.latitude.toFixed(5)}, ${photo.gps.longitude.toFixed(5)}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedCoordId(photo.id);
      setTimeout(() => setCopiedCoordId(null), 2500);
    }
  };

  const handleCalibrateGps = async () => {
    setGpsCalibrateMessage('Requesting device location...');
    const result = await captureLocation(job.client.address, job.gpsCoordinates);
    if (result?.source !== 'browser_geolocation') {
      setGpsCalibrateMessage('Device location unavailable: allow location access to calibrate. The job location is unchanged.');
      setTimeout(() => setGpsCalibrateMessage(null), 4000);
      return;
    }
    onUpdateJob({
      ...job,
      gpsCoordinates: {
        latitude: result.latitude,
        longitude: result.longitude,
        address: result.address || job.client.address,
        accuracy: result.accuracy,
        mapUrl: result.mapUrl,
      },
    });
    setGpsCalibrateMessage(
      `✓ GPS Calibrated: ${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)}${result.accuracy ? ` (±${Math.round(result.accuracy)}m)` : ''}`
    );
    setTimeout(() => setGpsCalibrateMessage(null), 4000);
  };

  // Quick Action Tag insertion
  const handleAddQuickTag = (tag: string) => {
    let newTranscript = transcript;
    if (tag === 'flood_cut_24') {
      newTranscript += ' 24-inch flood cut required on wet drywall.';
      if (!job.actions.includes('FLOOD_CUT')) {
        onUpdateJob({ ...job, actions: [...job.actions, 'FLOOD_CUT'] });
      }
    } else if (tag === 'baseboard') {
      newTranscript += ' Remove all swollen baseboard trim and haul away.';
      if (!job.actions.includes('REMOVE_BASEBOARD')) {
        onUpdateJob({ ...job, actions: [...job.actions, 'REMOVE_BASEBOARD'] });
      }
    } else if (tag === 'antimicrobial') {
      newTranscript += ' Apply EPA registered botanical antimicrobial wash.';
      if (!job.actions.includes('APPLY_ANTIMICROBIAL')) {
        onUpdateJob({ ...job, actions: [...job.actions, 'APPLY_ANTIMICROBIAL'] });
      }
    } else if (tag === 'equipment_standard') {
      newTranscript += ' Place 4 centrifugal air movers and 1 LGR dehumidifier for 3 days.';
      onUpdateJob({
        ...job,
        equipment: {
          ...job.equipment,
          airMovers: 4,
          dehumidifiers: 1,
          dryingDays: 3,
        },
      });
    }
    setTranscript(newTranscript.trim());
  };

  const latestLog =
    job.psychrometricLogs && job.psychrometricLogs.length > 0
      ? job.psychrometricLogs[job.psychrometricLogs.length - 1]
      : null;


  const previewPhotoGps = job.photos.find((p) => p.id === activePhotoId)?.gps;
  const selectedMapLat = selectedMapPhoto?.gps?.latitude;
  const selectedMapLng = selectedMapPhoto?.gps?.longitude;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Field Tech Header Card */}
      <div className="bg-[#0B192C] text-white p-5 sm:p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider flex items-center gap-1">
              <Wrench className="w-3 h-3" />
              Sales Technician Field Scoping
            </span>
            <span className="text-xs text-slate-400">Job #{job.jobId}</span>
          </div>
          <h2 className="text-2xl font-black mt-1 text-white">
            {job.client.name} – {job.client.address}
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Loss Category: <span className="font-semibold text-emerald-400">{job.category}</span> ({job.finishType}) • Policy: {job.client.policyNumber}
          </p>
        </div>

        {/* On-Site Client QR Code Signing Trigger, Asset Scanner & Pipeline Nav */}
        <div className="flex flex-wrap items-center gap-2.5">
          {onNavigateToPipeline && (
            <button
              onClick={onNavigateToPipeline}
              className="px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
            >
              <TrendingUp className="w-4 h-4" />
              <span>Sales Pipeline</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowAssetScanner(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-blue-600/20 cursor-pointer"
            title="Scan equipment barcodes or room boundary markers"
          >
            <Barcode className="w-4 h-4 text-white" />
            <span>Scan Asset / Room Tag</span>
          </button>

          <button
            onClick={handleOpenQrModal}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            <span>Generate Client QR Sign</span>
          </button>

          <button
            onClick={onNavigateToPortal}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-700 flex items-center gap-1.5"
          >
            <span>Preview Client View</span>
            <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
          </button>
        </div>
      </div>

      {/* Google Maps Connected Property Location Card */}
      <div className="bg-[#0B192C] text-white rounded-2xl border border-slate-800 shadow-xl p-5 overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <MapPin className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-300 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800">
                  Google Maps Connected
                </span>
                {job.gpsCoordinates && (
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/60">
                    GPS: {job.gpsCoordinates.latitude.toFixed(4)}, {job.gpsCoordinates.longitude.toFixed(4)}
                  </span>
                )}
                {job.photos.filter(p => p.gps?.latitude).length > 0 && (
                  <span className="text-[10px] font-mono text-amber-300 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-800/60">
                    {job.photos.filter(p => p.gps?.latitude).length} Geotagged Pins
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-white mt-1">
                {job.client.address || 'Property Address'}
                {job.client.cityStateZip ? `, ${job.client.cityStateZip}` : ''}
              </h3>
              <p className="text-xs text-slate-300">
                Client: <span className="font-semibold text-white">{job.client.name}</span> • Phone: {job.client.phone} • Policy: {job.client.policyNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end lg:self-auto">
            <button
              type="button"
              onClick={() => setIsEditingAddress(!isEditingAddress)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-sky-400" />
              <span>{isEditingAddress ? 'Close Address Search' : 'Lookup / Autocomplete Address'}</span>
            </button>
          </div>
        </div>

        {/* Address Autocomplete Search Drawer */}
        {isEditingAddress && (
          <div className="mt-4 p-4 rounded-xl bg-slate-950/90 border border-sky-500/40 space-y-2 animate-in fade-in">
            <label className="block text-xs font-bold text-sky-300 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5" />
              <span>Search Client Property with Google Places Autocomplete:</span>
            </label>
            <AddressAutocompleteInput
              value={tempAddress}
              onChange={setTempAddress}
              onAddressSelect={handleAddressSelected}
              placeholder="Search property address (e.g. 1450 River Rd, Eugene OR)..."
              autoFocus
            />
            <p className="text-[11px] text-slate-400">
              Selecting a place updates the client street, city, state, zip code, and real GPS coordinates across the entire job and all insurance documents.
            </p>
          </div>
        )}

        {/* Live Interactive Google Map with Property & Geotagged Photo Pins */}
        <div className="mt-4">
          <JobLocationMap
            latitude={job.gpsCoordinates?.latitude}
            longitude={job.gpsCoordinates?.longitude}
            address={job.client.address}
            accuracy={job.gpsCoordinates?.accuracy}
            photos={job.photos}
            onRecalibrateGps={handleRecalibrateMapGps}
            height="260px"
          />
        </div>
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('scoping')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'scoping'
                ? 'bg-[#0B192C] text-white shadow-md'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <Mic className="w-3.5 h-3.5 text-amber-400" />
            <span>Field Dictation & Photo OCR</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('psychrometrics')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'psychrometrics'
                ? 'bg-[#0B192C] text-white shadow-md'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <ThermometerSnowflake className="w-3.5 h-3.5 text-emerald-400" />
            <span>Psychrometric & GPP Calculator</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black font-mono bg-emerald-500/20 text-emerald-700 border border-emerald-500/30">
              {latestLog ? `+${latestLog.grainDepressionDeltaGPP} GPP` : '+28 GPP'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all items-center gap-2 hidden sm:flex cursor-pointer ${
              activeSubTab === 'all'
                ? 'bg-[#0B192C] text-white shadow-md'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>All-in-One Field View</span>
          </button>
        </div>

        {latestLog && (
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 font-mono pr-2">
            <span>Day {latestLog.dayNumber}:</span>
            <span className="font-bold text-slate-800">
              Chamber {latestLog.affectedGPP} GPP → Dehu {latestLog.dehuOutletGPP} GPP
            </span>
            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              +{latestLog.grainDepressionDeltaGPP} GPP
            </span>
          </div>
        )}
      </div>

      {/* 1. Field Scoping Grid (Voice, Photo OCR, Saturation Dial, Dimensions, Equipment) */}
      {(activeSubTab === 'scoping' || activeSubTab === 'all') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Voice Scoping Studio & Quick-Tag Pads */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Push-to-Talk Voice Scoping Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Mic className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Push-to-Talk Field Dictation
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Speak naturally. Strict anti-calculation rule extracts raw measurements only.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleHandsFreeMode}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isHandsFreeMode
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-300'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                  title="Toggle hands-free live conversation while walking the loss site"
                >
                  <Headphones className="w-3.5 h-3.5 text-amber-300" />
                  <span>{isHandsFreeMode ? 'Hands-Free Walkthrough Active' : 'Enable Hands-Free Walkthrough'}</span>
                </button>

                {/* Dictation Status */}
                {isRecording && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-red-600" />
                    <span>{isHandsFreeMode ? 'Listening' : 'Recording'}</span>
                  </div>
                )}
              </div>
            </div>

            {isHandsFreeMode && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-950 text-xs flex items-center gap-2.5 animate-in fade-in">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping shrink-0" />
                <span className="font-medium">
                  <strong>Hands-Free Assistant Active:</strong> Walk through rooms and speak specifications continuously. A 2-second pause automatically parses measurements, plays a chime, and speaks verbal confirmation.
                </span>
              </div>
            )}

            {/* Dictation Box */}
            <div className="relative">
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={4}
                placeholder="Tap mic to dictate or type: 'Room is 14 by 10 with 8-foot ceiling. Supply line burst, 34.5% WME in drywall. 24-inch flood cut, 4 air movers, 1 dehu...'"
                className="w-full p-3.5 text-xs sm:text-sm font-mono border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-slate-50/50"
              />

              {/* Push-to-Talk Big Button */}
              <div className="absolute right-3 bottom-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`p-3 rounded-full shadow-md transition-all ${
                    isRecording
                      ? 'bg-red-600 text-white scale-110 ring-4 ring-red-200 animate-pulse'
                      : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                  }`}
                  title={isRecording ? 'Stop Recording' : 'Start Push-to-Talk'}
                >
                  {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Soundwave Animation while recording */}
            {isRecording && (
              <div className="mt-3 flex items-center justify-center gap-1 h-6 py-1">
                {[4, 12, 18, 8, 22, 14, 28, 16, 24, 10, 18, 6].map((h, i) => (
                  <span
                    key={i}
                    className="w-1 bg-red-500 rounded-full animate-bounce"
                    style={{
                      height: `${h}px`,
                      animationDelay: `${i * 0.08}s`,
                    }}
                  />
                ))}
              </div>
            )}

            {/* Quick-Tag Action Pads */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                1-Tap Standard Directives:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleAddQuickTag('flood_cut_24')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors flex items-center gap-1 border border-slate-200"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-600" />
                  + 24&quot; Flood Cut
                </button>
                <button
                  type="button"
                  onClick={() => handleAddQuickTag('baseboard')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors flex items-center gap-1 border border-slate-200"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-600" />
                  + Remove Baseboard
                </button>
                <button
                  type="button"
                  onClick={() => handleAddQuickTag('antimicrobial')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors flex items-center gap-1 border border-slate-200"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-600" />
                  + Antimicrobial
                </button>
                <button
                  type="button"
                  onClick={() => handleAddQuickTag('equipment_standard')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors flex items-center gap-1 border border-slate-200"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-600" />
                  + 4 Fans, 1 Dehu
                </button>
              </div>
            </div>

            {/* Parse Dictation Button */}
            <div className="mt-5 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Calls server-side Gemini 2.5 Flash
              </span>

              <button
                type="button"
                onClick={() => handleParseScopeWithAI()}
                disabled={isParsingScope || !transcript.trim()}
                className="px-5 py-2.5 rounded-xl bg-[#0B192C] hover:bg-slate-900 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-blue-950/20 disabled:opacity-50 cursor-pointer"
              >
                {isParsingScope ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                    <span>Extracting Raw Scope...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>Parse Field Scope</span>
                  </>
                )}
              </button>
            </div>

            {parseMessage && (
              <div className="mt-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{parseMessage}</span>
              </div>
            )}
          </div>

          {/* 1.5 One-Handed Rapid-Tap Scoping HUD */}
          <RapidTapScopingHud job={job} onUpdateJob={onUpdateJob} />

          {/* 2. Multimodal Photo & Vision OCR Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Multimodal Photo & Meter OCR Vision
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Upload damage photo, moisture meter screen, or FLIR thermal display.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isGpsLocating ? (
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
                    <span>Requesting device location...</span>
                  </div>
                ) : job.gpsCoordinates ? (
                  <div className="flex items-center gap-1.5">
                    <a
                      href={
                        job.gpsCoordinates.mapUrl ||
                        buildGoogleMapsUrl(job.gpsCoordinates.latitude, job.gpsCoordinates.longitude)
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded border border-emerald-300 transition-colors shadow-2xs"
                      title="View live job coordinates on Google Maps"
                    >
                      <MapPin className="w-3 h-3 text-emerald-600" />
                      <span>
                        {job.gpsCoordinates.latitude.toFixed(4)}, {job.gpsCoordinates.longitude.toFixed(4)}
                      </span>
                      <ExternalLink className="w-2.5 h-2.5 text-emerald-600" />
                    </a>

                    <button
                      type="button"
                      onClick={handleCalibrateGps}
                      className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                      title="Calibrate with this device's location"
                    >
                      <Crosshair className="w-3.5 h-3.5 text-slate-600" />
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            {gpsCalibrateMessage && (
              <div className="mb-3 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] flex items-center justify-between animate-in fade-in">
                <span>{gpsCalibrateMessage}</span>
                {job.gpsCoordinates && (
                  <a
                    href={buildGoogleMapsUrl(job.gpsCoordinates.latitude, job.gpsCoordinates.longitude)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-emerald-700 hover:underline flex items-center gap-1 ml-2"
                  >
                    <span>View on Google Maps</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            )}

            {/* Category Selector */}
            <div className="flex gap-2 mb-4">
              {[
                ['moisture_meter', 'Moisture Meter OCR'],
                ['damage', 'Structural Damage'],
                ['thermal', 'FLIR Thermal Screen'],
              ].map(([cat, label]) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setPhotoCategory(cat as any)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all text-center ${
                    photoCategory === cat
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Photo Capture Dropzone */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              onChange={handlePhotoSelect}
              className="hidden"
            />

            {!photoPreview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-8 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-blue-50/30"
              >
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 mx-auto flex items-center justify-center mb-3">
                  <Camera className="w-6 h-6" />
                </div>
                <div className="text-xs font-bold text-slate-800">
                  Tap to Take Photo or Upload Image
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  GPS coordinates automatically captured and stored into photos array
                </p>
                <div className="mt-2 inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-mono">
                  <MapPin className="w-3 h-3" />
                  <span>Google Maps Geolocation Pin Active</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-xl overflow-hidden border border-slate-200 max-h-72 bg-black flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoPreview}
                    alt="Inspection preview"
                    className="max-h-72 w-auto object-contain"
                  />

                  {/* Floating Geolocation Overlay on Preview */}
                  {previewPhotoGps ? (
                  <div className="absolute bottom-2 left-2 right-2 bg-slate-950/85 backdrop-blur-xs text-white px-3 py-2 rounded-xl flex items-center justify-between text-xs border border-white/10 shadow-lg">
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="font-bold">
                        {previewPhotoGps.latitude.toFixed(5)},{' '}
                        {previewPhotoGps.longitude.toFixed(5)}
                      </span>
                      {previewPhotoGps.accuracy ? (
                        <span className="text-slate-400 text-[10px]">
                          (±{Math.round(previewPhotoGps.accuracy)}m)
                        </span>
                      ) : null}
                    </div>

                    <a
                      href={
                        previewPhotoGps.mapUrl ||
                        buildGoogleMapsUrl(previewPhotoGps.latitude, previewPhotoGps.longitude)
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold transition-colors"
                    >
                      <MapPin className="w-3 h-3" />
                      <span>Google Maps</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  ) : (
                  <div className="absolute bottom-2 left-2 right-2 bg-slate-950/85 backdrop-blur-xs text-slate-300 px-3 py-2 rounded-xl flex items-center gap-1.5 text-[11px] border border-white/10 shadow-lg">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>No location recorded</span>
                  </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setPhotoPreview(null);
                      setAnalyzedResult(null);
                      setPhotoAnalysisError(null);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleAnalyzePhotoWithAI}
                  disabled={isAnalyzingPhoto}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {isAnalyzingPhoto ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Reading Meter Digits & Forensic Evidence...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-emerald-300" />
                      <span>Inspect with Gemini Multimodal Vision</span>
                    </>
                  )}
                </button>

                {photoAnalysisError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
                    {photoAnalysisError}
                  </div>
                )}

                {analyzedResult && (
                  <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 text-xs space-y-2">
                    <div className="flex items-center justify-between font-bold text-blue-900 border-b border-blue-200 pb-1.5">
                      <span>Forensic Analysis Result</span>
                      {analyzedResult.meterReading && (
                        <span className="font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                          {analyzedResult.meterReading}
                        </span>
                      )}
                      {analyzedResult.thermalDelta && (
                        <span className="font-mono text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
                          {analyzedResult.thermalDelta}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-800">Substrate: </span>
                      <span className="text-slate-700">{analyzedResult.substrate}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-800">Adjuster Scope: </span>
                      <span className="text-slate-600">{analyzedResult.technicalDescription}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-800">Client Summary: </span>
                      <span className="text-slate-600">{analyzedResult.clientSummary}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. Geotagged Photo Evidence Ledger & Google Maps Verification */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 mb-4 gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Map className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>Geotagged Photo Evidence & Mapping</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono font-semibold">
                      {job.photos.length} photos
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    GPS coordinates captured automatically with Google Maps visualization links.
                  </p>
                </div>
              </div>

              {job.photos.length > 0 && job.gpsCoordinates && (
                <a
                  href={buildGoogleMapsUrl(job.gpsCoordinates.latitude, job.gpsCoordinates.longitude)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-200 transition-colors"
                >
                  <Compass className="w-3.5 h-3.5 text-emerald-600" />
                  <span>View All on Google Maps</span>
                  <ExternalLink className="w-3 h-3 text-emerald-600" />
                </a>
              )}
            </div>

            {/* Photo Cards List */}
            {job.photos.length === 0 ? (
              <div className="py-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs">
                No photo evidence captured yet. Use the camera above to capture geotagged photos.
              </div>
            ) : (
              <div className="space-y-4">
                {job.photos.map((photo, pIdx) => {
                  const lat = photo.gps?.latitude;
                  const lng = photo.gps?.longitude;
                  const hasLocation = lat != null && lng != null;
                  const gmapsUrl = photo.gps?.mapUrl || (hasLocation ? buildGoogleMapsUrl(lat, lng) : '');
                  const directionsUrl = photo.gps?.directionsUrl || (hasLocation ? buildGoogleMapsDirectionsUrl(lat, lng) : '');
                  const satelliteUrl = photo.gps?.satelliteUrl || (hasLocation ? buildGoogleMapsSatelliteUrl(lat, lng) : '');
                  const accuracyText = photo.gps?.accuracy ? `±${Math.round(photo.gps.accuracy)}m` : '';

                  return (
                    <div
                      key={photo.id || pIdx}
                      className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition-all shadow-xs flex flex-col md:flex-row gap-4"
                    >
                      {/* Photo Thumbnail */}
                      <div className="relative w-full md:w-44 h-32 md:h-auto rounded-lg overflow-hidden bg-slate-900 shrink-0 group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.dataUrl}
                          alt={photo.caption}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <button
                          type="button"
                          onClick={() => setPreviewEnlargePhoto(photo)}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1"
                        >
                          <Maximize2 className="w-4 h-4" />
                          <span>Enlarge</span>
                        </button>

                        <div className="absolute top-2 left-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              photo.category === 'moisture_meter'
                                ? 'bg-red-600 text-white'
                                : photo.category === 'thermal'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-800/90 text-white'
                            }`}
                          >
                            {photo.category.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      {/* Photo Details & Geolocation */}
                      <div className="flex-1 flex flex-col justify-between space-y-2">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="text-xs font-bold text-slate-900">
                                {photo.roomName || 'Loss Area'} — {photo.substrate || photo.caption}
                              </h4>
                              <p className="text-[11px] text-slate-500">
                                Recorded at {photo.timestamp || 'Today'}
                              </p>
                            </div>

                            {/* Meter reading or thermal badge */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {photo.meterReading && (
                                <span className="font-mono text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                                  {photo.meterReading}
                                </span>
                              )}
                              {photo.thermalDelta && (
                                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                                  {photo.thermalDelta}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeletePhoto(photo.id)}
                                className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                title="Delete Photo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                            {photo.technicalDescription}
                          </p>
                        </div>

                        {/* Dedicated Geolocation Verification Box */}
                        {hasLocation ? (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-800">
                              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="font-bold">
                                {lat.toFixed(5)}°, {lng.toFixed(5)}°
                              </span>
                              {accuracyText && (
                                <span className="text-slate-400 font-sans text-[10px]">
                                  ({accuracyText})
                                </span>
                              )}
                            </div>

                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              {photo.gps?.source === 'browser_geolocation'
                                ? 'Device GPS'
                                : 'Job Site Location'}
                            </span>
                          </div>

                          {/* Google Maps Actions Bar */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/60">
                            {/* Primary: View on Google Maps Link */}
                            <a
                              href={gmapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#0B192C] hover:bg-slate-900 text-white text-[11px] font-bold transition-all shadow-xs"
                            >
                              <MapPin className="w-3 h-3 text-emerald-400" />
                              <span>View on Google Maps</span>
                              <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                            </a>

                            {/* Secondary: Directions Link */}
                            <a
                              href={directionsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200 transition-colors"
                            >
                              <Navigation className="w-3 h-3 text-blue-600" />
                              <span>Route</span>
                            </a>

                            {/* Secondary: Satellite Link */}
                            <a
                              href={satelliteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200 transition-colors"
                            >
                              <Globe className="w-3 h-3 text-indigo-600" />
                              <span>Satellite</span>
                            </a>

                            {/* Map Preview Modal Button */}
                            <button
                              type="button"
                              onClick={() => setSelectedMapPhoto(photo)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200 transition-colors"
                            >
                              <Map className="w-3 h-3 text-amber-600" />
                              <span>Pin Preview</span>
                            </button>

                            {/* Copy Coordinates Button */}
                            <button
                              type="button"
                              onClick={() => handleCopyCoordinates(photo)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white hover:bg-slate-100 text-slate-600 text-[11px] border border-slate-200 transition-colors ml-auto"
                              title="Copy latitude & longitude"
                            >
                              {copiedCoordId === photo.id ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span className="text-emerald-700 font-semibold">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                        ) : (
                          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-[11px] text-slate-500 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>No location recorded</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Readings, Moisture Dial, Dimensions & Equipment */}
        <div className="lg:col-span-5 space-y-6">
          {/* Psychrometric Grain Depression Quick-Card */}
          <div className="bg-gradient-to-br from-slate-900 to-[#0B192C] text-white rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-md">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <ThermometerSnowflake className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Grain Depression (GPP)
                </h4>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-400/20 text-emerald-300 font-bold border border-emerald-400/30">
                IICRC S500 §12
              </span>
            </div>

            <div className="flex items-baseline justify-between mb-3">
              <div>
                <span className="text-3xl font-black font-mono text-emerald-400">
                  {latestLog ? `+${latestLog.grainDepressionDeltaGPP} GPP` : '+28 GPP'}
                </span>
                <span className="text-xs text-slate-400 block mt-0.5">
                  Dehumidifier Extraction Rate
                </span>
              </div>
              <div className="text-right text-xs font-mono text-slate-300">
                <div>Intake: {latestLog ? `${latestLog.affectedGPP} GPP` : '82 GPP'}</div>
                <div>Exhaust: {latestLog ? `${latestLog.dehuOutletGPP} GPP` : '54 GPP'}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveSubTab('psychrometrics')}
              className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              <span>Open Psychrometric Calculator</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 1. Moisture Level Visual Dial */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Moisture Saturation Dial
                </h4>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">IICRC Standard: 12%</span>
            </div>

            {/* Visual Gauge Bar */}
            <div className="space-y-3">
              {job.moistureReadings.map((reading) => {
                const pct = Math.min(100, Math.max(0, (reading.readingValue / 50) * 100));
                const isSaturated = reading.readingValue > 25;
                const isElevated = reading.readingValue > 16 && reading.readingValue <= 25;

                return (
                  <div key={reading.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-bold text-slate-900 truncate">
                        {reading.substrate}
                      </span>
                      <span
                        className={`font-mono font-black text-sm ${
                          isSaturated
                            ? 'text-red-600'
                            : isElevated
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {reading.readingValue} {reading.unit}
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden relative">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isSaturated
                            ? 'bg-red-500'
                            : isElevated
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                      <span>Dry &lt;16%</span>
                      <span>Elevated 16-25%</span>
                      <span className="text-red-500 font-semibold">Saturated &gt;25%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Extracted Room Dimensions (Strict Raw Extraction) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-700" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Raw Room Dimensions
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowAssetScanner(true)}
                className="text-[11px] text-blue-700 hover:text-blue-900 font-bold bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Scan room boundary QR label"
              >
                <Barcode className="w-3.5 h-3.5" />
                <span>Scan Room Tag</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {job.dimensions.map((dim, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-slate-900">{dim.roomName}</div>
                    <div className="text-slate-500 text-[11px]">
                      {dim.lengthFt}&apos; L × {dim.widthFt}&apos; W × {dim.heightFt}&apos; H ceiling
                    </div>
                  </div>
                  <div className="text-right">
                    {dim.floodCutHeightInches ? (
                      <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-900 font-bold rounded text-[11px]">
                        {dim.floodCutHeightInches}&quot; Flood Cut
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">No cut</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Confirmed Equipment Deployment */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-slate-700" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Equipment Deployment
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
                  {job.equipment.dryingDays} Days Cycle
                </span>
                <button
                  type="button"
                  onClick={() => setShowAssetScanner(true)}
                  className="text-[11px] text-emerald-800 hover:text-emerald-950 font-bold bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Scan equipment QR barcode"
                >
                  <Barcode className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Scan Asset Tag</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-slate-500 text-[11px]">Air Movers (Fans)</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">
                  {job.equipment.airMovers}{' '}
                  <span className="text-xs font-normal text-slate-400">units</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-slate-500 text-[11px]">Dehumidifiers (LGR)</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">
                  {job.equipment.dehumidifiers}{' '}
                  <span className="text-xs font-normal text-slate-400">units</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-slate-500 text-[11px]">HEPA Air Scrubbers</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">
                  {job.equipment.airScrubbers}{' '}
                  <span className="text-xs font-normal text-slate-400">units</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-slate-500 text-[11px]">Drying Days</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">
                  {job.equipment.dryingDays}{' '}
                  <span className="text-xs font-normal text-slate-400">days</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Scanned On-Site Assets Audit Ledger */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <Barcode className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Scanned Asset & Label Audit
                </h4>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-bold border border-blue-200">
                  {job.scannedAssets?.length || 0} Scanned
                </span>
                <button
                  type="button"
                  onClick={() => setShowAssetScanner(true)}
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                  title="Open QR scanner"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {(!job.scannedAssets || job.scannedAssets.length === 0) ? (
              <div className="py-5 text-center text-xs text-slate-500 space-y-2">
                <p>No equipment barcodes or room tags scanned yet.</p>
                <button
                  type="button"
                  onClick={() => setShowAssetScanner(true)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors inline-flex items-center gap-1.5"
                >
                  <Barcode className="w-3.5 h-3.5 text-blue-600" />
                  <span>Open Tag Scanner</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {job.scannedAssets.slice(0, 5).map((asset) => (
                  <div
                    key={asset.id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between gap-2"
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
                        <div className="font-semibold text-slate-900 truncate">
                          {asset.model || asset.roomName || asset.serialNumber}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono truncate">
                          {asset.serialNumber ? `SN: ${asset.serialNumber}` : asset.notes}
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {asset.scannedAt.split('T')[1]?.slice(0, 5) || 'Today'}
                    </span>
                  </div>
                ))}

                {job.scannedAssets.length > 5 && (
                  <div className="text-center pt-1 text-[11px] text-slate-500">
                    + {job.scannedAssets.length - 5} more scanned items in ledger
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* 2. Full IICRC S500 Psychrometric & Grain Depression Calculator */}
      {(activeSubTab === 'psychrometrics' || activeSubTab === 'all') && (
        <div className={activeSubTab === 'all' ? 'pt-6 border-t border-slate-200' : ''}>
          <PsychrometricCalculator
            job={job}
            onUpdateJob={onUpdateJob}
            onOpenDocSuite={onOpenDocSuite}
          />
        </div>
      )}

      {/* On-Site Client QR Code Signing Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 text-center border border-slate-200">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 mx-auto flex items-center justify-center mb-3">
              <QrCode className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Hold Up For Client To Scan
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Client points their iPhone or Android camera to open their private Work Authorization and sign on their own phone.
            </p>

            <div className="my-5 p-4 bg-white rounded-2xl border-2 border-slate-900 inline-block shadow-inner">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt="Client Signing QR Code"
                  className="w-56 h-56 mx-auto object-contain"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-slate-400">
                  Generating QR...
                </div>
              )}
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setShowQrModal(false);
                  onNavigateToPortal();
                }}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all"
              >
                Open Client Portal Directly
              </button>

              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="w-full py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Close QR Code
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Maps Visualization Modal */}
      {selectedMapPhoto && selectedMapLat != null && selectedMapLng != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="bg-[#0B192C] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Google Maps Photo Geolocation Pin</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                      {selectedMapPhoto.gps?.source === 'browser_geolocation' ? 'Device GPS' : 'Job Site Location'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedMapPhoto.roomName} • {selectedMapPhoto.substrate || selectedMapPhoto.caption}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedMapPhoto(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Photo Preview Column */}
                <div className="space-y-3">
                  <div className="relative h-48 rounded-xl overflow-hidden bg-slate-950 border border-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedMapPhoto.dataUrl}
                      alt={selectedMapPhoto.caption}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-0.5 rounded bg-black/75 text-white text-[10px] font-bold uppercase tracking-wider">
                        {selectedMapPhoto.category.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                    <div className="font-bold text-slate-900">{selectedMapPhoto.caption}</div>
                    {selectedMapPhoto.meterReading && (
                      <div className="text-red-700 font-bold font-mono">
                        Meter Reading: {selectedMapPhoto.meterReading}
                      </div>
                    )}
                    {selectedMapPhoto.thermalDelta && (
                      <div className="text-blue-700 font-bold font-mono">
                        Thermal Delta: {selectedMapPhoto.thermalDelta}
                      </div>
                    )}
                    <div className="text-slate-500 text-[11px]">
                      Captured: {selectedMapPhoto.timestamp || 'Today'}
                    </div>
                  </div>
                </div>

                {/* Google Maps Embed & Pin Coordinates */}
                <div className="space-y-3 flex flex-col justify-between">
                  <div className="rounded-xl overflow-hidden border border-slate-300 shadow-inner bg-slate-100">
                    <JobLocationMap
                      latitude={selectedMapLat}
                      longitude={selectedMapLng}
                      address={selectedMapPhoto.gps?.address || job.client.address}
                      accuracy={selectedMapPhoto.gps?.accuracy}
                      height="192px"
                      showPhotoMarkers={false}
                    />
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">GPS Latitude:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {selectedMapLat.toFixed(5)}°
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">GPS Longitude:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {selectedMapLng.toFixed(5)}°
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">GPS Accuracy:</span>
                      <span className="font-mono font-semibold text-emerald-700">
                        {selectedMapPhoto.gps?.accuracy
                          ? `±${Math.round(selectedMapPhoto.gps.accuracy)} meters`
                          : 'Not recorded'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Property Address:</span>
                      <span className="text-slate-700 text-[11px] truncate max-w-[180px]">
                        {selectedMapPhoto.gps?.address || job.client.address}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons with Google Maps URLs */}
              <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyCoordinates(selectedMapPhoto)}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  {copiedCoordId === selectedMapPhoto.id ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy Coordinates</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <a
                    href={
                      selectedMapPhoto.gps?.directionsUrl ||
                      buildGoogleMapsDirectionsUrl(selectedMapLat, selectedMapLng)
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold border border-slate-300 transition-colors flex items-center gap-1.5"
                  >
                    <Navigation className="w-3.5 h-3.5 text-blue-600" />
                    <span>Get Route</span>
                  </a>

                  <a
                    href={
                      selectedMapPhoto.gps?.satelliteUrl ||
                      buildGoogleMapsSatelliteUrl(selectedMapLat, selectedMapLng)
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold border border-slate-300 transition-colors flex items-center gap-1.5"
                  >
                    <Globe className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Satellite</span>
                  </a>

                  <a
                    href={
                      selectedMapPhoto.gps?.mapUrl ||
                      buildGoogleMapsUrl(selectedMapLat, selectedMapLng)
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-[#0B192C] hover:bg-slate-900 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-slate-900/20"
                  >
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <span>Open in Google Maps</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enlarged Photo Modal */}
      {previewEnlargePhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-[#0B192C] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-blue-400" />
                <h4 className="text-sm font-bold text-white">
                  {previewEnlargePhoto.roomName} — {previewEnlargePhoto.caption}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setPreviewEnlargePhoto(null)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors text-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="relative max-h-[60vh] bg-black rounded-2xl overflow-hidden flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewEnlargePhoto.dataUrl}
                  alt={previewEnlargePhoto.caption}
                  className="max-h-[60vh] w-auto object-contain"
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="text-xs space-y-1">
                  <div className="font-bold text-slate-900">
                    {previewEnlargePhoto.technicalDescription}
                  </div>
                  <div className="text-slate-500 font-mono text-[11px] flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-emerald-600" />
                    <span>
                      {previewEnlargePhoto.gps
                        ? `GPS: ${previewEnlargePhoto.gps.latitude.toFixed(5)}, ${previewEnlargePhoto.gps.longitude.toFixed(5)}${
                            previewEnlargePhoto.gps.accuracy ? ` (±${Math.round(previewEnlargePhoto.gps.accuracy)}m)` : ''
                          }`
                        : 'No location recorded'}
                    </span>
                  </div>
                </div>

                {previewEnlargePhoto.gps && (
                <a
                  href={
                    previewEnlargePhoto.gps.mapUrl ||
                    buildGoogleMapsUrl(previewEnlargePhoto.gps.latitude, previewEnlargePhoto.gps.longitude)
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-2 shrink-0 shadow-xs"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>View Pin on Google Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Field Asset & Room Tag Scanner Modal */}
      <QrAssetScannerModal
        isOpen={showAssetScanner}
        onClose={() => setShowAssetScanner(false)}
        job={job}
        onUpdateJob={onUpdateJob}
      />

      {/* Floating Gemini Live Real-Time Conversational Scoping Dock */}
      <GeminiLiveScopingBar
        job={job}
        onUpdateJob={onUpdateJob}
        onOpenAssetScanner={() => setShowAssetScanner(true)}
      />
    </div>
  );
}
