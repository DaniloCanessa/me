import type {
  AcBtu,
  AirConditionerGroup,
  ElectricWaterHeater,
  EVCharger,
  EVChargingTime,
  FutureConsumption,
  AnnualEnergyBalance,
} from './types';
import { SOLAR_DEFAULTS } from './constants';

// ─── Consumo mensual por equipo de AA (kWh/mes/equipo) ───────────────────────
// Promedio anual en Chile: incluye uso en verano (cooling) e invierno (heating).
// Zona central como referencia. Actualizable por zona en versiones futuras.

export const AC_MONTHLY_KWH_PER_UNIT: Record<AcBtu, number> = {
  9000:  70,
  12000: 95,
  18000: 140,
};

// ─── Termo eléctrico: capacidad recomendada según ocupantes ──────────────────

export const WATER_HEATER_CAPACITY_BY_OCCUPANTS: Record<number, number> = {
  1: 80,
  2: 80,
  3: 150,
  4: 150,
};
export const WATER_HEATER_CAPACITY_MAX_LITERS = 200; // para 5 o más personas

// kWh consumidos por litro de capacidad del termo al mes
// Incorpora pérdidas térmicas, ciclos de calentamiento y standby
export const WATER_HEATER_KWH_PER_LITER_MONTH = 1.1;

// ─── Aire acondicionado ───────────────────────────────────────────────────────

export function calcACConsumption(count: number, btu: AcBtu): AirConditionerGroup {
  return {
    count,
    btu,
    estimatedMonthlyKWh: count * AC_MONTHLY_KWH_PER_UNIT[btu],
  };
}

// ─── Termo eléctrico ──────────────────────────────────────────────────────────

export function calcWaterHeater(occupants: number): ElectricWaterHeater {
  const recommendedCapacityLiters =
    WATER_HEATER_CAPACITY_BY_OCCUPANTS[occupants] ?? WATER_HEATER_CAPACITY_MAX_LITERS;
  return {
    occupants,
    recommendedCapacityLiters,
    estimatedMonthlyKWh: Math.round(
      recommendedCapacityLiters * WATER_HEATER_KWH_PER_LITER_MONTH,
    ),
  };
}

// ─── Auto eléctrico ───────────────────────────────────────────────────────────

export function calcEVCharger(
  carCount: number,
  currentMonthlyKWh: number,
  energyBalance: AnnualEnergyBalance,
  kWhPriceCLP: number,
  injectionValuePerKWhCLP: number,
): EVCharger {
  const increasePerCar = SOLAR_DEFAULTS.evConsumptionIncreasePerCar;
  const estimatedIncreasePercent = increasePerCar * carCount * 100;
  const estimatedMonthlyKWh = Math.round(currentMonthlyKWh * increasePerCar * carCount);
  const estimatedAnnualKWh = estimatedMonthlyKWh * 12;

  // Recomendación de horario según excedentes solares anuales disponibles
  const annualSurplusKWh = energyBalance.totalInjectedKWh;

  let recommendedChargingTime: EVChargingTime;
  let dayChargingKWh: number;
  let nightChargingKWh: number;

  if (annualSurplusKWh >= estimatedAnnualKWh) {
    // Excedentes cubren todo el consumo del auto → cargar de día
    recommendedChargingTime = 'day';
    dayChargingKWh = estimatedAnnualKWh;
    nightChargingKWh = 0;
  } else if (annualSurplusKWh <= 0) {
    // Sin excedentes → cargar de noche desde la red
    recommendedChargingTime = 'night';
    dayChargingKWh = 0;
    nightChargingKWh = estimatedAnnualKWh;
  } else {
    // Excedentes parciales → carga mixta
    recommendedChargingTime = 'mixed';
    dayChargingKWh = annualSurplusKWh;
    nightChargingKWh = estimatedAnnualKWh - annualSurplusKWh;
  }

  // Ahorro adicional por carga diurna: usar el excedente solar directamente
  // evita venderlo a precio de inyección (50%) y comprarlo de vuelta al precio completo
  const dayChargingSavingsCLP = Math.round(
    dayChargingKWh * (kWhPriceCLP - injectionValuePerKWhCLP),
  );

  return {
    carCount,
    estimatedIncreasePercent,
    estimatedMonthlyKWh,
    recommendedChargingTime,
    dayChargingKWh: Math.round(dayChargingKWh),
    nightChargingKWh: Math.round(nightChargingKWh),
    dayChargingSavingsCLP,
  };
}

// ─── Total de consumos futuros ────────────────────────────────────────────────

export function calcFutureConsumption(
  airConditioners: AirConditionerGroup[],
  waterHeater: ElectricWaterHeater | undefined,
  evCharger: EVCharger | undefined,
): FutureConsumption {
  const totalAdditionalMonthlyKWh =
    airConditioners.reduce((s, ac) => s + ac.estimatedMonthlyKWh, 0) +
    (waterHeater?.estimatedMonthlyKWh ?? 0) +
    (evCharger?.estimatedMonthlyKWh ?? 0);

  return { airConditioners, waterHeater, evCharger, totalAdditionalMonthlyKWh };
}
