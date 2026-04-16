'use client';

import { useState, useMemo } from 'react';
import type { ConsumptionProfile, MonthlyBill, SupplyData } from '@/lib/types';
import { MONTH_NAMES } from '@/lib/constants';

// ─── Props ────────────────────────────────────────────────────────────────────

interface StepBillsProps {
  initialData: ConsumptionProfile | null;
  supply: SupplyData;
  onSubmit: (profile: ConsumptionProfile) => void;
}

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface MonthSlot {
  month: number;  // 1–12
  year: number;
  key: string;    // "YYYY-MM"
  label: string;  // "Enero 2026"
}

interface RowValues {
  kWh: string;
  clp: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Genera los últimos 12 meses en orden del más reciente al más antiguo. */
function generateMonthSlots(): MonthSlot[] {
  const now = new Date();
  const slots: MonthSlot[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    slots.push({
      month,
      year,
      key: `${year}-${String(month).padStart(2, '0')}`,
      label: `${MONTH_NAMES[month]} ${year}`,
    });
  }
  return slots;
}

/** Reconstruye el mapa de valores desde un ConsumptionProfile existente (volver atrás). */
function initRowsFromProfile(
  slots: MonthSlot[],
  profile: ConsumptionProfile | null,
): Record<string, RowValues> {
  const map: Record<string, RowValues> = {};
  slots.forEach((s) => { map[s.key] = { kWh: '', clp: '' }; });
  if (!profile) return map;
  profile.bills.forEach((b) => {
    const key = `${b.year}-${String(b.month).padStart(2, '0')}`;
    if (map[key] !== undefined) {
      map[key] = {
        kWh: b.consumptionKWh.toString(),
        clp: b.variableAmountCLP?.toString() ?? '',
      };
    }
  });
  return map;
}

/** Construye el ConsumptionProfile a partir del mapa de filas. */
function buildProfile(
  slots: MonthSlot[],
  rows: Record<string, RowValues>,
  supply: SupplyData,
): ConsumptionProfile {
  const bills: MonthlyBill[] = [];

  slots.forEach((s) => {
    const row = rows[s.key];
    const kWh = parseFloat(row.kWh);
    if (!row.kWh || isNaN(kWh) || kWh <= 0) return;

    const clp = row.clp ? parseFloat(row.clp) : undefined;
    const kWhPrice = clp && kWh > 0 ? Math.round(clp / kWh) : undefined;

    bills.push({
      month: s.month,
      year: s.year,
      consumptionKWh: kWh,
      variableAmountCLP: clp,
      kWhPriceCLP: kWhPrice,
      distribuidora: supply.distribuidora,
      tarifa: supply.tarifa !== 'unknown' ? supply.tarifa : undefined,
      source: 'manual',
    });
  });

  const values = bills.map((b) => b.consumptionKWh);
  const average = values.length > 0
    ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
    : 0;

  return {
    bills,
    averageMonthlyKWh: average,
    peakMonthKWh: values.length > 0 ? Math.max(...values) : 0,
    minMonthKWh:  values.length > 0 ? Math.min(...values) : 0,
    isComplete: bills.length === 12,
  };
}

// ─── Componente principal ─────────────────────────────────────────────────────

const SLOTS = generateMonthSlots();

export default function StepBills({ initialData, supply, onSubmit }: StepBillsProps) {
  const [rows, setRows] = useState<Record<string, RowValues>>(
    () => initRowsFromProfile(SLOTS, initialData),
  );

  function setRow(key: string, field: keyof RowValues, value: string) {
    setRows((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  }

  // ─── Métricas en vivo ──────────────────────────────────────────────────────

  const { filledCount, liveAverage } = useMemo(() => {
    const values = SLOTS
      .map((s) => parseFloat(rows[s.key]?.kWh))
      .filter((v) => !isNaN(v) && v > 0);
    return {
      filledCount: values.length,
      liveAverage: values.length > 0
        ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
        : null,
    };
  }, [rows]);

  const canSubmit = filledCount >= 1;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit(buildProfile(SLOTS, rows, supply));
  }

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Tus boletas eléctricas</h1>
        <p className="text-gray-500 mt-2 text-sm">
          Ingresa el consumo en kWh de cada mes. Con más meses obtenemos una simulación más precisa.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* Resumen en vivo */}
        <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-3">
          <div className="flex items-center gap-2">
            <span
              className={[
                'text-2xl font-bold tabular-nums',
                filledCount === 12 ? 'text-green-600' : 'text-gray-800',
              ].join(' ')}
            >
              {filledCount}
            </span>
            <span className="text-sm text-gray-500">de 12 meses ingresados</span>
          </div>
          {liveAverage !== null && (
            <div className="text-right">
              <p className="text-xs text-gray-400">Promedio</p>
              <p className="text-sm font-semibold text-gray-700">{liveAverage} kWh/mes</p>
            </div>
          )}
        </div>

        {/* Tabla de meses */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Encabezado */}
          <div className="grid grid-cols-[1fr_120px_120px] gap-3 px-5 py-2.5 bg-gray-50 border-b border-gray-100">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mes</span>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">kWh</span>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Monto ($)</span>
          </div>

          {/* Filas */}
          {SLOTS.map((slot, idx) => {
            const row = rows[slot.key];
            const isFilled = !!row.kWh && parseFloat(row.kWh) > 0;
            return (
              <div
                key={slot.key}
                className={[
                  'grid grid-cols-[1fr_120px_120px] gap-3 items-center px-5 py-2.5',
                  idx < SLOTS.length - 1 ? 'border-b border-gray-50' : '',
                  isFilled ? 'bg-green-50/40' : '',
                ].join(' ')}
              >
                <span className={['text-sm', isFilled ? 'text-gray-800 font-medium' : 'text-gray-500'].join(' ')}>
                  {slot.label}
                </span>
                <input
                  type="number"
                  min="1"
                  max="99999"
                  step="1"
                  value={row.kWh}
                  onChange={(e) => setRow(slot.key, 'kWh', e.target.value)}
                  placeholder="—"
                  aria-label={`kWh ${slot.label}`}
                  className="w-full text-right rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition"
                />
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={row.clp}
                  onChange={(e) => setRow(slot.key, 'clp', e.target.value)}
                  placeholder="opcional"
                  aria-label={`Monto CLP ${slot.label}`}
                  className="w-full text-right rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition"
                />
              </div>
            );
          })}
        </div>

        {/* Ayuda */}
        <p className="text-xs text-gray-400 text-center px-4">
          El consumo en kWh aparece en tu boleta junto al período de medición.
          El monto es la parte variable (sin cargos fijos) — opcional pero mejora el cálculo del precio por kWh.
        </p>

        <button
          type="submit"
          disabled={!canSubmit}
          className={[
            'w-full rounded-xl font-semibold py-3 text-sm transition-colors',
            canSubmit
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed',
          ].join(' ')}
        >
          {filledCount === 0
            ? 'Ingresa al menos un mes para continuar'
            : `Continuar con ${filledCount} mes${filledCount > 1 ? 'es' : ''} →`}
        </button>
      </form>
    </div>
  );
}
