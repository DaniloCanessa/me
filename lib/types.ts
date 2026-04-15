// ─── Precio del kWh ───────────────────────────────────────────────────────────

export type KWhPriceSource = 'bill_direct' | 'bill_calculated' | 'reference';

export interface EnergyPriceData {
  source: KWhPriceSource;
  kWhPriceCLP: number;
  variableAmountCLP?: number;
  measuredKWh?: number;
  referenceKWhPriceCLP: number;
}

// ─── Input del simulador ──────────────────────────────────────────────────────

export type CustomerType = 'residential' | 'business';
export type TarifaType = 'BT1' | 'BT2' | 'AT' | string;

export interface SimulatorInput {
  regionId: string;
  distribuidora?: string;
  tarifa: TarifaType;
  monthlyConsumptionKWh: number;
  energyPrice: EnergyPriceData;
  fixedChargeCLP?: number;
  customerType: CustomerType;
  hasExistingSolar?: boolean;
  existingSystemKWp?: number;
  includeBattery?: boolean;
}

// ─── Kit fotovoltaico ─────────────────────────────────────────────────────────

export interface SolarKit {
  id: string;
  sizekWp: number;
  includesBattery: boolean;
  batteryCapacityKWh?: number;
  panelCount: number;
  estimatedAreaM2: number;
  priceReferenceCLP: number;
  installationNotes?: string;
}

export interface KitRecommendation {
  primary: SolarKit;
  primaryWithBattery?: SolarKit;
  alternative?: SolarKit;
  alternativeCoveragePercent?: number;
}

// ─── Región y producción solar ────────────────────────────────────────────────

export type ZoneName = 'Norte' | 'Central' | 'Sur' | 'Austral';
export type MonthIndex = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type MonthlyProductionRecord = Record<MonthIndex, number>;

export interface RegionProfile {
  id: string;
  name: string;
  zone: ZoneName;
  monthlyProductionKWhPerKWp: MonthlyProductionRecord;
  annualProductionKWhPerKWp: number;
  summer: { sunriseHour: number; sunsetHour: number };
  winter: { sunriseHour: number; sunsetHour: number };
}

// ─── Balance energético mensual ───────────────────────────────────────────────

export interface MonthlyEnergyBalance {
  month: number;
  monthName: string;
  daysInMonth: number;
  productionKWh: number;
  consumptionKWh: number;
  selfConsumptionKWh: number;
  batteryChargeKWh: number;
  batteryDischargeKWh: number;
  injectedToGridKWh: number;
  consumedFromGridKWh: number;
  selfConsumptionSavingsCLP: number;
  injectionIncomeCLP: number;
  totalMonthlyBenefitCLP: number;
  netGridCostCLP: number;
  originalGridCostCLP: number;
}

// ─── Balance anual ────────────────────────────────────────────────────────────

export interface AnnualEnergyBalance {
  monthly: MonthlyEnergyBalance[];
  totalProductionKWh: number;
  totalConsumptionKWh: number;
  totalSelfConsumptionKWh: number;
  totalBatteryChargeKWh: number;
  totalBatteryDischargeKWh: number;
  totalInjectedKWh: number;
  totalConsumedFromGridKWh: number;
  coveragePercent: number;
  totalSelfConsumptionSavingsCLP: number;
  totalInjectionIncomeCLP: number;
  totalAnnualBenefitCLP: number;
  totalNetGridCostCLP: number;
  totalOriginalGridCostCLP: number;
}

// ─── Resumen financiero ───────────────────────────────────────────────────────

export interface FinancialSummary {
  systemCostCLP: number;
  annualBenefitCLP: number;
  monthlyBenefitCLP: number;
  paybackYears: number;
  roi25YearsPercent: number;
  injectionValuePerKWhCLP: number;
}

// ─── Resumen ambiental ────────────────────────────────────────────────────────

export interface EnvironmentalSummary {
  annualCO2AvoidedKg: number;
  equivalentTrees: number;
}

// ─── Resultado completo de la simulación ─────────────────────────────────────

export interface SimulatorResult {
  input: SimulatorInput;
  region: RegionProfile;
  kitRecommendation: KitRecommendation;
  energyBalance: AnnualEnergyBalance;
  financial: FinancialSummary;
  environmental: EnvironmentalSummary;
}

// ─── Futuro: persistencia y leads ────────────────────────────────────────────

export interface SavedSimulation {
  id: string;
  createdAt: string;
  result: SimulatorResult;
}

export interface LeadCapture {
  name: string;
  email: string;
  phone?: string;
  simulationId?: string;
}
