'use client';

import { useState, useRef, useCallback } from 'react';
import type { ExtractedBill, ExtractedPeriod } from '@/app/api/parse-bill/route';

// ─── Props ────────────────────────────────────────────────────────────────────

interface BillOCRUploadProps {
  /** Slots disponibles en la tabla (para informar cuántos coinciden) */
  availableSlotKeys: string[];          // ["2026-03", "2026-02", ...]
  onConfirm: (periods: ExtractedPeriod[], matchCount: number, billData: ExtractedBill) => void;
  onCancel: () => void;
}

// ─── Tipos de estado ──────────────────────────────────────────────────────────

type UploadState =
  | { stage: 'idle' }
  | { stage: 'loading'; fileName: string; current: number; total: number }
  | { stage: 'review'; data: ExtractedBill; edited: ExtractedPeriod[]; matchCount: number; isMock: boolean }
  | { stage: 'error'; reason: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES: Record<number, string> = {
  1: 'Ene', 2: 'Feb', 3: 'Mar', 4: 'Abr',
  5: 'May', 6: 'Jun', 7: 'Jul', 8: 'Ago',
  9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dic',
};

function slotKey(month: number, year: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function BillOCRUpload({ availableSlotKeys, onConfirm, onCancel }: BillOCRUploadProps) {
  const [state, setState] = useState<UploadState>({ stage: 'idle' });
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(async (files: File[]) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'];
    const valid = files.filter((f) => allowed.includes(f.type) || f.name.match(/\.xlsx?$/i) != null);
    if (valid.length === 0) {
      setState({ stage: 'error', reason: 'Formato no soportado. Usa JPG, PNG, PDF o Excel.' });
      return;
    }

    const allPeriods: Map<string, ExtractedPeriod> = new Map();
    let lastBillData: ExtractedBill | null = null;
    let anyMock = false;

    for (let i = 0; i < valid.length; i++) {
      const file = valid[i];
      setState({ stage: 'loading', fileName: file.name, current: i + 1, total: valid.length });
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/parse-bill', { method: 'POST', body: formData });
        const json = await res.json() as
          | { ok: true; data: ExtractedBill; mock?: boolean }
          | { ok: false; message: string };

        if (!json.ok) {
          setState({ stage: 'error', reason: json.message });
          return;
        }

        if (json.mock) anyMock = true;
        lastBillData = json.data;

        for (const p of json.data.periods) {
          const key = slotKey(p.month, p.year);
          const existing = allPeriods.get(key);
          // Prefer the entry with more data (has variableAmountCLP)
          if (!existing || (!existing.variableAmountCLP && p.variableAmountCLP)) {
            allPeriods.set(key, { ...p });
          }
        }
      } catch {
        setState({ stage: 'error', reason: 'Error de conexión. Intenta nuevamente.' });
        return;
      }
    }

    if (!lastBillData) return;

    const edited = Array.from(allPeriods.values()).sort(
      (a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month,
    );
    // Solo cuentan los períodos que tienen kWh válido Y están dentro del rango
    const matchCount = edited.filter(
      (p) => p.consumptionKWh != null && availableSlotKeys.includes(slotKey(p.month, p.year)),
    ).length;
    const mergedBill: ExtractedBill = { ...lastBillData, periods: edited };

    setState({ stage: 'review', data: mergedBill, edited, matchCount, isMock: anyMock });
  }, [availableSlotKeys]);

  function handleChange(idx: number, field: keyof ExtractedPeriod, value: string) {
    if (state.stage !== 'review') return;
    const num = value === '' ? undefined : parseFloat(value);
    const updated = state.edited.map((p, i) =>
      i === idx ? { ...p, [field]: isNaN(num as number) ? undefined : num } : p
    );
    setState({ ...state, edited: updated });
  }

  function handleConfirm() {
    if (state.stage !== 'review') return;
    onConfirm(state.edited, state.matchCount, state.data);
  }

  // ── Idle: zona de upload ────────────────────────────────────────────────────

  if (state.stage === 'idle') {
    return (
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault(); setIsDragging(false);
          const files = Array.from(e.dataTransfer.files);
          if (files.length > 0) handleFiles(files);
        }}
        onClick={() => inputRef.current?.click()}
        className={[
          'border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors',
          isDragging ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-green-300 hover:bg-gray-50',
        ].join(' ')}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf,.xlsx,.xls"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length > 0) handleFiles(files);
          }}
        />
        <p className="text-2xl mb-2">📄</p>
        <p className="text-sm font-semibold text-gray-700">Arrastra tus boletas o haz clic para subir</p>
        <p className="text-xs text-gray-400 mt-1">JPG · PNG · PDF · Excel · Puedes subir varias a la vez</p>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onCancel(); }}
          className="mt-3 text-xs text-gray-400 hover:text-gray-600 underline"
        >
          Prefiero ingresar manualmente
        </button>
      </div>
    );
  }

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (state.stage === 'loading') {
    return (
      <div className="text-center py-8 bg-white rounded-2xl border border-gray-100">
        <div className="inline-block w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mb-3" />
        <p className="text-sm font-semibold text-gray-700">
          Analizando boleta{state.total > 1 ? ` ${state.current} de ${state.total}` : ''}...
        </p>
        <p className="text-xs text-gray-400 mt-1">{state.fileName}</p>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────

  if (state.stage === 'error') {
    return (
      <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
        <p className="text-sm font-semibold text-red-700 mb-1">No se pudo leer la boleta</p>
        <p className="text-xs text-red-500 mb-4">{state.reason}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setState({ stage: 'idle' })}
            className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 transition-colors"
          >
            Intentar con otro archivo
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium py-2 transition-colors"
          >
            Ingresar manualmente
          </button>
        </div>
      </div>
    );
  }

  // ── Review ──────────────────────────────────────────────────────────────────

  const { data, edited, matchCount, isMock } = state;
  const outsideRange = edited.filter((p) => !availableSlotKeys.includes(slotKey(p.month, p.year)));

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-sm font-bold text-gray-900">Datos extraídos</p>
          <span className={[
            'text-xs font-medium px-2 py-0.5 rounded-full',
            data.confidence === 'high' ? 'bg-green-100 text-green-700' :
            data.confidence === 'medium' ? 'bg-amber-100 text-amber-700' :
            'bg-red-100 text-red-600',
          ].join(' ')}>
            {data.confidence === 'high' ? 'Lectura clara' : data.confidence === 'medium' ? 'Lectura parcial' : 'Lectura dudosa'}
          </span>
        </div>

        {data.distribuidora && (
          <p className="text-xs text-gray-500">
            {data.distribuidora}{data.tarifa ? ` · Tarifa ${data.tarifa}` : ''}
          </p>
        )}

        {/* Resumen de coincidencias */}
        <div className={[
          'mt-3 rounded-xl px-3 py-2 text-xs font-medium',
          matchCount > 0 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700',
        ].join(' ')}>
          {matchCount > 0
            ? `${matchCount} mes${matchCount !== 1 ? 'es' : ''} coinciden con tu período de simulación y se pre-rellenarán.`
            : 'Ningún mes de esta boleta coincide con el período de tu simulación.'}
          {outsideRange.length > 0 && (
            <span className="text-gray-400 font-normal">
              {' '}({outsideRange.length} mes{outsideRange.length !== 1 ? 'es' : ''} fuera de rango, ignorado{outsideRange.length !== 1 ? 's' : ''})
            </span>
          )}
        </div>

        {isMock && (
          <p className="mt-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-2 py-1">
            Modo de prueba — datos simulados
          </p>
        )}
      </div>

      {/* Tabla de períodos dentro del rango */}
      {matchCount > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-[90px_1fr_1fr] gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <span>Mes</span>
            <span className="text-right">kWh</span>
            <span className="text-right">Monto ($)</span>
          </div>
          {edited
            .filter((p) => availableSlotKeys.includes(slotKey(p.month, p.year)))
            .map((p) => {
              const idx = edited.indexOf(p);
              return (
                <div key={slotKey(p.month, p.year)}
                  className={['grid grid-cols-[90px_1fr_1fr] gap-2 items-center px-4 py-2 border-b border-gray-50 last:border-0', p.isCurrent ? 'bg-green-50/30' : ''].join(' ')}
                >
                  <span className="text-xs text-gray-700 font-medium">
                    {MONTH_NAMES[p.month]} {p.year}
                    {p.isCurrent && <span className="ml-1 text-green-500">·</span>}
                  </span>
                  <input
                    type="number"
                    min="1"
                    value={p.consumptionKWh ?? ''}
                    onChange={(e) => handleChange(idx, 'consumptionKWh', e.target.value)}
                    className="w-full text-right rounded-lg border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 transition"
                  />
                  <input
                    type="number"
                    min="1"
                    value={p.variableAmountCLP ?? ''}
                    onChange={(e) => handleChange(idx, 'variableAmountCLP', e.target.value)}
                    placeholder="opcional"
                    className="w-full text-right rounded-lg border border-gray-200 px-2 py-1 text-sm placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 transition"
                  />
                </div>
              );
            })}
        </div>
      )}

      {/* Acciones */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={matchCount === 0}
          className={[
            'flex-1 rounded-xl font-semibold py-2.5 text-sm transition-colors',
            matchCount > 0
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed',
          ].join(' ')}
        >
          {matchCount > 0 ? `Confirmar ${matchCount} mes${matchCount !== 1 ? 'es' : ''}` : 'Sin coincidencias'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium py-2.5 text-sm transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
