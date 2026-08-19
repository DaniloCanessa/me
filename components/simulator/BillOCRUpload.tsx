'use client';

import { useState, useRef, useCallback } from 'react';
import type { ExtractedBill, ExtractedPeriod } from '@/app/api/parse-bill/route';

// ─── Props ────────────────────────────────────────────────────────────────────

interface BillOCRUploadProps {
  /** Slots disponibles en la tabla (para informar cuántos coinciden) */
  availableSlotKeys: string[];          // ["2026-03", "2026-02", ...]
  onConfirm: (periods: ExtractedPeriod[], matchCount: number, billData: ExtractedBill, isMock: boolean, archivadas: BoletaArchivadaLocal[]) => void;
  onCancel: () => void;
}

// Boleta que quedó archivada en el bucket al procesarla, para poder guardarla
// junto a la simulación en la ficha del cliente.
export type BoletaArchivadaLocal = {
  filePath: string;
  fileName: string | null;
  contentType: string | null;
};

// ─── Tipos de estado ──────────────────────────────────────────────────────────

type UploadState =
  | { stage: 'idle' }
  | { stage: 'loading'; fileName: string; current: number; total: number }
  | { stage: 'error'; reason: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    const archivadas: BoletaArchivadaLocal[] = [];

    for (let i = 0; i < valid.length; i++) {
      const file = valid[i];
      setState({ stage: 'loading', fileName: file.name, current: i + 1, total: valid.length });
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/parse-bill', { method: 'POST', body: formData });
        const json = await res.json() as
          | { ok: true; data: ExtractedBill; mock?: boolean; storagePath?: string | null; fileName?: string | null }
          | { ok: false; message: string };

        if (!json.ok) {
          setState({ stage: 'error', reason: json.message });
          return;
        }

        if (json.mock) anyMock = true;
        lastBillData = json.data;
        if (json.storagePath) {
          archivadas.push({ filePath: json.storagePath, fileName: json.fileName ?? file.name, contentType: file.type || null });
        }

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

    // Antes esto abría una pantalla de revisión con su propio "Confirmar N
    // meses". Era revisar dos veces la misma grilla: ahora se vuelca directo a
    // la tabla de 12 meses, donde igual se iba a revisar y corregir.
    onConfirm(edited, matchCount, mergedBill, anyMock, archivadas);
  }, [availableSlotKeys, onConfirm]);

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
          isDragging ? 'border-[#389fe0] bg-[#dde3e9]/50' : 'border-gray-200 hover:border-[#b0cedd] hover:bg-gray-50',
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
        <div className="inline-block w-8 h-8 border-4 border-[#b0cedd]/40 border-t-[#389fe0] rounded-full animate-spin mb-3" />
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

  // Ya no hay etapa de revisión: al terminar la lectura los meses se vuelcan
  // directo a la tabla de 12 meses y ahí se corrigen. Este punto solo se
  // alcanza en el instante entre que termina el OCR y el padre cierra el panel.
  return null;
}
