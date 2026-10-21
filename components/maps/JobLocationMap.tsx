'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap
} from '@vis.gl/react-google-maps';
import {
  MapPin,
  Navigation,
  Crosshair,
  ExternalLink,
  Camera,
  Layers,
  Thermometer,
  Gauge,
  Sparkles,
  Info
} from 'lucide-react';
import {
  GOOGLE_MAPS_ENABLED,
  GOOGLE_MAPS_MAP_ID,
  GMP_INTERNAL_ATTRIBUTION_IDS,
  getDirectionsUrl
} from '@/lib/maps-config';
import { PhotoEvidence } from '@/lib/types';

interface JobLocationMapProps {
  latitude?: number;
  longitude?: number;
  address?: string;
  accuracy?: number;
  photos?: PhotoEvidence[];
  onRecalibrateGps?: (coords: { latitude: number; longitude: number; accuracy?: number }) => void;
  height?: string;
  className?: string;
  showPhotoMarkers?: boolean;
}

// Subcomponent to smoothly pan map when center changes
function MapCenterController({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    if (lat && lng && lat !== 0 && lng !== 0) {
      map.panTo({ lat, lng });
    }
  }, [map, lat, lng]);

  return null;
}

/**
 * Shown in place of the map when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set.
 * Keeps the address and a directions link, which need no key.
 */
function MapUnavailableNotice({ address, latitude, longitude, height, className }: JobLocationMapProps) {
  const hasCoords = Boolean(latitude && longitude && (latitude !== 0 || longitude !== 0));
  const directionsUrl = hasCoords || address ? getDirectionsUrl(latitude || 0, longitude || 0, address) : null;
  return (
    <div
      role="status"
      className={`relative w-full rounded-xl overflow-hidden border border-dashed border-slate-400 bg-slate-100 text-slate-700 flex flex-col items-center justify-center gap-2 p-4 text-center ${className}`}
      style={{ height }}
    >
      <MapPin className="w-6 h-6 text-slate-400" />
      <p className="text-xs font-semibold">Map unavailable</p>
      <p className="text-[11px] text-slate-500 max-w-xs">
        Google Maps is not configured for this deployment (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set).
        Addresses can still be typed by hand.
      </p>
      {address && <p className="text-[11px] font-medium text-slate-700">{address}</p>}
      {directionsUrl && (
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-sky-700 underline inline-flex items-center gap-1"
        >
          <Navigation className="w-3 h-3" /> Open directions
        </a>
      )}
    </div>
  );
}

export const JobLocationMap: React.FC<JobLocationMapProps> = (props) => {
  if (!GOOGLE_MAPS_ENABLED) return <MapUnavailableNotice {...props} />;
  return <LiveJobLocationMap {...props} />;
};

const LiveJobLocationMap: React.FC<JobLocationMapProps> = ({
  latitude,
  longitude,
  address,
  accuracy,
  photos = [],
  onRecalibrateGps,
  height = '320px',
  className = '',
  showPhotoMarkers = true
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoEvidence | null>(null);
  const [showPropertyInfo, setShowPropertyInfo] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Fallback coords if none provided (e.g. San Francisco or default US)
  const defaultCoords = useMemo(() => {
    if (latitude && longitude && (latitude !== 0 || longitude !== 0)) {
      return { lat: latitude, lng: longitude };
    }
    return { lat: 37.7749, lng: -122.4194 };
  }, [latitude, longitude]);

  const hasValidJobCoords = Boolean(
    latitude && longitude && (latitude !== 0 || longitude !== 0)
  );

  // Extract photos with GPS coordinates
  const geotaggedPhotos = useMemo(() => {
    if (!showPhotoMarkers) return [];
    return photos.filter(
      p => p.gps && p.gps.latitude && p.gps.longitude && (p.gps.latitude !== 0 || p.gps.longitude !== 0)
    );
  }, [photos, showPhotoMarkers]);

  const handleRecalibrate = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setIsLocating(false);
        if (onRecalibrateGps) {
          onRecalibrateGps({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy)
          });
        }
      },
      err => {
        setIsLocating(false);
        console.warn('Geolocation error:', err.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const directionsUrl = useMemo(() => {
    if (!hasValidJobCoords && !address) return null;
    return getDirectionsUrl(latitude || 0, longitude || 0, address);
  }, [latitude, longitude, address, hasValidJobCoords]);

  return (
    <div
      className={`relative w-full rounded-xl overflow-hidden border border-slate-700/80 bg-slate-900 shadow-xl ${className}`}
      style={{ height }}
    >
      <Map
        mapId={GOOGLE_MAPS_MAP_ID}
        defaultCenter={defaultCoords}
        defaultZoom={hasValidJobCoords ? 17 : 4}
        gestureHandling="greedy"
        disableDefaultUI={false}
        mapTypeControl={true}
        streetViewControl={false}
        fullscreenControl={true}
        zoomControl={true}
        internalUsageAttributionIds={GMP_INTERNAL_ATTRIBUTION_IDS}
        className="w-full h-full"
      >
        <MapCenterController lat={defaultCoords.lat} lng={defaultCoords.lng} />

        {/* Primary Job Property Marker */}
        {hasValidJobCoords && (
          <AdvancedMarker
            position={{ lat: latitude!, lng: longitude! }}
            title={`Job Location: ${address || 'Restoration Site'}`}
            onClick={() => setShowPropertyInfo(true)}
          >
            <div className="relative group cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-600 to-emerald-500 p-0.5 shadow-lg shadow-sky-950/80 flex items-center justify-center animate-pulse">
                <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-sky-400" />
                </div>
              </div>
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-emerald-400 rotate-45 shadow"></div>
            </div>
          </AdvancedMarker>
        )}

        {/* InfoWindow for Property */}
        {showPropertyInfo && hasValidJobCoords && (
          <InfoWindow
            position={{ lat: latitude!, lng: longitude! }}
            onCloseClick={() => setShowPropertyInfo(false)}
          >
            <div className="p-2 max-w-xs text-slate-900">
              <div className="flex items-center gap-1.5 text-xs font-bold text-sky-700 uppercase tracking-wider mb-1">
                <Sparkles className="w-3.5 h-3.5" /> Scoped Property Site
              </div>
              <p className="text-sm font-semibold text-slate-900 leading-snug">
                {address || 'Restoration Project Location'}
              </p>
              <div className="mt-2 pt-2 border-t border-slate-200 text-[11px] text-slate-600 flex justify-between items-center">
                <span>
                  {latitude?.toFixed(5)}, {longitude?.toFixed(5)}
                </span>
                {accuracy && <span>±{accuracy}m accuracy</span>}
              </div>
              {directionsUrl && (
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 bg-sky-600 text-white rounded text-xs font-medium hover:bg-sky-700 transition"
                >
                  <Navigation className="w-3 h-3" /> Get Directions
                </a>
              )}
            </div>
          </InfoWindow>
        )}

        {/* Photo Evidence Markers */}
        {geotaggedPhotos.map(photo => {
          const isSelected = selectedPhoto?.id === photo.id;
          const isThermal = photo.category === 'thermal';
          const isMoisture = photo.category === 'moisture_meter';

          return (
            <AdvancedMarker
              key={photo.id}
              position={{
                lat: photo.gps!.latitude,
                lng: photo.gps!.longitude
              }}
              title={`${photo.roomName} - ${photo.category}`}
              onClick={() => setSelectedPhoto(photo)}
            >
              <div
                className={`relative cursor-pointer transition-transform duration-200 hover:scale-125 ${
                  isSelected ? 'scale-125 z-30' : 'z-20'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shadow-md border-2 ${
                    isThermal
                      ? 'bg-rose-500 border-rose-200 text-white'
                      : isMoisture
                      ? 'bg-cyan-500 border-cyan-200 text-white'
                      : 'bg-amber-500 border-amber-200 text-white'
                  }`}
                >
                  {isThermal ? (
                    <Thermometer className="w-3.5 h-3.5" />
                  ) : isMoisture ? (
                    <Gauge className="w-3.5 h-3.5" />
                  ) : (
                    <Camera className="w-3.5 h-3.5" />
                  )}
                </div>
              </div>
            </AdvancedMarker>
          );
        })}

        {/* InfoWindow for Geotagged Photo */}
        {selectedPhoto && selectedPhoto.gps && (
          <InfoWindow
            position={{
              lat: selectedPhoto.gps.latitude,
              lng: selectedPhoto.gps.longitude
            }}
            onCloseClick={() => setSelectedPhoto(null)}
          >
            <div className="p-1 max-w-[240px] text-slate-900">
              {selectedPhoto.dataUrl && (
                <div className="w-full h-24 mb-2 rounded overflow-hidden bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedPhoto.dataUrl}
                    alt={selectedPhoto.roomName}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="text-xs font-bold text-slate-900">
                {selectedPhoto.roomName}
              </div>
              <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">
                {selectedPhoto.technicalDescription || selectedPhoto.caption}
              </p>
              {selectedPhoto.meterReading && (
                <div className="mt-1 inline-block px-1.5 py-0.5 bg-cyan-100 text-cyan-800 rounded text-[10px] font-semibold">
                  {selectedPhoto.meterReading}
                </div>
              )}
              {selectedPhoto.thermalDelta && (
                <div className="mt-1 ml-1 inline-block px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded text-[10px] font-semibold">
                  Δ {selectedPhoto.thermalDelta}
                </div>
              )}
              <div className="mt-1.5 text-[9px] text-slate-400">
                Lat: {selectedPhoto.gps.latitude.toFixed(5)}, Lng:{' '}
                {selectedPhoto.gps.longitude.toFixed(5)}
              </div>
            </div>
          </InfoWindow>
        )}
      </Map>

      {/* Floating Header Controls */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-2.5 py-1.5 rounded-lg text-xs text-slate-200 flex items-center gap-2 shadow-lg">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
            <span className="font-semibold text-slate-100">
              {hasValidJobCoords ? 'Google Maps Connected' : 'Search Address to Pin'}
            </span>
          </div>
          {geotaggedPhotos.length > 0 && (
            <span className="px-1.5 py-0.5 bg-slate-800 text-sky-400 rounded text-[10px] font-mono border border-slate-700">
              {geotaggedPhotos.length} photo pins
            </span>
          )}
        </div>

        <div className="pointer-events-auto flex items-center gap-1.5">
          {onRecalibrateGps && (
            <button
              type="button"
              onClick={handleRecalibrate}
              disabled={isLocating}
              className="px-2.5 py-1.5 bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md border border-slate-700/80 rounded-lg text-xs font-medium text-slate-200 hover:text-white flex items-center gap-1.5 shadow-lg transition"
              title="Use current device GPS position"
            >
              <Crosshair
                className={`w-3.5 h-3.5 text-sky-400 ${
                  isLocating ? 'animate-spin' : ''
                }`}
              />
              <span className="hidden sm:inline">
                {isLocating ? 'Acquiring...' : 'Sync GPS'}
              </span>
            </button>
          )}

          {directionsUrl && (
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 bg-sky-600/90 hover:bg-sky-600 backdrop-blur-md rounded-lg text-xs font-medium text-white flex items-center gap-1.5 shadow-lg transition"
              title="Open turn-by-turn directions in Google Maps"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Directions</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
          )}
        </div>
      </div>

      {/* Floating Bottom Info Bar */}
      {hasValidJobCoords && (
        <div className="absolute bottom-2 left-3 right-3 pointer-events-none z-10 flex items-center justify-between">
          <div className="pointer-events-auto bg-slate-950/85 backdrop-blur-md border border-slate-800 px-2.5 py-1 rounded text-[11px] font-mono text-slate-400 shadow">
            GPS: {latitude?.toFixed(5)}, {longitude?.toFixed(5)}
            {accuracy ? ` (±${accuracy}m)` : ''}
          </div>
          <div className="pointer-events-auto text-[10px] text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded backdrop-blur border border-slate-800">
            Google Maps Platform
          </div>
        </div>
      )}
    </div>
  );
};
