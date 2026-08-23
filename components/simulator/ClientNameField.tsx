'use client';

import { useMemo, useRef, useState } from 'react';
import type { SimulatorClientOption } from '@/lib/db/clients';

// Campo de nombre con autocompletado de clientes del CRM (solo back-office).
//
// Escribes y aparecen los clientes que calzan. Al elegir uno se cargan sus
// datos y los de su instalación; si tiene varias, primero pregunta cuál. Si el
// nombre no calza con nadie, se comporta como un campo de texto normal: es un
// cliente nuevo y se creará recién al generar la cotización.

type Installation = SimulatorClientOption['installations'][number];

const inputCls =
  'w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:border-[#389fe0] focus:ring-1 focus:ring-[#389fe0] outline-none';

export default function ClientNameField({
  label, id, value, onChange, placeholder, required,
  clients, matchOn, selected, onPickClient, onClearClient,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  clients?: SimulatorClientOption[];
  /** Qué campo del cliente se muestra como nombre principal. */
  matchOn: 'nombre' | 'empresa';
  /** Cliente ya vinculado a esta simulación, si hay. */
  selected?: { nombre: string; instalacion?: string | null } | null;
  onPickClient?: (client: SimulatorClientOption, installation: Installation | null) => void;
  onClearClient?: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  // Cliente elegido a la espera de que se defina la instalación.
  const [pendiente, setPendiente] = useState<SimulatorClientOption | null>(null);
  // Cliente elegido que ya tiene simulaciones: primero se pregunta si se
  // retoma una o se parte de cero, porque rehacerla a mano es el error caro.
  const [conHistorial, setConHistorial] = useState<SimulatorClientOption | null>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const etiqueta = (c: SimulatorClientOption) =>
    matchOn === 'empresa' ? (c.empresa || c.nombre) : c.nombre;

  const sugerencias = useMemo(() => {
    if (!clients || !value.trim() || value.trim().length < 2) return [];
    const q = value.trim().toLowerCase();
    const nombreDe = (c: SimulatorClientOption) =>
      matchOn === 'empresa' ? (c.empresa || c.nombre) : c.nombre;
    return clients
      .filter((c) => `${c.nombre} ${c.empresa ?? ''} ${c.email ?? ''}`.toLowerCase().includes(q))
      // Si el texto ya es exactamente un cliente elegido, no vale sugerirlo de nuevo.
      .filter((c) => nombreDe(c).toLowerCase() !== q)
      .slice(0, 6);
  }, [clients, value, matchOn]);

  function elegirCliente(c: SimulatorClientOption) {
    if (c.simulations.length > 0) {
      setConHistorial(c);
      setAbierto(false);
      return;
    }
    continuarConCliente(c);
  }

  function continuarConCliente(c: SimulatorClientOption) {
    setConHistorial(null);
    if (c.installations.length > 1) {
      setPendiente(c);      // hay que preguntar cuál instalación
      setAbierto(false);
      return;
    }
    onPickClient?.(c, c.installations[0] ?? null);
    setAbierto(false);
    setPendiente(null);
  }

  function elegirInstalacion(inst: Installation | null) {
    if (pendiente) onPickClient?.(pendiente, inst);
    setPendiente(null);
  }

  const mostrarLista = abierto && sugerencias.length > 0 && !pendiente && !conHistorial;

  const fechaHora = (iso: string) =>
    new Date(iso).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const clp = (n: number | null) =>
    n == null ? '—' : new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-[#389fe0] ml-0.5">*</span>}
      </label>

      <div className="relative">
        <input
          id={id}
          type="text"
          value={value}
          required={required}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(e) => { onChange(e.target.value); setAbierto(true); }}
          onFocus={() => setAbierto(true)}
          // El blur se posterga: si no, el clic en una sugerencia cierra la
          // lista antes de que el clic llegue a registrarse.
          onBlur={() => { blurTimer.current = setTimeout(() => setAbierto(false), 150); }}
          className={inputCls}
        />

        {mostrarLista && (
          <ul className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
            {sugerencias.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onMouseDown={() => { if (blurTimer.current) clearTimeout(blurTimer.current); }}
                  onClick={() => elegirCliente(c)}
                  className="w-full text-left px-4 py-2.5 hover:bg-[#eaf4fb] transition-colors">
                  <span className="text-sm text-gray-900 block">{etiqueta(c)}</span>
                  <span className="text-xs text-gray-400">
                    {[c.email, c.installations.length
                      ? `${c.installations.length} instalación${c.installations.length > 1 ? 'es' : ''}`
                      : 'sin instalaciones'].filter(Boolean).join(' · ')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Cliente con simulaciones previas: retomar una o empezar de cero */}
      {conHistorial && (
        <div className="rounded-xl border border-[#b0cedd] bg-[#eaf4fb] p-3 flex flex-col gap-2">
          <p className="text-xs font-medium text-[#1d65c5]">
            {etiqueta(conHistorial)} ya tiene {conHistorial.simulations.length} simulación
            {conHistorial.simulations.length > 1 ? 'es' : ''} guardada
            {conHistorial.simulations.length > 1 ? 's' : ''}. ¿Retomas una o empiezas de cero?
          </p>
          {conHistorial.simulations.slice(0, 5).map((sim) => (
            <a key={sim.id}
              href={`/admin/simulator?simulacion=${sim.id}`}
              className="text-left rounded-lg bg-white border border-gray-200 px-3 py-2 hover:border-[#389fe0] transition-colors block"
            >
              <span className="text-sm text-gray-800 block">
                PFV {sim.kit_size_kwp ?? '—'} kW
                {sim.battery_kwh > 0 && ` · ${sim.battery_kwh} kWh batería`}
                <span className="text-gray-400 font-normal"> · {clp(sim.annual_benefit_clp)}/año</span>
              </span>
              <span className="text-xs text-gray-400">
                Simulada el {fechaHora(sim.fecha_simulacion)}
                {sim.fecha_boleta && ` · boleta de ${sim.fecha_boleta}`}
              </span>
            </a>
          ))}
          <button type="button" onClick={() => continuarConCliente(conHistorial)}
            className="text-left rounded-lg border border-dashed border-gray-300 px-3 py-2 text-xs text-gray-600 hover:border-[#389fe0] hover:text-[#1d65c5] transition-colors">
            Empezar una simulación nueva con sus datos
          </button>
        </div>
      )}

      {/* Cliente con varias instalaciones: hay que elegir una */}
      {pendiente && (
        <div className="rounded-xl border border-[#b0cedd] bg-[#eaf4fb] p-3 flex flex-col gap-1.5">
          <p className="text-xs font-medium text-[#1d65c5]">
            ¿Qué instalación de {etiqueta(pendiente)} quieres simular?
          </p>
          {pendiente.installations.map((inst) => (
            <button key={inst.id} type="button" onClick={() => elegirInstalacion(inst)}
              className="text-left rounded-lg bg-white border border-gray-200 px-3 py-2 hover:border-[#389fe0] transition-colors">
              <span className="text-sm text-gray-800 block">{inst.nombre_instalacion}</span>
              <span className="text-xs text-gray-400">
                {[inst.comuna, inst.customer_type === 'business' ? 'empresa' : 'residencial']
                  .filter(Boolean).join(' · ')}
              </span>
            </button>
          ))}
          <button type="button" onClick={() => elegirInstalacion(null)}
            className="text-left text-xs text-gray-500 hover:text-[#1d65c5] px-1 py-1">
            Ninguna — usar solo los datos del cliente
          </button>
        </div>
      )}

      {/* Confirmación de que la simulación quedó ligada a un cliente del CRM */}
      {selected && !pendiente && !conHistorial && (
        <p className="text-xs text-[#1d65c5] flex items-center gap-2">
          <span>✓ {selected.nombre} — datos cargados desde el CRM</span>
          {onClearClient && (
            <button type="button" onClick={onClearClient} className="text-gray-400 hover:text-gray-600 underline">
              desvincular
            </button>
          )}
        </p>
      )}
    </div>
  );
}
