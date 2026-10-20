# Gemini Live Real-Time Conversational Scoping: Unified Master Implementation Plan

Complete architectural blueprint to implement a low-latency, bidirectional voice scoping assistant using **Gemini Live (`gemini-3.8-live`)** in DryScope. Sales technicians walking disaster loss sites can speak continuously, receive instant verbal field verifications from a professional restoration voice (`Zephyr`), identify Water vs. Mold estimates, receive proactive IICRC S500/S520 guiding questions, and trigger real-time UI function calls that populate room dimensions, moisture readings, and equipment deployments directly into the job state.

---

## 1. Executive Summary & User Alignment

- **Core Goal**: Hands-free, real-time voice scoping across disaster loss sites integrating directly into DryScope's job cards, transcription state, and Firestore persistence.
- **Voice Persona**: Professional restoration specialist (`Zephyr`) delivering crisp, standards-compliant spoken feedback.
- **Loss Peril Identification**: Automated voice classification and 1-tap manual toggle between **Water Damage Mitigation (IICRC S500)** and **Mold Remediation (IICRC S520)**.
- **Guiding Questions & Clarification**: Proactively guides the technician through missing IICRC items (dimensions $\rightarrow$ moisture readings $\rightarrow$ containment $\rightarrow$ equipment sizing $\rightarrow$ demo actions) with configurable **"Full Co-Pilot"** or **"Confirm Only"** modes.
- **UI Location**: Sleek, floating interactive dock at the bottom of the viewport with a live 16-channel audio frequency waveform, active room indicator, loss peril badge, and tool execution pills.
- **Field Resilience**: Noise gating for loud equipment, software audio ducking to prevent speaker feedback loops, active room context tracking, and 1-tap voice undo.

---

## 2. Gemini Live Agent Instructions (System Instruction Specification)

Below is the complete, production-grade System Instruction passed to `ai.live.connect` in `server.ts`:

```markdown
You are DryScope Live, an expert disaster mitigation and restoration scoping co-pilot certified in ANSI/IICRC S500 (Water Damage Restoration) and ANSI/IICRC S520 (Professional Mold Remediation).

Your role is to act as the hands-free conversational partner for sales technicians walking loss sites. You listen continuously, execute scoping tool calls in real time, deliver crisp verbal confirmations, and proactively prompt for missing IICRC data.

### STRICT OPERATIONAL BOUNDARIES & RULES

1. RULE 1 — STRICT ANTI-CALCULATION ENFORCEMENT:
   - NEVER calculate dollar amounts, estimate totals, line item pricing, or area square footages.
   - Only extract and confirm raw dimensions (length, width, height in feet), linear feet of baseboard, flood cut height (inches), material substrates, and equipment integers.
   - If a technician or client asks about cost, reply: "I record raw field measurements, substrates, and equipment counts. Your office estimating team and insurance matrix will calculate the final scope pricing."

2. RULE 2 — PERIL IDENTIFICATION (WATER VS. MOLD):
   - Evaluate whether the loss is Water Damage Mitigation (IICRC S500) or Mold Remediation (IICRC S520).
   - If the technician mentions active pipe leaks, clean overflows, or fresh water intrusion, classify as 'water'.
   - If the technician mentions visible fungal colonies, black staining, musty microbial odors, settled spores, or containment chambers, classify as 'mold' and identify the Condition level (Condition 1, 2, or 3).
   - Immediately call the tool `classify_loss_type` with your reasoning when detected.

3. RULE 3 — IMMEDIATE TOOL EXECUTION:
   - Call the appropriate function IMMEDIATELY when the technician states dimensions, moisture readings, equipment, actions, or room transitions. Never wait or batch tool calls.
   - Functions available: `classify_loss_type`, `set_active_room`, `record_room_dimensions`, `record_moisture_reading`, `record_thermal_reading`, `deploy_equipment`, `add_standardized_action`, `undo_last_action`, `add_field_notes`.

4. RULE 4 — CRISP VERBAL CONFIRMATIONS:
   - Keep spoken responses under 2 short sentences.
   - Speak the exact numbers and materials recorded so the technician has verbal verification while their hands are busy measuring (e.g., "Logged Master Bedroom 14 by 12 with 24-inch flood cut.").

5. RULE 5 — PROACTIVE IICRC GUIDING QUESTIONS:
   - When in Co-Pilot mode, guide the technician through standard IICRC checkpoints:
     * If room dimensions are stated without moisture readings: "What's your moisture meter reading on the flooring and drywall in this room?"
     * If a flood cut or baseboard removal is stated without cut height: "What height flood cut are you recommending—24 or 48 inches?"
     * If mold is identified: "Are we staging critical poly containment barriers and HEPA air scrubbers before demo?"
     * If drying equipment is unstated: "How many air movers and dehumidifiers are you staging here?"

6. RULE 6 — ACTIVE ROOM CONTEXT:
   - Whenever the technician mentions entering or moving to a new space (e.g., "Now in the kitchen", "Heading downstairs to the basement"), call `set_active_room` immediately so all subsequent readings attach to that room.

7. RULE 7 — CORRECTIONS & UNDO:
   - If the technician corrects themselves ("Wait, make that 16 feet, not 14"), update the existing room dimensions rather than creating a duplicate.
   - If the technician says "Cancel that" or "Remove that moisture reading", call `undo_last_action`.
```

---

## 3. Loss Peril Standards & Protocol Differentiation

| Parameter | Water Damage Mitigation (IICRC S500) | Mold Remediation (IICRC S520) |
| :--- | :--- | :--- |
| **Primary Objective** | Rapid water extraction, evaporation, & dehumidification | Containment, spore filtration, & controlled porous demo |
| **Classification** | Cat 1 (Clean), Cat 2 (Grey), Cat 3 (Black) | Condition 1 (Normal), Condition 2 (Settled), Condition 3 (Active Growth) |
| **Containment** | Open drying (Cat 1/2) or source isolation (Cat 3) | Critical negative air containment barrier mandatory for Condition 3 |
| **Primary Equipment** | Centrifugal air movers, LGR dehus, extraction units | HEPA air scrubbers (500 CFM), negative air machines, HEPA vacuums |
| **Air Movement Rule** | High-velocity airflow across wet structural surfaces | **Never** use unrestricted air movers without containment (prevents spore cross-contamination) |
| **Standard Actions** | `EXTRACT_WATER`, `FLOOD_CUT`, `REMOVE_BASEBOARD` | `CONTAINMENT_SETUP`, `HEPA_VACUUM`, `APPLY_ANTIMICROBIAL`, `REMOVE_DRYWALL` |

---

## 4. Conversational Guiding Questions & Confirmation Matrix

| Trigger Event | Technician Dictation | Gemini Live Response & Action |
| :--- | :--- | :--- |
| **Room Dimensions Logged** | *"Living room is 18 by 14 with 9 foot ceilings"* | **Tool:** `record_room_dimensions`<br>**Voice:** *"Recorded Living Room, 18 by 14 with 9-foot ceilings. What's the moisture reading on the hardwood floor?"* |
| **Vague Demolition Directive** | *"Do a flood cut along the east wall"* | **Voice:** *"What height flood cut are you recommending—24 or 48 inches?"*<br>*(Waits for answer before committing action)* |
| **Water vs. Mold Clues** | *"Smells musty under the sink, drywall is black and crumbly"* | **Tool:** `classify_loss_type(lossType: 'mold', moldCondition: 'Condition 3')`<br>**Voice:** *"Identified Mold Remediation under IICRC S520 Condition 3. Activating containment protocol. Shall I deploy HEPA air scrubbers?"* |
| **Equipment Staging** | *"Drop four air movers and a dehu here"* | **Tool:** `deploy_equipment(airMovers: 4, dehu: 1)`<br>**Voice:** *"Logged 4 air movers and 1 LGR dehumidifier for Living Room drying chamber."* |
| **S520 Mold Air Scrubber Guidance** | Dimensions logged in Mold scope | **Guidance:** *"For this 2,400 cu ft mold chamber, you'll need at least 160 CFM for 4 air changes per hour. Shall I stage one 500 CFM HEPA air scrubber?"* |

---

## 5. End-to-End System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Browser Client (TechFieldDashboard)                  │
│                                                                        │
│  ┌───────────────────────┐             ┌────────────────────────────┐  │
│  │ 16kHz PCM Mic Capture │             │ 24kHz Gapless Audio Player │  │
│  │ (Echo/Noise Filtered) │             │ (NextStartTime Scheduled)  │  │
│  └──────────┬────────────┘             └─────────────▲──────────────┘  │
│             │ Base64 Audio Chunk                     │ Base64 Audio    │
│             ▼                                        │ Output Chunks   │
│  ┌───────────────────────────────────────────────────┴──────────────┐  │
│  │     Client WebSocket Hook (useGeminiLive.ts)                     │  │
│  │     - 16-Band FFT Waveform Math                                  │  │
│  │     - Tool Dispatcher -> onUpdateJob() -> Firestore Sync         │  │
│  │     - Software Ducking (Attenuates mic when Gemini speaks)       │  │
│  └───────────────────────────▲──────────────────────────────────────┘  │
└──────────────────────────────┼─────────────────────────────────────────┘
                               │ WebSocket Bridge (/api/live-ws)
┌──────────────────────────────▼─────────────────────────────────────────┐
│                     Server Runtime (server.ts)                         │
│  - Node HTTP Server on Port 3000 + WebSocketServer (ws)                │
│  - Handles Next.js HTTP routes & upgrades /api/live-ws                 │
│  - Bridges to Gemini Live Session via @google/genai:                   │
│                                                                        │
│    ai.live.connect({                                                   │
│      model: "gemini-3.8-live",                                         │
│      config: {                                                         │
│        responseModalities: [Modality.AUDIO],                           │
│        speechConfig: { voiceConfig: { voiceName: "Zephyr" } },         │
│        systemInstruction: RESTORATION_SYSTEM_INSTRUCTION,              │
│        tools: [{ functionDeclarations: SCOPING_TOOL_DECLARATIONS }]    │
│      }                                                                 │
│    })                                                                  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Tool Declarations (ANSI/IICRC S500 & S520 Enforcement)

1. `classify_loss_type`:
   - `lossType`: `'water'` | `'mold'` | `'water_and_mold'`
   - `waterCategory`: `'Cat 1 (Clean)'` | `'Cat 2 (Grey)'` | `'Cat 3 (Black / Mold)'`
   - `moldCondition`: `'Condition 1 (Normal Fungal Ecology)'` | `'Condition 2 (Settled Spores)'` | `'Condition 3 (Active Microbial Growth)'`
   - `containmentRequired`: `boolean`
   - `reasoning`: `string`
2. `set_active_room`:
   - `roomName`: `string` (e.g., "Master Bedroom", "Kitchen")
3. `record_room_dimensions`:
   - `roomName`: `string`
   - `lengthFt`: `number`
   - `widthFt`: `number`
   - `heightFt`: `number` (default 8)
   - `floodCutHeightInches`: `number` (optional, e.g. 24 or 48)
   - `linearFtBaseboard`: `number` (optional)
4. `record_moisture_reading`:
   - `roomName`: `string`
   - `substrate`: `string` (Drywall, Subfloor, Baseboard, Framing)
   - `readingValue`: `number` (e.g. 32)
   - `unit`: `string` ('% WME')
   - `dryStandard`: `number` (default 12)
5. `record_thermal_reading`:
   - `roomName`: `string`
   - `deltaTFahrenheit`: `number` (e.g. -6.4)
   - `perimeterBoundaryDesc`: `string`
6. `deploy_equipment`:
   - `roomName`: `string`
   - `airMovers`: `number`
   - `dehumidifiers`: `number`
   - `airScrubbers`: `number`
   - `dryingDays`: `number`
7. `add_standardized_action`:
   - `action`: `'FLOOD_CUT' | 'REMOVE_BASEBOARD' | 'REMOVE_FLOORING' | 'EXTRACT_WATER' | 'DEPLOY_EQUIPMENT' | 'HEPA_VACUUM' | 'APPLY_ANTIMICROBIAL' | 'CONTAINMENT_SETUP'`
   - `notes`: `string`
8. `undo_last_action`:
   - `targetType`: `string`
9. `add_field_notes`:
   - `notes`: `string`

---

## 7. Real-World Field Gap Solutions

1. **Ambient Job-Site Noise Mitigation**:
   - Web Audio constraints enable hardware echo cancellation, noise suppression, and auto gain control.
   - Dual noise-gate thresholds on the floating bar (*Standard Room* vs. *Loud Equipment Site*).
2. **Acoustic Speaker Feedback Prevention**:
   - Software audio ducking: When Gemini is speaking back (`isModelTurn === true`), the mic audio transmission is gated by 85% to prevent Gemini from talking to itself, while allowing clear vocal barge-in if the technician speaks up.
3. **Active Room Context Pinning**:
   - Gemini tracks the `currentActiveRoom` and calls `set_active_room` so readings never attach to the wrong room.
4. **Smart Overwrite & 1-Tap Undo**:
   - If a measurement is updated within 60 seconds (e.g. *"Actually 16 feet"*), the existing room is updated rather than duplicated.
   - 1-tap "Undo Last Action" button on the floating bar reverts the most recent tool call with verbal confirmation.
5. **Cellular Drop Reconnect & Offline Speech Buffer**:
   - Exponential backoff WebSocket reconnection with yellow connection badge.
   - Fallback local queue so spoken notes are never lost if a basement drops cell coverage.

---

## 8. Concrete File Implementation Plan

| File | Purpose & Changes |
| :--- | :--- |
| `server.ts` | Custom Node HTTP server + Next.js + `WebSocketServer` at `/api/live-ws`, bridging client audio to `ai.live.connect` with `gemini-3.8-live`, agent instructions, tools, and transcription. |
| `package.json` | Configure `"dev": "tsx server.ts"` and `"start": "node server.js"`. |
| `lib/types.ts` | Add `LossPerilType`, `MoldConditionLevel`, and `containmentRequired` to `RestorationJob`. |
| `hooks/useGeminiLive.ts` | Complete client-side audio engine: 16kHz PCM mic capture, 24kHz playback scheduling, 16-band FFT waveform math, tool execution dispatch, and reconnection state. |
| `components/voice/GeminiLiveScopingBar.tsx` | Floating bottom visualizer dock: 16 dynamic frequency bars, active peril badge (`💧 Water` / `☣️ Mold`), active room pill, co-pilot mode toggle, live transcript ticker, and undo button. |
| `components/dashboards/TechFieldDashboard.tsx` | Mount `GeminiLiveScopingBar`, wire tool execution into `onUpdateJob`, and add visual S500 vs. S520 peril checklist. |
| `components/dashboards/NewJobModal.tsx` | Add explicit Water vs. Mold loss type selector during initial job intake. |

---

## 9. Verification & Validation Steps
1. Build verification using `compile_applet` (`npm run build`).
2. Codebase quality audit using `lint_applet` (ensuring 0 errors and 0 warnings).
3. WebSocket handshake verification on `http://localhost:3000/api/live-ws`.
4. Multi-room simulated voice walkthrough verifying tool calls for dimensions, moisture readings, equipment, and automatic Water vs. Mold classification.
