'use client';

import { useState, useTransition } from 'react';
import { guardarSimulacion, type GuardarSimulacionPayload } from '@/app/admin/simulator/actions';
import type { SimulacionPrevia } from '@/lib/db/simulations';

// Guardar la simulación en la ficha del cliente. Es explícito y no automático:
// así las pruebas exploratorias no crean fichas basura en el CRM.
// Si la boleta ya se simuló antes, avisa y ofrece abrir la anterior.

const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const clp = (n: number | null | undefined) =>
  n == null ? '—' : new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

export default function SaveSimulation({
  payload, clienteNombre, yaGuardada, onGuardada,
}: {
  payload: GuardarSimulacionPayload;
  clienteNombre: string;
  /** Id si esta simulación ya se guardó en esta sesión (evita duplicar sin querer). */
  yaGuardada: string | null;
  onGuardada: (id: string) => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [duplicada, setDuplicada] = useState<SimulacionPrevia | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);

  // Al corregir una simulación reabierta la boleta es la misma a propósito, así
  // que el payload ya trae confirmarDuplicado: no debe pisarse con el del botón.
  const esCorreccion = !!payload.corrigeId;

  function guardar(confirmarDuplicado = false) {
    setError(null);
    start(async () => {
      const res = await guardarSimulacion({
        ...payload,
        confirmarDuplicado: confirmarDuplicado || !!payload.confirmarDuplicado,
      });
      if (res.error) { setError(res.error); return; }
      if (res.duplicada) {
        setDuplicada(res.duplicada);
        setClientId(res.clientId ?? null);
        return;
      }
      setDuplicada(null);
      if (res.simulationId) onGuardada(res.simulationId);
    });
  }

  // ── Ya guardada ────────────────────────────────────────────────────────────
  if (yaGuardada) {
    return (
      <div className="bg-white rounded-2xl border border-green-200 shadow-sm p-4">
        <div className="rounded-xl bg-green-50 border border-green-200 px-3 py-2.5 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-sm text-green-800 font-medium">
            ✓ {esCorreccion ? 'Corrección guardada' : 'Simulación guardada'} en la ficha de {clienteNombre}
          </span>
          {clientId && (
            <a href={`/admin/clients/${clientId}`} target="_blank" rel="noopener noreferrer"
              className="text-xs font-semibold text-[#1d65c5] hover:underline whitespace-nowrap">
              Ver ficha del cliente ↗
            </a>
          )}
        </div>
        <p className="text-[11px] text-gray-400 mt-2">
          Si corriges algo y vuelves a guardar, se creará una simulación nueva con su propia
          fecha y hora — la anterior no se pierde.
        </p>
        <button
          onClick={() => guardar(true)}
          disabled={pending}
          className="mt-2 text-xs font-medium text-[#1d65c5] hover:underline disabled:opacity-60"
        >
          {pending ? 'Guardando…' : 'Guardar de nuevo como versión corregida'}
        </button>
      </div>
    );
  }

  // ── Aviso de boleta ya simulada ────────────────────────────────────────────
  if (duplicada) {
    return (
      <div className="bg-white rounded-2xl border border-amber-300 shadow-sm p-4">
        <p className="text-sm font-semibold text-amber-800">
          ⚠️ Esta boleta ya la simulaste antes
        </p>
        <p className="text-xs text-gray-600 mt-1">
          {duplicada.motivo === 'numero'
            ? `Coincide el número de boleta (${duplicada.numero_boleta}).`
            : `Coincide el período de la boleta (${duplicada.fecha_boleta}).`}
        </p>
        <div className="mt-2 rounded-xl bg-gray-50 border border-gray-100 px-3 py-2 text-xs text-gray-600">
          Simulada el <strong>{fechaHora(duplicada.fecha_simulacion)}</strong> ·
          PFV {duplicada.kit_size_kwp ?? '—'} kW · ahorro {clp(duplicada.annual_benefit_clp)}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={`/admin/clients/${clientId ?? ''}?tab=simulaciones`}
            target="_blank" rel="noopener noreferrer"
            className="rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium px-4 py-2.5 transition-colors"
          >
            Ver la simulación anterior ↗
          </a>
          <button
            onClick={() => guardar(true)}
            disabled={pending}
            className="rounded-xl bg-[#010101] hover:bg-[#1d65c5] text-white text-sm font-semibold px-4 py-2.5 transition-colors disabled:opacity-60"
          >
            {pending ? 'Guardando…' : 'Guardar igual como versión nueva'}
          </button>
          <button
            onClick={() => setDuplicada(null)}
            className="text-sm text-gray-500 hover:text-gray-700 px-2"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  // ── Estado normal ──────────────────────────────────────────────────────────
  const nBoletas = payload.boletas?.length ?? 0;
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
      <p className="text-sm font-semibold text-gray-900">
        {esCorreccion ? 'Guardar la corrección' : 'Guardar simulación en la ficha'}
      </p>
      <p className="text-xs text-gray-500 mt-0.5">
        {esCorreccion && 'Se guarda como versión nueva; la original queda intacta. '}
        Queda en el historial de {clienteNombre || 'el cliente'} con la fecha y hora de hoy
        {payload.fechaBoleta && `, asociada a la boleta de ${payload.fechaBoleta}`}.
        {nBoletas > 0 && ` Se archivan también ${nBoletas} boleta${nBoletas > 1 ? 's' : ''} subida${nBoletas > 1 ? 's' : ''}.`}
      </p>
      {!payload.clientId && (
        <p className="text-xs text-gray-500 mt-1.5">
          Se creará la ficha de {payload.clientData.nombre || 'este cliente'} y su instalación
          (si ya existen, se reutilizan).
        </p>
      )}

      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

      <button
        onClick={() => guardar(false)}
        disabled={pending || !payload.clientData.nombre?.trim()}
        className="mt-3 w-full rounded-xl border-2 border-[#389fe0] bg-white hover:bg-[#eaf4fb] text-[#1d65c5] text-sm font-semibold px-4 py-3 transition-colors disabled:opacity-50"
      >
        {pending ? 'Guardando…' : esCorreccion ? '💾 Guardar como versión corregida' : '💾 Guardar simulación'}
      </button>
    </div>
  );
}
