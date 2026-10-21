'use client';

import React from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_ENABLED } from '@/lib/maps-config';

interface GoogleMapsProviderProps {
  children: React.ReactNode;
}

export const GoogleMapsProvider: React.FC<GoogleMapsProviderProps> = ({ children }) => {
  // No key: render the app without Google Maps. Map components show a notice
  // and the address field becomes a plain text input.
  if (!GOOGLE_MAPS_ENABLED) {
    return <>{children}</>;
  }

  return (
    <APIProvider
      apiKey={GOOGLE_MAPS_API_KEY}
      solutionChannel="dryscope_field_scoping_v1"
    >
      {children}
    </APIProvider>
  );
};
