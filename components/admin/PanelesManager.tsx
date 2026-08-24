'use client';

import { useState, useTransition } from 'react';
import type { SolarPanel } from '@/lib/types';
import type { KitConPanel } from '@/lib/db/panels';
import { guardarPanel, eliminarPanel, asignarPanel } from '@/app/admin/paneles/actions';

// ─── Catálogo de paneles y asignación a kits ─────────────────────────────────
//
// Dos bloques: la matriz kits × paneles (lo que se mira a diario) y el alta de
// paneles debajo. La matriz manda porque el problema que resuelve esta pantalla
// es que un kit quede sin panel o con uno que no corresponde.

const inputCls =
  'w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-[#389fe0] focus:ring-1 focus:ring-[#389fe0] outline-none';

const kwp = (paneles: number, potenciaW: number) =>
  Math.round((paneles * potenciaW) / 10) / 100;

const FORM_VACIO = {
  id: '', nombre: '', potenciaW: '', pesoKg: '', anchoMm: '', largoMm: '', espesorMm: '',
};

export default function PanelesManager({
  panels, kits,
}: {
  panels: SolarPanel[];
  kits: KitConPanel[];
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [abierto, setAbierto] = useState(false);
  // Marca qué celda se está guardando, para no bloquear la tabla entera.
  const [guardando, setGuardando] = useState<string | null>(null);

  const set = (k: keyof typeof FORM_VACIO) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function enviarPanel(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null); setAviso(null);
    start(async () => {
      const res = await guardarPanel(fd);
      if (res.error) { setError(res.error); return; }
      setForm(FORM_VACIO);
      setAbierto(false);
      setAviso('Panel guardado.');
    });
  }

  function editar(p: SolarPanel) {
    setForm({
      id: p.id,
      nombre: p.nombre,
      potenciaW: String(p.potenciaW),
      pesoKg: p.pesoKg == null ? '' : String(p.pesoKg),
      anchoMm: String(p.anchoMm),
      largoMm: String(p.largoMm),
      espesorMm: p.espesorMm == null ? '' : String(p.espesorMm),
    });
    setAbierto(true);
    setError(null); setAviso(null);
  }

  function borrar(p: SolarPanel) {
    setError(null); setAviso(null);
    start(async () => {
      const res = await eliminarPanel(p.id);
      // El mensaje de la capa de datos nombra los kits que hay que reasignar,
      // que es lo único accionable cuando el borrado se rechaza.
      if (res.error) { setError(res.error); return; }
      setAviso(`Panel "${p.nombre}" eliminado.`);
    });
  }

  function asignar(kit: KitConPanel, panelId: string) {
    if (kit.panelId === panelId) return;   // ya está marcado: no hay nada que hacer
    setError(null); setAviso(null);
    setGuardando(kit.id);
    start(async () => {
      const res = await asignarPanel(kit.id, panelId);
      setGuardando(null);
      if (res.error) setError(res.error);
    });
  }

  const sinPanel = kits.filter((k) => !k.panelId);

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {aviso && !error && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {aviso}
        </div>
      )}

      {sinPanel.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>{sinPanel.length} kit{sinPanel.length > 1 ? 's' : ''} sin panel asignado:</strong>{' '}
          {sinPanel.map((k) => k.nombre).join(', ')}. Mientras no tengan uno, el simulador usa la
          potencia del nombre comercial en vez de calcularla desde los componentes.
        </div>
      )}

      {/* ── Matriz kits × paneles ───────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Panel de cada kit</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Marca con qué panel se arma cada kit. Cada kit usa uno solo, así que marcar otro
            reemplaza al anterior. La potencia real sale de multiplicar los paneles del kit por
            la potencia del panel.
          </p>
        </div>

        {panels.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-500 text-center">
            Todavía no hay paneles. Agrega el primero más abajo y aparecerá como columna.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left font-semibold text-gray-700 px-5 py-3 sticky left-0 bg-gray-50 min-w-[220px]">
                    Kits
                  </th>
                  {panels.map((p) => (
                    <th key={p.id} className="px-4 py-3 text-center font-semibold text-gray-700 whitespace-nowrap">
                      <span className="text-[#1d65c5]">{p.potenciaW} W</span>
                      <span className="block text-xs font-medium text-gray-500">{p.nombre}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {kits.map((kit) => (
                  <tr key={kit.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                    <td className="px-5 py-3 sticky left-0 bg-white">
                      <span className="font-medium text-gray-900">{kit.nombre}</span>
                      <span className="block text-xs text-gray-400">
                        {kit.panelCount} panel{kit.panelCount === 1 ? '' : 'es'}
                        {(() => {
                          const p = panels.find((x) => x.id === kit.panelId);
                          if (!p) return ' · sin panel';
                          const real = kwp(kit.panelCount, p.potenciaW);
                          return ` · ${real} kW real${
                            real !== kit.nominalKWp ? ` (nombre: ${kit.nominalKWp} kW)` : ''
                          }`;
                        })()}
                      </span>
                    </td>
                    {panels.map((p) => (
                      <td key={p.id} className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={kit.panelId === p.id}
                          disabled={pending && guardando === kit.id}
                          onChange={() => asignar(kit, p.id)}
                          aria-label={`${kit.nombre} con panel ${p.nombre} de ${p.potenciaW} W`}
                          className="w-4 h-4 accent-[#1d65c5] cursor-pointer disabled:opacity-40"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Catálogo de paneles ─────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Paneles</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Ordenados de menor a mayor potencia — el mismo orden de las columnas de arriba.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setForm(FORM_VACIO); setAbierto((v) => !v); setError(null); }}
            className="rounded-xl bg-[#010101] hover:bg-[#1d65c5] text-white text-sm font-semibold px-4 py-2.5 transition-colors"
          >
            {abierto && !form.id ? 'Cancelar' : '+ Agregar panel'}
          </button>
        </div>

        {abierto && (
          <form onSubmit={enviarPanel} className="px-5 py-4 border-b border-gray-100 bg-gray-50/60">
            <input type="hidden" name="id" value={form.id} />
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <div className="col-span-2">
                <label htmlFor="nombre" className="text-xs font-medium text-gray-600">Marca / modelo *</label>
                <input id="nombre" name="nombre" value={form.nombre} onChange={set('nombre')}
                  required placeholder="Astroenergy" className={inputCls} />
              </div>
              <div>
                <label htmlFor="potenciaW" className="text-xs font-medium text-gray-600">Potencia (W) *</label>
                <input id="potenciaW" name="potenciaW" type="number" step="1" value={form.potenciaW}
                  onChange={set('potenciaW')} required placeholder="700" className={inputCls} />
              </div>
              <div>
                <label htmlFor="anchoMm" className="text-xs font-medium text-gray-600">Ancho (mm) *</label>
                <input id="anchoMm" name="anchoMm" type="number" step="1" value={form.anchoMm}
                  onChange={set('anchoMm')} required placeholder="1303" className={inputCls} />
              </div>
              <div>
                <label htmlFor="largoMm" className="text-xs font-medium text-gray-600">Largo (mm) *</label>
                <input id="largoMm" name="largoMm" type="number" step="1" value={form.largoMm}
                  onChange={set('largoMm')} required placeholder="2384" className={inputCls} />
              </div>
              <div>
                <label htmlFor="espesorMm" className="text-xs font-medium text-gray-600">Espesor (mm)</label>
                <input id="espesorMm" name="espesorMm" type="number" step="1" value={form.espesorMm}
                  onChange={set('espesorMm')} placeholder="33" className={inputCls} />
              </div>
              <div>
                <label htmlFor="pesoKg" className="text-xs font-medium text-gray-600">Peso (kg)</label>
                <input id="pesoKg" name="pesoKg" type="number" step="0.1" value={form.pesoKg}
                  onChange={set('pesoKg')} placeholder="38" className={inputCls} />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button type="submit" disabled={pending}
                className="rounded-xl bg-[#1d65c5] hover:bg-[#389fe0] text-white text-sm font-semibold px-4 py-2.5 transition-colors disabled:opacity-60">
                {pending ? 'Guardando…' : form.id ? 'Guardar cambios' : 'Agregar panel'}
              </button>
              <button type="button" onClick={() => { setForm(FORM_VACIO); setAbierto(false); }}
                className="text-sm text-gray-500 hover:text-gray-700 px-3">
                Cancelar
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              El ancho es el lado menor y el largo el mayor; si se ingresan al revés se corrigen
              solos. El espesor es dato de ficha y no entra en el cálculo de superficie.
            </p>
          </form>
        )}

        {panels.length > 0 && (
          <ul className="divide-y divide-gray-100">
            {panels.map((p) => {
              const usos = kits.filter((k) => k.panelId === p.id);
              return (
                <li key={p.id} className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <span className="text-sm font-medium text-gray-900">
                      {p.potenciaW} W · {p.nombre}
                    </span>
                    <span className="block text-xs text-gray-500">
                      {p.largoMm} × {p.anchoMm}
                      {p.espesorMm ? ` × ${p.espesorMm}` : ''} mm
                      {p.pesoKg ? ` · ${p.pesoKg} kg` : ''}
                      {' · '}
                      {usos.length === 0
                        ? 'sin kits'
                        : `${usos.length} kit${usos.length > 1 ? 's' : ''}`}
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => editar(p)}
                      className="text-xs font-semibold text-[#1d65c5] hover:underline">
                      Editar
                    </button>
                    <button type="button" onClick={() => borrar(p)} disabled={pending}
                      title={usos.length > 0 ? 'Tiene kits asociados' : 'Eliminar panel'}
                      className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50">
                      Eliminar
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
