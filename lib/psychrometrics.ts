/**
 * IICRC S500 Psychrometric Calculation Engine
 * Converts Dry Bulb Temperature (°F) and Relative Humidity (% RH)
 * to Grains Per Pound (GPP), Dew Point (°F), Vapor Pressure (inHg),
 * and Specific Enthalpy (BTU/lb).
 */

export interface PsychrometricResult {
  tempF: number;
  rh: number;
  gpp: number; // Grains Per Pound of dry air
  dewPointF: number;
  dewPointDepressionF: number; // TempF - DewPointF (evaporative margin)
  vaporPressureInHg: number;
  enthalpyBtuPerLb: number; // BTU/lb dry air
}

export interface GrainDepressionResult {
  inletGPP: number;
  outletGPP: number;
  deltaGPP: number; // Inlet GPP - Outlet GPP
  status: 'optimal' | 'acceptable' | 'warning' | 'critical';
  label: string;
  recommendation: string;
  efficiencyPercentage: number;
}

export interface PsychrometricPreset {
  id: string;
  name: string;
  description: string;
  dayNumber: number;
  outside: { tempF: number; rh: number };
  unaffected: { tempF: number; rh: number };
  affected: { tempF: number; rh: number };
  dehuOutlet: { tempF: number; rh: number };
}

/**
 * Calculates GPP, Dew Point, Vapor Pressure, and Enthalpy at standard atmospheric pressure (1013.25 hPa / 29.921 inHg).
 */
export function calculatePsychrometrics(tempF: number, rh: number): PsychrometricResult {
  const clampedRH = Math.max(1, Math.min(100, Number(rh) || 50));
  const cleanTempF = Number(tempF) || 70;
  const tempC = ((cleanTempF - 32) * 5) / 9;

  // Saturation vapor pressure in hPa using Magnus-Tetens equation
  const vSatHpa = 6.1121 * Math.exp((17.67 * tempC) / (tempC + 243.5));

  // Actual vapor pressure in hPa
  const vActualHpa = vSatHpa * (clampedRH / 100);

  // Vapor pressure in inHg (1 hPa = 0.02953 inHg)
  const vaporPressureInHg = Number((vActualHpa * 0.02953).toFixed(3));

  // Mixing ratio W: lb water / lb dry air
  // Standard atmospheric pressure = 1013.25 hPa
  const P = 1013.25;
  const W = (0.62198 * vActualHpa) / Math.max(1, P - vActualHpa);

  // 1 lb = 7000 grains
  const gpp = Math.max(1, Math.round(W * 7000));

  // Dew point in °C
  const alpha = Math.log(Math.max(0.001, vActualHpa / 6.1121));
  const dewPointC = (243.5 * alpha) / (17.67 - alpha);
  const dewPointF = Math.round((dewPointC * 9) / 5 + 32);
  const dewPointDepressionF = Math.max(0, cleanTempF - dewPointF);

  // Specific Enthalpy h = 0.24 * T(°F) + W * (1061 + 0.444 * T(°F))
  const enthalpyBtuPerLb = Number((0.24 * cleanTempF + W * (1061 + 0.444 * cleanTempF)).toFixed(1));

  return {
    tempF: cleanTempF,
    rh: clampedRH,
    gpp,
    dewPointF,
    dewPointDepressionF,
    vaporPressureInHg,
    enthalpyBtuPerLb,
  };
}

/**
 * Evaluates Dehumidifier Grain Depression according to IICRC S500 Standards
 * for LGR (Low Grain Refrigerant) and Commercial Desiccants.
 */
export function evaluateGrainDepression(
  inletGPP: number,
  outletGPP: number
): GrainDepressionResult {
  const deltaGPP = Math.round(inletGPP - outletGPP);
  const efficiencyPercentage = Math.min(100, Math.max(0, Math.round((deltaGPP / Math.max(1, inletGPP)) * 100)));

  if (deltaGPP >= 20) {
    return {
      inletGPP,
      outletGPP,
      deltaGPP,
      status: 'optimal',
      label: 'Optimal Grain Depression (IICRC S500 Compliant)',
      recommendation:
        'LGR dehumidifier is operating at peak moisture extraction efficiency. The chamber maintains a strong vapor pressure gradient driving deep structural drying.',
      efficiencyPercentage,
    };
  }

  if (deltaGPP >= 12) {
    return {
      inletGPP,
      outletGPP,
      deltaGPP,
      status: 'acceptable',
      label: 'Acceptable Grain Depression',
      recommendation:
        'Dehumidifier is performing within standard acceptable parameters. Ensure air movers maintain 15–45° vortex airflow across wet assemblies.',
      efficiencyPercentage,
    };
  }

  if (deltaGPP > 0) {
    return {
      inletGPP,
      outletGPP,
      deltaGPP,
      status: 'warning',
      label: 'Low Grain Depression Alert (< 12 GPP)',
      recommendation:
        'Warning: Grain depression is below the IICRC 12 GPP benchmark. Check for dirty intake filters, coil icing, air leakage in containment, or high ambient temperatures.',
      efficiencyPercentage,
    };
  }

  return {
    inletGPP,
    outletGPP,
    deltaGPP,
    status: 'critical',
    label: 'Negative / Zero Grain Depression (Critical Fault)',
    recommendation:
      'CRITICAL: Dehumidifier exhaust is wetter than ambient chamber air. Compressor failure, severe coil freeze, or bypass ducting failure detected. Replace or service unit immediately.',
    efficiencyPercentage: 0,
  };
}

/**
 * Evaluates Vapor Pressure Differential driving evaporation from wet assemblies
 */
export function calculateVaporPressureDifferential(
  affectedVaporPressureInHg: number,
  outletVaporPressureInHg: number
): {
  deltaVpInHg: number;
  evaporativePotential: 'High' | 'Moderate' | 'Low' | 'Stagnant';
  guidance: string;
} {
  const delta = Number((affectedVaporPressureInHg - outletVaporPressureInHg).toFixed(3));

  if (delta >= 0.25) {
    return {
      deltaVpInHg: delta,
      evaporativePotential: 'High',
      guidance: 'Rapid structural desorption: high vapor pressure delta forces moisture out of porous substrates.',
    };
  }
  if (delta >= 0.12) {
    return {
      deltaVpInHg: delta,
      evaporativePotential: 'Moderate',
      guidance: 'Steady drying rate: acceptable differential between wet chamber air and processed exhaust air.',
    };
  }
  if (delta > 0) {
    return {
      deltaVpInHg: delta,
      evaporativePotential: 'Low',
      guidance: 'Sluggish drying: low vapor pressure differential. Consider increasing temperature or adding LGR capacity.',
    };
  }
  return {
    deltaVpInHg: delta,
    evaporativePotential: 'Stagnant',
    guidance: 'Evaporative stall: moisture cannot evaporate into an air boundary layer at equal or higher vapor pressure.',
  };
}

/**
 * Recommends Open vs. Closed Drying System according to IICRC S500 §12.
 * If outside air GPP is substantially lower than indoor chamber air and weather is favorable,
 * controlled air exchange (ventilation) may be considered.
 */
export function recommendDryingSystem(
  outsideGPP: number,
  affectedGPP: number
): {
  system: 'CLOSED SYSTEM (RECOMMENDED)' | 'CONTROLLED OPEN SYSTEM';
  badgeColor: string;
  explanation: string;
} {
  if (outsideGPP < affectedGPP - 20) {
    return {
      system: 'CONTROLLED OPEN SYSTEM',
      badgeColor: 'amber',
      explanation:
        'Outside air is significantly drier than the indoor drying chamber (Δ > 20 GPP). Controlled structural ventilation or air exchange may be utilized if outdoor weather is dry, stable, and particulate-free.',
    };
  }

  return {
    system: 'CLOSED SYSTEM (RECOMMENDED)',
    badgeColor: 'emerald',
    explanation:
      'Outside air humidity exceeds or nears chamber conditions. Maintain a sealed, closed drying chamber with mechanical LGR dehumidification to prevent ambient moisture infiltration.',
  };
}

/**
 * IICRC Field Presets for instant technician evaluation
 */
export const PSYCHROMETRIC_FIELD_PRESETS: PsychrometricPreset[] = [
  {
    id: 'preset-day1',
    name: 'Day 1: Initial Wet Loss (Emergency Setup)',
    description: 'High saturation in chamber; active LGR achieving high grain depression (28 GPP)',
    dayNumber: 1,
    outside: { tempF: 62, rh: 74 }, // 63 GPP
    unaffected: { tempF: 68, rh: 45 }, // 46 GPP
    affected: { tempF: 74, rh: 72 }, // 93 GPP
    dehuOutlet: { tempF: 86, rh: 36 }, // 65 GPP -> 28 GPP depression
  },
  {
    id: 'preset-day2',
    name: 'Day 2: Active Drying & Desorption',
    description: 'Chamber temperature warmed, RH reduced to 52%, LGR operating at steady 18 GPP depression',
    dayNumber: 2,
    outside: { tempF: 64, rh: 65 }, // 58 GPP
    unaffected: { tempF: 70, rh: 42 }, // 46 GPP
    affected: { tempF: 76, rh: 52 }, // 70 GPP
    dehuOutlet: { tempF: 88, rh: 28 }, // 52 GPP -> 18 GPP depression
  },
  {
    id: 'preset-day3',
    name: 'Day 3: Target Dry Standard Achieved',
    description: 'Equilibrium reached with unaffected control room; dry standard satisfied',
    dayNumber: 3,
    outside: { tempF: 60, rh: 70 }, // 54 GPP
    unaffected: { tempF: 70, rh: 40 }, // 44 GPP
    affected: { tempF: 73, rh: 42 }, // 51 GPP
    dehuOutlet: { tempF: 84, rh: 24 }, // 40 GPP -> 11 GPP depression
  },
  {
    id: 'preset-troubleshoot',
    name: 'Troubleshooting: Clogged Air Filter / Low Depression',
    description: 'Alert: Dehu pulling only 5 GPP depression due to restricted coil airflow',
    dayNumber: 2,
    outside: { tempF: 65, rh: 60 },
    unaffected: { tempF: 69, rh: 48 },
    affected: { tempF: 75, rh: 68 }, // 89 GPP
    dehuOutlet: { tempF: 82, rh: 52 }, // 84 GPP -> only 5 GPP depression!
  },
];
