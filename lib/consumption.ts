import type {
  AcBtu,
  AirConditionerGroup,
  ElectricWaterHeater,
  EVCharger,
  EVChargerType,
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

// Amperaje de pico por equipo de AA (split inverter, 220V monofásico)
export const AC_PEAK_AMPS: Record<AcBtu, number> = {
  9000:  3.6,   // ~800 W
  12000: 5.0,   // ~1.100 W
  18000: 7.5,   // ~1.650 W
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

// Amperaje de pico del elemento calefactor según capacidad del termo (220V)
// 80L → 1.500W, 150L → 2.000W, 200L → 2.500W
export const WATER_HEATER_PEAK_AMPS_BY_LITERS: Record<number, number> = {
  80:  6.8,
  150: 9.1,
  200: 11.4,
};

// ─── Auto eléctrico: amperaje de pico según tipo de cargador ─────────────────
// Modo 2: cable portable estándar 16A (3.520 W)
// Wallbox: instalación dedicada 32A (7.040 W)
export const EV_PEAK_AMPS: Record<EVChargerType, number> = {
  mode2:   16,
  wallbox: 32,
};

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
  chargerType: EVChargerType,
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
    chargerType,
    estimatedIncreasePercent,
    estimatedMonthlyKWh,
    recommendedChargingTime,
    dayChargingKWh: Math.round(dayChargingKWh),
    nightChargingKWh: Math.round(nightChargingKWh),
    dayChargingSavingsCLP,
  };
}

// ─── Carga pico de empalme por equipos futuros ────────────────────────────────

export interface EmpalmeLoadResult {
  totalPeakAmps: number;
  additionalEmpalmes: number;        // empalmes de 40A adicionales recomendados
  level: 'ok' | 'warning' | 'critical';
  breakdownAmps: {
    ac: number;
    waterHeater: number;
    ev: number;
  };
}

export function calcEmpalmeLoad(
  future: FutureConsumption,
  empalmeAmps: number,
): EmpalmeLoadResult {
  const acAmps = future.airConditioners.reduce(
    (sum, g) => sum + g.count * AC_PEAK_AMPS[g.btu],
    0,
  );

  const waterHeaterLiters = future.waterHeater?.recommendedCapacityLiters ?? 0;
  const waterHeaterAmps = waterHeaterLiters > 0
    ? (WATER_HEATER_PEAK_AMPS_BY_LITERS[waterHeaterLiters] ?? WATER_HEATER_PEAK_AMPS_BY_LITERS[200])
    : 0;

  const evAmps = future.evCharger
    ? future.evCharger.carCount * EV_PEAK_AMPS[future.evCharger.chargerType]
    : 0;

  const totalPeakAmps = Math.round((acAmps + waterHeaterAmps + evAmps) * 10) / 10;
  const ratio = totalPeakAmps / empalmeAmps;

  const level: EmpalmeLoadResult['level'] =
    ratio >= 0.9 ? 'critical' :
    ratio >= 0.6 ? 'warning'  : 'ok';

  const additionalEmpalmes = level !== 'ok'
    ? Math.ceil(totalPeakAmps / empalmeAmps)
    : 0;

  return {
    totalPeakAmps,
    additionalEmpalmes,
    level,
    breakdownAmps: {
      ac:          Math.round(acAmps * 10) / 10,
      waterHeater: Math.round(waterHeaterAmps * 10) / 10,
      ev:          Math.round(evAmps * 10) / 10,
    },
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
