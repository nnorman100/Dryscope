'use client';

import { useState, useEffect, useCallback } from 'react';

export interface PhotoGpsCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number; // in meters (e.g. ±3.5m)
  altitude?: number | null;
  address?: string;
  mapUrl: string;
  satelliteUrl: string;
  directionsUrl: string;
  embedUrl: string;
  capturedAt: string;
  source: 'browser_geolocation' | 'site_fallback' | 'manual';
}

/**
 * Builds standard Google Maps URL with lat/long query pin.
 */
export function buildGoogleMapsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

/**
 * Builds Google Maps satellite view link.
 */
export function buildGoogleMapsSatelliteUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps?q=${latitude},${longitude}&t=k`;
}

/**
 * Builds Google Maps turn-by-turn navigation / directions link.
 */
export function buildGoogleMapsDirectionsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
}

/**
 * Builds embeddable Google Maps iframe source URL.
 */
export function buildGoogleMapsEmbedUrl(latitude: number, longitude: number): string {
  return `https://maps.google.com/maps?q=${latitude},${longitude}&t=&z=16&ie=UTF8&iwloc=&output=embed`;
}

/**
 * Formats coordinates for professional field reports & adjuster submissions.
 * E.g., 44.04620° N, 123.02200° W (±4m)
 */
export function formatCoordinatesDMS(latitude: number, longitude: number, accuracy?: number): string {
  const latDir = latitude >= 0 ? 'N' : 'S';
  const lngDir = longitude >= 0 ? 'E' : 'W';
  const latStr = `${Math.abs(latitude).toFixed(5)}° ${latDir}`;
  const lngStr = `${Math.abs(longitude).toFixed(5)}° ${lngDir}`;
  const accStr = accuracy ? ` (±${Math.round(accuracy)}m)` : '';
  return `${latStr}, ${lngStr}${accStr}`;
}

/**
 * Custom React Hook: usePhotoGeolocation
 * Automatically captures browser geolocation when photos are captured in the field,
 * returns coordinates and pre-computed Google Maps visualization URLs.
 */
export function usePhotoGeolocation() {
  const [isLocating, setIsLocating] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<PhotoGpsCoordinates | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<
    'prompt' | 'granted' | 'denied' | 'unsupported'
  >('prompt');

  // Check initial browser permission status if supported
  useEffect(() => {
    if (typeof window !== 'undefined' && 'permissions' in navigator) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((status) => {
          setPermissionStatus(status.state as any);
          status.onchange = () => {
            setPermissionStatus(status.state as any);
          };
        })
        .catch(() => {
          // Permissions API query not supported for geolocation in some browsers
        });
    }
  }, []);

  /**
   * Capture real-time geolocation with browser GPS.
   * If GPS is unavailable or blocked, falls back cleanly to provided site coordinates.
   */
  const captureLocation = useCallback(
    async (
      fallbackAddress?: string,
      fallbackCoords?: { latitude: number; longitude: number; address?: string }
    ): Promise<PhotoGpsCoordinates> => {
      setIsLocating(true);
      setGeoError(null);

      const timestamp = new Date().toISOString();

      return new Promise<PhotoGpsCoordinates>((resolve) => {
        if (typeof window === 'undefined' || !('geolocation' in navigator)) {
          const fallback = createFallbackCoordinates(
            fallbackCoords,
            fallbackAddress,
            timestamp,
            'Browser does not support geolocation'
          );
          setGeoError('Geolocation unsupported by browser');
          setIsLocating(false);
          setCurrentCoords(fallback);
          resolve(fallback);
          return;
        }

        const geoOptions: PositionOptions = {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 0,
        };

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = Number(pos.coords.latitude.toFixed(5));
            const lng = Number(pos.coords.longitude.toFixed(5));
            const accuracy = pos.coords.accuracy ? Number(pos.coords.accuracy.toFixed(1)) : undefined;

            const gpsResult: PhotoGpsCoordinates = {
              latitude: lat,
              longitude: lng,
              accuracy,
              altitude: pos.coords.altitude ? Number(pos.coords.altitude.toFixed(1)) : null,
              address: fallbackAddress || 'Job Site Location',
              mapUrl: buildGoogleMapsUrl(lat, lng),
              satelliteUrl: buildGoogleMapsSatelliteUrl(lat, lng),
              directionsUrl: buildGoogleMapsDirectionsUrl(lat, lng),
              embedUrl: buildGoogleMapsEmbedUrl(lat, lng),
              capturedAt: timestamp,
              source: 'browser_geolocation',
            };

            setCurrentCoords(gpsResult);
            setIsLocating(false);
            setGeoError(null);
            setPermissionStatus('granted');
            resolve(gpsResult);
          },
          (err) => {
            let errMsg = 'Location capture failed';
            if (err.code === err.PERMISSION_DENIED) {
              errMsg = 'Geolocation permission denied by user';
              setPermissionStatus('denied');
            } else if (err.code === err.POSITION_UNAVAILABLE) {
              errMsg = 'GPS signal unavailable';
            } else if (err.code === err.TIMEOUT) {
              errMsg = 'GPS lock request timed out';
            }

            setGeoError(errMsg);

            const fallback = createFallbackCoordinates(
              fallbackCoords,
              fallbackAddress,
              timestamp,
              errMsg
            );

            setCurrentCoords(fallback);
            setIsLocating(false);
            resolve(fallback);
          },
          geoOptions
        );
      });
    },
    []
  );

  return {
    isLocating,
    currentCoords,
    geoError,
    permissionStatus,
    captureLocation,
    buildGoogleMapsUrl,
    buildGoogleMapsSatelliteUrl,
    buildGoogleMapsDirectionsUrl,
    buildGoogleMapsEmbedUrl,
    formatCoordinatesDMS,
  };
}

/**
 * Creates standardized fallback coordinates from job site data or defaults
 */
function createFallbackCoordinates(
  fallbackCoords?: { latitude: number; longitude: number; address?: string },
  fallbackAddress?: string,
  timestamp?: string,
  _reason?: string
): PhotoGpsCoordinates {
  const lat = fallbackCoords?.latitude ?? 44.0462;
  const lng = fallbackCoords?.longitude ?? -123.022;
  const time = timestamp ?? new Date().toISOString();
  const addr = fallbackCoords?.address || fallbackAddress || '742 Evergreen Terrace, Springfield, OR';

  return {
    latitude: lat,
    longitude: lng,
    accuracy: 12.0, // estimated site accuracy
    altitude: null,
    address: addr,
    mapUrl: buildGoogleMapsUrl(lat, lng),
    satelliteUrl: buildGoogleMapsSatelliteUrl(lat, lng),
    directionsUrl: buildGoogleMapsDirectionsUrl(lat, lng),
    embedUrl: buildGoogleMapsEmbedUrl(lat, lng),
    capturedAt: time,
    source: 'site_fallback',
  };
}
