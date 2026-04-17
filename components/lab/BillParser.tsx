'use client';

import { useState, useRef, useCallback } from 'react';
import type { ExtractedBill, ExtractedPeriod } from '@/app/api/parse-bill/route';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES: Record<number, string> = {
  1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril',
  5: 'Mayo', 6: 'Junio', 7: 'Julio', 8: 'Agosto',
  9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre',
};

function clp(n: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: 'CLP', maximumFractionDigits: 0,
  }).format(n);
}

// ─── Tipos de estado ──────────────────────────────────────────────────────────

type AppState =
  | { stage: 'idle' }
  | { stage: 'loading'; fileName: string }
  | { stage: 'review'; data: ExtractedBill; edited: ExtractedPeriod[]; isMock: boolean }
  | { stage: 'confirmed'; data: ExtractedBill; confirmed: ExtractedPeriod[] }
  | { stage: 'error'; reason: string };

// ─── UploadZone ───────────────────────────────────────────────────────────────

function UploadZone({ onFile }: { onFile: (f: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleFile(file: File) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      alert('Formato no soportado. Usa JPG, PNG o PDF.');
      return;
    }
    onFile(file);
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
      onClick={() => inputRef.current?.click()}
      className={[
        'border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors',
        isDragging ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-green-300 hover:bg-gray-50',
      ].join(' ')}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
      <div className="text-4xl mb-3">📄</div>
      <p className="text-base font-semibold text-gray-700">Arrastra tu boleta aquí</p>
      <p className="text-sm text-gray-400 mt-1">o haz clic para seleccionar un archivo</p>
      <p className="text-xs text-gray-300 mt-3">JPG · PNG · PDF</p>
    </div>
  );
}

// ─── LoadingState ─────────────────────────────────────────────────────────────

function LoadingState({ fileName }: { fileName: string }) {
  return (
    <div className="text-center py-12">
      <div className="inline-block w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mb-4" />
      <p className="text-base font-semibold text-gray-700">Analizando boleta...</p>
      <p className="text-sm text-gray-400 mt-1">{fileName}</p>
    </div>
  );
}

// ─── ConfidenceBadge ──────────────────────────────────────────────────────────

function ConfidenceBadge({ confidence }: { confidence: ExtractedBill['confidence'] }) {
  const s = {
    high:   'bg-green-100 text-green-700',
    medium: 'bg-amber-100 text-amber-700',
    low:    'bg-red-100 text-red-600',
  }[confidence];
  const l = { high: 'Lectura clara', medium: 'Lectura parcial', low: 'Lectura dudosa' }[confidence];
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s}`}>{l}</span>;
}

// ─── EmpalmeAlert ─────────────────────────────────────────────────────────────

function EmpalmeAlert({ potenciaKW }: { potenciaKW: number }) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3">
      <span className="text-xl shrink-0">⚡</span>
      <div>
        <p className="text-sm font-semibold text-blue-800">
          Potencia contratada (boleta): {potenciaKW} kW
        </p>
        <p className="text-xs text-blue-700 mt-0.5">
          Este valor es informativo. El tamaño máximo de la planta se calculará
          con el amperaje real del empalme que indiques en el formulario.
        </p>
      </div>
    </div>
  );
}

// ─── PeriodRow ────────────────────────────────────────────────────────────────

function PeriodRow({
  period, idx, onChange,
}: {
  period: ExtractedPeriod;
  idx: number;
  onChange: (idx: number, field: keyof ExtractedPeriod, value: string) => void;
}) {
  const derivedPrice = period.variableAmountCLP && period.consumptionKWh > 0
    ? Math.round(period.variableAmountCLP / period.consumptionKWh)
    : period.kWhPriceCLP;

  const hasHorario = period.tarifaPuntaCLPPerKWh || period.tarifaDiaCLPPerKWh || period.tarifaNocheCLPPerKWh;
  const hasInyeccion = period.energiaInyectadaKWh != null;

  return (
    <div className="flex flex-col gap-2 py-2 border-b border-gray-50 last:border-0">
      {/* Fila principal */}
      <div className="grid grid-cols-[110px_1fr_1fr_70px] gap-2 items-end">
        <div>
          <p className="text-xs text-gray-400 mb-1">Mes</p>
          <p className="text-sm font-medium text-gray-800">
            {MONTH_NAMES[period.month]} {period.year}
          </p>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Consumo (kWh)</label>
          <input
            type="number"
            value={period.consumptionKWh}
            onChange={(e) => onChange(idx, 'consumptionKWh', e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Monto variable ($)</label>
          <input
            type="number"
            value={period.variableAmountCLP ?? ''}
            onChange={(e) => onChange(idx, 'variableAmountCLP', e.target.value)}
            placeholder="opcional"
            className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-right placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition"
          />
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">$/kWh</p>
          <p className="text-sm text-gray-500 text-right">{derivedPrice ? `$${derivedPrice}` : '—'}</p>
        </div>
      </div>

      {/* Tarifas horarias */}
      {hasHorario && (
        <div className="grid grid-cols-3 gap-2 pl-1">
          {[
            { label: 'Punta', field: 'tarifaPuntaCLPPerKWh' as keyof ExtractedPeriod, value: period.tarifaPuntaCLPPerKWh, color: 'text-red-600' },
            { label: 'Día', field: 'tarifaDiaCLPPerKWh' as keyof ExtractedPeriod, value: period.tarifaDiaCLPPerKWh, color: 'text-amber-600' },
            { label: 'Noche', field: 'tarifaNocheCLPPerKWh' as keyof ExtractedPeriod, value: period.tarifaNocheCLPPerKWh, color: 'text-blue-600' },
          ].map(({ label, field, value, color }) => (
            <div key={label}>
              <label className={`text-xs font-medium mb-1 block ${color}`}>{label} ($/kWh)</label>
              <input
                type="number"
                value={value ?? ''}
                onChange={(e) => onChange(idx, field, e.target.value)}
                placeholder="—"
                className="w-full rounded-lg border border-gray-100 bg-gray-50 px-2 py-1 text-xs text-right placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-green-400 transition"
              />
            </div>
          ))}
        </div>
      )}

      {/* Inyección */}
      {hasInyeccion && (
        <div className="grid grid-cols-2 gap-2 pl-1">
          <div>
            <label className="text-xs font-medium text-green-600 mb-1 block">Energía inyectada (kWh)</label>
            <input
              type="number"
              value={period.energiaInyectadaKWh ?? ''}
              onChange={(e) => onChange(idx, 'energiaInyectadaKWh', e.target.value)}
              className="w-full rounded-lg border border-gray-100 bg-green-50 px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-green-400 transition"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-green-600 mb-1 block">Valor inyección ($/kWh)</label>
            <input
              type="number"
              value={period.valorInyeccionCLPPerKWh ?? ''}
              onChange={(e) => onChange(idx, 'valorInyeccionCLPPerKWh', e.target.value)}
              placeholder="—"
              className="w-full rounded-lg border border-gray-100 bg-green-50 px-2 py-1 text-xs text-right placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-green-400 transition"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ReviewState ──────────────────────────────────────────────────────────────

function ReviewState({
  data, edited, isMock, onChange, onConfirm, onDiscard,
}: {
  data: ExtractedBill;
  edited: ExtractedPeriod[];
  isMock: boolean;
  onChange: (idx: number, field: keyof ExtractedPeriod, value: string) => void;
  onConfirm: () => void;
  onDiscard: () => void;
}) {
  const currentPeriods = edited.filter((p) => p.isCurrent);
  const historical = edited.filter((p) => !p.isCurrent);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900">Datos extraídos de la boleta</h2>
          <p className="text-sm text-gray-500 mt-0.5">Revisa y corrige antes de confirmar.</p>
        </div>
        <ConfidenceBadge confidence={data.confidence} />
      </div>

      {isMock && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
          <strong>Modo de prueba:</strong> datos simulados. Con la API key de Anthropic configurada, la extracción será real.
        </div>
      )}

      {/* Alerta empalme */}
      {data.potenciaConectadaKW != null && (
        <EmpalmeAlert potenciaKW={data.potenciaConectadaKW} />
      )}

      {/* Datos del suministro */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Suministro</h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <p className="text-xs text-gray-400">Distribuidora</p>
            <p className="font-medium text-gray-900 mt-0.5">{data.distribuidora ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Tarifa</p>
            <p className="font-medium text-gray-900 mt-0.5">{data.tarifa ?? '—'}</p>
          </div>
          {data.direccionSuministro && (
            <div className="col-span-2">
              <p className="text-xs text-gray-400">Dirección del suministro</p>
              <p className="font-medium text-gray-900 mt-0.5">{data.direccionSuministro}</p>
            </div>
          )}
          {data.potenciaConectadaKW != null && (
            <div>
              <p className="text-xs text-gray-400">Potencia conectada</p>
              <p className="font-medium text-gray-900 mt-0.5">
                {data.potenciaConectadaKW} kW
                {data.amperajeA && <span className="text-gray-400 font-normal"> ({data.amperajeA} A)</span>}
              </p>
            </div>
          )}
          {(data.fechaLimiteCambioTarifa || data.fechaTerminoTarifa) && (
            <>
              {data.fechaLimiteCambioTarifa && (
                <div>
                  <p className="text-xs text-gray-400">Límite cambio de tarifa</p>
                  <p className="font-medium text-amber-700 mt-0.5">{data.fechaLimiteCambioTarifa}</p>
                </div>
              )}
              {data.fechaTerminoTarifa && (
                <div>
                  <p className="text-xs text-gray-400">Término de tarifa</p>
                  <p className="font-medium text-gray-900 mt-0.5">{data.fechaTerminoTarifa}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Período actual */}
      {currentPeriods.length > 0 && (
        <div className="bg-white rounded-2xl border-2 border-green-200 shadow-sm p-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Período actual
          </h3>
          {currentPeriods.map((p) => (
            <PeriodRow key={`${p.year}-${p.month}`} period={p} idx={edited.indexOf(p)} onChange={onChange} />
          ))}
        </div>
      )}

      {/* Historial */}
      {historical.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
            Historial — {historical.length} mes{historical.length !== 1 ? 'es' : ''}
          </h3>
          {historical.map((p) => (
            <PeriodRow key={`${p.year}-${p.month}`} period={p} idx={edited.indexOf(p)} onChange={onChange} />
          ))}
        </div>
      )}

      {data.notes && (
        <p className="text-xs text-gray-400 px-1">{data.notes}</p>
      )}

      {/* Acciones */}
      <div className="flex flex-col gap-2 pt-1">
        <button
          type="button"
          onClick={onConfirm}
          className="w-full rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold py-3 text-sm transition-colors"
        >
          Confirmar datos extraídos
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="w-full rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium py-2.5 text-sm transition-colors"
        >
          Descartar e ingresar manualmente
        </button>
      </div>
    </div>
  );
}

// ─── ConfirmedState ───────────────────────────────────────────────────────────

function ConfirmedState({ data, confirmed, onReset }: {
  data: ExtractedBill;
  confirmed: ExtractedPeriod[];
  onReset: () => void;
}) {
  const current = confirmed.find((p) => p.isCurrent);
  const hasInyeccion = confirmed.some((p) => p.energiaInyectadaKWh != null);
  const avgInyeccion = hasInyeccion
    ? confirmed.filter((p) => p.valorInyeccionCLPPerKWh).reduce((s, p, _, arr) =>
        s + (p.valorInyeccionCLPPerKWh ?? 0) / arr.length, 0)
    : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-green-50 border border-green-100 rounded-2xl p-5 text-center">
        <p className="text-3xl mb-2">✅</p>
        <p className="text-base font-bold text-green-800">Datos confirmados</p>
        <p className="text-sm text-green-700 mt-1">
          {confirmed.length} mes{confirmed.length !== 1 ? 'es' : ''} registrado{confirmed.length !== 1 ? 's' : ''}
          {current && ` · Período actual: ${MONTH_NAMES[current.month]} ${current.year}`}
        </p>
      </div>

      {/* Potencia contratada — solo informativa */}
      {data.potenciaConectadaKW != null && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm">
          <p className="font-semibold text-blue-800 mb-1">Potencia contratada (boleta)</p>
          <p className="text-blue-700 text-xs">
            <strong>{data.potenciaConectadaKW} kW</strong> — solo referencial.
            El kit máximo se determinará con el amperaje del empalme físico informado en el formulario.
          </p>
        </div>
      )}

      {/* Resumen inyección real */}
      {avgInyeccion != null && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-sm">
          <p className="font-semibold text-emerald-800 mb-1">Valor real de inyección detectado</p>
          <p className="text-emerald-700 text-xs">
            Promedio: <strong>{clp(Math.round(avgInyeccion))}/kWh</strong> —
            se usará en lugar del 50% estimado.
          </p>
        </div>
      )}

      {/* Tabla resumen */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-[1fr_60px_110px_60px] gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <span>Mes</span>
          <span className="text-right">kWh</span>
          <span className="text-right">Monto</span>
          <span className="text-right">$/kWh</span>
        </div>
        {confirmed.map((p) => {
          const price = p.variableAmountCLP && p.consumptionKWh > 0
            ? Math.round(p.variableAmountCLP / p.consumptionKWh)
            : p.kWhPriceCLP;
          return (
            <div
              key={`${p.year}-${p.month}`}
              className={[
                'grid grid-cols-[1fr_60px_110px_60px] gap-2 px-4 py-2 border-b border-gray-50 last:border-0 text-sm',
                p.isCurrent ? 'bg-green-50/40 font-medium' : '',
              ].join(' ')}
            >
              <span className="text-gray-800">
                {MONTH_NAMES[p.month]} {p.year}
                {p.isCurrent && <span className="ml-1.5 text-xs text-green-600 font-normal">actual</span>}
                {p.energiaInyectadaKWh != null && (
                  <span className="ml-1.5 text-xs text-emerald-500 font-normal">
                    +{p.energiaInyectadaKWh} kWh inj.
                  </span>
                )}
              </span>
              <span className="text-right text-gray-700">{p.consumptionKWh}</span>
              <span className="text-right text-gray-500">{p.variableAmountCLP ? clp(p.variableAmountCLP) : '—'}</span>
              <span className="text-right text-gray-400">{price ? `$${price}` : '—'}</span>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 text-center">
        En el wizard completo estos datos pre-rellenarían la tabla de boletas.
      </p>

      <button
        type="button"
        onClick={onReset}
        className="w-full rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium py-2.5 text-sm transition-colors"
      >
        Probar con otra boleta
      </button>
    </div>
  );
}

// ─── ErrorState ───────────────────────────────────────────────────────────────

function ErrorState({ reason, onReset }: { reason: string; onReset: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-red-50 border border-red-100 rounded-2xl p-5 text-center">
        <p className="text-3xl mb-2">⚠️</p>
        <p className="text-base font-bold text-red-800">No se pudo leer la boleta</p>
        <p className="text-sm text-red-600 mt-1">{reason}</p>
      </div>
      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm text-gray-600">
        <p className="font-medium mb-1">Sugerencias:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-500">
          <li>Asegúrate de que la imagen esté bien iluminada y enfocada</li>
          <li>Intenta con el PDF original en lugar de una foto</li>
          <li>O ingresa los datos manualmente</li>
        </ul>
      </div>
      <button
        type="button"
        onClick={onReset}
        className="w-full rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 text-sm transition-colors"
      >
        Intentar con otro archivo
      </button>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function BillParser() {
  const [state, setState] = useState<AppState>({ stage: 'idle' });

  const handleFile = useCallback(async (file: File) => {
    setState({ stage: 'loading', fileName: file.name });
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/parse-bill', { method: 'POST', body: formData });
      const json = await res.json() as
        | { ok: true; data: ExtractedBill; mock?: boolean }
        | { ok: false; reason: string; message: string };

      if (!json.ok) {
        setState({ stage: 'error', reason: json.message });
        return;
      }
      setState({
        stage: 'review',
        data: json.data,
        edited: json.data.periods.map((p) => ({ ...p })),
        isMock: json.mock ?? false,
      });
    } catch {
      setState({ stage: 'error', reason: 'Error de conexión al servidor de análisis.' });
    }
  }, []);

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
    setState({ stage: 'confirmed', data: state.data, confirmed: state.edited });
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      {state.stage === 'idle'    && <UploadZone onFile={handleFile} />}
      {state.stage === 'loading' && <LoadingState fileName={state.fileName} />}
      {state.stage === 'review'  && (
        <ReviewState
          data={state.data}
          edited={state.edited}
          isMock={state.isMock}
          onChange={handleChange}
          onConfirm={handleConfirm}
          onDiscard={() => setState({ stage: 'idle' })}
        />
      )}
      {state.stage === 'confirmed' && (
        <ConfirmedState
          data={state.data}
          confirmed={state.confirmed}
          onReset={() => setState({ stage: 'idle' })}
        />
      )}
      {state.stage === 'error' && (
        <ErrorState reason={state.reason} onReset={() => setState({ stage: 'idle' })} />
      )}
    </div>
  );
}
