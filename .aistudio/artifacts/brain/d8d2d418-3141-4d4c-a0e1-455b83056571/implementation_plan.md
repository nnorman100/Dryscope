# Architectural Recommendations & Implementation Plan: Field Technician Scoping & Cloud Sync

Comprehensive architectural blueprint to empower sales and field technicians to rapidly capture measurements, damage photos, moisture meter readings, and thermal imaging on-site using both hands-free live voice conversation and rapid tap buttons, backed by real-time cloud persistence syncing directly with office estimators.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Confirmed Choices from Clarification**:
> - **Input Modality**: **Dual-Mode (Hands-Free Live Voice Conversation + Tap Buttons)**. Technicians in crawl spaces or with wet gloves can speak continuously while walking, while technicians needing fast adjustments can tap high-contrast 48px touch controls.
> - **Data Persistence & Sync**: **Cloud Persistence (Firebase Firestore + Offline Cache)**. Field technicians frequently operate in basements, rural sites, or damaged properties with intermittent or zero cellular reception; the app must persist locally first and auto-sync to office estimators in real time when connectivity is restored.

### Core Recommendations Summary:
1. **Hands-Free Live Voice Scoping Assistant**: Integrate continuous browser speech-to-text with Gemini parsing on silence pauses. Include audio chimes and voice confirmations ("*Master Bedroom logged: 14x16 with 24-inch flood cut and 2 dehumidifiers*") so the tech never has to look down at their device while walking.
2. **One-Handed Rapid-Tap Thumb HUD**: Design touch-first controls conforming to mobile ergonomics ($48\text{px}$ touch targets, natural thumb zone) with quick room dimension presets (10x12, 12x15, 14x18), quick steppers for air movers/dehumidifiers, and single-tap standard action directives (`FLOOD_CUT`, `REMOVE_BASEBOARD`, `REMOVE_FLOORING`, `EXTRACT_WATER`, `DEPLOY_EQUIPMENT`, `HEPA_VACUUM`, `APPLY_ANTIMICROBIAL`).
3. **Forensic Multimodal Vision (Damage, Moisture Meter & Thermal Displays)**: Enhance photo analysis to read LCD screens from Delmhorst/Tramex/Protimeter moisture meters (e.g. 32% WME) and FLIR thermal cameras (extracting $\Delta T$ and thermal boundaries) with strict IICRC S500/S520 technical descriptions alongside layman homeowner summaries.
4. **Cloud Firestore Sync Architecture**: Deploy a real-time Firestore database (`jobs` collection) with `enableIndexedDbPersistence` and reactive `onSnapshot` listeners, bridging the field technician dashboard with the office estimator dashboard in sub-second latency.

---

## 1. Overview & Core Concept

### What It Does
An on-site field scoping engine for disaster mitigation (Water, Fire, Mold). Technicians walk the loss site, dictate structural details hands-free, tap rapid room presets, and snap photos of damage, moisture meters, and thermal cameras. The system extracts raw metrics (dimensions, substrates, meter percentages, equipment counts, standard actions) adhering strictly to IICRC restoration standards—never computing dollar totals in raw field extraction—and pushes updates to the cloud so office estimators can produce Xactimate estimates in real time.

### Target Audience & Persona
- **Sales & Field Scoping Technicians**: On-site in hazardous, wet, or dimly lit environments, wearing PPE and carrying diagnostic tools. Needs friction-free input without tiny dropdowns.
- **Office Estimators & Project Managers**: At HQ reviewing incoming field data, photos, and moisture logs simultaneously to draft scopes of work and insurance filings.
- **Property Owners**: Receiving non-alarming, transparent lay summaries of the drying operations.

### Key Value
- **Zero Field Bottlenecks**: Halves scoping time by eliminating manual paper logs and double entry.
- **Forensic Defensibility**: Camera and meter displays are verified with GPS geolocation and timestamp watermarks for carrier compliance.
- **Immediate Estimator Handoff**: Office estimators can begin drafting insurance estimates before the technician leaves the driveway.

---

## 2. User Experience & Visual Design

### Key User Flows

#### Flow A: Hands-Free Walkthrough Scoping
1. **Activation**: Tech taps the large floating "Hands-Free Scoping Mic" in the bottom thumb zone. A pulsing green ambient indicator signals active listening.
2. **Dictation**: Tech speaks: *"Living room is 18 by 22 with 10-foot ceilings. Category 2 water loss. 48-inch flood cut needed on exterior walls, carpet and pad need removal. Moisture meter reads 36% WME on bottom drywall. Deploy 4 air movers and 2 LGR dehus."*
3. **Real-Time Extraction & Voice Chime**: System parses the audio using Gemini, sounds a subtle double-beep chime, and adds the room, equipment, and actions to the active scope cards.
4. **Hands-Free Confirmation**: A synthetic assistant voice confirms via Web Speech TTS: *"Living Room added: 18 by 22, 48-inch flood cut, 4 air movers, 2 dehumidifiers."*

#### Flow B: One-Handed Rapid-Tap HUD
1. **Quick Room Selector**: Horizontal thumb carousel with common room tags (`Master Bed`, `Living Rm`, `Kitchen`, `Basement`, `Bath`).
2. **Dimension Pad**: Tap-steppers for Length, Width, Height ($8\text{ft}$, $9\text{ft}$, $10\text{ft}$, $12\text{ft}$) and Flood Cut height toggles ($0\text{"}$, $24\text{"}$, $48\text{"}$).
3. **Action Directives Palette**: Single-tap toggle buttons for IICRC standardized actions:
   - `[+ FLOOD_CUT]`
   - `[+ REMOVE_BASEBOARD]`
   - `[+ REMOVE_FLOORING]`
   - `[+ EXTRACT_WATER]`
   - `[+ DEPLOY_EQUIPMENT]`
   - `[+ HEPA_VACUUM]`
   - `[+ APPLY_ANTIMICROBIAL]`
4. **Equipment Quick Counter**: Big $+$ / $-$ increment buttons for Air Movers, LGR Dehumidifiers, and HEPA Scrubbers.

#### Flow C: Multimodal Evidence Capture (Camera & Diagnostic Meters)
1. **Photo Trigger**: Tap camera icon (or file upload). Live camera opens with targeting guide.
2. **Category Selection**: 3 big mode buttons:
   - 📸 **Structural Damage**: Water lines, wet framing, drywall staining, mold colonies.
   - 📟 **Moisture Meter Display**: Captures digital/analog meter screen; OCR/vision extracts substrate & numerical percentage (e.g. `34.8% WME`).
   - 🌡️ **Thermal Imaging Screen**: Captures FLIR/Seek thermal screen; extracts temperature delta ($\Delta T$, e.g. `-6.2°F`) and cold perimeter boundary.
3. **Automatic Forensic Inspection**: Gemini analyzes the photo, attaches GPS coordinates, and displays both technical adjuster notes and layman homeowner summaries.

#### Flow D: Office Estimator Real-Time Mirror
1. Office estimator opens the Office Dashboard.
2. An animated sync badge displays: *"Live Field Scoping Active (Tech: Alex Rivera at 1042 Elm St)"*.
3. New rooms, moisture meter cards, and damage photos populate the screen dynamically via Firestore real-time snapshots with zero page reloads.

### Visual Identity & Theme
- **Aesthetic Direction**: High-contrast, utilitarian industrial design suited for outdoor sunlight and dark basements.
- **Color Palette**:
  - Primary Dark Base: Slate-900 (`#0F172A`) & Dark Navy (`#0B192C`)
  - High-Contrast Accents: Emergency Amber (`#F59E0B`), Moisture Cyan (`#06B6D4`), Thermal Rose (`#F43F5E`), Verified Emerald (`#10B981`)
  - Clean Text Elements: Neutral unboxed typography with dot separators (`·`) avoiding static pill clutter per `frontend-design` standards.
- **Touch Target Math**: All field interactive buttons have hitboxes $\ge 48\times 48\text{px}$, with natural bottom-40% thumb zone placement.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Dual Input (Hands-Free Live Voice + Tap HUD) vs. Voice-Only
- **Chosen Approach**: Support both continuous conversational voice dictation and high-speed tap buttons side-by-side.
- **Why**: Field conditions vary wildly. In noisy environments with running axial air movers (80+ dB), voice dictation struggles; tap buttons ensure 100% operational reliability. When walking through a dark crawl space or holding tools, hands-free voice is dramatically faster.
- **Alternatives Considered**: Voice-only (fails in high-decibel environments) or manual form entry (too slow, leads to tech frustration).

### Decision 2: Persistence Strategy — Firebase Firestore with Offline Cache vs. SQL or LocalStorage
- **Chosen Approach**: Firebase Firestore provisioned via `set_up_firebase` tool, with local IndexedDB persistence caching and real-time snapshot listeners (`onSnapshot`).
- **Why**: 
  1. *Offline First*: Field technicians frequently lose LTE in basements or rural disaster zones; Firestore automatically queues writes locally and syncs them once connected.
  2. *Live Multi-Device Collaboration*: Office estimators see updates arrive in real-time as the tech inspects room by room.
  3. *Zero Relational Complexity*: Scopes are nested document structures with dynamic rooms, moisture readings, and photo metadata.
- **Alternatives Considered**: 
  - Pure `localStorage`: Only lives on the technician's single device, cannot sync to the office estimator without manual export/emailing.
  - Relational Cloud SQL: Requires manual offline caching layer and lacks native reactive client websocket subscriptions out of the box.

### Decision 3: AI Model Selection for Field Multimodal Parsing
- **Chosen Approach**: `gemini-flash-latest` (or `gemini-3.8-flash`) for audio transcript scoping and photo vision analysis.
- **Why**: Sub-second latency is critical for technician feedback in the field. Flash provides near-instant JSON extraction of complex dimensions and meter displays with strict zero-cost extraction discipline.
- **Alternatives Considered**: Heavier models like `gemini-4-argon` (too slow for real-time mobile interactions in the field).

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       FIELD TECHNICIAN WORKSPACE (MOBILE)                   │
│                                                                             │
│   ┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────┐   │
│   │ Hands-Free Mic HUD  │   │  Thumb-Zone Tap HUD │   │ Camera / Meter  │   │
│   │ SpeechRecognition   │   │  48px Room Steppers │   │ Photo Capture   │   │
│   │ & Live Audio Stream │   │  & Standard Actions │   │ & Geolocation   │   │
│   └──────────┬──────────┘   └──────────┬──────────┘   └────────┬────────┘   │
└──────────────┼─────────────────────────┼───────────────────────┼────────────┘
               │ Raw Audio Transcript    │ Direct Tap State      │ Base64 Image
               ▼                         ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SERVER-SIDE PROXY APIS                            │
│                                                                             │
│   ┌───────────────────────────────────┐ ┌─────────────────────────────────┐ │
│   │ POST /api/scope                   │ │ POST /api/analyze-photo         │ │
│   │ - Structured JSON Schema Engine   │ │ - Substrate & Reading Extractor │ │
│   │ - Strict Rules (No $ calculations)│ │ - Thermal Delta (ΔT) Extractor  │ │
│   │ - IICRC Standardized Directives   │ │ - Dual Technical/Client Text    │ │
│   └─────────────────┬─────────────────┘ └────────────────┬────────────────┘ │
└─────────────────────┼────────────────────────────────────┼──────────────────┘
                      │ Extracted Data                     │ Forensic Record
                      ▼                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   FIREBASE FIRESTORE PERSISTENCE & SYNC                     │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ Collection: `jobs` (Document: job.id)                               │   │
│   │ - dimensions: RoomDimension[] (lengthFt, widthFt, floodCut, basebd) │   │
│   │ - actions: string[] (FLOOD_CUT, REMOVE_BASEBOARD, etc.)             │   │
│   │ - moistureReadings: MoistureReading[] (substrate, % WME, dryStd)    │   │
│   │ - thermalReadings: ThermalReading[] (ΔT, perimeterBoundaryDesc)     │   │
│   │ - equipment: EquipmentDeployment (airMovers, dehumidifiers, etc.)   │   │
│   │ - photos: PhotoEvidence[] (forensic notes, coordinates, timestamps) │   │
│   │ - syncMetadata: { lastSyncedAt, modifiedBy, syncStatus }            │   │
│   └──────────────────────────────────┬──────────────────────────────────┘   │
└──────────────────────────────────────┼──────────────────────────────────────┘
                                       │ Real-Time onSnapshot Listener
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        OFFICE ESTIMATOR DASHBOARD (DESKTOP)                 │
│                                                                             │
│   ┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────┐   │
│   │ Live Job Scopes     │   │ 4-Doc Insurance     │   │ Psychrometric   │   │
│   │ Real-time Stream    │   │ Xactimate Exporter  │   │ Drying Log View │   │
│   └─────────────────────┘   └─────────────────────┘   └─────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Schema Mapping

```typescript
export interface RestorationJob {
  id: string;
  client: { name: string; phone: string; address: string; insuranceCarrier?: string; claimNumber?: string };
  category: 'Cat 1 (Clean)' | 'Cat 2 (Grey)' | 'Cat 3 (Black / Mold)';
  finishType: 'Finished' | 'Unfinished';
  cabinetryMultiplier: boolean;
  afterHours: boolean;
  
  // Scoped Dimensions (Strictly raw measurements)
  dimensions: Array<{
    id: string;
    roomName: string;
    lengthFt: number;
    widthFt: number;
    heightFt: number;
    floodCutHeightInches: number;
    linearFtBaseboard: number;
  }>;

  // IICRC Standard Actions
  actions: Array<
    | 'FLOOD_CUT'
    | 'REMOVE_BASEBOARD'
    | 'REMOVE_FLOORING'
    | 'EXTRACT_WATER'
    | 'DEPLOY_EQUIPMENT'
    | 'HEPA_VACUUM'
    | 'APPLY_ANTIMICROBIAL'
  >;

  // Moisture Diagnostic Log
  moistureReadings: Array<{
    id: string;
    roomName: string;
    substrate: string;
    readingValue: number;
    unit: string; // '% WME', 'points', etc.
    dryStandard: number;
    isAffected: boolean;
    timestamp: string;
    notes?: string;
  }>;

  // Thermal Camera Scans
  thermalReadings: Array<{
    id: string;
    roomName: string;
    deltaTFahrenheit: number;
    perimeterBoundaryDesc: string;
    timestamp: string;
  }>;

  // Equipment Deployed
  equipment: {
    airMovers: number;
    dehumidifiers: number;
    airScrubbers: number;
    woodFloorSystems: number;
    dryingDays: number;
    techHoursOnSite: number;
    monitoringHoursPerDay: number;
  };

  // Forensic Photos with Geolocation
  photos: PhotoEvidence[];

  // Sync Metadata
  syncStatus?: 'synced' | 'pending' | 'offline';
  lastSyncedAt?: string;
}
```

---

## 5. Phased Implementation Roadmap

1. **Phase 1: Cloud Persistence Setup (Firebase Firestore)**
   - Initialize Firebase setup via `set_up_firebase` tool with user confirmation curtain.
   - Configure Firestore schema and security rules enforcing role-based access (Techs can create/update scopes; Office Estimators can review and approve).
   - Implement `useJobSync` hook with real-time `onSnapshot` subscription and offline fallback.

2. **Phase 2: Multimodal Photo & Screen Inspector Upgrades**
   - Enhance `POST /api/analyze-photo` with targeted prompts for moisture meter LCD displays and thermal imaging gradients.
   - Update `TechFieldDashboard` photo upload/camera card with quick category filters (`Damage Photo`, `Moisture Meter Display`, `Thermal Camera Screen`).
   - Add substrate and reading auto-fill into the job's `moistureReadings` and `thermalReadings` arrays directly from photo analysis results.

3. **Phase 3: Hands-Free Voice Scoping & Rapid-Tap Thumb HUD**
   - Implement continuous hands-free voice mode with voice activity detection (VAD), audio double-tone chimes, and TTS confirmation.
   - Build the thumb-zone tap pad: quick-select room names, dimensional steppers ($1\text{ft}$, $5\text{ft}$, $10\text{ft}$), flood cut height toggles, and single-tap standard action buttons.
   - Integrate rapid equipment counters with instant local calculation of drying requirements.

4. **Phase 4: Office Estimator Real-Time View & Field Audit Trail**
   - Add real-time "Field Sync Live" indicator in `OfficeDashboard`.
   - Implement live updating badge and sound/visual cues when new field photos or scoped rooms land from the job site.
   - Run compilation and end-to-end lint verification.
