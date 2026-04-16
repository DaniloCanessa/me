'use client';

import { useMemo, useState } from 'react';
import type {
  WizardState,
  SimulatorInput,
  SimulatorResult,
  PersonContact,
  BusinessContact,
  TarifaType,
} from '@/lib/types';
import { runSimulation } from '@/lib/calculations';
import { calcEVCharger } from '@/lib/consumption';
import { CHILE_BT1, SOLAR_DEFAULTS } from '@/lib/constants';
import { formatCLP, formatKWh, formatPayback, formatPercent } from '@/lib/format';

// ─── Props ────────────────────────────────────────────────────────────────────

interface StepResultsProps {
  state: WizardState;
}

// ─── Construcción del SimulatorInput ──────────────────────────────────────────

function buildBaseInput(state: WizardState, extraMonthlyKWh = 0): SimulatorInput {
  const contact = state.contact!;
  const supply  = state.supply!;
  const profile = state.consumptionProfile!;

  const regionId     = (contact as PersonContact | BusinessContact).regionId || 'metropolitana';
  const billsWithPrice = profile.bills.filter((b) => b.kWhPriceCLP != null);
  const kWhPriceCLP  =
    billsWithPrice.length > 0
      ? Math.round(billsWithPrice.reduce((s, b) => s + b.kWhPriceCLP!, 0) / billsWithPrice.length)
      : CHILE_BT1.referenceKWhPriceCLP;

  return {
    regionId,
    distribuidora:         supply.distribuidora,
    tarifa:                supply.tarifa === 'unknown' ? 'BT1' : supply.tarifa,
    monthlyConsumptionKWh: profile.averageMonthlyKWh + extraMonthlyKWh,
    energyPrice: {
      source:                billsWithPrice.length > 0 ? 'bill_calculated' : 'reference',
      kWhPriceCLP,
      referenceKWhPriceCLP:  CHILE_BT1.referenceKWhPriceCLP,
    },
    fixedChargeCLP:   CHILE_BT1.fixedChargeCLP,
    customerType:     state.customerCategory === 'natural' ? 'residential' : 'business',
    hasExistingSolar: supply.hasExistingSolar,
    existingSystemKWp: supply.existingSystemKWp,
    includeBattery:   supply.includeBattery,
  };
}

// ─── Recomendación de tarifa ──────────────────────────────────────────────────

interface TarifaRec {
  type: 'unknown' | 'empalme' | 'battery-peak';
  title: string;
  body: string;
  color: 'amber' | 'blue' | 'purple';
}

function getTarifaRec(
  tarifa: TarifaType,
  futureAdditionalKWh: number,
  baseMonthlyKWh: number,
): TarifaRec | null {
  if (tarifa === 'unknown') {
    return {
      type: 'unknown',
      title: 'Confirma tu tarifa',
      body: 'No tenemos tu tarifa exacta. Revisa tu boleta y actualízala — con ese dato podemos afinar las recomendaciones de cambio de plan o empalme.',
      color: 'amber',
    };
  }
  if (tarifa === 'BT1' && futureAdditionalKWh > baseMonthlyKWh * 0.25) {
    return {
      type: 'empalme',
      title: 'Considera un segundo empalme BT1',
      body: 'Con el consumo proyectado, instalar un segundo empalme BT1 puede ser más conveniente que migrar a BT2 o BT3, ya que evitas el cargo por potencia demandada.',
      color: 'blue',
    };
  }
  if (tarifa.startsWith('BT4') || tarifa.startsWith('AT')) {
    return {
      type: 'battery-peak',
      title: 'Batería para gestión de punta',
      body: `Con tarifa ${tarifa} pagas un cargo por demanda en horas de punta. Una batería puede cargarse fuera de punta y descargarse en horas caras, reduciendo tu cargo por potencia.`,
      color: 'purple',
    };
  }
  return null;
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

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
  color: 'amber' | 'blue' | 'purple'; icon: string; title: string; body: string;
}) {
  const s = {
    amber:  { wrap: 'bg-amber-50 border-amber-200',   title: 'text-amber-800',  body: 'text-amber-700'  },
    blue:   { wrap: 'bg-blue-50 border-blue-200',     title: 'text-blue-800',   body: 'text-blue-700'   },
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

function KitCard({ kit, badge, borderClass }: {
  kit: SimulatorResult['kitRecommendation']['primary'];
  badge: React.ReactNode;
  borderClass: string;
}) {
  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-4 ${borderClass}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          {badge}
          <p className="font-semibold text-gray-900 mt-1.5">Kit {kit.sizekWp} kWp</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {kit.panelCount} paneles · {kit.estimatedAreaM2} m²
          </p>
          {kit.installationNotes && (
            <p className="text-xs text-gray-400 mt-1">{kit.installationNotes}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-bold text-gray-900">{formatCLP(kit.priceReferenceCLP)}</p>
          <p className="text-xs text-gray-400">precio referencial</p>
        </div>
      </div>
    </div>
  );
}

// ─── Bloque de escenario (KPIs + kits + balance) ──────────────────────────────

function ScenarioBlock({ result }: { result: SimulatorResult }) {
  const { kitRecommendation, energyBalance, financial } = result;
  const { primary, primaryWithBattery, alternative, alternativeCoveragePercent } = kitRecommendation;

  return (
    <div className="flex flex-col gap-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Ahorro mensual"
          value={formatCLP(financial.monthlyBenefitCLP)}
          sub="autoconsumo + inyección"
          accent="text-green-600"
        />
        <StatCard
          label="Ahorro anual"
          value={formatCLP(financial.annualBenefitCLP)}
          accent="text-green-600"
        />
        <StatCard
          label="Período de retorno"
          value={formatPayback(financial.paybackYears)}
          sub="payback simple"
        />
        <StatCard
          label="Cobertura solar"
          value={formatPercent(energyBalance.coveragePercent)}
          sub="de tu consumo cubierto"
        />
      </div>

      {/* Kits */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-gray-700">Sistema recomendado</h2>

        <KitCard
          kit={primary}
          borderClass="border-2 border-green-500"
          badge={
            <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
              Recomendado
            </span>
          }
        />

        {primaryWithBattery && (
          <KitCard
            kit={primaryWithBattery}
            borderClass="border border-amber-300"
            badge={
              <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                Con batería {primaryWithBattery.batteryCapacityKWh} kWh
              </span>
            }
          />
        )}

        {alternative && (
          <KitCard
            kit={alternative}
            borderClass="border border-gray-200"
            badge={
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                Alternativa · {alternativeCoveragePercent}% cobertura
              </span>
            }
          />
        )}
      </div>

      {/* Financiero */}
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

      {/* Balance mensual */}
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
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function StepResults({ state }: StepResultsProps) {
  const contact = state.contact!;
  const supply  = state.supply!;
  const profile = state.consumptionProfile!;
  const future  = state.futureConsumption;

  const hasAdditions = (future?.totalAdditionalMonthlyKWh ?? 0) > 0;
  const [activeTab, setActiveTab] = useState<'base' | 'future'>('base');

  const contactName = 'name' in contact
    ? (contact as PersonContact).name
    : (contact as BusinessContact).companyName;

  // ── Simulaciones ────────────────────────────────────────────────────────────
  const { baseResult, futureResult, evCharger } = useMemo(() => {
    const baseInput   = buildBaseInput(state, 0);
    const base        = runSimulation(baseInput);

    const futureInput = hasAdditions
      ? buildBaseInput(state, future!.totalAdditionalMonthlyKWh)
      : null;
    const fut = futureInput ? runSimulation(futureInput) : null;

    // EVCharger con balance real del escenario activo
    const evRaw = future?.evCharger;
    const realEV = evRaw
      ? calcEVCharger(
          evRaw.carCount,
          profile.averageMonthlyKWh,
          (fut ?? base).energyBalance,
          baseInput.energyPrice.kWhPriceCLP,
          baseInput.energyPrice.kWhPriceCLP * SOLAR_DEFAULTS.injectionValueFactor,
        )
      : null;

    return { baseResult: base, futureResult: fut, evCharger: realEV };
  }, [state, hasAdditions, future, profile.averageMonthlyKWh]);

  const activeResult = activeTab === 'future' && futureResult ? futureResult : baseResult;

  const tarifaRec = getTarifaRec(
    supply.tarifa,
    future?.totalAdditionalMonthlyKWh ?? 0,
    profile.averageMonthlyKWh,
  );

  const EVChargingLabel: Record<string, string> = {
    day:   'Carga diurna — usa tus excedentes solares',
    night: 'Carga nocturna — desde la red en horario bajo',
    mixed: 'Carga mixta — parte solar, parte red',
  };

  // Label del tab de equipos nuevos
  const futureTabLabel = (() => {
    const parts: string[] = [];
    if ((future?.airConditioners?.length ?? 0) > 0) parts.push('AA');
    if (future?.waterHeater) parts.push('Termo');
    if (future?.evCharger)   parts.push('Auto EV');
    return parts.length > 0 ? `Con ${parts.join(', ')}` : 'Con equipos nuevos';
  })();

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      className="flex flex-col gap-5 select-none"
      onCopy={(e) => e.preventDefault()}
    >
      {/* ── Encabezado ─────────────────────────────────────────────────────── */}
      <div className="bg-green-600 text-white rounded-2xl p-5">
        <p className="text-sm opacity-75 mb-0.5">{contactName}</p>
        <h1 className="text-xl font-bold">Simulación solar personalizada</h1>
        <p className="text-sm opacity-80 mt-1">
          {baseResult.region.name} · {supply.distribuidora} ·{' '}
          Tarifa {supply.tarifa === 'unknown' ? 'BT1 (referencia)' : supply.tarifa}
        </p>
        <p className="text-xs opacity-60 mt-1">
          Consumo base: {formatKWh(profile.averageMonthlyKWh)}/mes ·{' '}
          ${baseResult.input.energyPrice.kWhPriceCLP}/kWh
          {baseResult.input.energyPrice.source === 'reference' && ' (precio referencial)'}
        </p>
      </div>

      {/* ── Tabs de escenario (solo si hay equipos adicionales) ─────────────── */}
      {hasAdditions && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 flex gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('base')}
            className={[
              'flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors',
              activeTab === 'base'
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            Consumo actual
            <span className="block text-xs font-normal opacity-70">
              {profile.averageMonthlyKWh} kWh/mes
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('future')}
            className={[
              'flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors',
              activeTab === 'future'
                ? 'bg-green-600 text-white'
                : 'text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            {futureTabLabel}
            <span className="block text-xs font-normal opacity-70">
              {profile.averageMonthlyKWh + (future?.totalAdditionalMonthlyKWh ?? 0)} kWh/mes
            </span>
          </button>
        </div>
      )}

      {/* ── Detalle de equipos adicionales (solo tab futuro) ────────────────── */}
      {hasAdditions && activeTab === 'future' && future && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Equipos adicionales incluidos</h2>
          <div className="flex flex-col gap-2 text-sm">
            {future.airConditioners.map((ac) => (
              <div key={ac.btu} className="flex justify-between">
                <span className="text-gray-500">❄️ AA {ac.btu.toLocaleString('es-CL')} BTU × {ac.count}</span>
                <span className="font-medium text-gray-700">+{ac.estimatedMonthlyKWh} kWh/mes</span>
              </div>
            ))}
            {future.waterHeater && (
              <div className="flex justify-between">
                <span className="text-gray-500">🚿 Termo {future.waterHeater.recommendedCapacityLiters} L</span>
                <span className="font-medium text-gray-700">+{future.waterHeater.estimatedMonthlyKWh} kWh/mes</span>
              </div>
            )}
            {future.evCharger && (
              <div className="flex justify-between">
                <span className="text-gray-500">🚗 Auto eléctrico × {future.evCharger.carCount}</span>
                <span className="font-medium text-gray-700">+{future.evCharger.estimatedMonthlyKWh} kWh/mes</span>
              </div>
            )}
            <div className="border-t border-gray-100 pt-2 flex justify-between font-semibold">
              <span className="text-gray-700">Total adicional</span>
              <span className="text-gray-900">+{future.totalAdditionalMonthlyKWh} kWh/mes</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Escenario activo ────────────────────────────────────────────────── */}
      <ScenarioBlock result={activeResult} />

      {/* ── Recomendación de tarifa ────────────────────────────────────────── */}
      {tarifaRec && (
        <InfoBanner
          color={tarifaRec.color}
          icon={tarifaRec.type === 'unknown' ? '❓' : tarifaRec.type === 'empalme' ? '⚡' : '🔋'}
          title={tarifaRec.title}
          body={tarifaRec.body}
        />
      )}

      {/* ── Auto eléctrico ─────────────────────────────────────────────────── */}
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
              <span className="font-semibold">{formatCLP(evCharger.dayChargingSavingsCLP)}/año</span>{' '}
              vs. comprar esa energía a la red.
            </p>
          )}
        </div>
      )}

      {/* ── Impacto ambiental ──────────────────────────────────────────────── */}
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

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <div className="bg-gray-900 text-white rounded-2xl p-5 text-center">
        <p className="text-lg font-bold mb-1">¿Te interesa avanzar?</p>
        <p className="text-sm text-gray-400 mb-4">
          Un especialista revisará tu caso y coordinará una visita técnica sin costo.
        </p>
        <button
          type="button"
          className="w-full rounded-xl bg-green-500 hover:bg-green-400 text-white font-semibold py-3 text-sm transition-colors"
        >
          Quiero que me contacten
        </button>
      </div>

      {/* ── Nota metodológica ─────────────────────────────────────────────── */}
      <p className="text-xs text-gray-400 leading-relaxed pb-4">
        Simulación estimativa basada en irradiación histórica de {baseResult.region.name}.
        Precio de inyección = {SOLAR_DEFAULTS.injectionValueFactor * 100}% del kWh de compra (net billing).
        Perfil: {SOLAR_DEFAULTS.dayConsumptionRatio * 100}% diurno / {SOLAR_DEFAULTS.nightConsumptionRatio * 100}% nocturno.
        Los valores reales dependen de la instalación específica.
      </p>
    </div>
  );
}
