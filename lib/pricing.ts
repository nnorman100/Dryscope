import {
  RestorationJob,
  PricingBreakdown,
  WaterLossCategory,
  FinishType,
} from './types';

// Rate Constants per Residential Estimate Tool workbook
export const RATES = {
  CAT1_UNFINISHED: 1.21,
  CAT1_FINISHED: 2.78,
  CAT2_UNFINISHED: 1.52,
  CAT2_FINISHED: 2.89,
  CAT3_UNFINISHED: 2.48,
  CAT3_FINISHED: 8.39,

  // Baseline standard items (total $1,180.20)
  EMERGENCY_TRIP: 133.95,
  MONITORING_RATE_PER_HR: 47.46,
  MONITORING_BASELINE_HOURS: 13.25, // = $628.845 ($628.85 rounded)
  HAUL_LOAD: 159.53,
  HEPA_FILTER: 183.12,

  // Equipment daily rates
  AIR_MOVER_PER_DAY: 29.25,
  DEHUMIDIFIER_PER_DAY: 101.25,
  AIR_SCRUBBER_PER_DAY: 74.75,
  WOOD_FLOOR_PER_DAY: 180.0,

  // Surcharges & Labor
  AFTER_HOURS_CHARGE: 200.0,
  LABOR_RATE_PER_HOUR: 47.46,
};

export function getDemolitionRatePerSqFt(
  category: WaterLossCategory,
  finish: FinishType
): number {
  if (category === 'Cat 1 (Clean)') {
    return finish === 'Finished' ? RATES.CAT1_FINISHED : RATES.CAT1_UNFINISHED;
  }
  if (category === 'Cat 2 (Grey)') {
    return finish === 'Finished' ? RATES.CAT2_FINISHED : RATES.CAT2_UNFINISHED;
  }
  // Cat 3 (Black / Mold)
  return finish === 'Finished' ? RATES.CAT3_FINISHED : RATES.CAT3_UNFINISHED;
}

export function calculateTotalAffectedSqFt(job: RestorationJob): number {
  return job.dimensions.reduce((acc, dim) => {
    const area =
      dim.affectedFloorSqFt && dim.affectedFloorSqFt > 0
        ? dim.affectedFloorSqFt
        : dim.lengthFt * dim.widthFt;
    return acc + area;
  }, 0);
}

export function calculatePricingBreakdown(job: RestorationJob): PricingBreakdown {
  const affectedSqFt = calculateTotalAffectedSqFt(job);
  const baseDemoRate = getDemolitionRatePerSqFt(job.category, job.finishType);

  // Demolition calculation
  let demoTotal = affectedSqFt * baseDemoRate;
  let cabinetrySurcharge = 0;
  if (job.cabinetryMultiplier && job.category === 'Cat 3 (Black / Mold)') {
    // Cabinetry demo x2 increases finished demo factor
    cabinetrySurcharge = affectedSqFt * 1.68; // Wall demo & cabinetry factor
    demoTotal += cabinetrySurcharge;
  }

  // Baseline items
  const emergencyTrip = RATES.EMERGENCY_TRIP;
  const monitoringBaseline = Math.round(
    RATES.MONITORING_RATE_PER_HR * RATES.MONITORING_BASELINE_HOURS * 100
  ) / 100; // 628.85
  const haulLoad = RATES.HAUL_LOAD;
  const hepaFilter = RATES.HEPA_FILTER;
  const totalBaseline = emergencyTrip + monitoringBaseline + haulLoad + hepaFilter; // 1180.20

  // Equipment calculation
  const days = Math.max(1, job.equipment.dryingDays || 3);
  const airMoversTotal = job.equipment.airMovers * RATES.AIR_MOVER_PER_DAY * days;
  const dehumidifiersTotal =
    job.equipment.dehumidifiers * RATES.DEHUMIDIFIER_PER_DAY * days;
  const airScrubbersTotal =
    job.equipment.airScrubbers * RATES.AIR_SCRUBBER_PER_DAY * days;
  const woodFloorSystemsTotal =
    job.equipment.woodFloorSystems * RATES.WOOD_FLOOR_PER_DAY * days;

  const totalEquipment =
    airMoversTotal +
    dehumidifiersTotal +
    airScrubbersTotal +
    woodFloorSystemsTotal;

  // Cell D29 Labor Hours formula: (# of Techs * Hours on Site) + (Monitoring Hours * Days)
  const techHours = job.equipment.techHoursOnSite || 4;
  const monitoringDailyHours = job.equipment.monitoringHoursPerDay || 1;
  const totalLaborHours = techHours + monitoringDailyHours * days;
  const totalLabor = totalLaborHours * RATES.LABOR_RATE_PER_HOUR;

  // After hours fee
  const afterHoursFee = job.afterHours ? RATES.AFTER_HOURS_CHARGE : 0;

  // Itemized base total
  const itemizedSubtotal =
    demoTotal + totalBaseline + totalEquipment + totalLabor + afterHoursFee;

  // Multiplier for Low-High Range per sheet rules:
  // High uses 1.5 when affected area <= 1,000 SF, otherwise 1.2
  const multiplierUsed = affectedSqFt <= 1000 ? 1.5 : 1.2;

  // Range calculation per sheet Cells E17-H19 & C22:D22
  let lowEstimateBound = itemizedSubtotal;
  let highEstimateBound = itemizedSubtotal;

  if (job.afterHours) {
    // After hours range formula: base labor/material * 1.2
    const laborMatBase = demoTotal + totalLabor;
    const laborMatLow = laborMatBase * 1.2;
    const laborMatHigh = laborMatLow * multiplierUsed;
    const fixedFees = totalBaseline + totalEquipment + afterHoursFee;

    lowEstimateBound = fixedFees + laborMatLow;
    highEstimateBound = fixedFees + laborMatHigh;
  } else {
    const laborMatBase = demoTotal + totalLabor;
    const laborMatHigh = laborMatBase * multiplierUsed;
    const fixedFees = totalBaseline + totalEquipment;

    lowEstimateBound = fixedFees + laborMatBase;
    highEstimateBound = fixedFees + laborMatHigh;
  }

  return {
    affectedSquareFeet: Math.round(affectedSqFt * 100) / 100,
    demolitionRatePerSqFt: baseDemoRate,
    demolitionTotal: Math.round(demoTotal * 100) / 100,
    cabinetrySurcharge: Math.round(cabinetrySurcharge * 100) / 100,
    baselineCharges: {
      emergencyTrip,
      monitoringBaseline,
      haulLoad,
      hepaFilter,
      totalBaseline: Math.round(totalBaseline * 100) / 100,
    },
    equipmentCharges: {
      airMoversTotal: Math.round(airMoversTotal * 100) / 100,
      dehumidifiersTotal: Math.round(dehumidifiersTotal * 100) / 100,
      airScrubbersTotal: Math.round(airScrubbersTotal * 100) / 100,
      woodFloorSystemsTotal: Math.round(woodFloorSystemsTotal * 100) / 100,
      totalEquipment: Math.round(totalEquipment * 100) / 100,
    },
    laborCharges: {
      totalHoursD29: Math.round(totalLaborHours * 10) / 10,
      ratePerHour: RATES.LABOR_RATE_PER_HOUR,
      totalLabor: Math.round(totalLabor * 100) / 100,
    },
    afterHoursFee,
    itemizedSubtotal: Math.round(itemizedSubtotal * 100) / 100,
    lowEstimateBound: Math.round(lowEstimateBound * 100) / 100,
    highEstimateBound: Math.round(highEstimateBound * 100) / 100,
    multiplierUsed,
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
