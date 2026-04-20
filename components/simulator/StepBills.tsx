'use client';

import { useState, useMemo } from 'react';
import type { ConsumptionProfile, MonthlyBill, SupplyData, TarifaType } from '@/lib/types';
import type { ExtractedBill, ExtractedPeriod } from '@/app/api/parse-bill/route';
import { MONTH_NAMES, DISTRIBUTORS } from '@/lib/constants';
import BillOCRUpload from './BillOCRUpload';

// ─── Props ────────────────────────────────────────────────────────────────────

interface StepBillsProps {
  initialData: ConsumptionProfile | null;
  supply: SupplyData;
  onSubmit: (profile: ConsumptionProfile) => void;
  onUpdateSupply?: (partial: Pick<SupplyData, 'distribuidora' | 'tarifa'>) => void;
}

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface MonthSlot {
  month: number;
  year: number;
  key: string;
  label: string;
}

interface RowValues {
  kWh: string;
  clp: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function initRowsFromProfile(
  slots: MonthSlot[],
  profile: ConsumptionProfile | null,
): Record<string, RowValues> {
  const map: Record<string, RowValues> = {};
  slots.forEach((s) => { map[s.key] = { kWh: '', clp: '' }; });
  if (!profile) return map;
  profile.bills
    .filter((b) => b.source !== 'interpolated')
    .forEach((b) => {
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

function buildProfile(
  slots: MonthSlot[],
  rows: Record<string, RowValues>,
  supply: SupplyData,
  manualDistribuidora: string,
  manualTarifa: TarifaType,
  avgTotalBill?: number,
  avgPowerCharge?: number,
): ConsumptionProfile {
  const distribuidora = supply.distribuidora || manualDistribuidora || undefined;
  const tarifa = supply.tarifa !== 'unknown' ? supply.tarifa : manualTarifa;

  const realBills: MonthlyBill[] = [];

  slots.forEach((s) => {
    const row = rows[s.key];
    const kWh = parseFloat(row.kWh);
    if (!row.kWh || isNaN(kWh) || kWh <= 0) return;
    const clp = row.clp ? parseFloat(row.clp) : undefined;
    const kWhPrice = clp && kWh > 0 ? Math.round(clp / kWh) : undefined;
    realBills.push({
      month: s.month,
      year: s.year,
      consumptionKWh: kWh,
      variableAmountCLP: clp,
      kWhPriceCLP: kWhPrice,
      distribuidora,
      tarifa: tarifa !== 'unknown' ? tarifa : undefined,
      source: 'manual',
    });
  });

  // ── Interpolación estacional para meses faltantes ─────────────────────────
  const allBills: MonthlyBill[] = [...realBills];

  if (realBills.length >= 2) {
    const monthKWh = new Map<number, number>();
    realBills.forEach((b) => monthKWh.set(b.month, b.consumptionKWh));

    slots.forEach((slot) => {
      if (monthKWh.has(slot.month)) return;

      const neighborValues: number[] = [];
      for (const offset of [-2, -1, 1, 2]) {
        const m = ((slot.month - 1 + offset + 12) % 12) + 1;
        const v = monthKWh.get(m);
        if (v !== undefined) neighborValues.push(v);
      }
      if (neighborValues.length === 0) return;

      const estimated = Math.round(
        neighborValues.reduce((a, b) => a + b, 0) / neighborValues.length,
      );
      allBills.push({
        month: slot.month,
        year: slot.year,
        consumptionKWh: estimated,
        source: 'interpolated',
      });
    });
  }

  const realValues = realBills.map((b) => b.consumptionKWh);
  const allValues  = allBills.map((b) => b.consumptionKWh);
  const average    = allValues.length > 0
    ? Math.round(allValues.reduce((a, b) => a + b, 0) / allValues.length)
    : 0;

  return {
    bills: allBills,
    averageMonthlyKWh: average,
    peakMonthKWh: realValues.length > 0 ? Math.max(...realValues) : 0,
    minMonthKWh:  realValues.length > 0 ? Math.min(...realValues) : 0,
    isComplete: realBills.length === 12,
    avgTotalBillCLP:   avgTotalBill,
    avgPowerChargeCLP: avgPowerCharge,
  };
}

// ─── Opciones de tarifa ───────────────────────────────────────────────────────

const TARIFA_OPTIONS: { value: TarifaType; label: string }[] = [
  { value: 'unknown', label: 'No sé / No aparece en la boleta' },
  { value: 'BT1',     label: 'BT1 — Residencial (< 10 kW)' },
  { value: 'BT2',     label: 'BT2 — Comercial con potencia contratada' },
  { value: 'BT3',     label: 'BT3 — Demanda máxima medida' },
  { value: 'BT4.1',   label: 'BT4.1 — Demanda punta contratada' },
  { value: 'BT4.2',   label: 'BT4.2 — Demanda punta medida' },
  { value: 'BT4.3',   label: 'BT4.3 — Demanda punta y máxima medidas' },
];

// ─── Componente principal ─────────────────────────────────────────────────────

const SLOTS = generateMonthSlots();

export default function StepBills({ initialData, supply, onSubmit, onUpdateSupply }: StepBillsProps) {
  const [rows, setRows] = useState<Record<string, RowValues>>(
    () => initRowsFromProfile(SLOTS, initialData),
  );
  const [showOCR, setShowOCR] = useState(false);
  const [ocrMatchCount, setOcrMatchCount] = useState<number | null>(null);
  const [ocrUsed, setOcrUsed] = useState(false);

  const [distribuidoraSelect, setDistribuidoraSelect] = useState<string>(() => {
    const d = supply.distribuidora ?? '';
    if (!d) return '';
    return DISTRIBUTORS.includes(d) ? d : 'Otra';
  });
  const [distribuidoraCustom, setDistribuidoraCustom] = useState<string>(() => {
    const d = supply.distribuidora ?? '';
    return d && !DISTRIBUTORS.includes(d) ? d : '';
  });
  const manualDistribuidora = distribuidoraSelect === 'Otra' ? distribuidoraCustom : distribuidoraSelect;

  const [manualTarifa, setManualTarifa] = useState<TarifaType>(
    supply.tarifa !== 'unknown' ? supply.tarifa : 'unknown',
  );

  const [avgTotalBill, setAvgTotalBill] = useState(
    initialData?.avgTotalBillCLP?.toString() ?? '',
  );
  const [avgPowerCharge, setAvgPowerCharge] = useState(
    initialData?.avgPowerChargeCLP?.toString() ?? '',
  );

  function setRow(key: string, field: keyof RowValues, value: string) {
    setRows((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  }

  function handleOCRConfirm(periods: ExtractedPeriod[], matchCount: number, billData: ExtractedBill) {
    const updated = { ...rows };
    periods.forEach((p) => {
      const key = `${p.year}-${String(p.month).padStart(2, '0')}`;
      if (updated[key] === undefined || p.consumptionKWh == null) return;
      updated[key] = {
        kWh: String(p.consumptionKWh),
        clp: p.variableAmountCLP != null ? String(p.variableAmountCLP) : '',
      };
    });
    setRows(updated);
    setOcrMatchCount(matchCount);
    setOcrUsed(true);
    setShowOCR(false);

    // Auto-rellenar monto total y cargo por potencia si el OCR los detectó
    const totals = periods.map((p) => p.totalAmountCLP).filter((v): v is number => v != null);
    const powers = periods.map((p) => p.powerChargeCLP).filter((v): v is number => v != null);
    if (totals.length > 0) {
      const avg = Math.round(totals.reduce((a, b) => a + b, 0) / totals.length);
      setAvgTotalBill(String(avg));
    }
    if (powers.length > 0) {
      const avg = Math.round(powers.reduce((a, b) => a + b, 0) / powers.length);
      setAvgPowerCharge(String(avg));
    }

    if (onUpdateSupply && (billData.distribuidora || billData.tarifa)) {
      onUpdateSupply({
        distribuidora: billData.distribuidora ?? supply.distribuidora,
        tarifa: (billData.tarifa as TarifaType) ?? supply.tarifa,
      });
    }
  }

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

  const showTariffAnalysisFields =
    supply.tarifa !== 'BT1' && supply.tarifa !== 'unknown' && filledCount >= 1;

  const canSubmit = filledCount >= 1;
  const showManualFields = !ocrUsed && (!supply.distribuidora || supply.tarifa === 'unknown');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    if (onUpdateSupply && !ocrUsed) {
      onUpdateSupply({
        distribuidora: manualDistribuidora || supply.distribuidora,
        tarifa: manualTarifa,
      });
    }
    onSubmit(buildProfile(
      SLOTS, rows, supply, manualDistribuidora, manualTarifa,
      avgTotalBill ? parseFloat(avgTotalBill) : undefined,
      avgPowerCharge ? parseFloat(avgPowerCharge) : undefined,
    ));
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

        {/* OCR */}
        {showOCR ? (
          <BillOCRUpload
            availableSlotKeys={SLOTS.map((s) => s.key)}
            onConfirm={handleOCRConfirm}
            onCancel={() => setShowOCR(false)}
          />
        ) : (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => { setShowOCR(true); setOcrMatchCount(null); }}
              className="w-full rounded-2xl border-2 border-dashed border-green-300 bg-green-50 hover:bg-green-100 text-green-700 font-medium py-3 text-sm transition-colors flex items-center justify-center gap-2"
            >
              <span>📄</span> Subir boleta para autocompletar
            </button>
            {ocrMatchCount !== null && (
              <p className="text-xs text-green-700 bg-green-50 rounded-xl px-3 py-2 text-center">
                ✓ Se pre-rellenaron <strong>{ocrMatchCount} mes{ocrMatchCount !== 1 ? 'es' : ''}</strong> desde la boleta. Puedes editar los valores si es necesario.
              </p>
            )}
          </div>
        )}

        {/* Resumen en vivo */}
        <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-3">
          <div className="flex items-center gap-2">
            <span className={['text-2xl font-bold tabular-nums', filledCount === 12 ? 'text-green-600' : 'text-gray-800'].join(' ')}>
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
          <div className="grid grid-cols-[1fr_120px_120px] gap-3 px-5 py-2.5 bg-gray-50 border-b border-gray-100">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mes</span>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">kWh</span>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Monto ($)</span>
          </div>
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
                  type="number" min="1" max="99999" step="1"
                  value={row.kWh}
                  onChange={(e) => setRow(slot.key, 'kWh', e.target.value)}
                  placeholder="—"
                  aria-label={`kWh ${slot.label}`}
                  className="w-full text-right rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition"
                />
                <input
                  type="number" min="1" step="1"
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

        {/* Distribuidora y tarifa manual (cuando no vino de OCR) */}
        {showManualFields && filledCount > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-700">Datos de tu suministro</h2>
              <p className="text-xs text-gray-400 mt-0.5">Opcional — puedes encontrarlos en tu boleta.</p>
            </div>
            <div className="flex flex-col gap-3">
              {!supply.distribuidora && (
                <div className="flex flex-col gap-1">
                  <label htmlFor="manualDistribuidora" className="text-xs font-medium text-gray-600">
                    Empresa distribuidora
                  </label>
                  <select
                    id="manualDistribuidora"
                    value={distribuidoraSelect}
                    onChange={(e) => {
                      setDistribuidoraSelect(e.target.value);
                      if (e.target.value !== 'Otra') setDistribuidoraCustom('');
                    }}
                    className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition"
                  >
                    <option value="">Selecciona la distribuidora…</option>
                    {DISTRIBUTORS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  {distribuidoraSelect === 'Otra' && (
                    <input
                      type="text"
                      value={distribuidoraCustom}
                      onChange={(e) => setDistribuidoraCustom(e.target.value)}
                      placeholder="Nombre de la distribuidora"
                      className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition"
                    />
                  )}
                </div>
              )}
              {supply.tarifa === 'unknown' && (
                <div className="flex flex-col gap-1">
                  <label htmlFor="manualTarifa" className="text-xs font-medium text-gray-600">
                    Tarifa eléctrica
                  </label>
                  <select
                    id="manualTarifa"
                    value={manualTarifa}
                    onChange={(e) => setManualTarifa(e.target.value as TarifaType)}
                    className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition"
                  >
                    {TARIFA_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Campos opcionales para análisis tarifario (BT2/BT3/BT4.x/AT*) */}
        {showTariffAnalysisFields && (
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5 flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-semibold text-purple-800">Para análisis tarifario (opcional)</h2>
              <p className="text-xs text-purple-600 mt-0.5">
                Con esta información podemos comparar si tu tarifa {supply.tarifa} es la más conveniente.
                Si no los tienes a mano, omítelos — la simulación sigue funcionando.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="avgTotalBill" className="text-xs font-medium text-gray-600">
                  Monto total promedio mensual (CLP)
                </label>
                <input
                  id="avgTotalBill"
                  type="number"
                  min="0"
                  step="1000"
                  value={avgTotalBill}
                  onChange={(e) => setAvgTotalBill(e.target.value)}
                  placeholder="Ej: 185000"
                  className="rounded-xl border border-purple-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition max-w-xs"
                />
                <p className="text-xs text-purple-500 leading-relaxed mt-0.5">
                  Es el <strong>total a pagar</strong> que aparece al final de tu boleta, incluyendo todos los ítems (energía + potencia + cargo fijo + IVA). Suma los últimos meses disponibles y divide por la cantidad de meses.
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="avgPowerCharge" className="text-xs font-medium text-gray-600">
                  Cargo por potencia promedio mensual (CLP)
                </label>
                <input
                  id="avgPowerCharge"
                  type="number"
                  min="0"
                  step="1000"
                  value={avgPowerCharge}
                  onChange={(e) => setAvgPowerCharge(e.target.value)}
                  placeholder="Ej: 45000"
                  className="rounded-xl border border-purple-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition max-w-xs"
                />
                <p className="text-xs text-purple-500 leading-relaxed mt-0.5">
                  Busca en tu boleta la línea <strong>&quot;Cargo por demanda máxima&quot;</strong> (BT3) o <strong>&quot;Cargo por potencia contratada&quot;</strong> (BT2). Suele representar el 20–35% del total. Si tienes varias boletas, promedia ese ítem.
                  {supply.tarifa === 'BT3' && (
                    <> En BT3 se calcula como: <em>demanda máxima medida (kW) × precio unitario ($/kW)</em>.</>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

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
