export type UserRole =
  | 'superadmin'
  | 'owner'
  | 'office_staff'
  | 'sales_technician'
  | 'client';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  companyName: string;
  phone?: string;
  avatarColor?: string;
}

export type WaterLossCategory =
  | 'Cat 1 (Clean)'
  | 'Cat 2 (Grey)'
  | 'Cat 3 (Black / Mold)';

export type FinishType = 'Unfinished' | 'Finished';

export type StandardizedAction =
  | 'FLOOD_CUT'
  | 'REMOVE_BASEBOARD'
  | 'REMOVE_FLOORING'
  | 'EXTRACT_WATER'
  | 'DEPLOY_EQUIPMENT'
  | 'HEPA_VACUUM'
  | 'APPLY_ANTIMICROBIAL';

export interface RoomDimension {
  roomName: string;
  lengthFt: number;
  widthFt: number;
  heightFt: number;
  affectedFloorSqFt?: number;
  floodCutHeightInches?: number;
  linearFtBaseboard?: number;
}

export interface MoistureReading {
  id: string;
  roomName: string;
  substrate: string; // e.g. Drywall, Baseboard, Subfloor, Hardwood, Framing
  readingValue: number; // e.g. 32
  unit: string; // e.g. '% WME' or 'Relative Pinless'
  dryStandard: number; // e.g. 12
  isAffected: boolean;
  notes?: string;
}

export interface ThermalReading {
  id: string;
  roomName: string;
  deltaTFahrenheit: number; // e.g. -6.4°F
  perimeterBoundaryDesc: string; // e.g. 'Cold anomaly extends 3.5ft up exterior wall cavity'
  hotspotOrCold: 'cold_anomaly' | 'thermal_bridge' | 'evaporative_cooling';
}

export interface PsychrometricLog {
  id: string;
  dayNumber: number;
  date: string;
  outsideTempF: number;
  outsideRH: number;
  unaffectedTempF: number;
  unaffectedRH: number;
  affectedTempF: number;
  affectedRH: number;
  affectedGPP: number; // Grains per pound
  dehuInletGPP: number;
  dehuOutletGPP: number;
  grainDepressionDeltaGPP: number; // Inlet GPP - Outlet GPP
}

export interface EquipmentDeployment {
  airMovers: number;
  dehumidifiers: number;
  airScrubbers: number;
  woodFloorSystems: number;
  dryingDays: number;
  techHoursOnSite: number;
  monitoringHoursPerDay: number;
}

export interface PhotoEvidence {
  id: string;
  dataUrl: string;
  caption: string;
  category: 'damage' | 'moisture_meter' | 'thermal' | 'containment';
  roomName: string;
  technicalDescription: string;
  clientSummary: string;
  substrate?: string;
  meterReading?: string;
  thermalDelta?: string;
  timestamp: string;
  gps?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    altitude?: number | null;
    address?: string;
    mapUrl?: string;
    satelliteUrl?: string;
    directionsUrl?: string;
    embedUrl?: string;
    capturedAt?: string;
    source?: 'browser_geolocation' | 'site_fallback' | 'manual';
  };
}

export interface ClientInformation {
  name: string;
  email: string;
  phone: string;
  address: string;
  cityStateZip: string;
  insuranceCarrier: string;
  policyNumber: string;
  claimNumber: string;
  deductible: number;
  adjusterName?: string;
  adjusterEmail?: string;
  adjusterPhone?: string;
}

export interface DigitalSignature {
  isSigned: boolean;
  signatureDataUrl?: string;
  signedByName?: string;
  signedAt?: string;
  ipAddress?: string;
  termsAccepted: boolean;
}

export interface RestorationJob {
  id: string;
  jobId: string; // e.g. 'DS-2026-0842'
  status:
    | 'Draft'
    | 'Ready for Review'
    | 'Client Authorized'
    | 'In Progress'
    | 'Completed'
    | 'Archived';
  isArchived?: boolean;
  archivedAt?: string;
  settledAmount?: number;
  category: WaterLossCategory;
  finishType: FinishType;
  cabinetryMultiplier: boolean; // x2 cabinetry demo multiplier per template A10/M70
  afterHours: boolean; // +$200 emergency after-hours fee
  client: ClientInformation;
  dimensions: RoomDimension[];
  actions: StandardizedAction[];
  moistureReadings: MoistureReading[];
  thermalReadings: ThermalReading[];
  psychrometricLogs?: PsychrometricLog[];
  equipment: EquipmentDeployment;
  photos: PhotoEvidence[];
  technicianNotes: string;
  rawTranscript: string;
  signature: DigitalSignature;
  scannedAssets?: ScannedAssetTag[];
  gpsCoordinates?: {
    latitude: number;
    longitude: number;
    address: string;
    accuracy?: number;
    mapUrl?: string;
  };
  createdAt: string;
  updatedAt: string;
  assignedTechId: string;
}

export interface ScannedAssetTag {
  id: string;
  tagType: 'equipment' | 'room';
  rawPayload: string;
  scannedAt: string;
  equipmentCategory?: 'airMovers' | 'dehumidifiers' | 'airScrubbers' | 'woodFloorSystems';
  serialNumber?: string;
  model?: string;
  roomName?: string;
  dimensions?: {
    lengthFt: number;
    widthFt: number;
    heightFt: number;
    floodCutHeightInches?: number;
    linearFtBaseboard?: number;
  };
  notes?: string;
}

export interface PricingBreakdown {
  affectedSquareFeet: number;
  demolitionRatePerSqFt: number;
  demolitionTotal: number;
  cabinetrySurcharge: number;
  baselineCharges: {
    emergencyTrip: number;
    monitoringBaseline: number;
    haulLoad: number;
    hepaFilter: number;
    totalBaseline: number;
  };
  equipmentCharges: {
    airMoversTotal: number;
    dehumidifiersTotal: number;
    airScrubbersTotal: number;
    woodFloorSystemsTotal: number;
    totalEquipment: number;
  };
  laborCharges: {
    totalHoursD29: number;
    ratePerHour: number;
    totalLabor: number;
  };
  afterHoursFee: number;
  itemizedSubtotal: number;
  lowEstimateBound: number;
  highEstimateBound: number;
  multiplierUsed: number;
}
