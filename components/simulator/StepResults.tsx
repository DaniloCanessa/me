'use client';

import { useMemo, useState, useCallback } from 'react';
import type {
  WizardState,
  SimulatorInput,
  SimulatorResult,
  SimulatorConfig,
  SolarKit,
  PersonContact,
  BusinessContact,
  TarifaType,
  MonthIndex,
} from '@/lib/types';
import { calcThreeScenarios, runBusinessSimulation, runBusinessSimulationWithBattery } from '@/lib/calculations';
import { getRegionById } from '@/lib/regions';
import { runTariffAnalysis, type TariffAnalysisResult } from '@/lib/tariffAnalysis';
import { calcEVCharger, calcEmpalmeLoad, type EmpalmeLoadResult } from '@/lib/consumption';
import { CHILE_BT1, SOLAR_DEFAULTS, DFL4, requiredSurfaceM2 } from '@/lib/constants';
import QuoteFromSimulation from './QuoteFromSimulation';
import SaveSimulation from './SaveSimulation';
import type { BoletaArchivadaLocal } from './BillOCRUpload';
import { formatCLP, formatKWh, formatPayback, formatPercent } from '@/lib/format';
import { IconCar, IconBattery } from '@/components/landing/icons';
import dynamic from 'next/dynamic';

const PDFDownloadButton = dynamic(() => import('./PDFDownloadButton'), { ssr: false });

// ─── Props ────────────────────────────────────────────────────────────────────

interface StepResultsProps {
  state: WizardState;
  config?: SimulatorConfig;
  catalog?: SolarKit[];
  /** true solo con sesión de admin: habilita el selector manual de tamaño de PFV. */
  adminMode?: boolean;
  /** Cliente del CRM para el que se simula (habilita crear la cotización). */
  clientId?: string;
  installationId?: string;
  /** Boletas archivadas por el OCR + identificación del documento. */
  billInfo?: {
    archivadas: BoletaArchivadaLocal[];
    fechaBoleta: string | null;
    numeroBoleta: string | null;
    distribuidora: string | null;
  } | null;
}

// ─── PFV existente: saldo de empalme y consumo residual a cubrir ──────────────
// Si el cliente ya tiene paneles, la planta nueva solo puede usar el espacio
// libre del empalme (saldo = empalme − PFV existente). Si el saldo es < 1 kWp,
// no hay margen para ampliar → se ofrece mantención. El consumo objetivo del
// complemento depende de qué ingresó el cliente (boleta de la compañía vs total).

const MIN_HEADROOM_KWP = 1; // umbral "a tope": menos de 1 kWp libre → mantención

type ExistingSolarInfo =
  | { active: false }
  | {
      active: true;
      existingKWp: number;
      empalmeMaxKW: number | undefined;
      headroomKWp: number | null;
      atTope: boolean;
      basis: 'grid' | 'total';
      effectiveAvgKWh: number; // consumo mensual residual que cubrirá el complemento
    };

function empalmeKWFor(state: WizardState): number | undefined {
  const supply = state.supply!;
  return state.customerCategory === 'business'
    ? supply.potenciaContratadaKW
    : supply.amperajeA != null
      ? Math.round((supply.amperajeA * 220 / 1000) * 10) / 10
      : undefined;
}

function getExistingSolarInfo(state: WizardState): ExistingSolarInfo {
  const supply  = state.supply!;
  const profile = state.consumptionProfile!;
  if (!supply.hasExistingSolar || !supply.existingSystemKWp) return { active: false };

  const existingKWp  = supply.existingSystemKWp;
  const empalmeMaxKW = empalmeKWFor(state);
  const headroomKWp  = empalmeMaxKW != null
    ? Math.max(0, Math.round((empalmeMaxKW - existingKWp) * 10) / 10)
    : null;
  const atTope = headroomKWp != null && headroomKWp < MIN_HEADROOM_KWP;

  const basis: 'grid' | 'total' = profile.consumptionBasis ?? 'grid';
  let effectiveAvgKWh = profile.averageMonthlyKWh;
  if (basis === 'total') {
    const regionId = (state.contact as PersonContact | BusinessContact)?.regionId || 'metropolitana';
    const region = getRegionById(regionId);
    if (region) {
      // Energía que ya aporta la PFV existente (estimada); el residual de red es
      // lo que aún se importa y lo que el complemento intentará cubrir.
      const existingMonthlyProd = (existingKWp * region.annualProductionKWhPerKWp) / 12;
      effectiveAvgKWh = Math.max(0, Math.round(profile.averageMonthlyKWh - existingMonthlyProd));
    }
  }

  return { active: true, existingKWp, empalmeMaxKW, headroomKWp, atTope, basis, effectiveAvgKWh };
}

// ─── Construcción del SimulatorInput ──────────────────────────────────────────

function buildBaseInput(state: WizardState, config?: SimulatorConfig): SimulatorInput {
  const contact = state.contact!;
  const supply  = state.supply!;
  const profile = state.consumptionProfile!;
  const future  = state.futureConsumption;

  const regionId = (contact as PersonContact | BusinessContact).regionId || 'metropolitana';

  const billsWithPrice = profile.bills.filter((b) => b.kWhPriceCLP != null);
  const fallbackKWhPrice = config?.kwhPriceCLP ?? CHILE_BT1.referenceKWhPriceCLP;
  const kWhPriceCLP =
    billsWithPrice.length > 0
      ? Math.round(billsWithPrice.reduce((s, b) => s + b.kWhPriceCLP!, 0) / billsWithPrice.length)
      : fallbackKWhPrice;

  const empalmeMaxKW = empalmeKWFor(state);

  // PFV existente (no "a tope"): el complemento se dimensiona contra el saldo del
  // empalme y contra el consumo residual a cubrir; si no, todo el empalme y el
  // consumo promedio normal.
  const es = getExistingSolarInfo(state);
  const baseAvgKWh = es.active && !es.atTope ? es.effectiveAvgKWh : profile.averageMonthlyKWh;
  const empalmeForSizing = es.active && !es.atTope && es.headroomKWp != null
    ? es.headroomKWp
    : empalmeMaxKW;

  const monthlyConsumptionKWh =
    baseAvgKWh + (future?.totalAdditionalMonthlyKWh ?? 0);

  return {
    regionId,
    distribuidora:        supply.distribuidora,
    tarifa:               supply.tarifa === 'unknown' ? 'BT1' : supply.tarifa,
    monthlyConsumptionKWh,
    energyPrice: {
      source:               billsWithPrice.length > 0 ? 'bill_calculated' : 'reference',
      kWhPriceCLP,
      referenceKWhPriceCLP: fallbackKWhPrice,
    },
    fixedChargeCLP:   CHILE_BT1.fixedChargeCLP,
    customerType:     state.customerCategory === 'natural' ? 'residential' : 'business',
    hasExistingSolar: supply.hasExistingSolar,
    existingSystemKWp: supply.existingSystemKWp,
    empalmeMaxKW: empalmeForSizing,
    // Config overrides desde DB
    injectionValueFactor:   config?.injectionFactor,
    discountRateReal:       config?.discountRateReal,
    systemLifeYears:        config?.systemLifeYears,
    batteryModuleKWh:       config?.batteryModuleKWh,
    batteryModulePriceCLP:  config?.batteryModulePriceCLP,
    batteryCycleEfficiency: config?.batteryCycleEfficiency,
    costPerKWpBusinessCLP:  config?.costPerKWpBusinessCLP,
    businessCoverageTarget: config?.businessCoverageTarget,
    netBillingMaxKWp:       config?.netBillingMaxKWp,
    panelWattageWp:         config?.panelWattageWp,
    panelAreaM2:            config?.panelAreaM2,
    co2FactorKgPerKWh:      config?.co2FactorKgPerKWh,
    // Cada tipo de cliente tiene su propio perfil horario: una casa consume
    // sobre todo de tarde/noche, una empresa en horario de trabajo.
    dayConsumptionRatio:    state.customerCategory === 'business'
      ? config?.dayConsumptionRatioBusiness
      : config?.dayConsumptionRatio,
  };
}

// ─── Consumo real por mes ─────────────────────────────────────────────────────
// Construye el consumo mes a mes desde las boletas (reales + estimación estacional
// de los meses faltantes) para que la simulación no aplane el consumo al promedio.
// Con PFV existente base "total" descuenta la producción de la planta actual por mes.
// Los equipos futuros se suman como incremento mensual parejo (mismo criterio previo).

function buildMonthlyConsumption(
  state: WizardState,
  includeAdditions: boolean,
): Partial<Record<MonthIndex, number>> {
  const profile = state.consumptionProfile!;
  const es = getExistingSolarInfo(state);
  const additions = includeAdditions ? (state.futureConsumption?.totalAdditionalMonthlyKWh ?? 0) : 0;

  const regionId = (state.contact as PersonContact | BusinessContact)?.regionId || 'metropolitana';
  const region = getRegionById(regionId);
  // Solo se descuenta la PFV existente si el consumo ingresado es el total (red + PFV).
  const existing = es.active && !es.atTope && es.basis === 'total' ? es : null;

  const map: Partial<Record<MonthIndex, number>> = {};
  for (const bill of profile.bills) {
    const m = bill.month as MonthIndex;
    let c = bill.consumptionKWh;
    if (existing && region) {
      c = Math.max(0, c - existing.existingKWp * region.monthlyProductionKWhPerKWp[m]);
    }
    c += additions;
    map[m] = Math.round(c);
  }
  return map;
}

// ─── Panel de análisis y recomendaciones ─────────────────────────────────────

function AnalysisPanel({ analysis, tarifa }: { analysis: TariffAnalysisResult; tarifa: TarifaType }) {
  const clpFmt = (n: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

  const statusColors = {
    'optimal':          { bg: 'bg-[#dde3e9]/50',  border: 'border-[#b0cedd]/40',  icon: '✅', title: 'text-green-800',  body: 'text-[#1d65c5]'  },
    'consider-change':  { bg: 'bg-amber-50',  border: 'border-amber-200',  icon: '💡', title: 'text-amber-800',  body: 'text-amber-700'  },
    'informative-only': { bg: 'bg-gray-50',   border: 'border-gray-200',   icon: 'ℹ️', title: 'text-gray-700',   body: 'text-gray-600'   },
  };
  const sc = statusColors[analysis.tariffStatus];

  const showAnyBlock =
    tarifa === 'unknown' ||
    analysis.tariffStatus !== 'optimal' ||
    analysis.hasPeakCharges ||
    analysis.hasFlexibleEquipment;

  if (!showAnyBlock) return null;

  return (
    <div className="bg-white rounded-2xl ring-1 ring-[#b0cedd]/30 shadow-[0_1px_3px_rgba(16,40,80,0.04)] p-5 flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-gray-700">Análisis y recomendaciones</h2>

      {/* Tarifa desconocida */}
      {tarifa === 'unknown' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
          <span className="text-xl shrink-0">❓</span>
          <div>
            <p className="text-sm font-semibold text-amber-800">Confirma tu tarifa</p>
            <p className="text-xs text-amber-700 mt-1 leading-relaxed">
              No tenemos tu tarifa exacta. Revisa tu boleta eléctrica y vuelve al paso 3 para seleccionarla —
              el análisis tarifario y las recomendaciones de batería serán más precisos.
            </p>
          </div>
        </div>
      )}

      {/* Optimización tarifaria */}
      {tarifa !== 'unknown' && (
        <div className={`rounded-xl border ${sc.bg} ${sc.border} p-4 flex flex-col gap-2`}>
          <div className="flex gap-2 items-center">
            <span className="text-base shrink-0">{sc.icon}</span>
            <p className={`text-sm font-semibold ${sc.title}`}>Optimización tarifaria</p>
          </div>
          <p className={`text-xs leading-relaxed ${sc.body}`}>{analysis.tariffMessage}</p>

          {analysis.bestAlternative && analysis.tariffStatus === 'consider-change' && (
            <div className="mt-2 pt-2 border-t border-amber-200">
              <p className="text-xs font-semibold text-amber-800 mb-1">Alternativa recomendada:</p>
              <div className="flex items-center justify-between text-xs text-amber-700">
                <span>Tarifa {analysis.bestAlternative.tarifa} — {analysis.bestAlternative.typicalUse}</span>
                <span className="font-semibold">{clpFmt(analysis.bestAlternative.monthlySavingsCLP)}/mes</span>
              </div>
            </div>
          )}

          {!analysis.hasRealBillData && tarifa !== 'BT1' && (
            <p className="text-[10px] text-gray-400 mt-1">
              * Estimación basada en precios CNE referenciales — verifica con tu distribuidora.
            </p>
          )}
        </div>
      )}

      {/* Gestión de horas de punta */}
      {analysis.hasPeakCharges && (
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 flex gap-3">
          <span className="text-xl shrink-0">🔋</span>
          <div>
            <p className="text-sm font-semibold text-purple-800">Gestión de horas de punta</p>
            <p className="text-xs text-purple-700 mt-1 leading-relaxed">{analysis.peakManagementMessage}</p>
          </div>
        </div>
      )}

      {/* Desplazamiento de cargas */}
      {analysis.hasFlexibleEquipment && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex gap-3">
          <span className="text-xl shrink-0">⚙️</span>
          <div>
            <p className="text-sm font-semibold text-blue-800">Desplazamiento de cargas</p>
            <p className="text-xs text-blue-700 mt-1 leading-relaxed">{analysis.loadShiftingMessage}</p>
            <p className="text-xs text-blue-600 mt-1 font-medium">
              Autoconsumo adicional estimado: +{analysis.loadShiftingKWhPerMonth} kWh/mes
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-componentes reutilizables ────────────────────────────────────────────

function StatCard({ label, value, sub, accent }: {
  label: string; value: string; sub?: string; accent?: string;
}) {
  return (
    <div className="bg-white rounded-xl ring-1 ring-[#b0cedd]/30 shadow-[0_1px_3px_rgba(16,40,80,0.04)] p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent ?? 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// Control segmentado (estilo iOS): riel con la opción activa como "thumb" blanco.
// Mantiene todas las alternativas a la vista, pero más elegante que píldoras sueltas.
function SegmentedControl<T extends string | number>({ options, value, onChange, ariaLabel }: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex w-full gap-1 rounded-2xl bg-amber-100/50 p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={[
              'flex-1 min-w-0 rounded-xl px-2 py-2 text-sm font-semibold tabular-nums transition-all duration-200',
              active
                ? 'bg-white text-amber-900 shadow-[0_1px_4px_rgba(120,53,15,0.18)]'
                : 'text-amber-700/70 hover:text-amber-900',
            ].join(' ')}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function InfoBanner({ color, icon, title, body }: {
  color: 'amber' | 'purple'; icon: string; title: string; body: string;
}) {
  const s = {
    amber:  { wrap: 'bg-amber-50 border-amber-200',   title: 'text-amber-800',  body: 'text-amber-700'  },
    purple: { wrap: 'bg-purple-50 border-purple-200', title: 'text-purple-800', body: 'text-purple-700' },
  }[color];
  return (
    <div className={`rounded-2xl border p-4 flex gap-3 ${s.wrap}`}>
      <span className="text-xl shrink-0">{icon}</span>
      <div>
        <p className={`text-sm font-semibold ${s.title}`}>{title}</p>
        <p className={`text-xs mt-1 leading-relaxed ${s.body}`}>{body}</p>
      </div>
    </div>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────

type CtaState = 'idle' | 'loading' | 'success' | 'error';

function CTABlock({
  result,
  contactEmail,
  ctaState,
  onCTA,
}: {
  result: SimulatorResult;
  contactEmail: string;
  ctaState: CtaState;
  onCTA: () => void;
}) {
  const totalSaving = result.financial.annualBenefitCLP * SOLAR_DEFAULTS.systemLifeYears;

  if (ctaState === 'success') {
    return (
      <div className="bg-[#010101] text-white rounded-2xl p-6 text-center">
        <div className="w-12 h-12 bg-[#389fe0] rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
          ✓
        </div>
        <p className="text-base font-bold mb-2">¡Solicitud recibida!</p>
        <p className="text-sm text-gray-400">
          Un especialista te contactará a{' '}
          <span className="text-white font-medium">{contactEmail}</span>{' '}
          en las próximas 24 horas para coordinar una visita técnica gratuita.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#010101] text-white rounded-2xl p-5">
      <p className="text-base font-bold mb-1">Instala tu sistema solar</p>
      <p className="text-sm text-gray-400 mb-4">
        Visita técnica gratuita y presupuesto definitivo sin costo ni compromiso.
      </p>
      <div className="bg-gray-800 rounded-xl p-3 mb-4 flex flex-col gap-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Inversión estimada</span>
          <span className="font-semibold">{formatCLP(result.financial.systemCostCLP)} <span className="text-gray-400 font-normal text-xs">+ IVA</span></span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Ahorro en {SOLAR_DEFAULTS.systemLifeYears} años</span>
          <span className="font-semibold text-[#389fe0]/80">{formatCLP(totalSaving)}</span>
        </div>
      </div>
      {ctaState === 'error' && (
        <p className="text-red-400 text-xs mb-3">
          Hubo un error al enviar. Intenta nuevamente o escríbenos directamente.
        </p>
      )}
      <button
        type="button"
        onClick={onCTA}
        disabled={ctaState === 'loading'}
        className="w-full rounded-xl bg-[#389fe0] hover:bg-[#1d65c5] active:bg-[#389fe0] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3.5 text-sm shadow-lg shadow-[#389fe0]/30 hover:shadow-xl hover:shadow-[#389fe0]/40 transition-all duration-300"
      >
        {ctaState === 'loading'
          ? 'Enviando...'
          : ctaState === 'error'
            ? 'Reintentar'
            : 'Coordina una reunión con nuestro equipo técnico'}
      </button>
      <p className="text-xs text-gray-500 mt-2.5 text-center">
        Sin compromiso · Instaladores certificados · Respuesta en 24 hrs
      </p>
    </div>
  );
}

// ─── Gráfico de líneas mensual ────────────────────────────────────────────────

function MonthlyLineChart({ monthly }: { monthly: SimulatorResult['energyBalance']['monthly'] }) {
  const W = 560;
  const H = 150;
  const PAD = { top: 20, right: 10, bottom: 24, left: 38 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const allValues = monthly.flatMap((m) => [
    m.productionKWh, m.selfConsumptionKWh, m.injectedToGridKWh, m.consumedFromGridKWh,
  ]);
  const maxVal = Math.max(...allValues, 1);

  const xAt = (i: number) => PAD.left + (i / (monthly.length - 1)) * chartW;
  const yAt = (v: number) => PAD.top + chartH - (v / maxVal) * chartH;

  function path(vals: number[]) {
    return vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(' ');
  }

  const series = [
    { key: 'prod',  values: monthly.map((m) => m.productionKWh),        color: '#f59e0b', label: 'Producción' },
    { key: 'self',  values: monthly.map((m) => m.selfConsumptionKWh),    color: '#16a34a', label: 'Autoconsumo' },
    { key: 'inj',   values: monthly.map((m) => m.injectedToGridKWh),     color: '#2563eb', label: 'Inyección' },
    { key: 'grid',  values: monthly.map((m) => m.consumedFromGridKWh),   color: '#9ca3af', label: 'Red' },
  ];

  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="mt-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible">
        {yTicks.map((t) => {
          const yy = (PAD.top + chartH * (1 - t)).toFixed(1);
          return (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={yy} y2={yy} stroke="#f3f4f6" strokeWidth={1} />
              <text x={PAD.left - 4} y={+yy + 3} textAnchor="end" fontSize={9} fill="#9ca3af">
                {Math.round(maxVal * t)}
              </text>
            </g>
          );
        })}
        {monthly.map((m, i) => (
          <text key={m.month} x={xAt(i).toFixed(1)} y={H - 4} textAnchor="middle" fontSize={8} fill="#9ca3af">
            {m.monthName.slice(0, 3)}
          </text>
        ))}
        {series.map((s) => (
          <path key={s.key} d={path(s.values)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        ))}
      </svg>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        {series.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span className="inline-block w-5 rounded" style={{ height: 2, backgroundColor: s.color }} />
            <span className="text-[10px] text-gray-500">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Gráfico de barras apiladas del balance mensual ───────────────────────────

// Franjas horizontales para rayar una barra (la inyección). Se dibujan como
// rects en vez de usar <pattern> porque el informe se rasteriza con
// html2canvas, donde los patrones SVG no renderizan de forma confiable.
function franjas(y0: number, alto: number, paso = 4, grosor = 1.6): number[] {
  const out: number[] = [];
  for (let y = y0 + 1; y < y0 + alto - grosor; y += paso) out.push(y);
  return out;
}

// Sobre el eje, el consumo del mes partido en autoconsumo (verde) + lo que se
// sigue comprando a la red (gris). Bajo el eje, el excedente inyectado. Cada
// barra suma una magnitud real: antes la barra era producción y la red iba como
// línea, lo que mezclaba dos escalas en el mismo gráfico.

function StackedBalanceChart({ monthly }: { monthly: SimulatorResult['energyBalance']['monthly'] }) {
  const W = 560, H = 200;
  const PAD = { top: 14, right: 10, bottom: 26, left: 34 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const maxArriba = Math.max(1, ...monthly.map((m) => m.selfConsumptionKWh + m.consumedFromGridKWh));
  const maxAbajo  = Math.max(1, ...monthly.map((m) => m.injectedToGridKWh));
  // Reparto del eje según el peso de cada lado, con un piso de 25% abajo para
  // que la inyección siempre sea visible.
  const fracAbajo = Math.min(0.5, Math.max(0.25, maxAbajo / (maxArriba + maxAbajo)));
  const altoAbajo = chartH * fracAbajo;
  const altoArriba = chartH - altoAbajo;
  const zeroY = PAD.top + altoArriba;

  const n = monthly.length;
  const slot = chartW / n;
  const barW = Math.min(slot * 0.62, 26);
  const hUp = (v: number) => (v / maxArriba) * altoArriba;
  const hDn = (v: number) => (v / maxAbajo) * altoAbajo;

  return (
    <div className="mt-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible">
        {[0.5, 1].map((t) => {
          const yy = zeroY - altoArriba * t;
          return (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={yy} y2={yy} stroke="#f3f4f6" strokeWidth={1} />
              <text x={PAD.left - 4} y={yy + 3} textAnchor="end" fontSize={9} fill="#9ca3af">
                {Math.round(maxArriba * t)}
              </text>
            </g>
          );
        })}
        <text x={PAD.left - 4} y={zeroY + altoAbajo + 3} textAnchor="end" fontSize={9} fill="#9ca3af">
          {Math.round(maxAbajo)}
        </text>

        {monthly.map((m, i) => {
          const x = PAD.left + slot * i + (slot - barW) / 2;
          const selfH = hUp(m.selfConsumptionKWh);
          const gridH = hUp(m.consumedFromGridKWh);
          const injH  = hDn(m.injectedToGridKWh);
          return (
            <g key={m.month}>
              {/* Consumo del mes */}
              <rect x={x} y={zeroY - selfH} width={barW} height={Math.max(selfH, 0)} fill="#16a34a" opacity={0.85} />
              <rect x={x} y={zeroY - selfH - gridH} width={barW} height={Math.max(gridH, 0)} fill="#9ca3af" opacity={0.75} rx={1.5} />
              {/* Excedente inyectado: mantiene su celeste, rayado para
                  distinguirlo del consumo sin cambiarle el color */}
              <rect x={x} y={zeroY} width={barW} height={Math.max(injH, 0)} fill="#2563eb" opacity={0.18} rx={1.5} />
              {franjas(zeroY, Math.max(injH, 0)).map((fy, k) => (
                <rect key={k} x={x} y={fy} width={barW} height={1.6} fill="#2563eb" opacity={0.8} />
              ))}
              <text x={x + barW / 2} y={H - 6} textAnchor="middle" fontSize={8} fill="#9ca3af">
                {m.monthName.slice(0, 3)}
              </text>
            </g>
          );
        })}

        <line x1={PAD.left} x2={W - PAD.right} y1={zeroY} y2={zeroY} stroke="#d1d5db" strokeWidth={1} />
      </svg>

      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        {[
          { color: '#16a34a', label: 'Autoconsumo', hatched: false },
          { color: '#9ca3af', label: 'Consumo desde la red', hatched: false },
          { color: '#2563eb', label: 'Inyección (bajo el eje)', hatched: true },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            {s.hatched ? (
              <svg width={12} height={8} className="block">
                <rect width={12} height={8} fill={s.color} opacity={0.18} rx={2} />
                {[1, 4, 7].map((y) => <rect key={y} y={y} width={12} height={1.6} fill={s.color} opacity={0.75} />)}
              </svg>
            ) : (
              <span className="inline-block w-3 h-2 rounded-sm" style={{ backgroundColor: s.color }} />
            )}
            <span className="text-[10px] text-gray-500">{s.label}</span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-gray-400 mt-1.5 leading-relaxed">
        Sobre el eje, tu consumo del mes: la parte verde la cubren los paneles y la gris se sigue
        comprando. Bajo el eje, el excedente que se inyecta a la red.
      </p>
    </div>
  );
}

// ─── Gráfico generación (columnas) vs consumo (línea) ─────────────────────────
// Vista directa de por qué la cobertura no es 100%: en los meses en que las
// columnas de generación superan la línea de consumo, el excedente se inyecta;
// en invierno puede quedar por debajo. La generación es estacional; el consumo
// es el promedio mensual usado en la simulación (línea de referencia).

function GenerationConsumptionChart({ monthly }: { monthly: SimulatorResult['energyBalance']['monthly'] }) {
  const W = 560, H = 190;
  const PAD = { top: 18, right: 12, bottom: 24, left: 40 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const maxVal = Math.max(1, ...monthly.map((m) => Math.max(m.productionKWh, m.consumptionKWh)));
  const n = monthly.length;
  const slot = chartW / n;
  const barW = Math.min(slot * 0.58, 24);
  const baseY = PAD.top + chartH;
  const yOf = (v: number) => baseY - (v / maxVal) * chartH;

  const consPath = monthly
    .map((m, i) => {
      const cx = PAD.left + slot * i + slot / 2;
      return `${i === 0 ? 'M' : 'L'}${cx.toFixed(1)},${yOf(m.consumptionKWh).toFixed(1)}`;
    })
    .join(' ');

  const yTicks = [0, 0.5, 1];

  return (
    <div className="mt-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible">
        {/* Rejilla y eje Y */}
        {yTicks.map((t) => {
          const yy = PAD.top + chartH * (1 - t);
          return (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={yy} y2={yy} stroke="#f3f4f6" strokeWidth={1} />
              <text x={PAD.left - 5} y={yy + 3} textAnchor="end" fontSize={9} fill="#9ca3af">
                {Math.round(maxVal * t)}
              </text>
            </g>
          );
        })}

        {/* Columnas de generación */}
        {monthly.map((m, i) => {
          const x = PAD.left + slot * i + (slot - barW) / 2;
          const barH = (m.productionKWh / maxVal) * chartH;
          return (
            <g key={m.month}>
              <rect x={x} y={baseY - barH} width={barW} height={Math.max(barH, 0)} fill="#f59e0b" opacity={0.85} rx={1.5} />
              <text x={x + barW / 2} y={H - 5} textAnchor="middle" fontSize={8} fill="#9ca3af">
                {m.monthName.slice(0, 3)}
              </text>
            </g>
          );
        })}

        {/* Línea de consumo */}
        <path d={consPath} fill="none" stroke="#1d65c5" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {monthly.map((m, i) => {
          const cx = PAD.left + slot * i + slot / 2;
          return <circle key={m.month} cx={cx} cy={yOf(m.consumptionKWh)} r={2.5} fill="#1d65c5" />;
        })}
      </svg>

      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: '#f59e0b' }} />
          <span className="text-[10px] text-gray-500">Generación (columnas)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center" style={{ width: 16 }}>
            <span className="inline-block w-4 rounded" style={{ height: 2, backgroundColor: '#1d65c5' }} />
          </span>
          <span className="text-[10px] text-gray-500">Consumo (línea)</span>
        </div>
      </div>
    </div>
  );
}

// ─── Bloque financiero (detalle) ──────────────────────────────────────────────

function FinancialDetail({ result }: { result: SimulatorResult }) {
  const { energyBalance, financial } = result;
  const [showTable, setShowTable] = useState(false);
  return (
    <>
      <div className="bg-white rounded-2xl ring-1 ring-[#b0cedd]/30 shadow-[0_1px_3px_rgba(16,40,80,0.04)] p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Desglose financiero anual</h2>
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Ahorro por autoconsumo diurno</span>
            <span className="font-medium text-[#1d65c5]">
              {formatCLP(energyBalance.totalSelfConsumptionSavingsCLP)}
            </span>
          </div>
          {energyBalance.totalBatteryDischargeSavingsCLP > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Ahorro nocturno por batería</span>
              <span className="font-medium text-[#1d65c5]">
                {formatCLP(energyBalance.totalBatteryDischargeSavingsCLP)}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500">
              Ingreso por inyección ({financial.injectionValuePerKWhCLP} CLP/kWh)
            </span>
            <span className="font-medium text-[#1d65c5]">
              {formatCLP(energyBalance.totalInjectionIncomeCLP)}
            </span>
          </div>
          <div className="border-t border-gray-100 pt-2 flex justify-between font-semibold">
            <span className="text-gray-700">Beneficio total anual</span>
            <span className="text-[#389fe0]">{formatCLP(financial.annualBenefitCLP)}</span>
          </div>
          <div className="border-t border-gray-100 pt-2 flex flex-col gap-1.5 text-xs text-gray-500">
            <div className="flex justify-between">
              <span>ROI a {SOLAR_DEFAULTS.systemLifeYears} años (simple)</span>
              <span className="font-medium">{financial.roi25YearsPercent}%</span>
            </div>
            <div className="flex justify-between">
              <span>VAN a {SOLAR_DEFAULTS.systemLifeYears} años (tasa {DFL4.discountRateReal * 100}%)</span>
              <span className={`font-medium ${financial.vanCLP >= 0 ? 'text-[#389fe0]' : 'text-red-500'}`}>
                {formatCLP(financial.vanCLP)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Retorno descontado ({DFL4.discountRateReal * 100}% real anual)</span>
              <span className="font-medium">{formatPayback(financial.discountedPaybackYears)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl ring-1 ring-[#b0cedd]/30 shadow-[0_1px_3px_rgba(16,40,80,0.04)] p-5">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h2 className="text-sm font-semibold text-gray-700">Generación vs consumo mensual</h2>
          <span className="text-xs text-gray-400">PFV {result.kit.sizekWp} kW · en kWh</span>
        </div>
        <p className="text-xs text-gray-400 mb-1 leading-relaxed">
          En los meses en que la generación supera tu consumo, el excedente se inyecta a la red.
        </p>
        <GenerationConsumptionChart monthly={energyBalance.monthly} />
      </div>

      <div className="bg-white rounded-2xl ring-1 ring-[#b0cedd]/30 shadow-[0_1px_3px_rgba(16,40,80,0.04)] p-5">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h2 className="text-sm font-semibold text-gray-700">Balance energético mensual</h2>
          <span className="text-xs text-gray-400">consumo e inyección · en kWh</span>
        </div>

        {/* Vista principal: gráfico apilado (limpio, se lee de una) */}
        <StackedBalanceChart monthly={energyBalance.monthly} />

        {/* Resumen anual en una línea */}
        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-4 pt-3 border-t border-gray-100 text-xs">
          <span className="text-gray-500">Producción anual: <strong className="text-gray-700">{energyBalance.totalProductionKWh.toLocaleString('es-CL')} kWh</strong></span>
          <span className="text-gray-500">Autoconsumo: <strong className="text-green-700">{energyBalance.totalSelfConsumptionKWh.toLocaleString('es-CL')} kWh</strong></span>
          <span className="text-gray-500">Inyección: <strong className="text-blue-700">{energyBalance.totalInjectedKWh.toLocaleString('es-CL')} kWh</strong></span>
          <span className="text-gray-500">Beneficio: <strong className="text-[#389fe0]">{formatCLP(financial.annualBenefitCLP)}</strong></span>
        </div>

        {/* Detalle numérico colapsable */}
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="mt-3 text-xs font-semibold text-[#1d65c5] hover:text-[#389fe0] transition-colors flex items-center gap-1"
        >
          {showTable ? 'Ocultar detalle mensual' : 'Ver detalle mensual'}
          <span className={`transition-transform ${showTable ? 'rotate-180' : ''}`}>▾</span>
        </button>

        {showTable && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs min-w-[560px]">
              <thead>
                <tr className="text-gray-400 border-b border-gray-100">
                  <th className="text-left pb-2 font-medium">Mes</th>
                  <th className="text-right pb-2 font-medium">Producción</th>
                  <th className="text-right pb-2 font-medium">Autoconsumo</th>
                  <th className="text-right pb-2 font-medium">Inyección</th>
                  <th className="text-right pb-2 font-medium">Red</th>
                  <th className="text-right pb-2 font-medium">Beneficio</th>
                </tr>
              </thead>
              <tbody>
                {energyBalance.monthly.map((m) => (
                  <tr key={m.month} className="border-b border-gray-50">
                    <td className="py-1.5 text-gray-700">{m.monthName}</td>
                    <td className="py-1.5 text-right text-gray-600">{m.productionKWh}</td>
                    <td className="py-1.5 text-right text-[#389fe0]">{m.selfConsumptionKWh}</td>
                    <td className="py-1.5 text-right text-blue-600">{m.injectedToGridKWh}</td>
                    <td className="py-1.5 text-right text-gray-500">{m.consumedFromGridKWh}</td>
                    <td className="py-1.5 text-right font-medium text-[#1d65c5]">
                      {formatCLP(m.totalMonthlyBenefitCLP)}
                    </td>
                  </tr>
                ))}
                <tr className="font-semibold text-gray-700 bg-gray-50">
                  <td className="py-2">Total anual</td>
                  <td className="py-2 text-right">{energyBalance.totalProductionKWh}</td>
                  <td className="py-2 text-right text-[#389fe0]">{energyBalance.totalSelfConsumptionKWh}</td>
                  <td className="py-2 text-right text-blue-600">{energyBalance.totalInjectedKWh}</td>
                  <td className="py-2 text-right">{energyBalance.totalConsumedFromGridKWh}</td>
                  <td className="py-2 text-right text-[#389fe0]">{formatCLP(financial.annualBenefitCLP)}</td>
                </tr>
              </tbody>
            </table>
            <p className="text-xs text-gray-400 mt-2">Valores en kWh</p>
            <MonthlyLineChart monthly={energyBalance.monthly} />
          </div>
        )}
      </div>
    </>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function StepResults({ state, config, catalog, adminMode = false, clientId, installationId, billInfo }: StepResultsProps) {
  const contact = state.contact!;
  const supply  = state.supply!;
  const profile = state.consumptionProfile!;
  const future  = state.futureConsumption;
  const isResidential = state.customerCategory === 'natural';

  const [userScenarioOverride, setUserScenarioOverride] = useState<'A' | 'B' | 'C' | null>(null);
  // Escenario que se presenta como recomendado en el informe. Por defecto es el
  // que calcula el motor, pero tras conversar con el cliente puede convenir
  // destacar otro (una planta mayor, o la que lleva batería).
  const [featuredScenario, setFeaturedScenario] = useState<'A' | 'B' | 'C' | null>(null);
  // Id de la simulación si ya se guardó en esta sesión.
  const [savedSimulationId, setSavedSimulationId] = useState<string | null>(null);
  const [batteryCount, setBatteryCount]       = useState(1);
  const [batteryReservePct, setBatteryReservePct] = useState(30); // % de reserva; default 30%
  const [businessBattery, setBusinessBattery] = useState(false);
  const [ctaState, setCtaState]               = useState<CtaState>('idle');
  const [consumptionMode, setConsumptionMode] = useState<'base' | 'future'>('base');
  // Escenario C: batería sobre la planta recomendada o la más económica.
  const [batteryPlant, setBatteryPlant]       = useState<'recommended' | 'economic'>('recommended');
  // Modo interno: override manual del tamaño de la PFV (null = tamaño recomendado).
  const [adminSizeKWp, setAdminSizeKWp]       = useState<number | null>(null);

  // Tamaños del catálogo (sin batería) disponibles para el selector manual interno.
  const adminKitSizes = useMemo(
    () => (catalog ?? [])
      .filter((k) => !k.includesBattery)
      .map((k) => k.sizekWp)
      .sort((a, b) => a - b),
    [catalog],
  );

  const contactName = 'name' in contact
    ? (contact as PersonContact).name
    : (contact as BusinessContact).companyName;
  const contactEmail = (contact as PersonContact).email ?? (contact as BusinessContact).email;

  // PFV existente: saldo de empalme + si está "a tope" (sin margen para ampliar).
  const existingSolar = useMemo(() => getExistingSolarInfo(state), [state]);

  // ── Simulaciones ────────────────────────────────────────────────────────────
  const { baseInput, scenarios, futureScenarios, businessResult, businessBaseResult, recommendedScenario } = useMemo(() => {
    const batteryUsableFraction = (100 - batteryReservePct) / 100;
    // Consumo real por mes: con equipos futuros y sin ellos (para el toggle base/futuro).
    const futureMap = buildMonthlyConsumption(state, true);
    const baseMap   = buildMonthlyConsumption(state, false);
    const inp = { ...buildBaseInput(state, config), batteryUsableFraction, monthlyConsumptionByMonth: futureMap };
    const addKWh = state.futureConsumption?.totalAdditionalMonthlyKWh ?? 0;
    const hasAdd = addKWh > 0;
    // Consumo "base" (sin equipos nuevos): con PFV existente es el residual a cubrir.
    const es = getExistingSolarInfo(state);
    const baseConsumption = es.active && !es.atTope
      ? es.effectiveAvgKWh
      : state.consumptionProfile!.averageMonthlyKWh;
    const inpBase = hasAdd
      ? { ...inp, monthlyConsumptionKWh: baseConsumption, monthlyConsumptionByMonth: baseMap }
      : inp;

    if (!isResidential) {
      return {
        baseInput: inp,
        scenarios: null,
        futureScenarios: null,
        businessResult:         businessBattery ? runBusinessSimulationWithBattery(inp, batteryCount)     : runBusinessSimulation(inp),
        businessBaseResult:     hasAdd ? (businessBattery ? runBusinessSimulationWithBattery(inpBase, batteryCount) : runBusinessSimulation(inpBase)) : null,
        recommendedScenario:    'A' as const,
      };
    }

    const scenarioOpts = {
      overrideKitKWp: adminSizeKWp ?? undefined,
      cUsesEconomic:  batteryPlant === 'economic',
    };
    const sc = calcThreeScenarios(inpBase, batteryCount, catalog, scenarioOpts);
    // Regla 1: si kitA tiene payback > 12 años y kitB tiene payback < 10 años → recomendar B
    let recommended: 'A' | 'B' | 'C' = 'A';
    if (sc.B && sc.A.financial.paybackYears > 12 && sc.B.financial.paybackYears < 10) {
      recommended = 'B';
    }

    return {
      baseInput: inp,
      scenarios: sc,
      futureScenarios: hasAdd ? calcThreeScenarios(inp, batteryCount, catalog, scenarioOpts) : null,
      businessResult: null,
      businessBaseResult: null,
      recommendedScenario: recommended,
    };
  }, [state, isResidential, batteryCount, batteryReservePct, businessBattery, adminSizeKWp, batteryPlant]);

  const hasAdditions = (future?.totalAdditionalMonthlyKWh ?? 0) > 0;
  // Fracción diurna que aplica a este cliente (residencial o empresa).
  const perfilDiurno = isResidential
    ? (config?.dayConsumptionRatio ?? SOLAR_DEFAULTS.dayConsumptionRatio)
    : (config?.dayConsumptionRatioBusiness ?? SOLAR_DEFAULTS.businessDayConsumptionRatio);

  // Datos del cliente derivados del wizard: los comparten el bloque de guardar
  // la simulación y el de crear la cotización.
  const datosCliente = useMemo(() => ({
    nombre:   isResidential ? (contact as PersonContact).name : (contact as BusinessContact).companyName,
    email:    contactEmail ?? '',
    telefono: (contact as PersonContact).phone ?? '',
    empresa:  isResidential ? null : (contact as BusinessContact).companyName,
    atencionA: isResidential ? null : (contact as BusinessContact).contactName,
    customerType: (isResidential ? 'natural' : 'business') as 'natural' | 'business',
    direccion: contact.address || null,
    comuna:    contact.commune || null,
    ciudad:    contact.city || null,
    regionId:  contact.regionId || null,
    distribuidora: supply.distribuidora ?? null,
    tarifa:        supply.tarifa ?? null,
    amperajeA:     supply.amperajeA ?? null,
    potenciaContratadaKW: supply.potenciaContratadaKW ?? null,
    tensionSuministro:    supply.tensionSuministro ?? null,
    consumoPromedioMensualKWh: Math.round(profile.averageMonthlyKWh),
  }), [isResidential, contact, contactEmail, supply, profile.averageMonthlyKWh]);

  const effectiveRecommended = featuredScenario ?? recommendedScenario;
  const effectiveScenario = userScenarioOverride ?? effectiveRecommended;

  // Regla 2: sobredimensionamiento — kit genera >130% del consumo anual
  const isOversized = (result: SimulatorResult) =>
    result.energyBalance.totalProductionKWh > result.energyBalance.totalConsumptionKWh * 1.3;

  const activeScenarios = (hasAdditions && consumptionMode === 'future' && futureScenarios)
    ? futureScenarios
    : scenarios;

  const activeResult: SimulatorResult = isResidential
    ? (activeScenarios![effectiveScenario] ?? activeScenarios!.A)
    : (hasAdditions && consumptionMode === 'base' && businessBaseResult)
      ? businessBaseResult
      : businessResult!;

  const tariffAnalysis = useMemo(() => runTariffAnalysis({
    tarifa:              supply.tarifa,
    avgMonthlyKWh:       profile.averageMonthlyKWh,
    potenciaContratadaKW: supply.potenciaContratadaKW,
    avgPowerChargeCLP:   profile.avgPowerChargeCLP,
    avgTotalBillCLP:     profile.avgTotalBillCLP,
    kWhPriceCLP:         baseInput.energyPrice.kWhPriceCLP,
    isResidential,
    operatingHours:      supply.operatingHours,
    flexibleEquipment:   state.futureConsumption?.flexibleEquipment,
  }), [supply, profile, baseInput, isResidential, state.futureConsumption]);

  // EV analysis uses Scenario A balance (or business result)
  const evCharger = useMemo(() => {
    const evRaw = future?.evCharger;
    if (!evRaw) return null;
    const balanceForEV = isResidential ? scenarios!.A.energyBalance : (businessResult ?? businessBaseResult)!.energyBalance;
    return calcEVCharger(
      evRaw.carCount,
      evRaw.chargerType,
      profile.averageMonthlyKWh,
      balanceForEV,
      baseInput.energyPrice.kWhPriceCLP,
      baseInput.energyPrice.kWhPriceCLP * SOLAR_DEFAULTS.injectionValueFactor,
    );
  }, [future, isResidential, scenarios, businessResult, profile.averageMonthlyKWh, baseInput]);

  const empalmeLoad = useMemo((): EmpalmeLoadResult | null => {
    if (!isResidential || !supply.amperajeA || !future || future.totalAdditionalMonthlyKWh === 0) return null;
    const result = calcEmpalmeLoad(future, supply.amperajeA);
    return result.level !== 'ok' ? result : null;
  }, [isResidential, supply.amperajeA, future]);

  const EVChargingLabel: Record<string, string> = {
    day:   'Carga diurna — usa tus excedentes solares',
    night: 'Carga nocturna — desde la red en horario bajo',
    mixed: 'Carga mixta — parte solar, parte red',
  };

  const handleCTA = useCallback(async () => {
    if (ctaState !== 'idle') return;
    setCtaState('loading');

    const c = contact as PersonContact & BusinessContact;
    const scenarioSummary = (r: typeof activeResult) => ({
      kitSizeKWp:        r.kit.sizekWp,
      kitPriceCLP:       r.financial.systemCostCLP,
      monthlyBenefitCLP: r.financial.monthlyBenefitCLP,
      annualBenefitCLP:  r.financial.annualBenefitCLP,
      paybackYears:      r.financial.paybackYears,
      coveragePercent:   r.energyBalance.coveragePercent,
      panelCount:        r.kit.panelCount,
      areaM2:            requiredSurfaceM2(r.kit.panelCount),
      batteryKWh:        r.batteryCapacityKWh > 0 ? r.batteryCapacityKWh : undefined,
    });

    const payload = {
      customerCategory: state.customerCategory,
      contact: {
        name:        c.name,
        companyName: c.companyName,
        contactName: c.contactName,
        email:       c.email,
        phone:       c.phone,
        regionId:    c.regionId,
        city:        c.city,
        commune:     c.commune,
      },
      supply: { tarifa: supply.tarifa, distribuidora: supply.distribuidora },
      averageMonthlyKWh: profile.averageMonthlyKWh,
      simulation: {
        regionName:        activeResult.region.name,
        kitSizeKWp:        activeResult.kit.sizekWp,
        kitPriceCLP:       activeResult.financial.systemCostCLP,
        batteryCapacityKWh: activeResult.batteryCapacityKWh,
        monthlyBenefitCLP: activeResult.financial.monthlyBenefitCLP,
        annualBenefitCLP:  activeResult.financial.annualBenefitCLP,
        paybackYears:      activeResult.financial.paybackYears,
        coveragePercent:   activeResult.energyBalance.coveragePercent,
      },
      consumption_profile: {
        bills: profile.bills.map((b) => ({
          month: b.month, year: b.year,
          consumptionKWh: b.consumptionKWh,
          variableAmountCLP: b.variableAmountCLP,
        })),
        averageMonthlyKWh: profile.averageMonthlyKWh,
      },
      scenarios_json: activeScenarios ? {
        A: scenarioSummary(activeScenarios.A),
        B: activeScenarios.B ? scenarioSummary(activeScenarios.B) : null,
        C: scenarioSummary(activeScenarios.C),
      } : null,
      future_consumption: future && future.totalAdditionalMonthlyKWh > 0 ? {
        totalAdditionalMonthlyKWh: future.totalAdditionalMonthlyKWh,
        evCharger: future.evCharger ? { carCount: future.evCharger.carCount, estimatedMonthlyKWh: future.evCharger.estimatedMonthlyKWh } : undefined,
        airConditioners: future.airConditioners?.length ? future.airConditioners.map((a) => ({ count: a.count, btu: a.btu, estimatedMonthlyKWh: a.estimatedMonthlyKWh })) : undefined,
        waterHeater: future.waterHeater ? { occupants: future.waterHeater.occupants, estimatedMonthlyKWh: future.waterHeater.estimatedMonthlyKWh } : undefined,
      } : null,
      supply_details: {
        tarifa:                supply.tarifa,
        distribuidora:         supply.distribuidora,
        amperajeA:             supply.amperajeA,
        potenciaContratadaKW:  supply.potenciaContratadaKW,
        tensionSuministro:     supply.tensionSuministro,
        hasExistingSolar:      supply.hasExistingSolar,
        existingSystemKWp:     supply.existingSystemKWp,
        propertyType:          supply.propertyType,
      },
    };

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setCtaState(res.ok ? 'success' : 'error');
    } catch {
      setCtaState('error');
    }
  }, [ctaState, contact, state.customerCategory, supply, profile, activeResult]);

  // CTA para el caso "planta a tope" → solicitud de revisión/mantención (sin
  // propuesta de planta nueva). Mismo endpoint de leads, simulación en cero.
  const handleMaintenanceCTA = useCallback(async () => {
    if (ctaState !== 'idle') return;
    setCtaState('loading');
    const c = contact as PersonContact & BusinessContact;
    const payload = {
      customerCategory: state.customerCategory,
      contact: {
        name: c.name, companyName: c.companyName, contactName: c.contactName,
        email: c.email, phone: c.phone, regionId: c.regionId, city: c.city, commune: c.commune,
      },
      supply: { tarifa: supply.tarifa, distribuidora: supply.distribuidora },
      averageMonthlyKWh: profile.averageMonthlyKWh,
      simulation: {
        regionName: activeResult.region.name,
        kitSizeKWp: 0, kitPriceCLP: 0, batteryCapacityKWh: 0,
        monthlyBenefitCLP: 0, annualBenefitCLP: 0, paybackYears: 0, coveragePercent: 0,
      },
      consumption_profile: {
        bills: profile.bills.map((b) => ({ month: b.month, year: b.year, consumptionKWh: b.consumptionKWh, variableAmountCLP: b.variableAmountCLP })),
        averageMonthlyKWh: profile.averageMonthlyKWh,
      },
      scenarios_json: null,
      future_consumption: null,
      supply_details: {
        tarifa: supply.tarifa, distribuidora: supply.distribuidora,
        amperajeA: supply.amperajeA, potenciaContratadaKW: supply.potenciaContratadaKW,
        tensionSuministro: supply.tensionSuministro,
        hasExistingSolar: supply.hasExistingSolar, existingSystemKWp: supply.existingSystemKWp,
        propertyType: supply.propertyType,
        consumptionBasis: profile.consumptionBasis,
        maintenanceRequest: true, // PFV a tope: pide revisión/mantención
      },
    };
    try {
      const res = await fetch('/api/leads', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      setCtaState(res.ok ? 'success' : 'error');
    } catch {
      setCtaState('error');
    }
  }, [ctaState, contact, state.customerCategory, supply, profile, activeResult]);

  // ── PFV existente "a tope": no hay margen de empalme → revisión/mantención ──
  if (existingSolar.active && existingSolar.atTope) {
    return (
      <div className="flex flex-col gap-5">
        <div className="bg-gradient-to-br from-[#389fe0] to-[#1d65c5] text-white rounded-2xl p-6 shadow-[0_16px_48px_rgba(56,159,224,0.25)]">
          <p className="text-sm opacity-70 mb-1">{contactName}</p>
          <p className="text-2xl font-bold leading-tight tracking-tight">Tu planta ya aprovecha todo tu empalme</p>
          <p className="text-sm opacity-90 mt-2">
            Tienes una PFV de <strong>{existingSolar.existingKWp} kWp</strong>
            {existingSolar.empalmeMaxKW != null && <> y un empalme de ~<strong>{existingSolar.empalmeMaxKW} kW</strong></>}.
            No queda margen para ampliar sin modificar el empalme.
          </p>
        </div>

        <div className="bg-white rounded-2xl ring-1 ring-[#b0cedd]/30 shadow-[0_1px_3px_rgba(16,40,80,0.04)] p-6">
          <h2 className="text-base font-bold text-[#010101] tracking-tight">Te recomendamos una revisión / mantención</h2>
          <p className="text-sm text-gray-600 mt-2 leading-relaxed">
            Para asegurar que tu planta produzca al máximo, podemos revisar su estado, limpieza,
            inversor y conexiones. Si más adelante quieres ampliar, evaluamos también una mejora
            de empalme.
          </p>
          <ul className="mt-4 flex flex-col gap-2 text-sm text-gray-600">
            {['Inspección de paneles e inversor', 'Limpieza y revisión de conexiones', 'Diagnóstico de producción real vs esperada'].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <span className="text-[#389fe0] mt-0.5">✓</span> {t}
              </li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          onClick={handleMaintenanceCTA}
          disabled={ctaState !== 'idle'}
          className={[
            'w-full rounded-xl font-semibold py-3.5 text-sm transition-all',
            ctaState === 'success'
              ? 'bg-green-500 text-white'
              : 'bg-[#010101] hover:bg-[#1d65c5] text-white disabled:opacity-60',
          ].join(' ')}
        >
          {ctaState === 'loading' ? 'Enviando…'
            : ctaState === 'success' ? '✓ ¡Listo! Te contactaremos pronto'
            : ctaState === 'error' ? 'Hubo un error — reintentar'
            : 'Quiero que me contacten para una revisión'}
        </button>
        {ctaState === 'error' && (
          <p className="text-xs text-red-500 text-center -mt-3">No se pudo enviar. Intenta nuevamente.</p>
        )}
      </div>
    );
  }

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      className="flex flex-col gap-5 select-none"
      onCopy={(e) => e.preventDefault()}
    >
      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-[#389fe0] to-[#1d65c5] text-white rounded-2xl p-6 shadow-[0_16px_48px_rgba(56,159,224,0.25)]">
        <p className="text-sm opacity-70 mb-1">{contactName}</p>
        <p className="text-4xl font-bold leading-tight tracking-tight">
          {formatCLP(activeResult.financial.annualBenefitCLP)}
          <span className="text-lg font-normal opacity-75">/año</span>
        </p>
        <p className="text-sm opacity-90 font-medium mt-0.5 mb-4">de ahorro estimado anual en energía</p>
        <div className="grid grid-cols-3 gap-3 text-sm border-t border-white/20 pt-4">
          <div>
            <p className="text-xs opacity-60">Retorno</p>
            <p className="font-semibold">{formatPayback(activeResult.financial.paybackYears)}</p>
          </div>
          <div>
            <p className="text-xs opacity-60">Dejas de pagar</p>
            <p className="font-semibold">{formatPercent(activeResult.financial.billSavingsPercent)}</p>
          </div>
          <div>
            <p className="text-xs opacity-60">Consumo</p>
            <p className="font-semibold">{formatKWh(baseInput.monthlyConsumptionKWh)}/mes</p>
          </div>
        </div>
        <p className="text-xs opacity-50 mt-3">
          {activeResult.region.name} · {supply.distribuidora ?? 'distribuidora no especificada'} ·
          Tarifa {supply.tarifa === 'unknown' ? 'BT1 (referencia)' : supply.tarifa}
          {baseInput.energyPrice.source === 'reference'
            ? ` · ${baseInput.energyPrice.kWhPriceCLP} CLP/kWh (ref.)`
            : ` · ${baseInput.energyPrice.kWhPriceCLP} CLP/kWh`}
        </p>
      </div>

      {/* ── Aviso: propuesta complementaria a la PFV existente ─────────────── */}
      {existingSolar.active && !existingSolar.atTope && (
        <div className="bg-[#389fe0]/8 border border-[#389fe0]/20 rounded-xl px-4 py-3 text-sm text-[#1d65c5]">
          <p className="font-semibold">Propuesta para complementar tu PFV existente</p>
          <p className="text-xs text-[#1d65c5]/80 mt-1 leading-relaxed">
            Ya tienes {existingSolar.existingKWp} kWp instalados. Esta propuesta usa el
            espacio libre de tu empalme{existingSolar.headroomKWp != null && <> (~{existingSolar.headroomKWp} kW disponibles)</>}
            {existingSolar.basis === 'total'
              ? ' y dimensiona sobre el consumo que aún tomas de la red.'
              : ' sobre el consumo de tu boleta de la compañía.'}
          </p>
        </div>
      )}

      {/* ── Toggle consumo base / futuro ───────────────────────────────────── */}
      {hasAdditions && (futureScenarios ?? businessBaseResult) && (
        <div>
          <p className="text-xs text-gray-500 mb-2 font-medium">Simular con:</p>
          <div className="flex gap-2">
            {([
              { mode: 'base'   as const, label: 'Consumo actual',     kwh: profile.averageMonthlyKWh },
              { mode: 'future' as const, label: 'Con equipos proyectados', kwh: profile.averageMonthlyKWh + (future?.totalAdditionalMonthlyKWh ?? 0) },
            ]).map(({ mode, label, kwh }) => {
              const active = consumptionMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setConsumptionMode(mode)}
                  className={[
                    'flex-1 rounded-xl border-2 py-3 px-3 text-center transition-all',
                    active
                      ? 'border-[#389fe0] bg-[#389fe0] text-white shadow-md'
                      : 'border-gray-300 bg-white text-gray-600 hover:border-[#389fe0]/50 hover:bg-[#f0f8ff]',
                  ].join(' ')}
                >
                  <span className="block text-xs font-semibold">{label}</span>
                  <span className={`block text-[10px] mt-0.5 ${active ? 'text-white/80' : 'text-gray-400'}`}>
                    {kwh} kWh/mes
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Toggle batería (empresa) ───────────────────────────────────────── */}
      {!isResidential && (
        <div>
          <p className="text-xs text-gray-500 mb-2 font-medium">Elige un escenario:</p>
          <div className="flex gap-2">
            {([
              { val: false, label: 'Sin batería',   sub: 'Solo generación solar',      activeCls: 'border-[#389fe0] bg-[#1d65c5]' },
              { val: true,  label: 'Con baterías',  sub: 'Mayor autoconsumo nocturno', activeCls: 'border-amber-400 bg-amber-500' },
            ]).map(({ val, label, sub, activeCls }) => {
              const isActive = businessBattery === val;
              return (
                <button
                  key={String(val)}
                  type="button"
                  onClick={() => setBusinessBattery(val)}
                  className={[
                    'flex-1 rounded-xl border-2 py-3 px-3 text-center transition-all',
                    isActive
                      ? `${activeCls} text-white shadow-md`
                      : 'border-gray-300 bg-white text-gray-600 hover:border-[#389fe0]/50 hover:bg-[#f0f8ff]',
                  ].join(' ')}
                >
                  <span className="block text-xs font-bold">{label}</span>
                  <span className={`block text-[10px] mt-0.5 ${isActive ? 'text-white/75' : 'text-gray-400'}`}>{sub}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Selector de baterías (empresa con batería) ─────────────────────── */}
      {!isResidential && businessBattery && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-amber-800">Módulos de batería</p>
            <select
              value={batteryCount}
              onChange={(e) => setBatteryCount(Number(e.target.value))}
              className="rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-sm font-semibold text-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {Array.from({ length: 100 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n} módulo{n > 1 ? 's' : ''}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <div>
              <p className="text-xs font-medium text-amber-800">Reserva de emergencia</p>
              <p className="text-[10px] text-amber-600">Porcentaje que nunca se descarga (cortes de luz)</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[0, 10, 20, 30, 40, 50].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setBatteryReservePct(pct)}
                  className={[
                    'px-3.5 py-2 rounded-xl text-sm font-semibold border-2 transition-all',
                    batteryReservePct === pct
                      ? 'border-amber-500 bg-amber-500 text-white'
                      : 'border-amber-300 bg-white text-amber-800 hover:border-amber-400',
                  ].join(' ')}
                >
                  {pct}%{pct === 30 ? ' ·' : ''}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-amber-700 pt-1 border-t border-amber-200">
            <span>Capacidad total: <strong>{batteryCount * SOLAR_DEFAULTS.batteryModuleKWh} kWh</strong></span>
            <span>Reserva ({batteryReservePct}%): <strong>{(batteryCount * SOLAR_DEFAULTS.batteryModuleKWh * batteryReservePct / 100).toFixed(1)} kWh</strong></span>
            <span>Uso nocturno: <strong>{(batteryCount * SOLAR_DEFAULTS.batteryModuleKWh * (100 - batteryReservePct) / 100).toFixed(1)} kWh</strong></span>
          </div>
        </div>
      )}

      {/* ── Selector manual de tamaño de PFV (modo interno) ────────────────── */}
      {isResidential && adminMode && activeScenarios && adminKitSizes.length > 0 && (
        <div className="bg-white rounded-2xl ring-1 ring-[#010101]/10 shadow-[0_1px_3px_rgba(16,40,80,0.04)] p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-gray-700">Ajustar tamaño de PFV</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Sobrescribe la planta recomendada para cotizar otra capacidad.
              </p>
            </div>
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider bg-[#010101] text-white/80 px-2 py-0.5 rounded-full">
              Modo interno
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setAdminSizeKWp(null)}
              className={[
                'px-3.5 py-2 rounded-xl text-sm font-semibold border-2 transition-all',
                adminSizeKWp === null
                  ? 'border-[#389fe0] bg-[#dde3e9]/50 text-[#1d65c5]'
                  : 'border-gray-200 text-gray-600 hover:border-[#b0cedd]',
              ].join(' ')}
            >
              Auto
            </button>
            {adminKitSizes.map((kw) => (
              <button
                key={kw}
                type="button"
                onClick={() => setAdminSizeKWp(kw)}
                className={[
                  'px-3.5 py-2 rounded-xl text-sm font-semibold border-2 transition-all',
                  adminSizeKWp === kw
                    ? 'border-[#389fe0] bg-[#dde3e9]/50 text-[#1d65c5]'
                    : 'border-gray-200 text-gray-600 hover:border-[#b0cedd]',
                ].join(' ')}
              >
                {kw} kW
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Tabs de escenario (solo residencial) ───────────────────────────── */}
      {isResidential && activeScenarios && (
        <div>
          <p className="text-xs text-gray-500 mb-2 font-medium">Elige un escenario:</p>
          <div className="flex gap-2">
            {(['A', 'B', 'C'] as const)
              .filter((s) => s !== 'B' || activeScenarios.kitB !== null)
              .map((s) => {
                const meta = {
                  A: { title: `PFV ${activeScenarios.kitA.sizekWp} kW`, sub: 'Sin batería', badge: effectiveRecommended === 'A' ? 'Recomendado' : 'Kit mayor', badgeColor: effectiveRecommended === 'A' ? 'bg-[#1d65c5]' : 'bg-gray-500' },
                  B: { title: `PFV ${activeScenarios.kitB?.sizekWp} kW`, sub: 'Sin batería', badge: effectiveRecommended === 'B' ? 'Recomendado' : 'Más económico', badgeColor: effectiveRecommended === 'B' ? 'bg-[#1d65c5]' : 'bg-gray-500' },
                  C: { title: `PFV ${activeScenarios.C.kit.sizekWp} kW`, sub: 'Con baterías', badge: effectiveRecommended === 'C' ? 'Recomendado' : 'Con baterías', badgeColor: effectiveRecommended === 'C' ? 'bg-[#1d65c5]' : 'bg-amber-500' },
                }[s];
                const isActive = effectiveScenario === s;
                const activeBorder = s === 'C' ? 'border-amber-400 bg-amber-500' : 'border-[#389fe0] bg-[#1d65c5]';
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setUserScenarioOverride(s)}
                    className={[
                      'flex-1 rounded-xl border-2 py-3 px-2 text-center transition-all',
                      isActive
                        ? `${activeBorder} text-white shadow-md`
                        : 'border-gray-300 bg-white text-gray-600 hover:border-[#389fe0]/50 hover:bg-[#f0f8ff]',
                    ].join(' ')}
                  >
                    <span className={`inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded-full mb-1 ${
                      isActive ? 'bg-white/20 text-white' : `${meta.badgeColor} text-white`
                    }`}>
                      {meta.badge}
                    </span>
                    <span className="block text-xs font-bold mt-0.5">{meta.title}</span>
                    <span className={`block text-[10px] mt-0.5 ${isActive ? 'text-white/75' : 'text-gray-400'}`}>
                      {meta.sub}
                    </span>
                  </button>
                );
              })}
          </div>

          {/* Qué escenario se presenta como recomendado en el informe. Por
              defecto el que calcula el motor; tras hablar con el cliente puede
              convenir destacar otro. */}
          <div className="mt-3">
            {effectiveRecommended === effectiveScenario ? (
              <div className="rounded-xl border border-[#1d65c5]/30 bg-[#eaf4fb] px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                <span className="flex items-center gap-2 text-sm font-semibold text-[#1d65c5]">
                  <span className="text-base leading-none">★</span>
                  Este escenario es el que sale destacado en el informe
                </span>
                {featuredScenario && (
                  <button type="button" onClick={() => setFeaturedScenario(null)}
                    className="text-xs font-medium text-gray-500 hover:text-gray-700 underline whitespace-nowrap">
                    Volver al automático
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setFeaturedScenario(effectiveScenario)}
                className="w-full rounded-xl border-2 border-dashed border-[#389fe0] bg-white hover:bg-[#eaf4fb] px-4 py-3 flex items-center justify-center gap-2 transition-colors group"
              >
                <span className="text-lg leading-none text-[#389fe0] group-hover:scale-110 transition-transform">★</span>
                <span className="text-sm font-semibold text-[#1d65c5]">
                  Destacar este escenario en el informe
                </span>
                <span className="text-xs text-gray-400 hidden sm:inline">
                  — pasa a ser el recomendado
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Configuración de batería (Escenario C) ─────────────────────────── */}
      {isResidential && effectiveScenario === 'C' && activeScenarios && (
        <div className="bg-white rounded-2xl ring-1 ring-amber-200/70 shadow-[0_1px_3px_rgba(16,40,80,0.04)] p-5 flex flex-col gap-5">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <IconBattery className="w-4.5 h-4.5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-800">Configuración de batería</p>
              <p className="text-xs text-gray-400">Ajusta la planta, los módulos y la reserva.</p>
            </div>
          </div>

          {/* Planta sobre la que se monta la batería: recomendada o más económica */}
          {activeScenarios.kitB && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-gray-500">Planta para la batería</span>
              <SegmentedControl
                ariaLabel="Planta para la batería"
                value={batteryPlant}
                onChange={setBatteryPlant}
                options={[
                  { value: 'recommended', label: `Recomendada · ${activeScenarios.kitA.sizekWp} kW` },
                  { value: 'economic',    label: `Más económica · ${activeScenarios.kitB.sizekWp} kW` },
                ]}
              />
            </div>
          )}

          {/* Módulos de batería */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-gray-500">Módulos de batería</span>
            <SegmentedControl
              ariaLabel="Módulos de batería"
              value={batteryCount}
              onChange={setBatteryCount}
              options={Array.from({ length: 10 }, (_, i) => ({ value: i + 1, label: String(i + 1) }))}
            />
          </div>

          {/* Reserva de emergencia */}
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium text-gray-500">Reserva de emergencia</span>
              <span className="text-[10px] text-gray-400">nunca se descarga (cortes de luz)</span>
            </div>
            <SegmentedControl
              ariaLabel="Reserva de emergencia"
              value={batteryReservePct}
              onChange={setBatteryReservePct}
              options={[0, 10, 20, 30, 40, 50].map((pct) => ({ value: pct, label: `${pct}%` }))}
            />
          </div>

          {/* Cifras resultantes */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Capacidad total', value: `${batteryCount * SOLAR_DEFAULTS.batteryModuleKWh} kWh` },
              { label: `Reserva (${batteryReservePct}%)`, value: `${(batteryCount * SOLAR_DEFAULTS.batteryModuleKWh * batteryReservePct / 100).toFixed(1)} kWh` },
              { label: 'Uso nocturno', value: `${(batteryCount * SOLAR_DEFAULTS.batteryModuleKWh * (100 - batteryReservePct) / 100).toFixed(1)} kWh` },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-amber-50/80 px-3 py-2.5 text-center">
                <p className="text-sm font-bold text-amber-900 tabular-nums">{s.value}</p>
                <p className="text-[10px] text-amber-700/70 mt-0.5 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── KPIs ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Dejas de pagar"
          value={formatPercent(activeResult.financial.billSavingsPercent)}
          sub="de tu cuenta de luz anual"
          accent="text-[#389fe0]"
        />
        <StatCard
          label="Ahorro anual"
          value={formatCLP(activeResult.financial.annualBenefitCLP)}
          sub="autoconsumo + inyección"
          accent="text-[#389fe0]"
        />
        <StatCard
          label="Gasto actual"
          value={formatCLP(activeResult.financial.annualBillCLP)}
          sub="lo que pagas hoy al año"
        />
        <StatCard
          label="Período de retorno"
          value={formatPayback(activeResult.financial.paybackYears)}
          sub="payback simple"
        />
      </div>

      {/* ── Kit del escenario activo ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border-2 border-[#389fe0] shadow-sm p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-xs font-medium text-[#1d65c5] bg-[#dde3e9]/50 px-2 py-0.5 rounded-full">
              {effectiveScenario === 'C'
                ? `Con ${batteryCount} batería${batteryCount > 1 ? 's' : ''} · ${batteryCount * SOLAR_DEFAULTS.batteryModuleKWh} kWh`
                : effectiveScenario === 'B'
                  ? (effectiveRecommended === 'B' ? 'Recomendado' : 'Opción económica')
                  : 'Recomendado'}
            </span>
            <p className="font-semibold text-gray-900 mt-1.5">PFV {activeResult.kit.sizekWp} kW</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {activeResult.kit.panelCount} paneles · {requiredSurfaceM2(activeResult.kit.panelCount)} m² de superficie
              {activeResult.batteryCapacityKWh > 0 && (
                <> · {activeResult.batteryCapacityKWh} kWh batería</>
              )}
            </p>
            {activeResult.kit.installationNotes && (
              <p className="text-xs text-gray-400 mt-1">{activeResult.kit.installationNotes}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-bold text-gray-900">
              {formatCLP(activeResult.financial.systemCostCLP)}
            </p>
            <p className="text-xs text-gray-400">precio referencial + IVA</p>
          </div>
        </div>
      </div>

      {/* ── Crear cotización (solo back-office) ────────────────────────────── */}
      {adminMode && (
        <>
          <SaveSimulation
            clienteNombre={datosCliente.nombre}
            yaGuardada={savedSimulationId}
            onGuardada={setSavedSimulationId}
            payload={{
              clientId,
              installationId: installationId ?? null,
              clientData: datosCliente,
              fechaBoleta:  billInfo?.fechaBoleta ?? null,
              numeroBoleta: billInfo?.numeroBoleta ?? null,
              escenario: isResidential ? effectiveScenario : 'empresa',
              kitSizeKWp: activeResult.kit.sizekWp,
              panelCount: activeResult.kit.panelCount,
              systemCostCLP: activeResult.financial.systemCostCLP,
              batteryKWh: activeResult.batteryCapacityKWh,
              annualBenefitCLP: activeResult.financial.annualBenefitCLP,
              paybackYears: activeResult.financial.paybackYears,
              billSavingsPercent: activeResult.financial.billSavingsPercent,
              averageMonthlyKWh: Math.round(profile.averageMonthlyKWh),
              // El estado del wizard permite reabrir la simulación y corregirla.
              inputJson: state,
              resultJson: {
                escenario: isResidential ? effectiveScenario : 'empresa',
                kitSizeKWp: activeResult.kit.sizekWp,
                panelCount: activeResult.kit.panelCount,
                systemCostCLP: activeResult.financial.systemCostCLP,
                batteryCapacityKWh: activeResult.batteryCapacityKWh,
                annualBenefitCLP: activeResult.financial.annualBenefitCLP,
                paybackYears: activeResult.financial.paybackYears,
                billSavingsPercent: activeResult.financial.billSavingsPercent,
                coveragePercent: activeResult.energyBalance.coveragePercent,
                regionName: activeResult.region.name,
                averageMonthlyKWh: Math.round(profile.averageMonthlyKWh),
              },
              boletas: (billInfo?.archivadas ?? []).map((b) => ({
                filePath: b.filePath,
                fileName: b.fileName,
                contentType: b.contentType,
                fechaBoleta: billInfo?.fechaBoleta ?? null,
                numeroBoleta: billInfo?.numeroBoleta ?? null,
                distribuidora: billInfo?.distribuidora ?? null,
              })),
            }}
          />

          <QuoteFromSimulation
            clientId={clientId}
            installationId={installationId}
            clientData={datosCliente}
            escenario={isResidential ? effectiveScenario : 'empresa'}
            escenarioLabel={
              activeResult.batteryCapacityKWh > 0
                ? `PFV ${activeResult.kit.sizekWp} kW con ${activeResult.batteryCapacityKWh} kWh de batería`
                : `PFV ${activeResult.kit.sizekWp} kW sin batería`
            }
            kitSizeKWp={activeResult.kit.sizekWp}
            kitPanelCount={activeResult.kit.panelCount}
            kitPriceNetoCLP={activeResult.kit.priceReferenceCLP}
            batteryKWh={activeResult.batteryCapacityKWh || undefined}
            batteryModules={activeResult.batteryCapacityKWh > 0 ? batteryCount : undefined}
            batteryCostNetoCLP={Math.max(0, activeResult.financial.systemCostCLP - activeResult.kit.priceReferenceCLP)}
            simulationData={{
              escenario: isResidential ? effectiveScenario : 'empresa',
              kitSizeKWp: activeResult.kit.sizekWp,
              panelCount: activeResult.kit.panelCount,
              systemCostCLP: activeResult.financial.systemCostCLP,
              batteryCapacityKWh: activeResult.batteryCapacityKWh,
              annualBenefitCLP: activeResult.financial.annualBenefitCLP,
              paybackYears: activeResult.financial.paybackYears,
              coveragePercent: activeResult.energyBalance.coveragePercent,
              regionName: activeResult.region.name,
              averageMonthlyKWh: profile.averageMonthlyKWh,
            }}
          />
        </>
      )}

      {/* ── Aviso sobredimensionamiento (Regla 2) ──────────────────────────── */}
      {isOversized(activeResult) && effectiveScenario !== 'B' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
          <span className="text-xl shrink-0">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-amber-800">Sistema sobredimensionado</p>
            <p className="text-xs text-amber-700 mt-1 leading-relaxed">
              Este sistema generará ~<strong>{Math.round(activeResult.energyBalance.totalProductionKWh / activeResult.energyBalance.totalConsumptionKWh * 100)}%</strong> de tu consumo anual.
              El excedente se inyecta a la red al 50% del valor de compra, lo que alarga el retorno de inversión.
              {isResidential && activeScenarios?.kitB
                ? ` Considera el kit B de ${activeScenarios.kitB.sizekWp} kW, que cubre mejor tu consumo real con mejor retorno.`
                : ' Si no planeas agregar equipos eléctricos próximamente, considera un sistema de menor tamaño.'}
            </p>
          </div>
        </div>
      )}

      {/* ── Aviso capacidad de empalme ─────────────────────────────────────── */}
      {empalmeLoad && (
        <div className={`rounded-xl border p-4 flex gap-3 ${
          empalmeLoad.level === 'critical'
            ? 'bg-red-50 border-red-200'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <span className="text-xl shrink-0">
            {empalmeLoad.level === 'critical' ? '🔴' : '⚡'}
          </span>
          <div className="flex flex-col gap-1.5">
            <p className={`text-sm font-semibold ${
              empalmeLoad.level === 'critical' ? 'text-red-800' : 'text-amber-800'
            }`}>
              {empalmeLoad.level === 'critical'
                ? 'Empalme insuficiente para las cargas proyectadas'
                : 'Capacidad del empalme: atención'}
            </p>
            <p className={`text-xs leading-relaxed ${
              empalmeLoad.level === 'critical' ? 'text-red-700' : 'text-amber-700'
            }`}>
              {empalmeLoad.level === 'critical' ? (
                <>
                  Los equipos proyectados suman un pico estimado de{' '}
                  <strong>~{empalmeLoad.totalPeakAmps} A</strong>, superando la capacidad
                  de tu empalme de {supply.amperajeA} A. La PFV se instala en el empalme
                  actual sin cambios. Para las nuevas cargas, se recomiendan{' '}
                  <strong>{empalmeLoad.additionalEmpalmes} empalme{empalmeLoad.additionalEmpalmes > 1 ? 's' : ''} adicional{empalmeLoad.additionalEmpalmes > 1 ? 'es' : ''} de {supply.amperajeA} A</strong>.{' '}
                  Podemos gestionar con la distribuidora la factibilidad y la instalación
                  de esos empalmes junto con tu proyecto solar.
                </>
              ) : (
                <>
                  Los equipos proyectados suman un pico estimado de{' '}
                  <strong>~{empalmeLoad.totalPeakAmps} A</strong> ({Math.round(empalmeLoad.totalPeakAmps / supply.amperajeA! * 100)}% de tu empalme de {supply.amperajeA} A).
                  En momentos de uso simultáneo podrías acercarte al límite. Podemos
                  gestionar con la distribuidora la contratación de un empalme adicional
                  de {supply.amperajeA} A para distribuir estas cargas.
                </>
              )}
            </p>
            {(empalmeLoad.breakdownAmps.ac > 0 || empalmeLoad.breakdownAmps.waterHeater > 0 || empalmeLoad.breakdownAmps.ev > 0) && (
              <div className={`flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] mt-1 ${
                empalmeLoad.level === 'critical' ? 'text-red-600' : 'text-amber-600'
              }`}>
                {empalmeLoad.breakdownAmps.ac > 0 && (
                  <span>AA: {empalmeLoad.breakdownAmps.ac} A</span>
                )}
                {empalmeLoad.breakdownAmps.waterHeater > 0 && (
                  <span>Termo: {empalmeLoad.breakdownAmps.waterHeater} A</span>
                )}
                {empalmeLoad.breakdownAmps.ev > 0 && (
                  <span>EV: {empalmeLoad.breakdownAmps.ev} A</span>
                )}
              </div>
            )}
            <p className={`text-[10px] font-medium mt-0.5 ${
              empalmeLoad.level === 'critical' ? 'text-red-600' : 'text-amber-600'
            }`}>
              Coordínalo con nuestro equipo técnico en la visita.
            </p>
          </div>
        </div>
      )}

      {/* ── Avisos regulatorios (empresas) ─────────────────────────────────── */}
      {!isResidential && activeResult.kit.exceedsNetBillingLimit && (
        <InfoBanner
          color="amber"
          icon="⚡"
          title="Sistema supera el límite de net billing (300 kW)"
          body={`Tu consumo requiere un sistema de ~${Math.round(activeResult.kit.sizekWp / DFL4.netBillingMaxKWp * activeResult.kit.sizekWp)} kWp para cobertura óptima, pero el Art. 149 bis del DFL 4 limita el net billing a 300 kW por inmueble. La simulación usa 300 kWp. Para instalaciones mayores se requiere otro marco regulatorio (PMGD/PMG). Consulta con nuestro equipo.`}
        />
      )}
      {!isResidential && (
        <InfoBanner
          color="purple"
          icon="📋"
          title="Tratamiento tributario para empresas"
          body="El ahorro por autoconsumo reduce tus costos operacionales y es libre de IVA (Art. 149 quinquies DFL 4). Sin embargo, si tributas en Primera Categoría con contabilidad completa, los pagos que recibas por excedentes inyectados a la red sí constituyen renta gravable. Consulta con tu contador."
        />
      )}

      {/* ── Panel de análisis y recomendaciones ────────────────────────────── */}
      <AnalysisPanel analysis={tariffAnalysis} tarifa={supply.tarifa} />

      {/* ── Desglose financiero + balance ───────────────────────────────────── */}
      <FinancialDetail result={activeResult} />

      {/* ── Auto eléctrico ──────────────────────────────────────────────────── */}
      {evCharger && (
        <div className="bg-white rounded-2xl ring-1 ring-[#b0cedd]/30 shadow-[0_1px_3px_rgba(16,40,80,0.04)] p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Auto eléctrico — recomendación de carga
          </h2>
          <div className="flex items-center gap-3 mb-3">
            <span className="w-11 h-11 rounded-xl bg-[#389fe0]/10 text-[#1d65c5] flex items-center justify-center shrink-0">
              <IconCar className="w-6 h-6" />
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-800">
                {EVChargingLabel[evCharger.recommendedChargingTime]}
              </p>
              <p className="text-xs text-gray-400">
                {evCharger.carCount} auto{evCharger.carCount > 1 ? 's' : ''} ·{' '}
                +{evCharger.estimatedMonthlyKWh} kWh/mes estimados
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-yellow-50 rounded-xl p-3">
              <p className="text-yellow-700 font-medium">Carga solar (día)</p>
              <p className="text-lg font-bold text-yellow-800">
                {evCharger.dayChargingKWh.toLocaleString('es-CL')} kWh/año
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-gray-600 font-medium">Carga red (noche)</p>
              <p className="text-lg font-bold text-gray-800">
                {evCharger.nightChargingKWh.toLocaleString('es-CL')} kWh/año
              </p>
            </div>
          </div>
          {evCharger.dayChargingSavingsCLP > 0 && (
            <p className="text-xs text-[#1d65c5] mt-3 bg-[#dde3e9]/50 rounded-xl px-3 py-2">
              Ahorro adicional por carga solar:{' '}
              <span className="font-semibold">{formatCLP(evCharger.dayChargingSavingsCLP)}/año</span>
            </p>
          )}
        </div>
      )}

      {/* ── Impacto ambiental ────────────────────────────────────────────────── */}
      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-emerald-800 mb-3">Impacto ambiental estimado</h2>
        <div className="flex gap-8">
          <div>
            <p className="text-2xl font-bold text-emerald-700">
              {activeResult.environmental.annualCO2AvoidedKg.toLocaleString('es-CL')} kg
            </p>
            <p className="text-xs text-emerald-600">CO₂ evitado al año</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-700">
              {activeResult.environmental.equivalentTrees}
            </p>
            <p className="text-xs text-emerald-600">árboles equivalentes</p>
          </div>
        </div>
      </div>

      {/* ── Nota metodológica ────────────────────────────────────────────────── */}
      <p className="text-xs text-gray-400 leading-relaxed">
        Simulación estimativa basada en irradiación histórica de {activeResult.region.name}.
        Precio de inyección = {SOLAR_DEFAULTS.injectionValueFactor * 100}% del kWh de compra (net billing, Art. 149 bis DFL 4).
        Perfil {isResidential ? 'residencial' : 'empresa'}: {Math.round(perfilDiurno * 100)}% diurno / {Math.round((1 - perfilDiurno) * 100)}% nocturno.
        VAN calculado con tasa {DFL4.discountRateReal * 100}% real anual (Arts. 165d y 182 bis DFL 4).
        Los valores reales dependen de la instalación específica.
      </p>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <CTABlock
        result={activeResult}
        contactEmail={contactEmail}
        ctaState={ctaState}
        onCTA={handleCTA}
      />

      {/* ── Mostrar informe ─────────────────────────────────────────────────── */}
      {isResidential && activeScenarios && (
        <PDFDownloadButton
          state={state}
          scenarios={activeScenarios}
          recommendedScenario={effectiveRecommended}
          clientName={contactName}
          clientEmail={contactEmail}
        />
      )}
      {!isResidential && businessResult && (
        <PDFDownloadButton
          state={state}
          businessResult={businessResult}
          clientName={contactName}
          clientEmail={contactEmail}
        />
      )}
    </div>
  );
}
