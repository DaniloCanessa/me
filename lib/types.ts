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

// Tarifas reguladas en Chile (Norma Técnica CNE).
// BT = Baja Tensión (< 1 kV), AT = Alta Tensión (≥ 1 kV).
// 'unknown' se usa cuando el cliente no conoce su tarifa; se trata como BT1.
export type TarifaType =
  | 'BT1'   // Energía, potencia conectada < 10 kW (residencial)
  | 'BT2'   // Energía + potencia contratada (comercial, alumbrado)
  | 'BT3'   // Energía + demanda máxima medida
  | 'BT4.1' // Energía + demanda punta contratada + demanda máxima contratada
  | 'BT4.2' // Energía + demanda punta medida + demanda máxima contratada
  | 'BT4.3' // Energía + demanda punta medida + demanda máxima medida
  | 'AT2'   // Alta tensión: equivalente a BT2
  | 'AT3'   // Alta tensión: equivalente a BT3
  | 'AT4.1' // Alta tensión: equivalente a BT4.1
  | 'AT4.2' // Alta tensión: equivalente a BT4.2
  | 'AT4.3' // Alta tensión: equivalente a BT4.3
  | 'unknown'; // No sabe → se trata como BT1

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
  empalmeMaxKW?: number;           // límite físico del empalme → cap del inversor/planta
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

// ─── Futuro: persistencia ─────────────────────────────────────────────────────

export interface SavedSimulation {
  id: string;
  createdAt: string;
  result: SimulatorResult;
}

// ─── Tipo de cliente y propiedad ──────────────────────────────────────────────

export type CustomerCategory = 'natural' | 'business';

export type PropertyType = 'casa' | 'departamento' | 'oficina' | 'colegio' | 'otro';

// ─── Datos de suministro ──────────────────────────────────────────────────────

export interface SupplyData {
  propertyType: PropertyType;
  distribuidora?: string;           // capturado desde la boleta (OCR) o ingresado manual en paso 4
  tarifa: TarifaType;               // capturado desde la boleta o manual; default 'unknown'
  amperajeA?: number;
  hasExistingSolar: boolean;
  existingSystemKWp?: number;
  includeBattery: boolean;          // derivado de batteryCount en FutureConsumption
}

// ─── Datos de contacto ────────────────────────────────────────────────────────

export interface PersonContact {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  commune: string;
  regionId: string;
}

export interface BusinessContact {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  commune: string;
  regionId: string;
}

// ─── Boletas y perfil de consumo ──────────────────────────────────────────────

export type BillDataSource = 'file_parsed' | 'manual' | 'interpolated';

export interface MonthlyBill {
  month: number;                  // 1–12
  year: number;
  consumptionKWh: number;
  variableAmountCLP?: number;
  fixedChargeCLP?: number;
  kWhPriceCLP?: number;
  distribuidora?: string;
  tarifa?: string;
  source: BillDataSource;
}

export interface ConsumptionProfile {
  bills: MonthlyBill[];           // hasta 12 meses
  averageMonthlyKWh: number;      // promedio usado en la simulación
  peakMonthKWh: number;
  minMonthKWh: number;
  isComplete: boolean;            // true si tiene los 12 meses
}

// ─── Consumos futuros ─────────────────────────────────────────────────────────

export type AcBtu = 9000 | 12000 | 18000;

export interface AirConditionerGroup {
  count: number;
  btu: AcBtu;
  estimatedMonthlyKWh: number;        // calculado
}

export interface ElectricWaterHeater {
  occupants: number;
  recommendedCapacityLiters: number;  // calculado según ocupantes
  estimatedMonthlyKWh: number;        // calculado
}

export type EVChargingTime = 'day' | 'night' | 'mixed';

export interface EVCharger {
  carCount: number;
  estimatedIncreasePercent: number;   // 33% por auto sobre consumo actual
  estimatedMonthlyKWh: number;        // calculado

  // Recomendación de horario derivada del balance energético
  recommendedChargingTime: EVChargingTime;
  // day   → excedentes solares suficientes para cubrir la carga
  // night → sin excedentes, conviene cargar desde la red en horario nocturno
  // mixed → varía según el mes

  dayChargingKWh: number;             // kWh cubiertos por excedentes solares
  nightChargingKWh: number;           // kWh consumidos desde la red
  dayChargingSavingsCLP: number;      // ahorro adicional por carga diurna solar
}

export interface FutureConsumption {
  airConditioners: AirConditionerGroup[];
  waterHeater?: ElectricWaterHeater;
  evCharger?: EVCharger;
  batteryCount: number;               // cantidad de baterías a incluir (0 = sin batería)
  totalAdditionalMonthlyKWh: number;
}

// ─── Estado del wizard ────────────────────────────────────────────────────────

export type WizardStep =
  | 'customer-type'
  | 'contact'
  | 'supply'
  | 'bills'
  | 'bill-review'
  | 'future-consumption'
  | 'results';

export interface WizardState {
  step: WizardStep;
  customerCategory: CustomerCategory | null;
  contact: PersonContact | BusinessContact | null;
  supply: SupplyData | null;
  consumptionProfile: ConsumptionProfile | null;
  futureConsumption: FutureConsumption | null;
  simulationResult: SimulatorResult | null;
}
