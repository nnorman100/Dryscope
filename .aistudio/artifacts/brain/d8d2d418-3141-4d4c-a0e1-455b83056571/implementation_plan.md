# Google Maps Platform Integration & Client Address Autocomplete

Comprehensive architectural blueprint to integrate Google Maps Platform into DryScope, providing sales technicians and office estimators with interactive property mapping, forensic GPS photo pinning, and intelligent client address autocompletion using modern Places API (New) and `@vis.gl/react-google-maps`.

## User Review & Critical Decisions

> [!IMPORTANT]
> The custom Google Maps Platform API key has been verified and configured for client-side usage via `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. As this uses a dedicated key (BYOK), standard production error handling applies without demo quota banners.

- **Confirmed Decision 1 (SDK Standard)**: Utilizes the official modern `@vis.gl/react-google-maps` SDK with `AdvancedMarkerElement` and `mapId="DEMO_MAP_ID"`. Legacy `google.maps.Marker` and `DirectionsService` are strictly prohibited.
- **Confirmed Decision 2 (Address Autocomplete)**: Employs the modern Places API (New) `AutocompleteSuggestion.fetchAutocompleteSuggestions` with `AutocompleteSessionToken` paired with `Place.fetchFields`, ensuring optimized session billing and auto-populating street, city, state, zip code, and latitude/longitude coordinates.
- **Confirmed Decision 3 (Usage Attribution)**: Sets mandatory internal usage tracking attribution `gmp_mcp_codeassist_v1_aistudio` on all map instances.

---

## 1. Overview & Core Concept

- **What It Does**:
  1. **Client Address Autocomplete**: A dedicated, touch-optimized input on the Field Intake HUD, Job Edit modal, and Dispatch view that presents real-time street and business address suggestions as the technician types. Selecting an address parses standardized street, city, state, zip code, and exact geocoordinates into the job record.
  2. **Interactive Property & Forensic Damage Map**: Replaces static iframe fallbacks with a responsive, high-performance vector/raster Google Map featuring custom `AdvancedMarker` pins for the property centroid and geotagged moisture/thermal damage photos with accuracy rings.
  3. **Location Synchronization & Navigation**: Syncs geocoordinated addresses to Firebase Firestore so office estimators and field technicians maintain a shared view of job sites with one-tap turn-by-turn driving directions.
- **Target Audience / Persona**:
  - **Sales Technicians on Job Sites**: Rapidly intake new disaster loss addresses without typos; inspect GPS-stamped photo damage locations directly on the map.
  - **Office Estimators & Dispatchers**: View loss locations across the regional service territory and verify property risk zones.
- **Key Value**: Eliminates incorrect addresses, saves 3–5 minutes per customer intake, and establishes verifiable geospatial chain-of-custody for insurance carrier audits.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Intake & Address Autocomplete**:
   - Technician taps "Property Address" or "Edit Client Info" on the Field Dashboard or New Job Modal.
   - Technician types partial address (e.g., "1247 Willamette").
   - A drop-down menu displays debounced, high-contrast address predictions with primary text highlighted and secondary locality clearly delineated.
   - Upon tap, the system calls `place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location', 'addressComponents'] })`.
   - The street, city, state, postal code, and latitude/longitude are immediately updated and synced to Firestore.
2. **Interactive Property Map Inspection**:
   - The Field Dashboard features an interactive Google Map displaying the property pin with an amber beacon halo.
   - Geotagged damage photos appear as interactive visual pins. Tapping a photo pin opens an inspection card with moisture readings and thermal delta overlays.
   - Technicians can toggle between Roadmap and Satellite imagery, calibrate device GPS against the Google Maps address centroid, and launch navigation in Google Maps.

### Visual Identity & Theme
- **Color Tokens**:
  - Primary Field Background: `bg-slate-900` / `bg-[#0B192C]` with deep slate card surfaces (`bg-slate-800/90`).
  - Active Map Accents: Emergency Amber (`#F59E0B`), Restoration Emerald (`#10B981`), and High-Contrast Sky (`#0284C7`).
  - Autocomplete Suggestion Flyout: `bg-slate-800` border `border-slate-700` with text `text-slate-100` and subtle hover transitions `hover:bg-slate-700/80`.
- **Typography & Ergonomics**:
  - Large touch target autocomplete items (minimum 48px height) adhering to mobile field ergonomics.
  - Monospace formatting for coordinates (`font-mono text-xs text-amber-400`).

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: React Google Maps SDK Selection**
  - *Chosen Approach*: Official `@vis.gl/react-google-maps` with `APIProvider` wrapping the root application layout.
  - *Why*: Google Maps Platform engineering officially mandates `@vis.gl/react-google-maps` for modern React/Next.js. Avoids legacy callback wrappers and works with `AdvancedMarkerElement`.
  - *Alternatives Considered*: Legacy `@react-google-maps/api` (prohibited due to legacy API dependencies) or raw script injection (prone to race conditions).

- **Decision 2: Autocomplete Custom Hook vs. Native Web Component**
  - *Chosen Approach*: Custom hook `useAutocompleteSuggestions` using `AutocompleteSuggestion.fetchAutocompleteSuggestions` and `AutocompleteSessionToken`.
  - *Why*: Gives complete control over Tailwind styling, dark-mode field HUD aesthetics, keyboard navigation, and seamless state integration with `RestorationJob.client`.
  - *Alternatives Considered*: Native `<gmp-place-autocomplete>` element (less flexible to restyle for specialized industrial dark HUD theme and prone to JSX attribute stringification).

- **Decision 3: Map ID & Styling**
  - *Chosen Approach*: Use `mapId="DEMO_MAP_ID"` with `AdvancedMarker` and standard vector controls.
  - *Why*: Enables Vector Maps and `AdvancedMarkerElement` out-of-the-box without requiring custom Cloud Console styling setup.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DryScope Next.js App                            │
├────────────────────────────────────────────────────────────────────────┤
│  Root Provider Layer: <APIProvider apiKey={NEXT_PUBLIC_GMP_KEY}>       │
│                                                                        │
│   ┌────────────────────────────────┐  ┌─────────────────────────────┐  │
│   │ Client Address Autocomplete    │  │ Interactive Job Map Panel   │  │
│   │ • useAutocompleteSuggestions   │  │ • <Map mapId="DEMO_MAP_ID"> │  │
│   │ • Places API (New)             │  │ • <AdvancedMarker> Property │  │
│   │ • AutocompleteSessionToken     │  │ • <AdvancedMarker> Photos   │  │
│   │ • Place.fetchFields()          │  │ • Accuracy Boundary Ring    │  │
│   └───────────────┬────────────────┘  └──────────────┬──────────────┘  │
│                   │                                  │                 │
│                   ▼                                  ▼                 │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │               RestorationJob State & Reducer                   │   │
│   │  job.client.address  /  job.client.cityStateZip                │   │
│   │  job.gpsCoordinates { latitude, longitude, address }          │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │                                    │
│                                   ▼                                    │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │           Firebase Firestore Sync (syncJobToFirestore)          │   │
│   │         Collection: /jobs/{jobId} (Offline-Persistent)         │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

### Data Model & State Mapping
- `RestorationJob.client`:
  - `address`: Formatted street address (e.g., `1247 Willamette St`).
  - `cityStateZip`: Locality, administrative area, and postal code (e.g., `Eugene, OR 97401`).
- `RestorationJob.gpsCoordinates`:
  - `latitude`: Number (e.g., `44.04620`).
  - `longitude`: Number (e.g., `-123.02200`).
  - `address`: Full formatted reverse-geocoded address.
  - `accuracy`: Accuracy radius in meters.
  - `mapUrl`: Direct Google Maps navigation link.

### Interactive Components to Deliver:
1. `components/maps/GoogleMapsProvider.tsx`: Wrapper for `@vis.gl/react-google-maps` `APIProvider` with key resolution and error boundary.
2. `components/maps/ClientAddressAutocomplete.tsx`: Reusable, touch-friendly address search component with `useAutocompleteSuggestions`, debounced input, session token recycling, and `place.fetchFields()` extraction.
3. `components/maps/JobLocationMap.tsx`: Modern interactive map component with `AdvancedMarker`, satellite/roadmap switcher, photo evidence markers, and GPS recalibration.
4. Integration into `TechFieldDashboard.tsx` and job creation/edit flows in `app/page.tsx`.

---

## 5. Compliance & Verification Review

- [x] **Zero-Legacy Compliance**: No `google.maps.Marker`, `DirectionsService`, or deprecated Places API endpoints.
- [x] **Places API New**: Uses `AutocompleteSuggestion.fetchAutocompleteSuggestions` with `AutocompleteSessionToken` and direct `place.fetchFields()`.
- [x] **Attribution Tagging**: Maps configured with `internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}`.
- [x] **CORS & Height**: Explicit container heights (e.g., `h-64`, `h-80`) and SDK wrappers to prevent CORS traps.
