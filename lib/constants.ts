import type { SolarKit } from './types';

// ─── Tarifa BT1 Chile (valores referenciales) ─────────────────────────────────

export const CHILE_BT1 = {
  referenceKWhPriceCLP: 220,
  fixedChargeCLP: 1_200,
};

// ─── Parámetros solares generales ────────────────────────────────────────────

export const SOLAR_DEFAULTS = {
  // Nota: la producción mensual en regions.ts ya incorpora eficiencia del sistema.
  // panelWattage y panelAreaM2 se usan solo para dimensionar cantidad de paneles y área.
  panelWattage: 550,                   // W por panel (estándar residencial)
  panelAreaM2: 2.5,                    // m² por panel
  co2FactorKgPerKWh: 0.4,             // kg CO₂/kWh (factor red eléctrica Chile)
  systemLifeYears: 25,                 // vida útil del sistema en años
  injectionValueFactor: 0.50,          // valor inyección = 50% precio compra (net billing conservador)
  batteryDailyCycleEfficiency: 0.80,   // eficiencia de ciclo diario de la batería
  minAlternativeCoveragePercent: 65,   // cobertura mínima para mostrar kit alternativo
  businessCoverageTarget: 0.90,        // % del consumo anual que se intenta cubrir en clientes empresa
  evConsumptionIncreasePerCar: 0.33,
  dayConsumptionRatio: 0.70,
  nightConsumptionRatio: 0.30,
  batteryUsableFraction: 0.70,         // fracción de la batería disponible para descarga nocturna (30% = reserva cortes)
  batteryModuleKWh: 5,                 // kWh por módulo de batería
  batteryModulePriceCLP: 1_500_000,    // precio referencial por módulo de 5 kWh
};

// ─── Parámetros para empresas ─────────────────────────────────────────────────

export const BUSINESS_DEFAULTS = {
  costPerKWpCLP: 1_000_000, // actualizable
};

// ─── Catálogo de kits residenciales ──────────────────────────────────────────

export const KIT_CATALOG: SolarKit[] = [
  // Sin batería
  {
    id: 'kit-2kwp',
    sizekWp: 2,
    includesBattery: false,
    panelCount: 4,
    estimatedAreaM2: 10,
    priceReferenceCLP: 2_400_000,
    installationNotes: 'Requiere espacio libre mínimo de 10 m².',
  },
  {
    id: 'kit-3kwp',
    sizekWp: 3,
    includesBattery: false,
    panelCount: 6,
    estimatedAreaM2: 15,
    priceReferenceCLP: 3_600_000,
    installationNotes: 'Requiere espacio libre mínimo de 15 m².',
  },
  {
    id: 'kit-5kwp',
    sizekWp: 5,
    includesBattery: false,
    panelCount: 10,
    estimatedAreaM2: 25,
    priceReferenceCLP: 6_000_000,
    installationNotes: 'Requiere espacio libre mínimo de 25 m².',
  },
  {
    id: 'kit-8kwp',
    sizekWp: 8,
    includesBattery: false,
    panelCount: 15,
    estimatedAreaM2: 38,
    priceReferenceCLP: 9_600_000,
    installationNotes: 'Requiere espacio libre mínimo de 38 m².',
  },
  {
    id: 'kit-10kwp',
    sizekWp: 10,
    includesBattery: false,
    panelCount: 18,
    estimatedAreaM2: 45,
    priceReferenceCLP: 12_000_000,
    installationNotes: 'Requiere espacio libre mínimo de 45 m².',
  },
  // Con batería
  {
    id: 'kit-2kwp-battery',
    sizekWp: 2,
    includesBattery: true,
    batteryCapacityKWh: 5,
    panelCount: 4,
    estimatedAreaM2: 10,
    priceReferenceCLP: 4_400_000,
    installationNotes: 'Incluye batería de 5 kWh. Requiere espacio libre mínimo de 10 m².',
  },
  {
    id: 'kit-3kwp-battery',
    sizekWp: 3,
    includesBattery: true,
    batteryCapacityKWh: 5,
    panelCount: 6,
    estimatedAreaM2: 15,
    priceReferenceCLP: 5_600_000,
    installationNotes: 'Incluye batería de 5 kWh. Requiere espacio libre mínimo de 15 m².',
  },
  {
    id: 'kit-5kwp-battery',
    sizekWp: 5,
    includesBattery: true,
    batteryCapacityKWh: 10,
    panelCount: 10,
    estimatedAreaM2: 25,
    priceReferenceCLP: 9_000_000,
    installationNotes: 'Incluye batería de 10 kWh. Requiere espacio libre mínimo de 25 m².',
  },
  {
    id: 'kit-8kwp-battery',
    sizekWp: 8,
    includesBattery: true,
    batteryCapacityKWh: 10,
    panelCount: 15,
    estimatedAreaM2: 38,
    priceReferenceCLP: 12_600_000,
    installationNotes: 'Incluye batería de 10 kWh. Requiere espacio libre mínimo de 38 m².',
  },
  {
    id: 'kit-10kwp-battery',
    sizekWp: 10,
    includesBattery: true,
    batteryCapacityKWh: 15,
    panelCount: 18,
    estimatedAreaM2: 45,
    priceReferenceCLP: 16_000_000,
    installationNotes: 'Incluye batería de 15 kWh. Requiere espacio libre mínimo de 45 m².',
  },
];

// ─── Auxiliares ───────────────────────────────────────────────────────────────

export const MONTH_NAMES: Record<number, string> = {
  1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril',
  5: 'Mayo', 6: 'Junio', 7: 'Julio', 8: 'Agosto',
  9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre',
};

export const DAYS_IN_MONTH: Record<number, number> = {
  1: 31, 2: 28, 3: 31, 4: 30, 5: 31, 6: 30,
  7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31,
};

export const DISTRIBUTORS = [
  'Enel Distribución Chile',
  'CGE Distribución',
  'Chilquinta Energía',
  'Saesa',
  'Frontel',
  'Luz Osorno',
  'Edelmag',
  'Otra',
];
