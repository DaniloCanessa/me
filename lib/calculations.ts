import type {
  SimulatorInput,
  SimulatorResult,
  SolarKit,
  KitRecommendation,
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

// ─── Selección de kit residencial ─────────────────────────────────────────────

function calcAnnualCoveragePercent(
  kit: SolarKit,
  annualConsumptionKWh: number,
  annualProductionPerKWp: number,
): number {
  const annualProduction = kit.sizekWp * annualProductionPerKWp;
  const annualDaytimeConsumption = annualConsumptionKWh * SOLAR_DEFAULTS.dayConsumptionRatio;
  const effectiveCoverage = Math.min(annualProduction, annualDaytimeConsumption);
  return Math.min(Math.round((effectiveCoverage / annualConsumptionKWh) * 100), 100);
}

function selectResidentialKit(
  monthlyConsumptionKWh: number,
  annualProductionPerKWp: number,
): KitRecommendation {
  const annualConsumptionKWh = monthlyConsumptionKWh * 12;
  const targetAnnualProduction = annualConsumptionKWh * SOLAR_DEFAULTS.dayConsumptionRatio;
  const requiredKWp = targetAnnualProduction / annualProductionPerKWp;

  const base = KIT_CATALOG
    .filter((k) => !k.includesBattery)
    .sort((a, b) => a.sizekWp - b.sizekWp);

  const withBattery = KIT_CATALOG
    .filter((k) => k.includesBattery)
    .sort((a, b) => a.sizekWp - b.sizekWp);

  const primary = base.find((k) => k.sizekWp >= requiredKWp) ?? base[base.length - 1];
  const primaryWithBattery = withBattery.find((k) => k.sizekWp === primary.sizekWp);

  const primaryIndex = base.indexOf(primary);
  const alternativeKit = primaryIndex > 0 ? base[primaryIndex - 1] : undefined;
  const altCoverage = alternativeKit
    ? calcAnnualCoveragePercent(alternativeKit, annualConsumptionKWh, annualProductionPerKWp)
    : undefined;
  const showAlternative =
    altCoverage !== undefined && altCoverage >= SOLAR_DEFAULTS.minAlternativeCoveragePercent;

  return {
    primary,
    primaryWithBattery,
    alternative: showAlternative ? alternativeKit : undefined,
    alternativeCoveragePercent: showAlternative ? altCoverage : undefined,
  };
}

function buildBusinessKit(monthlyConsumptionKWh: number, annualProductionPerKWp: number): SolarKit {
  const annualConsumption = monthlyConsumptionKWh * 12;
  const rawKWp = (annualConsumption * SOLAR_DEFAULTS.businessCoverageTarget) / annualProductionPerKWp;
  const sizekWp = Math.ceil(rawKWp * 2) / 2;
  const panelCount = Math.ceil((sizekWp * 1000) / SOLAR_DEFAULTS.panelWattage);
  return {
    id: `business-${sizekWp}kwp`,
    sizekWp,
    includesBattery: false,
    panelCount,
    estimatedAreaM2: Math.round(panelCount * SOLAR_DEFAULTS.panelAreaM2),
    priceReferenceCLP: Math.round(sizekWp * BUSINESS_DEFAULTS.costPerKWpCLP),
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
  const daytimeConsumption = consumptionKWh * SOLAR_DEFAULTS.dayConsumptionRatio;
  const nighttimeConsumption = consumptionKWh * SOLAR_DEFAULTS.nightConsumptionRatio;
  const originalGridCostCLP = Math.round(consumptionKWh * kWhPriceCLP + fixedChargeCLP);

  let selfConsumptionKWh: number;
  let batteryChargeKWh: number;
  let batteryDischargeKWh: number;
  let injectedToGridKWh: number;
  let consumedFromGridKWh: number;

  if (productionKWh >= daytimeConsumption) {
    // Solar cubre todo el consumo diurno y genera excedentes
    selfConsumptionKWh = daytimeConsumption;
    const surplus = productionKWh - daytimeConsumption;

    if (batteryCapacityKWh > 0) {
      const maxBatteryMonthly =
        batteryCapacityKWh * SOLAR_DEFAULTS.batteryDailyCycleEfficiency * daysInMonth;
      batteryChargeKWh = Math.min(surplus, maxBatteryMonthly);
      batteryDischargeKWh = Math.min(batteryChargeKWh, nighttimeConsumption);
      injectedToGridKWh = surplus - batteryChargeKWh;
      consumedFromGridKWh = nighttimeConsumption - batteryDischargeKWh;
    } else {
      batteryChargeKWh = 0;
      batteryDischargeKWh = 0;
      injectedToGridKWh = surplus;
      consumedFromGridKWh = nighttimeConsumption;
    }
  } else {
    // Solar no cubre todo el consumo diurno: sin excedentes, sin inyección
    selfConsumptionKWh = productionKWh;
    batteryChargeKWh = 0;
    batteryDischargeKWh = 0;
    injectedToGridKWh = 0;
    consumedFromGridKWh = (daytimeConsumption - productionKWh) + nighttimeConsumption;
  }

  const selfConsumptionSavingsCLP = Math.round(selfConsumptionKWh * kWhPriceCLP);
  const injectionIncomeCLP = Math.round(injectedToGridKWh * injectionValueCLP);
  const totalMonthlyBenefitCLP = selfConsumptionSavingsCLP + injectionIncomeCLP;
  const netGridCostCLP = Math.round(consumedFromGridKWh * kWhPriceCLP + fixedChargeCLP);

  return {
    month,
    monthName: MONTH_NAMES[month],
    daysInMonth,
    productionKWh: Math.round(productionKWh),
    consumptionKWh: Math.round(consumptionKWh),
    selfConsumptionKWh: Math.round(selfConsumptionKWh),
    batteryChargeKWh: Math.round(batteryChargeKWh),
    batteryDischargeKWh: Math.round(batteryDischargeKWh),
    injectedToGridKWh: Math.round(injectedToGridKWh),
    consumedFromGridKWh: Math.round(consumedFromGridKWh),
    selfConsumptionSavingsCLP,
    injectionIncomeCLP,
    totalMonthlyBenefitCLP,
    netGridCostCLP,
    originalGridCostCLP,
  };
}

// ─── Simulación principal ─────────────────────────────────────────────────────

export function runSimulation(input: SimulatorInput): SimulatorResult {
  const region = getRegionById(input.regionId);
  if (!region) throw new Error(`Región no encontrada: ${input.regionId}`);

  const kWhPriceCLP = input.energyPrice.kWhPriceCLP;
  const fixedChargeCLP = input.fixedChargeCLP ?? CHILE_BT1.fixedChargeCLP;
  const injectionValueCLP = kWhPriceCLP * SOLAR_DEFAULTS.injectionValueFactor;

  const kitRecommendation: KitRecommendation =
    input.customerType === 'residential'
      ? selectResidentialKit(input.monthlyConsumptionKWh, region.annualProductionKWhPerKWp)
      : { primary: buildBusinessKit(input.monthlyConsumptionKWh, region.annualProductionKWhPerKWp) };

  const selectedKit = kitRecommendation.primary;

  // Capacidad de batería: del kit > parámetro por defecto si el usuario la solicitó > 0
  const batteryCapacityKWh =
    selectedKit.batteryCapacityKWh ??
    (input.includeBattery ? SOLAR_DEFAULTS.defaultBatteryCapacityKWh : 0);

  const monthly: MonthlyEnergyBalance[] = [];
  for (let m = 1; m <= 12; m++) {
    const monthProd = region.monthlyProductionKWhPerKWp[m as MonthIndex];
    const productionKWh = selectedKit.sizekWp * monthProd;
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

  const totalConsumptionKWh = input.monthlyConsumptionKWh * 12;
  const totalSelfConsumptionKWh = monthly.reduce((s, m) => s + m.selfConsumptionKWh, 0);
  const totalBatteryChargeKWh = monthly.reduce((s, m) => s + m.batteryChargeKWh, 0);
  const totalBatteryDischargeKWh = monthly.reduce((s, m) => s + m.batteryDischargeKWh, 0);

  const energyBalance: AnnualEnergyBalance = {
    monthly,
    totalProductionKWh: monthly.reduce((s, m) => s + m.productionKWh, 0),
    totalConsumptionKWh,
    totalSelfConsumptionKWh,
    totalBatteryChargeKWh,
    totalBatteryDischargeKWh,
    totalInjectedKWh: monthly.reduce((s, m) => s + m.injectedToGridKWh, 0),
    totalConsumedFromGridKWh: monthly.reduce((s, m) => s + m.consumedFromGridKWh, 0),
    // Cobertura real = autoconsumo diurno + descarga nocturna de batería
    coveragePercent: Math.min(
      Math.round(
        ((totalSelfConsumptionKWh + totalBatteryDischargeKWh) / totalConsumptionKWh) * 100,
      ),
      100,
    ),
    totalSelfConsumptionSavingsCLP: monthly.reduce((s, m) => s + m.selfConsumptionSavingsCLP, 0),
    totalInjectionIncomeCLP: monthly.reduce((s, m) => s + m.injectionIncomeCLP, 0),
    totalAnnualBenefitCLP: monthly.reduce((s, m) => s + m.totalMonthlyBenefitCLP, 0),
    totalNetGridCostCLP: monthly.reduce((s, m) => s + m.netGridCostCLP, 0),
    totalOriginalGridCostCLP: monthly.reduce((s, m) => s + m.originalGridCostCLP, 0),
  };

  const financial: FinancialSummary = {
    systemCostCLP: selectedKit.priceReferenceCLP,
    annualBenefitCLP: energyBalance.totalAnnualBenefitCLP,
    monthlyBenefitCLP: Math.round(energyBalance.totalAnnualBenefitCLP / 12),
    paybackYears:
      Math.round((selectedKit.priceReferenceCLP / energyBalance.totalAnnualBenefitCLP) * 10) / 10,
    roi25YearsPercent: Math.round(
      ((energyBalance.totalAnnualBenefitCLP * SOLAR_DEFAULTS.systemLifeYears -
        selectedKit.priceReferenceCLP) /
        selectedKit.priceReferenceCLP) *
        100,
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

  return {
    input,
    region,
    kitRecommendation,
    energyBalance,
    financial,
    environmental,
  };
}
