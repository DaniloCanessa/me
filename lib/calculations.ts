import type {
  SimulatorInput,
  SimulatorResult,
  SolarKit,
  KitScenarios,
  MonthlyEnergyBalance,
  AnnualEnergyBalance,
  FinancialSummary,
  EnvironmentalSummary,
  MonthIndex,
} from './types';
import {
  KIT_CATALOG,
  SOLAR_DEFAULTS,
  BUSINESS_DEFAULTS,
  DFL4,
  MONTH_NAMES,
  DAYS_IN_MONTH,
  CHILE_BT1,
} from './constants';
import { getRegionById } from './regions';

// ─── Precio del kWh ───────────────────────────────────────────────────────────

export function calcKWhPriceFromBill(variableAmountCLP: number, measuredKWh: number): number {
  if (measuredKWh <= 0) return CHILE_BT1.referenceKWhPriceCLP;
  return Math.round(variableAmountCLP / measuredKWh);
}

// ─── Selección de kits residenciales ─────────────────────────────────────────

export function selectKits(empalmeMaxKW: number): { kitA: SolarKit; kitB: SolarKit | null } {
  const all = KIT_CATALOG
    .filter((k) => !k.includesBattery)
    .sort((a, b) => a.sizekWp - b.sizekWp);

  const eligible = all.filter((k) => k.sizekWp <= empalmeMaxKW);
  const kits = eligible.length > 0 ? eligible : all.slice(0, 1);

  const kitA = kits[kits.length - 1];
  const kitB = kits.length > 1 ? kits[kits.length - 2] : null;
  return { kitA, kitB };
}

// ─── Kit empresa (dimensionamiento continuo) ──────────────────────────────────

export function buildBusinessKit(
  monthlyConsumptionKWh: number,
  annualProductionPerKWp: number,
  empalmeMaxKW?: number,
): SolarKit {
  const annualConsumption = monthlyConsumptionKWh * 12;
  const rawKWp = (annualConsumption * SOLAR_DEFAULTS.businessCoverageTarget) / annualProductionPerKWp;
  const uncappedKWp = Math.ceil(rawKWp * 2) / 2;
  const cappedByEmpalme = empalmeMaxKW != null ? Math.min(uncappedKWp, empalmeMaxKW) : uncappedKWp;
  // Art. 149 bis DFL4: máximo 300 kW por inmueble para net billing
  const sizekWp = Math.min(cappedByEmpalme, DFL4.netBillingMaxKWp);
  const exceedsNetBillingLimit = uncappedKWp > DFL4.netBillingMaxKWp;
  const panelCount = Math.ceil((sizekWp * 1000) / SOLAR_DEFAULTS.panelWattage);
  return {
    id: `business-${sizekWp}kwp`,
    sizekWp,
    includesBattery: false,
    panelCount,
    estimatedAreaM2: Math.round(panelCount * SOLAR_DEFAULTS.panelAreaM2),
    priceReferenceCLP: Math.round(sizekWp * BUSINESS_DEFAULTS.costPerKWpCLP),
    exceedsNetBillingLimit,
  };
}

// ─── Balance energético mensual ───────────────────────────────────────────────

function calcMonthlyBalance(
  month: number,
  productionKWh: number,
  consumptionKWh: number,
  kWhPriceCLP: number,
  injectionValueCLP: number,
  fixedChargeCLP: number,
  batteryCapacityKWh: number,
  daysInMonth: number,
): MonthlyEnergyBalance {
  const daytimeConsumption  = consumptionKWh * SOLAR_DEFAULTS.dayConsumptionRatio;
  const nighttimeConsumption = consumptionKWh * SOLAR_DEFAULTS.nightConsumptionRatio;
  const originalGridCostCLP = Math.round(consumptionKWh * kWhPriceCLP + fixedChargeCLP);

  let selfConsumptionKWh: number;
  let batteryChargeKWh: number;
  let batteryDischargeKWh: number;
  let injectedToGridKWh: number;
  let consumedFromGridKWh: number;

  if (productionKWh >= daytimeConsumption) {
    selfConsumptionKWh = daytimeConsumption;
    const surplus = productionKWh - daytimeConsumption;

    if (batteryCapacityKWh > 0) {
      // Solo el 70% de la capacidad se usa para descarga nocturna (30% = reserva de cortes)
      const maxDailyUsable = batteryCapacityKWh * SOLAR_DEFAULTS.batteryUsableFraction;
      const maxMonthlyCharge    = (maxDailyUsable / SOLAR_DEFAULTS.batteryDailyCycleEfficiency) * daysInMonth;
      const maxMonthlyDischarge = maxDailyUsable * SOLAR_DEFAULTS.batteryDailyCycleEfficiency * daysInMonth;

      batteryChargeKWh    = Math.min(surplus, maxMonthlyCharge);
      batteryDischargeKWh = Math.min(
        batteryChargeKWh * SOLAR_DEFAULTS.batteryDailyCycleEfficiency,
        maxMonthlyDischarge,
        nighttimeConsumption,
      );
      injectedToGridKWh   = surplus - batteryChargeKWh;
      consumedFromGridKWh = nighttimeConsumption - batteryDischargeKWh;
    } else {
      batteryChargeKWh    = 0;
      batteryDischargeKWh = 0;
      injectedToGridKWh   = surplus;
      consumedFromGridKWh = nighttimeConsumption;
    }
  } else {
    selfConsumptionKWh  = productionKWh;
    batteryChargeKWh    = 0;
    batteryDischargeKWh = 0;
    injectedToGridKWh   = 0;
    consumedFromGridKWh = (daytimeConsumption - productionKWh) + nighttimeConsumption;
  }

  const selfConsumptionSavingsCLP = Math.round(selfConsumptionKWh * kWhPriceCLP);
  const injectionIncomeCLP        = Math.round(injectedToGridKWh  * injectionValueCLP);
  const totalMonthlyBenefitCLP    = selfConsumptionSavingsCLP + injectionIncomeCLP;
  const netGridCostCLP            = Math.round(consumedFromGridKWh * kWhPriceCLP + fixedChargeCLP);

  return {
    month,
    monthName: MONTH_NAMES[month],
    daysInMonth,
    productionKWh:          Math.round(productionKWh),
    consumptionKWh:         Math.round(consumptionKWh),
    selfConsumptionKWh:     Math.round(selfConsumptionKWh),
    batteryChargeKWh:       Math.round(batteryChargeKWh),
    batteryDischargeKWh:    Math.round(batteryDischargeKWh),
    injectedToGridKWh:      Math.round(injectedToGridKWh),
    consumedFromGridKWh:    Math.round(consumedFromGridKWh),
    selfConsumptionSavingsCLP,
    injectionIncomeCLP,
    totalMonthlyBenefitCLP,
    netGridCostCLP,
    originalGridCostCLP,
  };
}

// ─── Simulación principal ─────────────────────────────────────────────────────

export function runSimulation(
  input: SimulatorInput,
  kit: SolarKit,
  batteryCapacityKWh: number,
  systemCostOverrideCLP?: number,
): SimulatorResult {
  const region = getRegionById(input.regionId);
  if (!region) throw new Error(`Región no encontrada: ${input.regionId}`);

  const kWhPriceCLP      = input.energyPrice.kWhPriceCLP;
  const fixedChargeCLP   = input.fixedChargeCLP ?? CHILE_BT1.fixedChargeCLP;
  const injectionValueCLP = kWhPriceCLP * SOLAR_DEFAULTS.injectionValueFactor;

  const monthly: MonthlyEnergyBalance[] = [];
  for (let m = 1; m <= 12; m++) {
    const productionKWh = kit.sizekWp * region.monthlyProductionKWhPerKWp[m as MonthIndex];
    monthly.push(
      calcMonthlyBalance(
        m,
        productionKWh,
        input.monthlyConsumptionKWh,
        kWhPriceCLP,
        injectionValueCLP,
        fixedChargeCLP,
        batteryCapacityKWh,
        DAYS_IN_MONTH[m],
      ),
    );
  }

  const totalConsumptionKWh        = input.monthlyConsumptionKWh * 12;
  const totalSelfConsumptionKWh    = monthly.reduce((s, m) => s + m.selfConsumptionKWh, 0);
  const totalBatteryChargeKWh      = monthly.reduce((s, m) => s + m.batteryChargeKWh, 0);
  const totalBatteryDischargeKWh   = monthly.reduce((s, m) => s + m.batteryDischargeKWh, 0);

  const energyBalance: AnnualEnergyBalance = {
    monthly,
    totalProductionKWh:           monthly.reduce((s, m) => s + m.productionKWh, 0),
    totalConsumptionKWh,
    totalSelfConsumptionKWh,
    totalBatteryChargeKWh,
    totalBatteryDischargeKWh,
    totalInjectedKWh:             monthly.reduce((s, m) => s + m.injectedToGridKWh, 0),
    totalConsumedFromGridKWh:     monthly.reduce((s, m) => s + m.consumedFromGridKWh, 0),
    coveragePercent: Math.min(
      Math.round(((totalSelfConsumptionKWh + totalBatteryDischargeKWh) / totalConsumptionKWh) * 100),
      100,
    ),
    totalSelfConsumptionSavingsCLP: monthly.reduce((s, m) => s + m.selfConsumptionSavingsCLP, 0),
    totalInjectionIncomeCLP:        monthly.reduce((s, m) => s + m.injectionIncomeCLP, 0),
    totalAnnualBenefitCLP:          monthly.reduce((s, m) => s + m.totalMonthlyBenefitCLP, 0),
    totalNetGridCostCLP:            monthly.reduce((s, m) => s + m.netGridCostCLP, 0),
    totalOriginalGridCostCLP:       monthly.reduce((s, m) => s + m.originalGridCostCLP, 0),
  };

  const systemCostCLP = systemCostOverrideCLP ?? kit.priceReferenceCLP;
  const annualBenefit = energyBalance.totalAnnualBenefitCLP;
  const r = DFL4.discountRateReal;
  const n = SOLAR_DEFAULTS.systemLifeYears;

  // Factor de anualidad: (1 - (1+r)^-n) / r
  const annuityFactor = (1 - Math.pow(1 + r, -n)) / r;
  const vanCLP = Math.round(annualBenefit * annuityFactor - systemCostCLP);

  // Payback descontado: meses donde el VAN acumulado cubre la inversión
  // t = -ln(1 - r × Cost/AnnualBenefit) / ln(1+r)
  const ratio = systemCostCLP / annualBenefit;
  const arg = 1 - r * ratio;
  const discountedPaybackYears = arg > 0
    ? Math.round((-Math.log(arg) / Math.log(1 + r)) * 10) / 10
    : Infinity; // la inversión no se recupera dentro de la vida útil a esta tasa

  const financial: FinancialSummary = {
    systemCostCLP,
    annualBenefitCLP:   annualBenefit,
    monthlyBenefitCLP:  Math.round(annualBenefit / 12),
    paybackYears:       Math.round((systemCostCLP / annualBenefit) * 10) / 10,
    discountedPaybackYears,
    vanCLP,
    roi25YearsPercent: Math.round(
      ((annualBenefit * n - systemCostCLP) / systemCostCLP) * 100,
    ),
    injectionValuePerKWhCLP: Math.round(injectionValueCLP),
  };

  const annualCO2AvoidedKg = Math.round(
    energyBalance.totalProductionKWh * SOLAR_DEFAULTS.co2FactorKgPerKWh,
  );
  const environmental: EnvironmentalSummary = {
    annualCO2AvoidedKg,
    equivalentTrees: Math.round(annualCO2AvoidedKg / 21),
  };

  return { input, region, kit, batteryCapacityKWh, energyBalance, financial, environmental };
}

// ─── Tres escenarios residenciales ────────────────────────────────────────────

export function calcThreeScenarios(
  input: SimulatorInput,
  batteryCount: number,
): KitScenarios {
  const empalmeMaxKW = input.empalmeMaxKW!;
  const { kitA, kitB } = selectKits(empalmeMaxKW);
  const batteryKWh      = batteryCount * SOLAR_DEFAULTS.batteryModuleKWh;
  const batteryCostCLP  = batteryCount * SOLAR_DEFAULTS.batteryModulePriceCLP;

  return {
    A:    runSimulation(input, kitA, 0),
    B:    kitB ? runSimulation(input, kitB, 0) : null,
    C:    runSimulation(input, kitA, batteryKWh, kitA.priceReferenceCLP + batteryCostCLP),
    kitA,
    kitB,
  };
}

// ─── Simulación empresa (un solo escenario) ───────────────────────────────────

export function runBusinessSimulation(input: SimulatorInput): SimulatorResult {
  const region = getRegionById(input.regionId);
  if (!region) throw new Error(`Región no encontrada: ${input.regionId}`);
  const kit = buildBusinessKit(input.monthlyConsumptionKWh, region.annualProductionKWhPerKWp, input.empalmeMaxKW);
  return runSimulation(input, kit, 0);
}

export function runBusinessSimulationWithBattery(input: SimulatorInput, batteryCount: number): SimulatorResult {
  const region = getRegionById(input.regionId);
  if (!region) throw new Error(`Región no encontrada: ${input.regionId}`);
  const kit = buildBusinessKit(input.monthlyConsumptionKWh, region.annualProductionKWhPerKWp, input.empalmeMaxKW);
  const batteryKWh = batteryCount * SOLAR_DEFAULTS.batteryModuleKWh;
  const totalCost  = kit.priceReferenceCLP + batteryCount * SOLAR_DEFAULTS.batteryModulePriceCLP;
  return runSimulation(input, kit, batteryKWh, totalCost);
}
