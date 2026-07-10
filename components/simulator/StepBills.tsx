'use client';

import { useState, useMemo } from 'react';
import type { ConsumptionProfile, MonthlyBill, SupplyData, TarifaType } from '@/lib/types';
import type { ExtractedBill, ExtractedPeriod } from '@/app/api/parse-bill/route';
import { MONTH_NAMES, DISTRIBUTORS, CHILE_BT1 } from '@/lib/constants';
import { extrapolateSeasonalKWh } from '@/lib/consumption';
import BillOCRUpload from './BillOCRUpload';
import { IconUpload } from '@/components/landing/icons';

// ─── Props ────────────────────────────────────────────────────────────────────

interface StepBillsProps {
  initialData: ConsumptionProfile | null;
  supply: SupplyData;
  /** true solo para usuarios internos con sesión de admin: muestra el OCR de boletas. */
  ocrEnabled?: boolean;
  /** true para clientes empresa: mantiene el relleno por promedio de vecinos.
   *  Residencial usa la extrapolación estacional (perfil nacional BT1). */
  isBusinessCustomer?: boolean;
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
  // Parte desde el mes ANTERIOR al actual: el mes en curso aún no se factura,
  // así no le pedimos al usuario una boleta que todavía no existe.
  for (let i = 1; i <= 12; i++) {
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

/**
 * Precio estimado del kWh para convertir montos $ → kWh:
 * promedio real de los meses que tienen ambos datos; si no hay, el referencial.
 */
function estimateKWhPrice(slots: MonthSlot[], rows: Record<string, RowValues>): number {
  const prices: number[] = [];
  slots.forEach((s) => {
    const row = rows[s.key];
    const kWh = parseFloat(row?.kWh);
    const clp = parseFloat(row?.clp);
    if (!isNaN(kWh) && kWh > 0 && !isNaN(clp) && clp > 0) prices.push(clp / kWh);
  });
  return prices.length > 0
    ? prices.reduce((a, b) => a + b, 0) / prices.length
    : CHILE_BT1.referenceKWhPriceCLP;
}

function buildProfile(
  slots: MonthSlot[],
  rows: Record<string, RowValues>,
  supply: SupplyData,
  manualDistribuidora: string,
  manualTarifa: TarifaType,
  isBusiness: boolean,
  consumptionBasis: 'grid' | 'total' | undefined,
): ConsumptionProfile {
  const distribuidora = supply.distribuidora || manualDistribuidora || undefined;
  const tarifa = supply.tarifa !== 'unknown' ? supply.tarifa : manualTarifa;

  const estimatedPrice = estimateKWhPrice(slots, rows);
  const realBills: MonthlyBill[] = [];

  slots.forEach((s) => {
    const row = rows[s.key];
    const kWhInput = parseFloat(row.kWh);
    const clp = row.clp ? parseFloat(row.clp) : undefined;
    // kWh directo, o estimado desde el monto $ cuando solo se ingresó el monto
    let kWh = !isNaN(kWhInput) && kWhInput > 0 ? kWhInput : undefined;
    if (kWh === undefined && clp && clp > 0) {
      kWh = Math.round(clp / estimatedPrice);
    }
    if (!kWh || kWh <= 0) return;
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

  // ── Relleno de meses faltantes ─────────────────────────────────────────────
  // Residencial: extrapolación estacional (perfil nacional BT1), desde 1 mes.
  // Empresa: comportamiento histórico (promedio de meses vecinos, desde 2 meses).
  const allBills: MonthlyBill[] = [...realBills];
  const monthKWh = new Map<number, number>();
  realBills.forEach((b) => monthKWh.set(b.month, b.consumptionKWh));

  if (!isBusiness) {
    // Residencial: extrapolación estacional por coeficientes.
    const estimates = extrapolateSeasonalKWh(monthKWh);
    slots.forEach((slot) => {
      const est = estimates.get(slot.month);
      if (est === undefined || est <= 0) return;
      allBills.push({
        month: slot.month,
        year: slot.year,
        consumptionKWh: est,
        source: 'interpolated',
      });
    });
  } else if (realBills.length >= 2) {
    // Empresa: promedio de meses vecinos (±1, ±2).
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

  const allValues  = allBills.map((b) => b.consumptionKWh);
  const average    = allValues.length > 0
    ? Math.round(allValues.reduce((a, b) => a + b, 0) / allValues.length)
    : 0;

  return {
    bills: allBills,
    averageMonthlyKWh: average,
    // Peak/min sobre TODOS los meses (reales + estimados) para que coincidan
    // con la curva mostrada en el gráfico de revisión.
    peakMonthKWh: allValues.length > 0 ? Math.max(...allValues) : 0,
    minMonthKWh:  allValues.length > 0 ? Math.min(...allValues) : 0,
    isComplete: realBills.length === 12,
    consumptionBasis:  supply.hasExistingSolar ? (consumptionBasis ?? 'grid') : undefined,
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

export default function StepBills({ initialData, supply, ocrEnabled = false, isBusinessCustomer = false, onSubmit, onUpdateSupply }: StepBillsProps) {
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

  // Solo si el cliente ya tiene PFV: ¿el consumo ingresado es el de la boleta de
  // la compañía (importación de red) o su consumo total (red + lo que produce su PFV)?
  const [consumptionBasis, setConsumptionBasis] = useState<'grid' | 'total'>(
    initialData?.consumptionBasis ?? 'grid',
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

    if (onUpdateSupply && (billData.distribuidora || billData.tarifa)) {
      onUpdateSupply({
        distribuidora: billData.distribuidora ?? supply.distribuidora,
        tarifa: (billData.tarifa as TarifaType) ?? supply.tarifa,
      });
    }
  }

  const { filledCount, liveAverage, estimatedPrice } = useMemo(() => {
    const price = estimateKWhPrice(SLOTS, rows);
    // Un mes cuenta como ingresado con kWh O con monto $ (se estima el kWh desde el monto)
    const values = SLOTS
      .map((s) => {
        const row = rows[s.key];
        const kWh = parseFloat(row?.kWh);
        if (!isNaN(kWh) && kWh > 0) return kWh;
        const clp = parseFloat(row?.clp);
        if (!isNaN(clp) && clp > 0) return Math.round(clp / price);
        return NaN;
      })
      .filter((v) => !isNaN(v) && v > 0);
    return {
      filledCount: values.length,
      liveAverage: values.length > 0
        ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
        : null,
      estimatedPrice: price,
    };
  }, [rows]);

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
      SLOTS, rows, supply, manualDistribuidora, manualTarifa, isBusinessCustomer,
      supply.hasExistingSolar ? consumptionBasis : undefined,
    ));
  }

  return (
    <div>
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-[#010101] tracking-tight">Tus boletas eléctricas</h1>
        <p className="text-gray-500 mt-3">
          Ingresa el consumo en kWh <strong>o el monto en pesos</strong> de cada mes.
          Con más meses obtenemos una simulación más precisa.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* OCR — solo usuarios internos con sesión de admin */}
        {ocrEnabled && (showOCR ? (
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
              className="relative w-full rounded-2xl border-2 border-dashed border-[#b0cedd] bg-[#dde3e9]/50 hover:bg-[#b0cedd]/20 text-[#1d65c5] font-semibold py-3.5 text-sm transition-colors flex items-center justify-center gap-2"
            >
              <IconUpload className="w-4.5 h-4.5" /> Subir boleta para autocompletar
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-wider bg-[#010101] text-white/80 px-2 py-0.5 rounded-full">
                Modo interno
              </span>
            </button>
            {ocrMatchCount !== null && (
              <p className="text-xs text-[#1d65c5] bg-[#dde3e9]/50 rounded-xl px-3 py-2 text-center">
                ✓ Se pre-rellenaron <strong>{ocrMatchCount} mes{ocrMatchCount !== 1 ? 'es' : ''}</strong> desde la boleta. Puedes editar los valores si es necesario.
              </p>
            )}
          </div>
        ))}

        {/* Mensaje anti-abandono para usuarios públicos */}
        {!ocrEnabled && (
          <p className="text-xs text-[#1d65c5] bg-[#dde3e9]/50 rounded-xl px-4 py-3 text-center leading-relaxed">
            No necesitas los 12 meses: con <strong>2 o 3 meses</strong> basta — estimamos el resto
            según la estación del año. Y si solo conoces el monto de tu boleta, ingrésalo y
            nosotros calculamos el consumo.
          </p>
        )}

        {/* Base del consumo — solo si ya tiene PFV (el consumo de la compañía
            ya viene descontado por su planta; hay que saber cuál ingresó) */}
        {supply.hasExistingSolar && (
          <div className="bg-white rounded-2xl ring-1 ring-[#b0cedd]/30 shadow-[0_1px_3px_rgba(16,40,80,0.04)] p-5 flex flex-col gap-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-700">Ya tienes paneles — ¿qué consumo ingresaste?</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Como ya generas parte de tu energía, necesitamos saber a qué corresponde el consumo de arriba.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {([
                { value: 'grid' as const, title: 'El de mi boleta', sub: 'Lo que me cobra la compañía (lo que tomo de la red)' },
                { value: 'total' as const, title: 'Mi consumo total', sub: 'Todo lo que consumo (red + lo que produce mi PFV)' },
              ]).map((opt) => {
                const active = consumptionBasis === opt.value;
                return (
                  <button key={opt.value} type="button" onClick={() => setConsumptionBasis(opt.value)}
                    className={[
                      'text-left rounded-xl border-2 px-4 py-3 transition-all',
                      active ? 'border-[#389fe0] bg-[#389fe0]/5' : 'border-gray-200 hover:border-[#b0cedd]',
                    ].join(' ')}>
                    <p className={['text-sm font-semibold', active ? 'text-[#1d65c5]' : 'text-gray-700'].join(' ')}>{opt.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{opt.sub}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Resumen en vivo */}
        <div className="flex items-center justify-between bg-white rounded-2xl ring-1 ring-[#b0cedd]/30 shadow-[0_1px_3px_rgba(16,40,80,0.04)] px-5 py-3">
          <div className="flex items-center gap-2">
            <span className={['text-2xl font-bold tabular-nums', filledCount === 12 ? 'text-[#389fe0]' : 'text-gray-800'].join(' ')}>
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
        <div className="bg-white rounded-2xl ring-1 ring-[#b0cedd]/30 shadow-[0_1px_3px_rgba(16,40,80,0.04)] overflow-hidden">
          <div className="grid grid-cols-[1fr_120px_120px] gap-3 px-5 py-2.5 bg-gray-50 border-b border-gray-100">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mes</span>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">kWh</span>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Monto ($)</span>
          </div>
          {SLOTS.map((slot, idx) => {
            const row = rows[slot.key];
            const hasKWh = !!row.kWh && parseFloat(row.kWh) > 0;
            const hasClp = !!row.clp && parseFloat(row.clp) > 0;
            const isFilled = hasKWh || hasClp;
            return (
              <div
                key={slot.key}
                className={[
                  'grid grid-cols-[1fr_120px_120px] gap-3 items-center px-5 py-2.5',
                  idx < SLOTS.length - 1 ? 'border-b border-gray-50' : '',
                  isFilled ? 'bg-[#389fe0]/5' : '',
                ].join(' ')}
              >
                <span className={['text-sm', isFilled ? 'text-gray-800 font-medium' : 'text-gray-500'].join(' ')}>
                  {slot.label}
                </span>
                <input
                  type="number" min="1" max="99999" step="1"
                  value={row.kWh}
                  onChange={(e) => setRow(slot.key, 'kWh', e.target.value)}
                  placeholder={hasClp && !hasKWh ? `≈ ${Math.round(parseFloat(row.clp) / estimatedPrice)}` : '—'}
                  aria-label={`kWh ${slot.label}`}
                  className={[
                    'w-full text-right rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#389fe0]/50 focus:border-transparent transition',
                    hasClp && !hasKWh ? 'placeholder:text-[#389fe0] placeholder:font-medium' : 'placeholder:text-gray-300',
                  ].join(' ')}
                />
                <input
                  type="number" min="1" step="1"
                  value={row.clp}
                  onChange={(e) => setRow(slot.key, 'clp', e.target.value)}
                  placeholder="$"
                  aria-label={`Monto CLP ${slot.label}`}
                  className="w-full text-right rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#389fe0]/50 focus:border-transparent transition"
                />
              </div>
            );
          })}
        </div>

        {/* Distribuidora y tarifa manual (cuando no vino de OCR) */}
        {showManualFields && filledCount > 0 && (
          <div className="bg-white rounded-2xl ring-1 ring-[#b0cedd]/30 shadow-[0_1px_3px_rgba(16,40,80,0.04)] p-5 flex flex-col gap-4">
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
                    className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#389fe0]/50 focus:border-transparent transition"
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
                      className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#389fe0]/50 focus:border-transparent transition"
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
                    className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#389fe0]/50 focus:border-transparent transition"
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

        <p className="text-xs text-gray-400 text-center px-4">
          El consumo en kWh aparece en tu boleta junto al período de medición.
          Si solo conoces el monto en pesos, ingrésalo y calcularemos el consumo aproximado
          {estimatedPrice ? ` (a $${Math.round(estimatedPrice)}/kWh)` : ''}.
        </p>

        <button
          type="submit"
          disabled={!canSubmit}
          className={[
            'w-full rounded-xl font-semibold py-3.5 text-sm transition-all duration-300',
            canSubmit
              ? 'bg-[#389fe0] hover:bg-[#1d65c5] text-white shadow-lg shadow-[#389fe0]/30 hover:-translate-y-0.5'
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
