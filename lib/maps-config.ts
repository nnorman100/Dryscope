/**
 * Google Maps Platform Configuration & Helpers
 * Provides centralized API key management, attribution tags, and Places utility functions.
 */

export const GOOGLE_MAPS_API_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
  'AIzaSyAEOQWesK2Yf1J1KblWQ89DgotTLzrAB-c';

export const GOOGLE_MAPS_MAP_ID =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';

export const GMP_INTERNAL_ATTRIBUTION_IDS = ['gmp_git_agentskills_v1'];

export interface ParsedPlaceDetails {
  formattedAddress: string;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  cityStateZip: string;
  lat: number;
  lng: number;
  displayName?: string;
}

/**
 * Extracts normalized street address, city, state, postal code, and lat/lng
 * from modern Places API New Place object addressComponents.
 */
export function extractPlaceDetails(
  place: google.maps.places.Place
): ParsedPlaceDetails | null {
  if (!place) return null;

  let streetNumber = '';
  let route = '';
  let city = '';
  let state = '';
  let postalCode = '';
  let country = '';

  if (place.addressComponents && Array.isArray(place.addressComponents)) {
    for (const comp of place.addressComponents) {
      const types = comp.types || [];
      if (types.includes('street_number')) {
        streetNumber = comp.longText || comp.shortText || '';
      } else if (types.includes('route')) {
        route = comp.longText || comp.shortText || '';
      } else if (types.includes('locality')) {
        city = comp.longText || comp.shortText || '';
      } else if (!city && types.includes('sublocality_level_1')) {
        city = comp.longText || comp.shortText || '';
      } else if (types.includes('administrative_area_level_1')) {
        state = comp.shortText || comp.longText || '';
      } else if (types.includes('postal_code')) {
        postalCode = comp.longText || comp.shortText || '';
      } else if (types.includes('country')) {
        country = comp.shortText || comp.longText || '';
      }
    }
  }

  const streetAddress = [streetNumber, route].filter(Boolean).join(' ');
  const cityStateZip = [
    city,
    [state, postalCode].filter(Boolean).join(' ')
  ]
    .filter(Boolean)
    .join(', ');

  const lat = place.location?.lat ? place.location.lat() : 0;
  const lng = place.location?.lng ? place.location.lng() : 0;

  const formattedAddress =
    place.formattedAddress ||
    [streetAddress, cityStateZip].filter(Boolean).join(', ') ||
    place.displayName ||
    '';

  return {
    formattedAddress,
    streetAddress: streetAddress || formattedAddress,
    city,
    state,
    postalCode,
    country,
    cityStateZip,
    lat,
    lng,
    displayName: typeof place.displayName === 'string' ? place.displayName : ''
  };
}

/**
 * Generates an official Google Maps navigation directions link.
 */
export function getDirectionsUrl(lat: number, lng: number, address?: string): string {
  if (address) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
