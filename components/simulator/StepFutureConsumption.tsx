'use client';

import { useState, useMemo } from 'react';
import type { AcBtu, FutureConsumption } from '@/lib/types';
import {
  calcACConsumption,
  calcWaterHeater,
  calcFutureConsumption,
  AC_MONTHLY_KWH_PER_UNIT,
} from '@/lib/consumption';
import { SOLAR_DEFAULTS } from '@/lib/constants';

// ─── Props ────────────────────────────────────────────────────────────────────

interface StepFutureConsumptionProps {
  initialData: FutureConsumption | null;
  averageMonthlyKWh: number;
  onSubmit: (data: FutureConsumption) => void;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const AC_BTU_OPTIONS: { btu: AcBtu; label: string }[] = [
  { btu: 9000,  label: '9.000 BTU — habitación pequeña' },
  { btu: 12000, label: '12.000 BTU — habitación estándar' },
  { btu: 18000, label: '18.000 BTU — sala o espacio grande' },
];

const MAX_OCCUPANTS = 6;

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function Toggle({
  enabled,
  onChange,
  label,
  sublabel,
  icon,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
  label: string;
  sublabel: string;
  icon: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-sm font-medium text-gray-800">{label}</p>
          <p className="text-xs text-gray-400">{sublabel}</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={[
          'relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-green-400',
          enabled ? 'bg-green-500' : 'bg-gray-200',
        ].join(' ')}
      >
        <span
          className={[
            'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform',
            enabled ? 'translate-x-5' : 'translate-x-0',
          ].join(' ')}
        />
      </button>
    </div>
  );
}

function Stepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="w-8 h-8 rounded-lg border border-gray-200 text-gray-600 font-bold text-lg flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
      >
        −
      </button>
      <span className="w-8 text-center text-sm font-semibold text-gray-900 tabular-nums">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="w-8 h-8 rounded-lg border border-gray-200 text-gray-600 font-bold text-lg flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
      >
        +
      </button>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function StepFutureConsumption({
  initialData,
  averageMonthlyKWh,
  onSubmit,
}: StepFutureConsumptionProps) {

  // ── Estado AA ──────────────────────────────────────────────────────────────
  const [hasAC, setHasAC] = useState(() =>
    (initialData?.airConditioners?.length ?? 0) > 0,
  );
  const [acCounts, setAcCounts] = useState<Record<AcBtu, number>>(() => {
    const base: Record<AcBtu, number> = { 9000: 0, 12000: 0, 18000: 0 };
    initialData?.airConditioners?.forEach((g) => { base[g.btu] = g.count; });
    return base;
  });

  // ── Estado Termo ──────────────────────────────────────────────────────────
  const [hasTermo, setHasTermo] = useState(() => !!initialData?.waterHeater);
  const [occupants, setOccupants] = useState(() =>
    initialData?.waterHeater?.occupants ?? 2,
  );

  // ── Estado Auto eléctrico ─────────────────────────────────────────────────
  const [hasEV, setHasEV] = useState(() => !!initialData?.evCharger);
  const [carCount, setCarCount] = useState(() =>
    initialData?.evCharger?.carCount ?? 1,
  );

  // ── Estado Batería ────────────────────────────────────────────────────────
  const [batteryCount, setBatteryCount] = useState(() =>
    initialData?.batteryCount ?? 0,
  );

  // ── Cálculos en vivo ──────────────────────────────────────────────────────
  const { acGroups, waterHeater, evEstimatedKWh, total } = useMemo(() => {
    const groups = hasAC
      ? AC_BTU_OPTIONS
          .filter((o) => acCounts[o.btu] > 0)
          .map((o) => calcACConsumption(acCounts[o.btu], o.btu))
      : [];

    const wh = hasTermo ? calcWaterHeater(occupants) : undefined;

    const evMonthly = hasEV
      ? Math.round(averageMonthlyKWh * SOLAR_DEFAULTS.evConsumptionIncreasePerCar * carCount)
      : 0;

    const acTotal = groups.reduce((s, g) => s + g.estimatedMonthlyKWh, 0);
    const totalAdd = acTotal + (wh?.estimatedMonthlyKWh ?? 0) + evMonthly;

    return {
      acGroups: groups,
      waterHeater: wh,
      evEstimatedKWh: evMonthly,
      total: totalAdd,
    };
  }, [hasAC, acCounts, hasTermo, occupants, hasEV, carCount, averageMonthlyKWh]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // EVCharger parcial: los campos de análisis de horario se completan en el paso de resultados
    // tras correr la simulación con el balance energético real.
    const evCharger = hasEV
      ? {
          carCount,
          estimatedIncreasePercent: Math.round(
            SOLAR_DEFAULTS.evConsumptionIncreasePerCar * carCount * 100,
          ),
          estimatedMonthlyKWh: evEstimatedKWh,
          // Valores provisorios — el paso de resultados los reemplazará con calcEVCharger()
          recommendedChargingTime: 'mixed' as const,
          dayChargingKWh: 0,
          nightChargingKWh: evEstimatedKWh * 12,
          dayChargingSavingsCLP: 0,
        }
      : undefined;

    onSubmit(calcFutureConsumption(acGroups, waterHeater, evCharger, batteryCount));
  }

  const hasAny = hasAC || hasTermo || hasEV;
  const acHasUnits = hasAC && AC_BTU_OPTIONS.some((o) => acCounts[o.btu] > 0);

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Consumos futuros</h1>
        <p className="text-gray-500 mt-2 text-sm">
          ¿Planeas agregar nuevos equipos eléctricos? Los incluimos en la simulación.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        {/* Aire acondicionado */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
          <Toggle
            icon="❄️"
            label="Aire acondicionado"
            sublabel="Equipos de climatización tipo split"
            enabled={hasAC}
            onChange={setHasAC}
          />

          {hasAC && (
            <div className="flex flex-col gap-3 pt-1 border-t border-gray-50">
              {AC_BTU_OPTIONS.map((opt) => {
                const monthly = AC_MONTHLY_KWH_PER_UNIT[opt.btu];
                return (
                  <div key={opt.btu} className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm text-gray-700">{opt.label}</p>
                      <p className="text-xs text-gray-400">~{monthly} kWh/mes por equipo</p>
                    </div>
                    <Stepper
                      value={acCounts[opt.btu]}
                      min={0}
                      max={10}
                      onChange={(v) =>
                        setAcCounts((prev) => ({ ...prev, [opt.btu]: v }))
                      }
                    />
                  </div>
                );
              })}

              {acHasUnits && (
                <div className="flex justify-between items-center bg-green-50 rounded-xl px-4 py-2 mt-1">
                  <span className="text-xs text-green-700 font-medium">Consumo estimado AA</span>
                  <span className="text-sm font-bold text-green-700">
                    +{acGroups.reduce((s, g) => s + g.estimatedMonthlyKWh, 0)} kWh/mes
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Termo eléctrico */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
          <Toggle
            icon="🚿"
            label="Termo eléctrico"
            sublabel="Calefón o calentador de agua a electricidad"
            enabled={hasTermo}
            onChange={setHasTermo}
          />

          {hasTermo && (
            <div className="flex flex-col gap-4 pt-1 border-t border-gray-50">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-700">Personas en el hogar</p>
                  <p className="text-xs text-gray-400">
                    Determina la capacidad del termo recomendado
                  </p>
                </div>
                <Stepper
                  value={occupants}
                  min={1}
                  max={MAX_OCCUPANTS}
                  onChange={setOccupants}
                />
              </div>

              {waterHeater && (
                <div className="flex justify-between items-center bg-green-50 rounded-xl px-4 py-2">
                  <div>
                    <p className="text-xs text-green-700 font-medium">Termo recomendado</p>
                    <p className="text-xs text-gray-500">{waterHeater.recommendedCapacityLiters} litros</p>
                  </div>
                  <span className="text-sm font-bold text-green-700">
                    +{waterHeater.estimatedMonthlyKWh} kWh/mes
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Auto eléctrico */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
          <Toggle
            icon="🚗"
            label="Auto eléctrico"
            sublabel="Carga doméstica desde la red o paneles solares"
            enabled={hasEV}
            onChange={setHasEV}
          />

          {hasEV && (
            <div className="flex flex-col gap-4 pt-1 border-t border-gray-50">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-700">Cantidad de autos</p>
                  <p className="text-xs text-gray-400">
                    ~{Math.round(SOLAR_DEFAULTS.evConsumptionIncreasePerCar * 100)}% de aumento por auto sobre tu consumo actual
                  </p>
                </div>
                <Stepper
                  value={carCount}
                  min={1}
                  max={4}
                  onChange={setCarCount}
                />
              </div>

              <div className="flex justify-between items-center bg-green-50 rounded-xl px-4 py-2">
                <div>
                  <p className="text-xs text-green-700 font-medium">Consumo estimado EV</p>
                  <p className="text-xs text-gray-500">
                    Análisis de horario de carga en los resultados
                  </p>
                </div>
                <span className="text-sm font-bold text-green-700">
                  +{evEstimatedKWh} kWh/mes
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Batería de respaldo */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 py-1">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔋</span>
              <div>
                <p className="text-sm font-medium text-gray-800">Baterías de respaldo</p>
                <p className="text-xs text-gray-400">Almacena excedentes solares para usar de noche</p>
              </div>
            </div>
            <Stepper value={batteryCount} min={0} max={3} onChange={setBatteryCount} />
          </div>
          {batteryCount > 0 && (
            <p className="text-xs text-green-700 bg-green-50 rounded-xl px-3 py-2">
              {batteryCount} batería{batteryCount > 1 ? 's' : ''} — mayor autonomía nocturna y respaldo ante cortes de luz.
            </p>
          )}
        </div>

        {/* Resumen total */}
        {hasAny && total > 0 && (
          <div className="flex items-center justify-between bg-gray-900 text-white rounded-2xl px-5 py-4">
            <div>
              <p className="text-xs text-gray-400">Consumo actual</p>
              <p className="text-sm font-medium">{averageMonthlyKWh} kWh/mes</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Con equipos nuevos</p>
              <p className="text-lg font-bold">{averageMonthlyKWh + total} kWh/mes</p>
            </div>
          </div>
        )}

        <button
          type="submit"
          className="w-full rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold py-3 text-sm transition-colors"
        >
          {total > 0 ? 'Simular con equipos adicionales →' : 'Continuar sin equipos adicionales →'}
        </button>
      </form>
    </div>
  );
}
