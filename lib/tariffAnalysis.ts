import type { TarifaType } from './types';
import { TARIFF_REFERENCE_PRICES } from './constants';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface TariffAnalysisInput {
  tarifa: TarifaType;
  avgMonthlyKWh: number;
  potenciaContratadaKW?: number;
  avgPowerChargeCLP?: number;  // cargo por potencia promedio mensual (de boletas)
  avgTotalBillCLP?: number;    // monto total promedio mensual (de boletas)
  kWhPriceCLP: number;
  isResidential: boolean;
  operatingHours?: 'peak' | 'offpeak' | 'mixed';
  flexibleEquipment?: boolean;
}

export interface TariffAlternative {
  tarifa: TarifaType;
  label: string;
  estimatedMonthlyCostCLP: number;
  monthlySavingsCLP: number;
  typicalUse: string;
}

export interface TariffAnalysisResult {
  // Comparación tarifaria
  currentTariff: TarifaType;
  currentMonthlyCostCLP: number;
  alternatives: TariffAlternative[];
  bestAlternative: TariffAlternative | null;
  tariffStatus: 'optimal' | 'consider-change' | 'informative-only';
  tariffMessage: string;
  hasRealBillData: boolean;

  // Horas de punta (BT4.x / AT4.x)
  hasPeakCharges: boolean;
  peakChargeCLPperMonth: number;
  peakManagementMessage: string;

  // Desplazamiento de cargas (empresa con equipos flexibles)
  hasFlexibleEquipment: boolean;
  loadShiftingKWhPerMonth: number;
  loadShiftingMessage: string;
}

// ─── Función principal ────────────────────────────────────────────────────────

export function runTariffAnalysis(input: TariffAnalysisInput): TariffAnalysisResult {
  const {
    tarifa,
    avgMonthlyKWh,
    potenciaContratadaKW,
    avgPowerChargeCLP,
    avgTotalBillCLP,
    isResidential,
    operatingHours,
    flexibleEquipment,
  } = input;

  const hasRealBillData = !!avgTotalBillCLP || !!avgPowerChargeCLP;
  const prices = TARIFF_REFERENCE_PRICES[tarifa] ?? TARIFF_REFERENCE_PRICES['BT1'];

  // ── Estimación de demanda ──────────────────────────────────────────────────
  // Comercial estándar: ~180 h/mes operación activa (8 h/día × 22.5 días)
  const estimatedMaxDemandKW = potenciaContratadaKW ?? Math.max(avgMonthlyKWh / 180, 1);
  // Fracción de la demanda en horas de punta (06:00–23:00)
  const peakFraction = operatingHours === 'offpeak' ? 0.2 : operatingHours === 'peak' ? 0.9 : 0.6;
  const estimatedPeakDemandKW = estimatedMaxDemandKW * peakFraction;

  // ── Calcular costo mensual para una tarifa dada ────────────────────────────
  function calcMonthlyCost(t: string): number {
    const p = TARIFF_REFERENCE_PRICES[t];
    if (!p) return Infinity;
    const powerBase = potenciaContratadaKW ?? estimatedMaxDemandKW;
    return Math.round(
      p.energyCLPperKWh * avgMonthlyKWh +
      p.fixedCLPperMonth +
      p.powerCLPperKWMonth * powerBase +
      p.maxDemandCLPperKW * estimatedMaxDemandKW +
      p.peakDemandCLPperKW * estimatedPeakDemandKW,
    );
  }

  const currentMonthlyCostCLP = avgTotalBillCLP
    ? Math.round(avgTotalBillCLP)
    : calcMonthlyCost(tarifa);

  // ── Tarifas comparables (no cruzar BT↔AT sin cambio de infraestructura) ───
  const isAT = tarifa.startsWith('AT');
  const comparableTariffs: string[] = isAT
    ? ['AT2', 'AT3', 'AT4.1', 'AT4.2', 'AT4.3']
    : isResidential
      ? ['BT1', 'BT2', 'BT3']
      : ['BT1', 'BT2', 'BT3', 'BT4.1', 'BT4.2', 'BT4.3'];

  const alternatives: TariffAlternative[] = comparableTariffs
    .filter((t) => t !== tarifa)
    .map((t) => {
      const cost = calcMonthlyCost(t);
      const p = TARIFF_REFERENCE_PRICES[t];
      return {
        tarifa: t as TarifaType,
        label: p.label,
        estimatedMonthlyCostCLP: cost,
        monthlySavingsCLP: Math.round(currentMonthlyCostCLP - cost),
        typicalUse: p.typicalUse,
      };
    })
    .filter((a) => a.monthlySavingsCLP > 0)
    .sort((a, b) => b.monthlySavingsCLP - a.monthlySavingsCLP);

  const bestAlternative = alternatives.length > 0 ? alternatives[0] : null;
  const savingsPct = bestAlternative
    ? (bestAlternative.monthlySavingsCLP / currentMonthlyCostCLP) * 100
    : 0;

  // ── Estado y mensaje de recomendación ─────────────────────────────────────
  const clpFmt = new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: 'CLP', maximumFractionDigits: 0,
  });

  let tariffStatus: TariffAnalysisResult['tariffStatus'];
  let tariffMessage: string;

  if (!hasRealBillData && !potenciaContratadaKW && tarifa !== 'BT1') {
    tariffStatus = 'informative-only';
    tariffMessage =
      'Ingresa el monto total de tu boleta o la potencia contratada para comparar tarifas con precisión.';
  } else if (tarifa === 'BT1' || tarifa === 'unknown') {
    tariffStatus = 'optimal';
    tariffMessage = 'La tarifa BT1 es la estándar para tu perfil de consumo residencial.';
  } else if (bestAlternative && savingsPct > 10) {
    tariffStatus = 'consider-change';
    tariffMessage = `La tarifa ${bestAlternative.tarifa} podría reducir tu costo eléctrico en ~${clpFmt.format(bestAlternative.monthlySavingsCLP)}/mes (${Math.round(savingsPct)}% menos). Es una estimación referencial — confirma con tu distribuidora antes de gestionar el cambio.`;
  } else {
    tariffStatus = 'optimal';
    tariffMessage = 'Tu tarifa actual parece adecuada para tu perfil de consumo y demanda estimados.';
  }

  // ── Análisis de horas de punta ─────────────────────────────────────────────
  const hasPeakCharges = tarifa.startsWith('BT4') || tarifa.startsWith('AT4');
  const peakChargeCLPperMonth = hasPeakCharges
    ? Math.round(prices.peakDemandCLPperKW * estimatedPeakDemandKW)
    : 0;
  const peakManagementMessage = hasPeakCharges
    ? `Tu tarifa tiene cargo por demanda en horas de punta (06:00–23:00), ~${clpFmt.format(peakChargeCLPperMonth)}/mes estimado. El Escenario C con baterías puede reducir este cargo descargando en horario punta.`
    : '';

  // ── Desplazamiento de cargas ───────────────────────────────────────────────
  // ~35% del consumo cae en la ventana solar 10:00–16:00; ~40% de eso es desplazable
  const hasFlexibleEquipment = !!flexibleEquipment && !isResidential;
  const loadShiftingKWhPerMonth = hasFlexibleEquipment
    ? Math.round(avgMonthlyKWh * 0.35 * 0.4)
    : 0;
  const loadShiftingMessage = hasFlexibleEquipment
    ? `Programa tus equipos flexibles entre las 10:00 y 16:00 para aprovechar la generación solar directamente. Puedes aumentar el autoconsumo en ~${loadShiftingKWhPerMonth} kWh/mes adicionales.`
    : '';

  return {
    currentTariff: tarifa,
    currentMonthlyCostCLP,
    alternatives,
    bestAlternative,
    tariffStatus,
    tariffMessage,
    hasRealBillData,
    hasPeakCharges,
    peakChargeCLPperMonth,
    peakManagementMessage,
    hasFlexibleEquipment,
    loadShiftingKWhPerMonth,
    loadShiftingMessage,
  };
}
