import type { SolarKit, TarifaType } from './types';

/**
 * Normaliza el código de tarifa que viene de una boleta.
 *
 * Las boletas residenciales traen el tramo de Equidad Tarifaria Residencial
 * pegado al código: BT1-T1, BT1-T6, etc. Ese sufijo indica el tramo de
 * descuento por ley según el consumo promedio del año anterior — NO es una
 * tarifa distinta: todas son BT1, que además no tiene bloques de precio por
 * cantidad consumida.
 *
 * Sin normalizar, cualquier comparación `tarifa === 'BT1'` fallaba con un
 * BT1-T6 y el análisis tarifario terminaba declarándose no concluyente.
 */
export function normalizeTarifa(raw?: string | null): TarifaType | 'unknown' {
  const t = (raw ?? '').trim().toUpperCase().replace(/\s+/g, '');
  if (!t) return 'unknown';

  // BT1 con cualquier tramo de ETR (BT1-T1 … BT1-T6, BT1T4, BT1 T2…)
  if (/^BT1(-|_)?T?\d*$/.test(t)) return 'BT1';

  // El resto conserva su código; el punto decimal puede venir como coma.
  const normalizado = t.replace(',', '.');
  const validas: TarifaType[] = [
    'BT1', 'BT2', 'BT3', 'BT4.1', 'BT4.2', 'BT4.3',
    'AT2', 'AT3', 'AT4.1', 'AT4.2', 'AT4.3',
  ];
  return (validas as string[]).includes(normalizado)
    ? (normalizado as TarifaType)
    : 'unknown';
}

// ─── Tarifa BT1 Chile (valores referenciales) ─────────────────────────────────

export const CHILE_BT1 = {
  referenceKWhPriceCLP: 220,
  fixedChargeCLP: 1_200,
};

// ─── Estacionalidad de consumo residencial (perfil nacional BT1) ──────────────
// Coeficientes relativos (consumo del mes / promedio mensual anual), media = 1.
// Promedio nacional de hogares residenciales sin A/C, CNE / Energía Abierta
// 2015–2019. Describen la FORMA estacional (invariante a la escala): peak en
// invierno (jul/ago), valle en otoño-verano (mar/dic). Se usan para extrapolar
// los meses faltantes a partir de uno o más meses conocidos (solo residencial).
export const SEASONAL_COEFFICIENTS: Record<number, number> = {
  1: 0.988, 2: 0.948, 3: 0.927, 4: 0.957, 5: 0.984, 6: 1.071,
  7: 1.144, 8: 1.127, 9: 1.027, 10: 0.966, 11: 0.954, 12: 0.908,
};

// ─── Límites regulatorios DFL 4 ──────────────────────────────────────────────

export const DFL4 = {
  netBillingMaxKWp: 300,     // Art. 149 bis: capacidad máxima por inmueble para net billing
  discountRateReal: 0.10,    // Arts. 165d / 182 bis: tasa de actualización referencial
};

// ─── Parámetros solares generales ────────────────────────────────────────────

export const SOLAR_DEFAULTS = {
  // Nota: la producción mensual en regions.ts ya incorpora eficiencia del sistema.
  // panelWattage y panelAreaM2 se usan solo para dimensionar cantidad de paneles y área.
  panelWattage: 550,                   // W por panel (estándar residencial)
  panelAreaM2: 2.5,                    // m² por panel (dimensionamiento simple empresa)
  panelHeightM: 2.278,                 // alto de un panel estándar 550 W (m)
  panelWidthM: 1.134,                  // ancho de un panel estándar 550 W (m)
  panelSideMarginM: 0.02,              // separación de montaje: 2 cm por lado
  co2FactorKgPerKWh: 0.4,             // kg CO₂/kWh (factor red eléctrica Chile)
  systemLifeYears: 25,                 // vida útil del sistema en años
  injectionValueFactor: 0.50,          // valor inyección = 50% precio compra (net billing conservador)
  batteryDailyCycleEfficiency: 0.80,   // eficiencia de ciclo diario de la batería
  minAlternativeCoveragePercent: 65,   // cobertura mínima para mostrar kit alternativo
  businessCoverageTarget: 0.90,        // % del consumo anual que se intenta cubrir en clientes empresa
  evConsumptionIncreasePerCar: 0.33,
  // Residencial: buena parte del consumo es de tarde/noche.
  dayConsumptionRatio: 0.70,
  nightConsumptionRatio: 0.30,
  // Empresa: el consumo se concentra en horario de trabajo, así que la
  // fracción diurna es bastante mayor que en una casa.
  businessDayConsumptionRatio: 0.85,
  batteryUsableFraction: 0.70,         // fracción de la batería disponible para descarga nocturna (30% = reserva cortes)
  batteryModuleKWh: 5,                 // kWh por módulo de batería
  batteryModulePriceCLP: 1_500_000,    // precio referencial por módulo de 5 kWh
};

/**
 * Los kW con que se NOMBRA un kit. Los nombres comerciales se mantienen aunque
 * cambie la tecnología del panel: el kit "PFV 8,8 kW" pasó de 16 × 550 W a
 * 12 × 700 W y hoy son 8,4 kWp reales, pero se sigue llamando igual.
 *
 * Usar esto para rotular el producto (tarjetas de escenario, cotización) y
 * `kit.sizekWp` para todo lo que hable de energía, que es la potencia real.
 */
export function kitNombreKW(kit: { nominalKWp?: number; sizekWp: number }): number {
  return kit.nominalKWp ?? kit.sizekWp;
}

/**
 * Diferencia (kW) a partir de la cual el informe muestra la potencia real junto
 * al nombre comercial.
 *
 * Por debajo es redondeo: 18 paneles × 550 W = 9,9 kW y el kit se llama
 * "10 kW"; agregar "(9,9 kW)" es ruido. Por encima hay una divergencia que el
 * cliente nota al multiplicar lo que lee en el mismo recuadro: 12 × 700 W =
 * 8,4 kW en el kit llamado "8,8 kW".
 */
export const KWP_TOLERANCIA_NOMBRE = 0.25;

/** True si conviene mostrar la potencia real además del nombre comercial. */
export function mostrarPotenciaReal(kit: { nominalKWp?: number; sizekWp: number }): boolean {
  if (kit.nominalKWp == null) return false;
  return Math.abs(kit.nominalKWp - kit.sizekWp) > KWP_TOLERANCIA_NOMBRE;
}

/**
 * Superficie de montaje necesaria (m²) para instalar N paneles.
 * Se calcula con las dimensiones reales del panel más 2 cm de separación por
 * lado (alto y ancho), que es el espacio mínimo entre paneles/estructura.
 *
 * Si el kit tiene un panel del catálogo se usan SUS medidas; el respaldo son
 * las de un panel de 550 W, que es lo único que había antes de que el panel
 * fuera una entidad configurable.
 */
export function requiredSurfaceM2(
  panelCount: number,
  panel?: { anchoMm: number; largoMm: number } | null,
): number {
  const { panelHeightM, panelWidthM, panelSideMarginM } = SOLAR_DEFAULTS;
  const altoM  = panel ? panel.largoMm / 1000 : panelHeightM;
  const anchoM = panel ? panel.anchoMm / 1000 : panelWidthM;
  const perPanelM2 = (altoM + 2 * panelSideMarginM) * (anchoM + 2 * panelSideMarginM);
  return Math.round(panelCount * perPanelM2);
}

// ─── Parámetros para empresas ─────────────────────────────────────────────────

export const BUSINESS_DEFAULTS = {
  costPerKWpCLP: 1_000_000, // actualizable
};

// ─── Catálogo PFV residenciales ───────────────────────────────────────────────

export const KIT_CATALOG: SolarKit[] = [
  // ── Sin batería ──────────────────────────────────────────────────────────
  {
    id: 'pfv-1.1kw',
    sizekWp: 1.1,
    includesBattery: false,
    panelCount: 2,
    estimatedAreaM2: 5,
    priceReferenceCLP: 1_320_000,
    installationNotes: 'Requiere espacio libre mínimo de 5 m².',
  },
  {
    id: 'pfv-2.2kw',
    sizekWp: 2.2,
    includesBattery: false,
    panelCount: 4,
    estimatedAreaM2: 10,
    priceReferenceCLP: 2_640_000,
    installationNotes: 'Requiere espacio libre mínimo de 10 m².',
  },
  {
    id: 'pfv-3.3kw',
    sizekWp: 3.3,
    includesBattery: false,
    panelCount: 6,
    estimatedAreaM2: 15,
    priceReferenceCLP: 3_960_000,
    installationNotes: 'Requiere espacio libre mínimo de 15 m².',
  },
  {
    id: 'pfv-5.5kw',
    sizekWp: 5.5,
    includesBattery: false,
    panelCount: 10,
    estimatedAreaM2: 25,
    priceReferenceCLP: 6_600_000,
    installationNotes: 'Requiere espacio libre mínimo de 25 m².',
  },
  {
    id: 'pfv-6.6kw',
    sizekWp: 6.6,
    includesBattery: false,
    panelCount: 12,
    estimatedAreaM2: 30,
    priceReferenceCLP: 7_920_000,
    installationNotes: 'Requiere espacio libre mínimo de 30 m².',
  },
  {
    id: 'pfv-8.8kw',
    sizekWp: 8.8,
    includesBattery: false,
    panelCount: 16,
    estimatedAreaM2: 40,
    priceReferenceCLP: 10_560_000,
    installationNotes: 'Requiere espacio libre mínimo de 40 m².',
  },
  {
    id: 'pfv-10kw',
    sizekWp: 10,
    includesBattery: false,
    panelCount: 18,
    estimatedAreaM2: 45,
    priceReferenceCLP: 12_000_000,
    installationNotes: 'Requiere espacio libre mínimo de 45 m².',
  },
  {
    id: 'pfv-11kw',
    sizekWp: 11,
    includesBattery: false,
    panelCount: 20,
    estimatedAreaM2: 50,
    priceReferenceCLP: 13_200_000,
    installationNotes: 'Requiere espacio libre mínimo de 50 m².',
  },
  {
    id: 'pfv-13.9kw',
    sizekWp: 13.9,
    includesBattery: false,
    panelCount: 26,
    estimatedAreaM2: 65,
    priceReferenceCLP: 16_680_000,
    installationNotes: 'Requiere espacio libre mínimo de 65 m².',
  },
  // ── Con batería ──────────────────────────────────────────────────────────
  {
    id: 'pfv-2.2kw-battery',
    sizekWp: 2.2,
    includesBattery: true,
    batteryCapacityKWh: 5,
    panelCount: 4,
    estimatedAreaM2: 10,
    priceReferenceCLP: 4_140_000,
    installationNotes: 'Incluye batería de 5 kWh. Requiere espacio libre mínimo de 10 m².',
  },
  {
    id: 'pfv-3.3kw-battery',
    sizekWp: 3.3,
    includesBattery: true,
    batteryCapacityKWh: 5,
    panelCount: 6,
    estimatedAreaM2: 15,
    priceReferenceCLP: 5_460_000,
    installationNotes: 'Incluye batería de 5 kWh. Requiere espacio libre mínimo de 15 m².',
  },
  {
    id: 'pfv-5.5kw-battery',
    sizekWp: 5.5,
    includesBattery: true,
    batteryCapacityKWh: 10,
    panelCount: 10,
    estimatedAreaM2: 25,
    priceReferenceCLP: 9_600_000,
    installationNotes: 'Incluye batería de 10 kWh. Requiere espacio libre mínimo de 25 m².',
  },
  {
    id: 'pfv-8.8kw-battery',
    sizekWp: 8.8,
    includesBattery: true,
    batteryCapacityKWh: 10,
    panelCount: 16,
    estimatedAreaM2: 40,
    priceReferenceCLP: 13_560_000,
    installationNotes: 'Incluye batería de 10 kWh. Requiere espacio libre mínimo de 40 m².',
  },
  {
    id: 'pfv-11kw-battery',
    sizekWp: 11,
    includesBattery: true,
    batteryCapacityKWh: 15,
    panelCount: 20,
    estimatedAreaM2: 50,
    priceReferenceCLP: 17_700_000,
    installationNotes: 'Incluye batería de 15 kWh. Requiere espacio libre mínimo de 50 m².',
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

// ─── Precios referenciales CNE por tarifa ─────────────────────────────────────
// Valores aproximados basados en decretos CNE vigentes (promedio nacional).
// Actualizable semestralmente. Usar solo para análisis indicativo.

export interface TariffPrices {
  energyCLPperKWh: number;
  fixedCLPperMonth: number;
  powerCLPperKWMonth: number;   // cargo por kW contratado (BT2/AT2)
  maxDemandCLPperKW: number;    // cargo por kW demanda máxima medida (BT3/AT3/BT4.3/AT4.3)
  peakDemandCLPperKW: number;   // cargo por kW demanda en horas punta (BT4.x/AT4.x)
  label: string;
  typicalUse: string;
}

export const TARIFF_REFERENCE_PRICES: Record<string, TariffPrices> = {
  BT1:    { energyCLPperKWh: 220, fixedCLPperMonth: 1_200, powerCLPperKWMonth: 0,     maxDemandCLPperKW: 0,     peakDemandCLPperKW: 0,      label: 'BT1',    typicalUse: 'Residencial y pequeño comercio (< 10 kW)' },
  BT2:    { energyCLPperKWh: 205, fixedCLPperMonth: 1_500, powerCLPperKWMonth: 6_200, maxDemandCLPperKW: 0,     peakDemandCLPperKW: 0,      label: 'BT2',    typicalUse: 'Comercial con potencia contratada' },
  BT3:    { energyCLPperKWh: 195, fixedCLPperMonth: 1_500, powerCLPperKWMonth: 0,     maxDemandCLPperKW: 9_800, peakDemandCLPperKW: 0,      label: 'BT3',    typicalUse: 'Demanda máxima medida' },
  'BT4.1':{ energyCLPperKWh: 185, fixedCLPperMonth: 1_500, powerCLPperKWMonth: 3_200, maxDemandCLPperKW: 0,     peakDemandCLPperKW: 14_500, label: 'BT4.1',  typicalUse: 'Demanda punta contratada + máxima contratada' },
  'BT4.2':{ energyCLPperKWh: 180, fixedCLPperMonth: 1_500, powerCLPperKWMonth: 3_000, maxDemandCLPperKW: 0,     peakDemandCLPperKW: 16_000, label: 'BT4.2',  typicalUse: 'Demanda punta medida + máxima contratada' },
  'BT4.3':{ energyCLPperKWh: 175, fixedCLPperMonth: 1_500, powerCLPperKWMonth: 0,     maxDemandCLPperKW: 9_500, peakDemandCLPperKW: 16_500, label: 'BT4.3',  typicalUse: 'Demanda punta medida + máxima medida' },
  AT2:    { energyCLPperKWh: 175, fixedCLPperMonth: 2_000, powerCLPperKWMonth: 5_400, maxDemandCLPperKW: 0,     peakDemandCLPperKW: 0,      label: 'AT2',    typicalUse: 'Alta tensión con potencia contratada' },
  AT3:    { energyCLPperKWh: 165, fixedCLPperMonth: 2_000, powerCLPperKWMonth: 0,     maxDemandCLPperKW: 8_500, peakDemandCLPperKW: 0,      label: 'AT3',    typicalUse: 'Alta tensión con demanda máxima medida' },
  'AT4.1':{ energyCLPperKWh: 160, fixedCLPperMonth: 2_000, powerCLPperKWMonth: 2_800, maxDemandCLPperKW: 0,     peakDemandCLPperKW: 12_500, label: 'AT4.1',  typicalUse: 'Alta tensión con demanda punta contratada' },
  'AT4.2':{ energyCLPperKWh: 155, fixedCLPperMonth: 2_000, powerCLPperKWMonth: 2_600, maxDemandCLPperKW: 0,     peakDemandCLPperKW: 13_800, label: 'AT4.2',  typicalUse: 'Alta tensión con demanda punta medida + máx. contratada' },
  'AT4.3':{ energyCLPperKWh: 150, fixedCLPperMonth: 2_000, powerCLPperKWMonth: 0,     maxDemandCLPperKW: 8_200, peakDemandCLPperKW: 14_200, label: 'AT4.3',  typicalUse: 'Alta tensión con demanda punta medida + máx. medida' },
  unknown:{ energyCLPperKWh: 220, fixedCLPperMonth: 1_200, powerCLPperKWMonth: 0,     maxDemandCLPperKW: 0,     peakDemandCLPperKW: 0,      label: 'Desconocida', typicalUse: 'Tarifa no especificada' },
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
