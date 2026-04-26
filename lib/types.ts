// ─── Usuarios ─────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'user';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Clientes ─────────────────────────────────────────────────────────────────

export type ClientSource = 'simulador' | 'referido' | 'llamada' | 'visita' | 'manual' | 'otro';

export interface Client {
  id: string;
  lead_id: string | null;
  nombre: string;
  rut: string | null;
  empresa: string | null;
  ciudad: string | null;
  telefono: string | null;
  email: string | null;
  notas: string | null;
  assigned_to: string | null;
  source: ClientSource;
  created_at: string;
  updated_at: string;
  installations?: Installation[];
  contacts?: ClientContact[];
}

// ─── Instalaciones ────────────────────────────────────────────────────────────

export interface Installation {
  id: string;
  client_id: string;
  lead_id: string | null;
  nombre_instalacion: string;
  direccion: string | null;
  ciudad: string | null;
  region_id: string | null;
  customer_type: 'natural' | 'business' | null;
  distribuidora: string | null;
  tarifa: string | null;
  amperaje_a: number | null;
  potencia_contratada_kw: number | null;
  tension_suministro: 'BT' | 'AT' | null;
  consumo_promedio_mensual_kwh: number | null;
  simulation_data: Record<string, unknown> | null;
  notas: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Contactos de cliente ─────────────────────────────────────────────────────

export interface ClientContact {
  id: string;
  client_id: string;
  nombre: string;
  cargo: string | null;
  email: string | null;
  telefono: string | null;
  es_principal: boolean;
  created_at: string;
}

// ─── Actividades (timeline CRM) ───────────────────────────────────────────────

export type ActivityType = 'llamada' | 'visita' | 'email' | 'nota' | 'reunion' | 'otro';

export interface Activity {
  id: string;
  client_id: string | null;
  lead_id: string | null;
  tipo: ActivityType;
  descripcion: string;
  fecha: string;
  user_id: string | null;
  created_at: string;
}

// ─── Proyectos ────────────────────────────────────────────────────────────────

export type ProjectStatus = 'pendiente' | 'en_ejecucion' | 'completado' | 'cancelado';

export interface Project {
  id: string;
  quote_id: string | null;
  client_id: string;
  installation_id: string | null;
  nombre: string;
  estado: ProjectStatus;
  fecha_inicio: string | null;
  fecha_termino: string | null;
  assigned_to: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Cotizaciones ─────────────────────────────────────────────────────────────

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

export interface QuoteItem {
  id: string;
  quote_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  costo_proveedor_clp: number;  // interno — no aparece en PDF
  margen_pct: number;           // interno — no aparece en PDF
  unit_price_clp: number;       // precio neto unitario calculado
  discount_percent: number;
  total_clp: number;            // subtotal con IVA
  sort_order: number;
}

export interface Quote {
  id: string;
  quote_number: string;
  lead_id: string | null;
  client_id: string | null;
  installation_id: string | null;
  assigned_to: string | null;
  status: QuoteStatus;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  subtotal_clp: number;
  discount_clp: number;
  total_clp: number;
  validity_days: number;
  valid_until: string | null;
  notes: string | null;
  client_notes: string | null;
  token: string;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  closed_by: string | null;
  items?: QuoteItem[];
}

// ─── Precio del kWh ───────────────────────────────────────────────────────────

export type KWhPriceSource = 'bill_direct' | 'bill_calculated' | 'reference';

export interface EnergyPriceData {
  source: KWhPriceSource;
  kWhPriceCLP: number;
  variableAmountCLP?: number;
  measuredKWh?: number;
  referenceKWhPriceCLP: number;
}

// ─── Configuración dinámica del modelo (desde DB, con fallback a constants.ts) ─

export interface SimulatorConfig {
  kwhPriceCLP: number;
  injectionFactor: number;
  dayConsumptionRatio: number;
  systemLifeYears: number;
  panelWattageWp: number;
  panelAreaM2: number;
  co2FactorKgPerKWh: number;
  batteryModuleKWh: number;
  batteryModulePriceCLP: number;
  batteryCycleEfficiency: number;
  batteryUsableFraction: number;
  costPerKWpBusinessCLP: number;
  businessCoverageTarget: number;
  netBillingMaxKWp: number;
  discountRateReal: number;
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
  empalmeMaxKW?: number;
  batteryUsableFraction?: number; // fracción usable de la batería (1 - reserva); default 0.70

  // Overrides de config desde DB (todos opcionales, fallback a constants.ts)
  injectionValueFactor?: number;
  discountRateReal?: number;
  systemLifeYears?: number;
  batteryModuleKWh?: number;
  batteryModulePriceCLP?: number;
  batteryCycleEfficiency?: number;
  costPerKWpBusinessCLP?: number;
  businessCoverageTarget?: number;
  netBillingMaxKWp?: number;
  panelWattageWp?: number;
  panelAreaM2?: number;
  co2FactorKgPerKWh?: number;
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
  exceedsNetBillingLimit?: boolean; // true si el sistema óptimo supera los 300 kW del Art. 149 bis
}

export interface KitScenarios {
  A: SimulatorResult;
  B: SimulatorResult | null;
  C: SimulatorResult;
  kitA: SolarKit;
  kitB: SolarKit | null;
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
  batteryDischargeSavingsCLP: number;
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
  totalBatteryDischargeSavingsCLP: number;
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
  discountedPaybackYears: number; // payback descontado a tasa 10% real (DFL4 Art. 165d)
  vanCLP: number;                 // valor actual neto a 25 años con tasa 10% real
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
  kit: SolarKit;
  batteryCapacityKWh: number;
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

export type PropertyType = 'casa' | 'departamento' | 'oficina' | 'colegio' | 'industria' | 'condominio' | 'otro';

// ─── Datos de suministro ──────────────────────────────────────────────────────

export interface SupplyData {
  propertyType: PropertyType;
  distribuidora?: string;
  tarifa: TarifaType;
  amperajeA?: number;              // residencial: amperaje del breaker principal
  potenciaContratadaKW?: number;   // empresa: potencia contratada en kW
  tensionSuministro?: 'BT' | 'AT'; // empresa: baja tensión o alta tensión
  operatingHours?: 'peak' | 'offpeak' | 'mixed'; // solo para BT4.x/AT4.x
  hasExistingSolar: boolean;
  existingSystemKWp?: number;
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
  avgTotalBillCLP?: number;       // promedio monto total boleta (todos los cargos)
  avgPowerChargeCLP?: number;     // promedio cargo por potencia mensual
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
export type EVChargerType = 'mode2' | 'wallbox';

export interface EVCharger {
  carCount: number;
  chargerType: EVChargerType;         // modo 2 (cable portable 16A) o wallbox (32A)
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
  totalAdditionalMonthlyKWh: number;
  flexibleEquipment?: boolean;   // empresa: equipos con horario de uso flexible
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
