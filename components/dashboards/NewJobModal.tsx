'use client';

import React, { useState } from 'react';
import {
  X,
  Plus,
  MapPin,
  Building,
  User,
  Phone,
  Mail,
  Shield,
  FileText,
  Sparkles,
  Navigation,
  CheckCircle2,
  AlertCircle,
  Droplets,
  Biohazard
} from 'lucide-react';
import { RestorationJob, WaterLossCategory, FinishType, LossPerilType } from '@/lib/types';
import { AddressAutocompleteInput } from '@/components/maps/AddressAutocompleteInput';
import { JobLocationMap } from '@/components/maps/JobLocationMap';
import { ParsedPlaceDetails, getDirectionsUrl } from '@/lib/maps-config';

interface NewJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateJob: (jobData: Partial<RestorationJob>) => void;
}

export function NewJobModal({ isOpen, onClose, onCreateJob }: NewJobModalProps) {
  const [lossType, setLossType] = useState<LossPerilType>('water');
  const [clientName, setClientName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [cityStateZip, setCityStateZip] = useState('');
  const [insuranceCarrier, setInsuranceCarrier] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [category, setCategory] = useState<WaterLossCategory>('Cat 1 (Clean)');
  const [finishType, setFinishType] = useState<FinishType>('Finished');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [placeDetails, setPlaceDetails] = useState<ParsedPlaceDetails | null>(null);

  if (!isOpen) return null;

  const handleAddressSelect = (details: ParsedPlaceDetails) => {
    setPlaceDetails(details);
    setAddress(details.streetAddress || details.formattedAddress);
    if (details.cityStateZip) {
      setCityStateZip(details.cityStateZip);
    }
    if (details.lat && details.lng) {
      setCoords({ lat: details.lat, lng: details.lng });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const formattedJobId = `DS-2026-${Math.floor(Math.random() * 800 + 200)}`;

    const partialJob: Partial<RestorationJob> = {
      jobId: formattedJobId,
      lossType,
      category: lossType === 'mold' ? 'Cat 3 (Black / Mold)' : category,
      moldCondition: lossType === 'mold' ? 'Condition 3 (Active Microbial Growth)' : undefined,
      containmentRequired: lossType === 'mold',
      finishType,
      // Blank fields stay blank: no placeholder client, carrier or claim is invented
      client: {
        name: clientName.trim() || 'New client',
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        cityStateZip: cityStateZip.trim(),
        insuranceCarrier: insuranceCarrier.trim(),
        policyNumber: policyNumber.trim(),
        claimNumber: '',
        deductible: 0,
      },
      gpsCoordinates: coords
        ? {
            latitude: coords.lat,
            longitude: coords.lng,
            address: address || placeDetails?.formattedAddress || '',
            accuracy: 5,
            mapUrl: getDirectionsUrl(coords.lat, coords.lng, address),
          }
        : undefined,
      technicianNotes: '',
    };

    onCreateJob(partialJob);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl text-slate-100 flex flex-col">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-20 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>New Restoration Field Estimate</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Google Maps Connected
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Type address to auto-populate property geolocation, city, state, and zip.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6">
          {/* Section 1: Property Location & Address Autocomplete */}
          <div className="bg-slate-800/60 p-4 sm:p-5 rounded-xl border border-slate-700/80 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-sky-400" />
                <span>Loss Property Address (Google Places Autocomplete)</span>
              </label>
              {coords && (
                <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Pinned ({coords.lat.toFixed(4)}, {coords.lng.toFixed(4)})</span>
                </span>
              )}
            </div>

            <AddressAutocompleteInput
              value={address}
              onChange={setAddress}
              onAddressSelect={handleAddressSelect}
              placeholder="Search property address (e.g. 1450 River Rd, Eugene OR)..."
              autoFocus
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  City, State & ZIP Code
                </label>
                <input
                  type="text"
                  value={cityStateZip}
                  onChange={(e) => setCityStateZip(e.target.value)}
                  placeholder="Eugene, OR 97401"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  GPS Coordinates Status
                </label>
                <div className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-300 flex items-center justify-between">
                  <span>
                    {coords
                      ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
                      : 'Waiting for address selection...'}
                  </span>
                  {coords && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">
                      Live Pin
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Interactive Map Preview */}
            {coords && (
              <div className="pt-2">
                <label className="block text-[11px] text-slate-400 mb-1.5">
                  Interactive Google Maps Satellite & Street View Preview
                </label>
                <JobLocationMap
                  latitude={coords.lat}
                  longitude={coords.lng}
                  address={address}
                  height="190px"
                  showPhotoMarkers={false}
                />
              </div>
            )}
          </div>

          {/* Section 2: Client & Insurance Information */}
          <div className="bg-slate-800/40 p-4 sm:p-5 rounded-xl border border-slate-700/60 space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <User className="w-4 h-4 text-emerald-400" />
              <span>Client & Policy Information</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Client / Owner Name *
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="John & Sarah Miller"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 234-9988"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@example.com"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Insurance Carrier
                </label>
                <select
                  value={insuranceCarrier}
                  onChange={(e) => setInsuranceCarrier(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value="">Not provided</option>
                  <option value="State Farm">State Farm</option>
                  <option value="Allstate">Allstate</option>
                  <option value="Farmers">Farmers</option>
                  <option value="Travelers">Travelers</option>
                  <option value="Liberty Mutual">Liberty Mutual</option>
                  <option value="Chubb">Chubb</option>
                  <option value="USAA">USAA</option>
                  <option value="Self-Pay / Cash">Self-Pay / Cash</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Policy Number
                </label>
                <input
                  type="text"
                  value={policyNumber}
                  onChange={(e) => setPolicyNumber(e.target.value)}
                  placeholder="SF-7849204-B"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Primary Loss Peril (Water vs. Mold) & IICRC Classification */}
          <div className="bg-slate-800/40 p-4 sm:p-5 rounded-xl border border-slate-700/60 space-y-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 mb-2">
                <Shield className="w-4 h-4 text-amber-400" />
                <span>Primary Loss Peril (IICRC S500 vs. S520)</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLossType('water');
                    setCategory('Cat 1 (Clean)');
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 ${
                    lossType === 'water'
                      ? 'bg-sky-600 border-sky-400 text-white shadow-md'
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Droplets className="w-4 h-4 text-sky-400" />
                  <span>Water Damage (S500)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLossType('mold');
                    setCategory('Cat 3 (Black / Mold)');
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 ${
                    lossType === 'mold'
                      ? 'bg-rose-600 border-rose-400 text-white shadow-md'
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Biohazard className="w-4 h-4 text-rose-300" />
                  <span>Mold Remediation (S520)</span>
                </button>
              </div>
            </div>

            {lossType === 'water' ? (
              <div className="pt-2 border-t border-slate-800">
                <label className="block text-[11px] text-slate-400 mb-1.5">
                  Water Loss Classification (IICRC S500)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Cat 1 (Clean)', 'Cat 2 (Gray)', 'Cat 3 (Black)'] as WaterLossCategory[]).map(
                    (cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold border transition text-center ${
                          category === cat
                            ? 'bg-sky-950 border-sky-400 text-sky-200'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        {cat}
                      </button>
                    )
                  )}
                </div>
              </div>
            ) : (
              <div className="pt-2 border-t border-slate-800 text-xs space-y-1.5">
                <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs">
                  <div className="font-bold flex items-center gap-1.5">
                    <Biohazard className="w-3.5 h-3.5 text-rose-400" />
                    <span>IICRC S520 Condition 3 Microbial Protocol Active</span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1">
                    Critical containment barrier with negative pressure and HEPA air scrubbing required.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-600 hover:from-emerald-400 hover:to-sky-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-sky-500/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Estimate & Open Scoping</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
