'use client';

import { useState, useTransition } from 'react';
import { createQuoteFromSimulation, type SimulationClientData } from '@/app/admin/quotes/actions';

// Cierra el ciclo simular → cotizar. Toma el escenario que el usuario tiene
// activo y crea la cotización con ese kit ya cargado, para terminar de
// ajustarla (descuento, validez, notas) en el editor de cotizaciones de
// siempre. Solo se monta en el back-office.

const clp = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

export default function QuoteFromSimulation({
  clientId, installationId, clientData,
  escenario, escenarioLabel,
  kitSizeKWp, kitPanelCount, kitPriceNetoCLP,
  batteryKWh, batteryModules, batteryCostNetoCLP,
  simulationData,
}: {
  clientId?: string;
  installationId?: string | null;
  clientData: SimulationClientData;
  escenario: string;
  escenarioLabel: string;
  kitSizeKWp: number;
  kitPanelCount: number;
  kitPriceNetoCLP: number;
  batteryKWh?: number;
  batteryModules?: number;
  batteryCostNetoCLP?: number;
  simulationData?: Record<string, unknown>;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Cotizaciones creadas desde esta simulación. Se acumulan porque un mismo
  // escenario puede cotizarse y luego cotizarse otro (con batería, por ejemplo).
  const [creadas, setCreadas] = useState<Array<{ id: string; numero: string | null; escenario: string }>>([]);
  const conBateria = !!batteryCostNetoCLP && batteryCostNetoCLP > 0;
  const totalNeto = kitPriceNetoCLP + (batteryCostNetoCLP ?? 0);

  function crear() {
    if (!clientData.nombre?.trim()) { setError('Falta el nombre del cliente'); return; }
    setError(null);
    start(async () => {
      const res = await createQuoteFromSimulation({
        clientId,
        installationId: installationId ?? null,
        clientData,
        escenario, escenarioLabel,
        kitSizeKWp, kitPanelCount, kitPriceNetoCLP,
        batteryKWh, batteryModules, batteryCostNetoCLP,
        simulationData,
      });
      if (res?.error) { setError(res.error); return; }
      // No se navega a propósito: irse de la página borraba la simulación, que
      // vive en memoria, y había que rehacerla entera para cotizar otro escenario.
      setCreadas((prev) => [...prev, { id: res.quoteId!, numero: res.quoteNumber ?? null, escenario: escenarioLabel }]);
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
      <p className="text-sm font-semibold text-gray-900">Crear cotización con este escenario</p>
      <p className="text-xs text-gray-500 mt-0.5">
        Se cotiza el escenario que estás viendo ({escenarioLabel}). Después puedes ajustar
        descuento, validez y notas en el editor.
      </p>

      {/* Vista previa de los ítems que se van a crear */}
      <div className="mt-3 rounded-xl bg-gray-50 border border-gray-100 divide-y divide-gray-100">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs text-gray-600">
            Planta fotovoltaica {kitSizeKWp} kW on-grid — {kitPanelCount} paneles
          </span>
          <span className="text-xs font-medium text-gray-900 tabular-nums">{clp(kitPriceNetoCLP)}</span>
        </div>
        {conBateria && (
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs text-gray-600">
              Banco de baterías {batteryKWh} kWh
              {batteryModules ? ` — ${batteryModules} módulo${batteryModules > 1 ? 's' : ''}` : ''}
            </span>
            <span className="text-xs font-medium text-gray-900 tabular-nums">{clp(batteryCostNetoCLP!)}</span>
          </div>
        )}
        <div className="flex items-center justify-between px-3 py-2 bg-white">
          <span className="text-xs font-semibold text-gray-700">Total neto</span>
          <span className="text-sm font-bold text-[#1d65c5] tabular-nums">{clp(totalNeto)}</span>
        </div>
      </div>
      <p className="text-[11px] text-gray-400 mt-1.5">
        Los valores son netos; el IVA se agrega en la cotización.
      </p>

      {/* Qué va a pasar con la ficha del cliente */}
      <p className="text-xs text-gray-500 mt-3">
        {clientId
          ? `Se cotiza a ${clientData.nombre}. Los datos que completaste se guardan en su ficha.`
          : `Se creará la ficha de ${clientData.nombre || 'este cliente'} en el CRM con los datos del simulador (si ya existe, se reutiliza).`}
      </p>

      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

      {/* Cotizaciones ya generadas desde esta simulación */}
      {creadas.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5">
          {creadas.map((c) => (
            <div key={c.id} className="rounded-xl bg-green-50 border border-green-200 px-3 py-2 flex items-center justify-between gap-3 flex-wrap">
              <span className="text-xs text-green-800">
                ✓ {c.numero ?? 'Cotización'} creada · {c.escenario}
              </span>
              {/* En pestaña nueva a propósito: abrirla en la misma dejaba la
                  simulación atrás, que es justo lo que se quiere evitar. */}
              <a href={`/admin/quotes/${c.id}`} target="_blank" rel="noopener noreferrer"
                className="text-xs font-semibold text-[#1d65c5] hover:underline whitespace-nowrap">
                Abrir cotización ↗
              </a>
            </div>
          ))}
          <p className="text-[11px] text-gray-400">
            La cotización se abre en una pestaña nueva: esta simulación no se pierde. Puedes cambiar de escenario y cotizar otro sin rehacerla.
          </p>
        </div>
      )}

      <button
        onClick={crear}
        disabled={pending || !clientData.nombre?.trim()}
        className="mt-3 w-full rounded-xl bg-[#010101] hover:bg-[#1d65c5] text-white text-sm font-semibold px-4 py-3 transition-colors disabled:opacity-50">
        {pending ? 'Creando cotización…' : creadas.length > 0 ? 'Crear otra cotización con este escenario' : 'Crear cotización'}
      </button>
    </div>
  );
}
