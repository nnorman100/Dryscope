# Implementation Plan: Field QR Code Asset & Room Scanner for TechFieldDashboard

Implement a high-speed, camera-enabled QR code scanner in the technician's on-site workspace (`TechFieldDashboard`). Technicians can scan physical equipment barcodes (dehumidifiers, air movers, scrubbers) and room boundary labels to automatically assign verified metadata, dimensions, and equipment counts to the current job scope without manual data entry errors.

---

## User Review Required

> [!IMPORTANT]
> **Key Decisions Confirmed by User**:
> 1. **Tag Scope**: Supports both **Restoration Equipment Asset Tags** (e.g. LGR Dehumidifiers, Axial Air Movers, HEPA Scrubbers) and **Room Boundary Labels** (e.g. Master Bedroom, Kitchen, affected area dimensions).
> 2. **Input Modes**: Both **Live Device Camera Video Stream** (real-time canvas analysis) and **Photo / Image File Upload** (captured loss photos or gallery screenshots), plus a quick-test sample tag bar for immediate testing.
> 3. **Scope Automation**: Automatically increments `job.equipment` inventory counts and appends/updates `job.dimensions` in the active scope, accompanied by an asset scan audit trail.

---

## Proposed Changes

### 1. Data Schema & QR Payload Specification

#### `lib/types.ts` & `lib/qrAssetParser.ts`
- Define standardized QR tag payload structures:
  - **Equipment Tag Payload (`equipment`)**:
    ```json
    {
      "type": "equipment",
      "category": "dehumidifier" | "air_mover" | "air_scrubber" | "wood_floor_system",
      "serialNumber": "DH-LGR-94821",
      "model": "Dri-Eaz Revolution LGR",
      "voltage": "115V / 5.2A",
      "defaultDays": 3
    }
    ```
    Also supports compact URI format: `adr://eq/dehumidifier/DH-LGR-94821?model=Dri-Eaz%20LGR&days=3`
  - **Room Boundary Tag Payload (`room`)**:
    ```json
    {
      "type": "room",
      "roomName": "Master Bedroom",
      "lengthFt": 16,
      "widthFt": 14,
      "heightFt": 8,
      "floodCutHeightInches": 24,
      "linearFtBaseboard": 60,
      "finishType": "Finished"
    }
    ```
    Also supports compact URI format: `adr://rm/Master%20Bedroom?l=16&w=14&h=8&fc=24&lb=60`
  - **Audit Ledger Type**: Add `scannedAssets?: ScannedAssetTag[]` to `RestorationJob` to track physical equipment deployed on-site with serial numbers, battery/runtime notes, and timestamps.

---

### 2. QR Code Decoding Engine

#### Install `jsqr`
- Install `jsqr` and `@types/jsqr` via `install_applet_package` for pure-JavaScript canvas barcode decoding that works reliably on both live camera streams (`MediaStream` via `canvas.getContext('2d')`) and static image uploads without browser compatibility bottlenecks.

#### `lib/qrAssetParser.ts`
- Robust parsing utility that decodes raw string content from:
  1. JSON payloads (`{"type": "equipment", ...}`)
  2. URI schemes (`adr://eq/...`, `adr://rm/...`)
  3. Legacy plain-text asset tags (e.g., `"AIR-MOVER-04: Master Bath"`, `"DEHU-842: Basement"`)
- Safe validator with fallback feedback when an unrecognized QR code is scanned.

---

### 3. Scanner UI Component

#### `components/dashboards/QrAssetScannerModal.tsx`
- **Modal Viewport & Responsive Design**:
  - Modal with backdrop blur, adhering to `frontend-design` SaaS guidelines.
  - Tabs: **Live Camera Scanner** and **Image / Tag File Upload**.
- **Live Camera Scanner Viewport**:
  - WebRTC camera feed via `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })`.
  - Smooth targeting reticle with animated scanning laser effect.
  - Camera switch control (environment/back vs. user/front).
  - Torch/Flashlight toggle if supported by device hardware.
  - Audio/Haptic scan confirmation chime using the Web Audio API (synthesizing a short 880Hz crisp double-tone beep on successful decode, zero external audio assets required).
- **File Upload & Photo Inspection**:
  - Drag-and-drop zone for uploading photo evidence of asset tags, equipment labels, or architectural blueprints.
- **Quick-Test Tag Simulator**:
  - 1-click test tags for rapid verification without physical QR printouts:
    - `[Air Mover #AM-402]`
    - `[LGR Dehu #DH-948]`
    - `[HEPA Scrubber #AS-118]`
    - `[Kitchen Loss Zone 15x12]`
    - `[Master Bath 10x8 w/ 24" Flood Cut]`
- **Real-Time Scope Application Feedback**:
  - Interactive toast/card confirming:
    - `"✓ Dehumidifier Tag #DH-LGR-94821 registered: Total Dehumidifiers updated from 1 → 2."`
    - `"✓ Room Label 'Kitchen' applied: 180 SF affected area and 24" flood cut added to scope."`
  - Direct Undo button to reverse any accidental scan.

---

### 4. Integration with `TechFieldDashboard.tsx`

#### `components/dashboards/TechFieldDashboard.tsx`
- Add prominent **"Scan Asset / Room Tag"** button in the Scoping Header and inside the Equipment & Room Dimensions cards.
- Add **Deployed Asset & Room Tag Ledger** section displaying:
  - Scanned equipment list with serial numbers and models.
  - Scanned room markers.
  - Quick badge indicating `X items scanned on-site`.
- Wire job update handler to atomically update:
  - `job.equipment`
  - `job.dimensions`
  - `job.scannedAssets`

---

## Verification Plan

### Automated Build & Lint Verification
1. Run `install_applet_package` for `jsqr` and `@types/jsqr`.
2. Run `compile_applet` to ensure TypeScript compilation succeeds without errors.
3. Run `lint_applet` to confirm zero ESLint violations.

### Interactive Verification
1. **Camera Feed & Permission**:
   - Open QR Scanner modal, verify camera feed requests access and renders targeting box.
2. **Preset Asset Scanning**:
   - Click "Test Air Mover Tag", verify air mover count increments by 1.
   - Click "Test Kitchen Boundary Label", verify 15x12 room is added to `job.dimensions`.
3. **Photo Upload Scanning**:
   - Upload QR image or drop file, verify instant decoding.
4. **Scope Persistence**:
   - Verify that updated equipment counts and room dimensions reflect in the pricing calculation and Document Suite reports.
