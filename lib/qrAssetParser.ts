import { ScannedAssetTag, RestorationJob, RoomDimension } from './types';

export interface ParsedQrResult {
  success: boolean;
  type: 'equipment' | 'room' | 'unknown';
  summary: string;
  tag: ScannedAssetTag;
  appliedChangesDescription: string;
  updatedJob: RestorationJob;
}

/**
 * Normalizes category string to the matching field on RestorationJob['equipment']
 */
export function normalizeEquipmentCategory(
  cat: string
): 'airMovers' | 'dehumidifiers' | 'airScrubbers' | 'woodFloorSystems' {
  const lower = cat.toLowerCase().replace(/[-_\s]/g, '');
  if (lower.includes('dehu') || lower.includes('refrigerant') || lower.includes('lgr')) {
    return 'dehumidifiers';
  }
  if (lower.includes('scrub') || lower.includes('hepa') || lower.includes('negativeair')) {
    return 'airScrubbers';
  }
  if (lower.includes('wood') || lower.includes('floor') || lower.includes('injectidry')) {
    return 'woodFloorSystems';
  }
  return 'airMovers';
}

export function getEquipmentDisplayName(
  category: 'airMovers' | 'dehumidifiers' | 'airScrubbers' | 'woodFloorSystems'
): string {
  switch (category) {
    case 'dehumidifiers':
      return 'LGR Dehumidifier';
    case 'airMovers':
      return 'Centrifugal Air Mover';
    case 'airScrubbers':
      return 'HEPA Air Scrubber';
    case 'woodFloorSystems':
      return 'Injectidry Wood Floor Drying System';
  }
}

/**
 * Parses raw QR code string (JSON, URI, or plain text) and applies the metadata to the current job scope
 */
export function parseAndApplyQrAssetTag(
  rawText: string,
  currentJob: RestorationJob
): ParsedQrResult {
  const timestamp = new Date().toISOString();
  const trimmed = rawText.trim();

  // 1. Attempt JSON parsing
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const data = JSON.parse(trimmed);

      // A. Equipment JSON tag
      if (
        data.type === 'equipment' ||
        data.category === 'air_mover' ||
        data.category === 'dehumidifier' ||
        data.category === 'air_scrubber' ||
        data.serialNumber
      ) {
        const eqCategory = normalizeEquipmentCategory(data.category || data.type || 'air_mover');
        const serial = data.serialNumber || data.sn || data.id || `EQ-${Math.floor(Math.random() * 90000 + 10000)}`;
        const model = data.model || getEquipmentDisplayName(eqCategory);

        const currentCount = currentJob.equipment[eqCategory] || 0;
        const newCount = currentCount + 1;

        const newTag: ScannedAssetTag = {
          id: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          tagType: 'equipment',
          rawPayload: trimmed,
          scannedAt: timestamp,
          equipmentCategory: eqCategory,
          serialNumber: serial,
          model,
          notes: data.notes || data.voltage ? `Rated: ${data.voltage || '115V'}` : undefined,
        };

        const existingScanned = currentJob.scannedAssets || [];
        const updatedJob: RestorationJob = {
          ...currentJob,
          equipment: {
            ...currentJob.equipment,
            [eqCategory]: newCount,
          },
          scannedAssets: [newTag, ...existingScanned],
          updatedAt: timestamp,
        };

        return {
          success: true,
          type: 'equipment',
          summary: `${getEquipmentDisplayName(eqCategory)} (#${serial})`,
          tag: newTag,
          appliedChangesDescription: `Added 1 ${getEquipmentDisplayName(eqCategory)} to job scope (Count: ${currentCount} → ${newCount}). Serial: ${serial}.`,
          updatedJob,
        };
      }

      // B. Room JSON tag
      if (data.type === 'room' || data.roomName || data.lengthFt) {
        const roomName = data.roomName || data.name || 'Tagged Loss Area';
        const length = Number(data.lengthFt || data.length || 14);
        const width = Number(data.widthFt || data.width || 12);
        const height = Number(data.heightFt || data.height || 8);
        const affectedFloor = Number(data.affectedFloorSqFt || length * width);
        const floodCut = Number(data.floodCutHeightInches || 24);
        const baseboard = Number(data.linearFtBaseboard || (length + width) * 2);

        const newRoom: RoomDimension = {
          roomName,
          lengthFt: length,
          widthFt: width,
          heightFt: height,
          affectedFloorSqFt: affectedFloor,
          floodCutHeightInches: floodCut,
          linearFtBaseboard: baseboard,
        };

        const newTag: ScannedAssetTag = {
          id: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          tagType: 'room',
          rawPayload: trimmed,
          scannedAt: timestamp,
          roomName,
          dimensions: {
            lengthFt: length,
            widthFt: width,
            heightFt: height,
            floodCutHeightInches: floodCut,
            linearFtBaseboard: baseboard,
          },
          notes: `${length}ft × ${width}ft (${affectedFloor} SF), ${floodCut}" flood cut`,
        };

        // Check if room with same name exists, update it, or append
        const existingRooms = currentJob.dimensions || [];
        const roomIdx = existingRooms.findIndex(
          (r) => r.roomName.toLowerCase() === roomName.toLowerCase()
        );

        let updatedRooms: RoomDimension[];
        if (roomIdx >= 0) {
          updatedRooms = [...existingRooms];
          updatedRooms[roomIdx] = newRoom;
        } else {
          updatedRooms = [...existingRooms, newRoom];
        }

        const existingScanned = currentJob.scannedAssets || [];
        const updatedJob: RestorationJob = {
          ...currentJob,
          dimensions: updatedRooms,
          scannedAssets: [newTag, ...existingScanned],
          updatedAt: timestamp,
        };

        return {
          success: true,
          type: 'room',
          summary: `Room Boundary: ${roomName} (${affectedFloor} SF)`,
          tag: newTag,
          appliedChangesDescription: `Assigned room specifications: ${length}ft × ${width}ft × ${height}ft (${affectedFloor} SF), ${floodCut}" flood cut, ${baseboard} LF baseboard.`,
          updatedJob,
        };
      }
    } catch {
      // Fall through to URI/text parsing
    }
  }

  // 2. URI Schemes: dryscope://eq/..., ds://eq/..., or URL query
  if (trimmed.startsWith('dryscope://') || trimmed.startsWith('ds://') || trimmed.includes('/asset?')) {
    try {
      const normalizedScheme = trimmed.replace(/^(dryscope|ds):\/\//, 'http://dummy.io/');
      const url = new URL(normalizedScheme);
      const pathname = url.pathname.toLowerCase();

      // Equipment URI
      if (pathname.includes('/eq') || url.searchParams.get('type') === 'equipment') {
        const rawCat = pathname.split('/')[2] || url.searchParams.get('category') || 'air_mover';
        const serial = pathname.split('/')[3] || url.searchParams.get('sn') || `EQ-${Math.floor(Math.random() * 90000 + 10000)}`;
        const model = url.searchParams.get('model') || decodeURIComponent(url.searchParams.get('model') || '') || 'Field Asset';

        const eqCategory = normalizeEquipmentCategory(rawCat);
        const currentCount = currentJob.equipment[eqCategory] || 0;
        const newCount = currentCount + 1;

        const newTag: ScannedAssetTag = {
          id: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          tagType: 'equipment',
          rawPayload: trimmed,
          scannedAt: timestamp,
          equipmentCategory: eqCategory,
          serialNumber: serial,
          model,
        };

        const updatedJob: RestorationJob = {
          ...currentJob,
          equipment: {
            ...currentJob.equipment,
            [eqCategory]: newCount,
          },
          scannedAssets: [newTag, ...(currentJob.scannedAssets || [])],
          updatedAt: timestamp,
        };

        return {
          success: true,
          type: 'equipment',
          summary: `${getEquipmentDisplayName(eqCategory)} (#${serial})`,
          tag: newTag,
          appliedChangesDescription: `Registered asset via URI: Count updated ${currentCount} → ${newCount}. Serial: ${serial}.`,
          updatedJob,
        };
      }

      // Room URI
      if (pathname.includes('/rm') || url.searchParams.get('type') === 'room') {
        const rawName = pathname.split('/')[2] || url.searchParams.get('name') || 'Loss Chamber';
        const roomName = decodeURIComponent(rawName);
        const l = Number(url.searchParams.get('l') || 15);
        const w = Number(url.searchParams.get('w') || 12);
        const h = Number(url.searchParams.get('h') || 8);
        const fc = Number(url.searchParams.get('fc') || 24);
        const lb = Number(url.searchParams.get('lb') || (l + w) * 2);

        const newRoom: RoomDimension = {
          roomName,
          lengthFt: l,
          widthFt: w,
          heightFt: h,
          affectedFloorSqFt: l * w,
          floodCutHeightInches: fc,
          linearFtBaseboard: lb,
        };

        const newTag: ScannedAssetTag = {
          id: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          tagType: 'room',
          rawPayload: trimmed,
          scannedAt: timestamp,
          roomName,
          dimensions: {
            lengthFt: l,
            widthFt: w,
            heightFt: h,
            floodCutHeightInches: fc,
            linearFtBaseboard: lb,
          },
        };

        const existingRooms = currentJob.dimensions || [];
        const roomIdx = existingRooms.findIndex(
          (r) => r.roomName.toLowerCase() === roomName.toLowerCase()
        );

        let updatedRooms: RoomDimension[];
        if (roomIdx >= 0) {
          updatedRooms = [...existingRooms];
          updatedRooms[roomIdx] = newRoom;
        } else {
          updatedRooms = [...existingRooms, newRoom];
        }

        const updatedJob: RestorationJob = {
          ...currentJob,
          dimensions: updatedRooms,
          scannedAssets: [newTag, ...(currentJob.scannedAssets || [])],
          updatedAt: timestamp,
        };

        return {
          success: true,
          type: 'room',
          summary: `Room Label: ${roomName} (${l * w} SF)`,
          tag: newTag,
          appliedChangesDescription: `Applied room dimensions via URI: ${l}ft × ${w}ft (${l * w} SF), ${fc}" flood cut.`,
          updatedJob,
        };
      }
    } catch {
      // Fall through to plain text parsing
    }
  }

  // 3. Plain Text Barcode Fallback (e.g. "AIR-MOVER-04: Master Bath" or "DEHU-108: Phoenix")
  const lowerText = trimmed.toLowerCase();
  if (
    lowerText.includes('fan') ||
    lowerText.includes('air mover') ||
    lowerText.includes('air-mover') ||
    lowerText.includes('dehu') ||
    lowerText.includes('scrubber') ||
    lowerText.includes('wood floor')
  ) {
    const eqCategory = normalizeEquipmentCategory(trimmed);
    const serialMatch = trimmed.match(/[A-Z0-9]+-[0-9]+/i) || trimmed.match(/#[0-9A-Z]+/i);
    const serial = serialMatch ? serialMatch[0] : `TAG-${Math.floor(Math.random() * 8000 + 1000)}`;

    const currentCount = currentJob.equipment[eqCategory] || 0;
    const newCount = currentCount + 1;

    const newTag: ScannedAssetTag = {
      id: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tagType: 'equipment',
      rawPayload: trimmed,
      scannedAt: timestamp,
      equipmentCategory: eqCategory,
      serialNumber: serial,
      model: trimmed.split(':')[1]?.trim() || getEquipmentDisplayName(eqCategory),
    };

    const updatedJob: RestorationJob = {
      ...currentJob,
      equipment: {
        ...currentJob.equipment,
        [eqCategory]: newCount,
      },
      scannedAssets: [newTag, ...(currentJob.scannedAssets || [])],
      updatedAt: timestamp,
    };

    return {
      success: true,
      type: 'equipment',
      summary: `${getEquipmentDisplayName(eqCategory)} (${serial})`,
      tag: newTag,
      appliedChangesDescription: `Recognized asset barcode: incremented ${getEquipmentDisplayName(eqCategory)} count ${currentCount} → ${newCount}.`,
      updatedJob,
    };
  }

  // Room plain text detection (e.g. "ROOM: Kitchen 15x12" or "Living Room Loss Zone")
  if (
    lowerText.startsWith('room:') ||
    lowerText.includes('bedroom') ||
    lowerText.includes('kitchen') ||
    lowerText.includes('bathroom') ||
    lowerText.includes('basement') ||
    lowerText.includes('hallway')
  ) {
    const cleanName = trimmed.replace(/^room:\s*/i, '').split(/[0-9]/)[0].trim() || 'Scanned Room';
    const dimMatch = trimmed.match(/(\d+)\s*(?:x|by|\*)\s*(\d+)/i);
    const l = dimMatch ? Number(dimMatch[1]) : 14;
    const w = dimMatch ? Number(dimMatch[2]) : 12;
    const h = 8;
    const fc = 24;
    const lb = (l + w) * 2;

    const newRoom: RoomDimension = {
      roomName: cleanName,
      lengthFt: l,
      widthFt: w,
      heightFt: h,
      affectedFloorSqFt: l * w,
      floodCutHeightInches: fc,
      linearFtBaseboard: lb,
    };

    const newTag: ScannedAssetTag = {
      id: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tagType: 'room',
      rawPayload: trimmed,
      scannedAt: timestamp,
      roomName: cleanName,
      dimensions: {
        lengthFt: l,
        widthFt: w,
        heightFt: h,
        floodCutHeightInches: fc,
        linearFtBaseboard: lb,
      },
    };

    const updatedRooms = [...(currentJob.dimensions || []), newRoom];
    const updatedJob: RestorationJob = {
      ...currentJob,
      dimensions: updatedRooms,
      scannedAssets: [newTag, ...(currentJob.scannedAssets || [])],
      updatedAt: timestamp,
    };

    return {
      success: true,
      type: 'room',
      summary: `Room Boundary: ${cleanName} (${l * w} SF)`,
      tag: newTag,
      appliedChangesDescription: `Extracted room boundary: ${cleanName} (${l}ft × ${w}ft, ${fc}" flood cut) appended to scope.`,
      updatedJob,
    };
  }

  // Unrecognized tag fallback
  const fallbackTag: ScannedAssetTag = {
    id: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    tagType: 'equipment',
    rawPayload: trimmed,
    scannedAt: timestamp,
    notes: `Scanned code: ${trimmed.slice(0, 80)}`,
  };

  return {
    success: false,
    type: 'unknown',
    summary: 'Unrecognized Tag Format',
    tag: fallbackTag,
    appliedChangesDescription: `Scanned code "${trimmed.slice(0, 40)}..." was logged to job history but did not match equipment or room schema.`,
    updatedJob: {
      ...currentJob,
      scannedAssets: [fallbackTag, ...(currentJob.scannedAssets || [])],
    },
  };
}

/**
 * Synthesizes an audio beep confirmation chime on successful QR scan via Web Audio API
 */
export function playScanSuccessSound(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // High crisp double-tone chime (880Hz -> 1760Hz)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    // AudioContext blocked by browser policy until gesture or not supported
  }
}
