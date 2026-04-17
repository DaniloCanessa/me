'use client';

import { useMemo, useState, useCallback } from 'react';
import type {
  WizardState,
  SimulatorInput,
  SimulatorResult,
  PersonContact,
  BusinessContact,
  TarifaType,
} from '@/lib/types';
import { calcThreeScenarios, runBusinessSimulation } from '@/lib/calculations';
import { calcEVCharger } from '@/lib/consumption';
import { CHILE_BT1, SOLAR_DEFAULTS } from '@/lib/constants';
import { formatCLP, formatKWh, formatPayback, formatPercent } from '@/lib/format';

// ─── Props ────────────────────────────────────────────────────────────────────

interface StepResultsProps {
  state: WizardState;
}

// ─── Construcción del SimulatorInput ──────────────────────────────────────────

function buildBaseInput(state: WizardState): SimulatorInput {
  const contact = state.contact!;
  const supply  = state.supply!;
  const profile = state.consumptionProfile!;
  const future  = state.futureConsumption;

  const regionId = (contact as PersonContact | BusinessContact).regionId || 'metropolitana';

  const billsWithPrice = profile.bills.filter((b) => b.kWhPriceCLP != null);
  const kWhPriceCLP =
    billsWithPrice.length > 0
      ? Math.round(billsWithPrice.reduce((s, b) => s + b.kWhPriceCLP!, 0) / billsWithPrice.length)
      : CHILE_BT1.referenceKWhPriceCLP;

  const empalmeMaxKW = supply.amperajeA != null
    ? Math.round((supply.amperajeA * 220 / 1000) * 10) / 10
    : undefined;

  const monthlyConsumptionKWh =
    profile.averageMonthlyKWh + (future?.totalAdditionalMonthlyKWh ?? 0);

  return {
    regionId,
    distribuidora:        supply.distribuidora,
    tarifa:               supply.tarifa === 'unknown' ? 'BT1' : supply.tarifa,
    monthlyConsumptionKWh,
    energyPrice: {
      source:               billsWithPrice.length > 0 ? 'bill_calculated' : 'reference',
      kWhPriceCLP,
      referenceKWhPriceCLP: CHILE_BT1.referenceKWhPriceCLP,
    },
    fixedChargeCLP:   CHILE_BT1.fixedChargeCLP,
    customerType:     state.customerCategory === 'natural' ? 'residential' : 'business',
    hasExistingSolar: supply.hasExistingSolar,
    existingSystemKWp: supply.existingSystemKWp,
    empalmeMaxKW,
  };
}

// ─── Recomendación de tarifa ──────────────────────────────────────────────────

interface TarifaRec {
  type: 'unknown' | 'battery-peak';
  title: string;
  body: string;
  color: 'amber' | 'purple';
}

function getTarifaRec(tarifa: TarifaType): TarifaRec | null {
  if (tarifa === 'unknown') {
    return {
      type: 'unknown',
      title: 'Confirma tu tarifa',
      body: 'No tenemos tu tarifa exacta. Revisa tu boleta y actualízala para afinar las recomendaciones.',
      color: 'amber',
    };
  }
  if (tarifa.startsWith('BT4') || tarifa.startsWith('AT')) {
    return {
      type: 'battery-peak',
      title: 'Batería para gestión de punta',
      body: `Con tarifa ${tarifa} pagas cargo por demanda en horas de punta. El Escenario C (con batería) puede reducir ese cargo descargándose en horas caras.`,
      color: 'purple',
    };
  }
  return null;
}

// ─── Sub-componentes reutilizables ────────────────────────────────────────────

function StatCard({ label, value, sub, accent }: {
  label: string; value: string; sub?: string; accent?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent ?? 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
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
      <div className="bg-gray-900 text-white rounded-2xl p-6 text-center">
        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
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
    <div className="bg-gray-900 text-white rounded-2xl p-5">
      <p className="text-base font-bold mb-1">Instala tu sistema solar</p>
      <p className="text-sm text-gray-400 mb-4">
        Visita técnica gratuita y presupuesto definitivo sin costo ni compromiso.
      </p>
      <div className="bg-gray-800 rounded-xl p-3 mb-4 flex flex-col gap-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Inversión estimada</span>
          <span className="font-semibold">{formatCLP(result.financial.systemCostCLP)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Ahorro en {SOLAR_DEFAULTS.systemLifeYears} años</span>
          <span className="font-semibold text-green-400">{formatCLP(totalSaving)}</span>
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
        className="w-full rounded-xl bg-green-500 hover:bg-green-400 active:bg-green-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3.5 text-sm transition-colors"
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

// ─── Bloque financiero (detalle) ──────────────────────────────────────────────

function FinancialDetail({ result }: { result: SimulatorResult }) {
  const { energyBalance, financial } = result;
  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Desglose financiero anual</h2>
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Ahorro por autoconsumo</span>
            <span className="font-medium text-green-700">
              {formatCLP(energyBalance.totalSelfConsumptionSavingsCLP)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">
              Ingreso por inyección ({financial.injectionValuePerKWhCLP} CLP/kWh)
            </span>
            <span className="font-medium text-green-700">
              {formatCLP(energyBalance.totalInjectionIncomeCLP)}
            </span>
          </div>
          <div className="border-t border-gray-100 pt-2 flex justify-between font-semibold">
            <span className="text-gray-700">Beneficio total anual</span>
            <span className="text-green-600">{formatCLP(financial.annualBenefitCLP)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>ROI a {SOLAR_DEFAULTS.systemLifeYears} años</span>
            <span>{financial.roi25YearsPercent}%</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 overflow-x-auto">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Balance energético mensual</h2>
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
                <td className="py-1.5 text-right text-green-600">{m.selfConsumptionKWh}</td>
                <td className="py-1.5 text-right text-blue-600">{m.injectedToGridKWh}</td>
                <td className="py-1.5 text-right text-gray-500">{m.consumedFromGridKWh}</td>
                <td className="py-1.5 text-right font-medium text-green-700">
                  {formatCLP(m.totalMonthlyBenefitCLP)}
                </td>
              </tr>
            ))}
            <tr className="font-semibold text-gray-700 bg-gray-50">
              <td className="py-2">Total anual</td>
              <td className="py-2 text-right">{energyBalance.totalProductionKWh}</td>
              <td className="py-2 text-right text-green-600">{energyBalance.totalSelfConsumptionKWh}</td>
              <td className="py-2 text-right text-blue-600">{energyBalance.totalInjectedKWh}</td>
              <td className="py-2 text-right">{energyBalance.totalConsumedFromGridKWh}</td>
              <td className="py-2 text-right text-green-600">{formatCLP(financial.annualBenefitCLP)}</td>
            </tr>
          </tbody>
        </table>
        <p className="text-xs text-gray-400 mt-2">Valores en kWh</p>
        <MonthlyLineChart monthly={energyBalance.monthly} />
      </div>
    </>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function StepResults({ state }: StepResultsProps) {
  const contact = state.contact!;
  const supply  = state.supply!;
  const profile = state.consumptionProfile!;
  const future  = state.futureConsumption;
  const isResidential = state.customerCategory === 'natural';

  const [activeScenario, setActiveScenario]   = useState<'A' | 'B' | 'C'>('A');
  const [batteryCount, setBatteryCount]       = useState(1);
  const [ctaState, setCtaState]               = useState<CtaState>('idle');
  const [consumptionMode, setConsumptionMode] = useState<'base' | 'future'>('future');

  const contactName = 'name' in contact
    ? (contact as PersonContact).name
    : (contact as BusinessContact).companyName;
  const contactEmail = (contact as PersonContact).email ?? (contact as BusinessContact).email;

  // ── Simulaciones ────────────────────────────────────────────────────────────
  const { baseInput, scenarios, futureScenarios, businessResult } = useMemo(() => {
    const inp = buildBaseInput(state); // includes future consumption

    if (!isResidential) {
      return { baseInput: inp, scenarios: null, futureScenarios: null, businessResult: runBusinessSimulation(inp) };
    }

    const addKWh = state.futureConsumption?.totalAdditionalMonthlyKWh ?? 0;
    const hasAdd = addKWh > 0;
    const inpBase = hasAdd
      ? { ...inp, monthlyConsumptionKWh: state.consumptionProfile!.averageMonthlyKWh }
      : inp;

    return {
      baseInput: inp,
      scenarios: calcThreeScenarios(inpBase, batteryCount),
      futureScenarios: hasAdd ? calcThreeScenarios(inp, batteryCount) : null,
      businessResult: null,
    };
  }, [state, isResidential, batteryCount]);

  const hasAdditions = (future?.totalAdditionalMonthlyKWh ?? 0) > 0;

  const activeScenarios = (hasAdditions && consumptionMode === 'future' && futureScenarios)
    ? futureScenarios
    : scenarios;

  const activeResult: SimulatorResult = isResidential
    ? (activeScenarios![activeScenario] ?? activeScenarios!.A)
    : businessResult!;

  const tarifaRec = getTarifaRec(supply.tarifa);

  // EV analysis uses Scenario A balance (or business result)
  const evCharger = useMemo(() => {
    const evRaw = future?.evCharger;
    if (!evRaw) return null;
    const balanceForEV = isResidential ? scenarios!.A.energyBalance : businessResult!.energyBalance;
    return calcEVCharger(
      evRaw.carCount,
      profile.averageMonthlyKWh,
      balanceForEV,
      baseInput.energyPrice.kWhPriceCLP,
      baseInput.energyPrice.kWhPriceCLP * SOLAR_DEFAULTS.injectionValueFactor,
    );
  }, [future, isResidential, scenarios, businessResult, profile.averageMonthlyKWh, baseInput]);

  const EVChargingLabel: Record<string, string> = {
    day:   'Carga diurna — usa tus excedentes solares',
    night: 'Carga nocturna — desde la red en horario bajo',
    mixed: 'Carga mixta — parte solar, parte red',
  };

  const handleCTA = useCallback(async () => {
    if (ctaState !== 'idle') return;
    setCtaState('loading');

    const c = contact as PersonContact & BusinessContact;
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

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      className="flex flex-col gap-5 select-none"
      onCopy={(e) => e.preventDefault()}
    >
      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-green-600 to-green-700 text-white rounded-2xl p-5">
        <p className="text-sm opacity-70 mb-1">{contactName}</p>
        <p className="text-3xl font-bold leading-tight">
          {formatCLP(activeResult.financial.monthlyBenefitCLP)}
          <span className="text-lg font-normal opacity-75">/mes</span>
        </p>
        <p className="text-sm opacity-90 font-medium mt-0.5 mb-4">de ahorro estimado en energía</p>
        <div className="grid grid-cols-3 gap-3 text-sm border-t border-white/20 pt-4">
          <div>
            <p className="text-xs opacity-60">Retorno</p>
            <p className="font-semibold">{formatPayback(activeResult.financial.paybackYears)}</p>
          </div>
          <div>
            <p className="text-xs opacity-60">Cobertura</p>
            <p className="font-semibold">{formatPercent(activeResult.energyBalance.coveragePercent)}</p>
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

      {/* ── Toggle consumo base / futuro ───────────────────────────────────── */}
      {hasAdditions && futureScenarios && (
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          <button
            type="button"
            onClick={() => setConsumptionMode('base')}
            className={[
              'flex-1 rounded-lg py-2.5 text-xs font-medium transition-colors',
              consumptionMode === 'base' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            Consumo actual
            <span className="block text-[10px] font-normal opacity-60 mt-0.5">
              {profile.averageMonthlyKWh} kWh/mes
            </span>
          </button>
          <button
            type="button"
            onClick={() => setConsumptionMode('future')}
            className={[
              'flex-1 rounded-lg py-2.5 text-xs font-medium transition-colors',
              consumptionMode === 'future' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            Con equipos nuevos
            <span className="block text-[10px] font-normal opacity-60 mt-0.5">
              {profile.averageMonthlyKWh + (future?.totalAdditionalMonthlyKWh ?? 0)} kWh/mes
            </span>
          </button>
        </div>
      )}

      {/* ── Tabs de escenario (solo residencial) ───────────────────────────── */}
      {isResidential && activeScenarios && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 flex gap-1.5">
          {(['A', 'B', 'C'] as const)
            .filter((s) => s !== 'B' || activeScenarios.kitB !== null)
            .map((s) => {
              const labels = {
                A: { title: `Kit ${activeScenarios.kitA.sizekWp} kWp`, sub: 'sin batería' },
                B: { title: `Kit ${activeScenarios.kitB?.sizekWp} kWp`, sub: 'sin batería' },
                C: { title: `Kit ${activeScenarios.kitA.sizekWp} kWp`, sub: 'con baterías' },
              }[s];
              const isActive = activeScenario === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setActiveScenario(s)}
                  className={[
                    'flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? s === 'C' ? 'bg-amber-500 text-white' : 'bg-gray-900 text-white'
                      : 'text-gray-500 hover:text-gray-700',
                  ].join(' ')}
                >
                  {labels.title}
                  <span className="block text-xs font-normal opacity-70">{labels.sub}</span>
                </button>
              );
            })}
        </div>
      )}

      {/* ── Selector de baterías (Escenario C) ─────────────────────────────── */}
      {isResidential && activeScenario === 'C' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-amber-800 mb-3">Módulos de batería</p>
          <div className="flex gap-2 flex-wrap mb-3">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setBatteryCount(n)}
                className={[
                  'w-10 h-10 rounded-xl text-sm font-bold border-2 transition-all',
                  batteryCount === n
                    ? 'border-amber-500 bg-amber-500 text-white'
                    : 'border-amber-200 text-amber-700 hover:border-amber-400',
                ].join(' ')}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex gap-4 text-xs text-amber-700">
            <span>Capacidad total: <strong>{batteryCount * SOLAR_DEFAULTS.batteryModuleKWh} kWh</strong></span>
            <span>Reserva (30%): <strong>{(batteryCount * SOLAR_DEFAULTS.batteryModuleKWh * 0.3).toFixed(1)} kWh</strong></span>
            <span>Uso nocturno: <strong>{(batteryCount * SOLAR_DEFAULTS.batteryModuleKWh * 0.7).toFixed(1)} kWh</strong></span>
          </div>
        </div>
      )}

      {/* ── KPIs ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Ahorro mensual"
          value={formatCLP(activeResult.financial.monthlyBenefitCLP)}
          sub="autoconsumo + inyección"
          accent="text-green-600"
        />
        <StatCard
          label="Ahorro anual"
          value={formatCLP(activeResult.financial.annualBenefitCLP)}
          accent="text-green-600"
        />
        <StatCard
          label="Período de retorno"
          value={formatPayback(activeResult.financial.paybackYears)}
          sub="payback simple"
        />
        <StatCard
          label="Cobertura solar"
          value={formatPercent(activeResult.energyBalance.coveragePercent)}
          sub="de tu consumo cubierto"
        />
      </div>

      {/* ── Kit del escenario activo ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border-2 border-green-500 shadow-sm p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
              {activeScenario === 'C'
                ? `Con ${batteryCount} batería${batteryCount > 1 ? 's' : ''} · ${batteryCount * SOLAR_DEFAULTS.batteryModuleKWh} kWh`
                : activeScenario === 'B' ? 'Opción económica' : 'Recomendado'}
            </span>
            <p className="font-semibold text-gray-900 mt-1.5">Kit {activeResult.kit.sizekWp} kWp</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {activeResult.kit.panelCount} paneles · {activeResult.kit.estimatedAreaM2} m²
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
            <p className="text-xs text-gray-400">precio referencial</p>
          </div>
        </div>
      </div>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <CTABlock
        result={activeResult}
        contactEmail={contactEmail}
        ctaState={ctaState}
        onCTA={handleCTA}
      />

      {/* ── Desglose financiero + balance ───────────────────────────────────── */}
      <FinancialDetail result={activeResult} />

      {/* ── Banners ─────────────────────────────────────────────────────────── */}
      {tarifaRec && (
        <InfoBanner
          color={tarifaRec.color}
          icon={tarifaRec.type === 'unknown' ? '❓' : '🔋'}
          title={tarifaRec.title}
          body={tarifaRec.body}
        />
      )}

      {/* ── Auto eléctrico ──────────────────────────────────────────────────── */}
      {evCharger && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Auto eléctrico — recomendación de carga
          </h2>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">🚗</span>
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
            <p className="text-xs text-green-700 mt-3 bg-green-50 rounded-xl px-3 py-2">
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
      <p className="text-xs text-gray-400 leading-relaxed pb-4">
        Simulación estimativa basada en irradiación histórica de {activeResult.region.name}.
        Precio de inyección = {SOLAR_DEFAULTS.injectionValueFactor * 100}% del kWh de compra (net billing).
        Perfil: {SOLAR_DEFAULTS.dayConsumptionRatio * 100}% diurno / {SOLAR_DEFAULTS.nightConsumptionRatio * 100}% nocturno.
        Los valores reales dependen de la instalación específica.
      </p>
    </div>
  );
}
