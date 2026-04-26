'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Client, Installation, Activity, Quote } from '@/lib/types';
import type { ProjectRow } from '@/lib/db/projects';
import { updateClient, addActivity, addInstallation, deleteClient } from '@/app/admin/clients/actions';

const ACTIVITY_ICONS: Record<string, string> = {
  llamada: '📞', visita: '🏠', email: '✉️',
  nota: '📝', reunion: '👥', otro: '•',
};

const ESTADO_COLORS: Record<string, string> = {
  pendiente:    'bg-amber-100 text-amber-700',
  en_ejecucion: 'bg-blue-100 text-blue-700',
  completado:   'bg-green-100 text-green-700',
  cancelado:    'bg-gray-100 text-gray-500',
};

const ESTADO_LABELS: Record<string, string> = {
  pendiente:    'Pendiente',
  en_ejecucion: 'En ejecución',
  completado:   'Completado',
  cancelado:    'Cancelado',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft:    { label: 'Borrador', color: 'bg-gray-100 text-gray-600' },
  sent:     { label: 'Enviada',  color: 'bg-blue-100 text-blue-700' },
  accepted: { label: 'Aceptada', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rechazada', color: 'bg-red-100 text-red-600' },
  expired:  { label: 'Vencida',  color: 'bg-amber-100 text-amber-700' },
};

function clp(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
}

function dateStr(d: string) {
  return new Date(d).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ClientDetail({
  client,
  activities,
  quotes,
  projects,
}: {
  client: Client;
  activities: Activity[];
  quotes: Quote[];
  projects: ProjectRow[];
}) {
  const router = useRouter();
  const [tab, setTab]                = useState<'info' | 'instalaciones' | 'actividades' | 'cotizaciones' | 'proyectos'>('info');
  const [editMode, setEditMode]      = useState(false);
  const [showActForm, setShowActForm] = useState(false);
  const [showInstForm, setShowInstForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`¿Eliminar a ${client.nombre}? Se eliminarán también sus instalaciones y actividades.`)) return;
    startTransition(async () => {
      await deleteClient(client.id);
      router.push('/admin/clients');
    });
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href="/admin/clients" className="text-sm text-gray-400 hover:text-gray-600 mb-2 block">
            ← Clientes
          </Link>
          <h1 className="text-xl font-bold text-gray-900">{client.nombre}</h1>
          {client.empresa && <p className="text-sm text-gray-500">{client.empresa}</p>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="border border-red-200 text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
          >
            Eliminar
          </button>
          <Link
            href={`/admin/quotes/new?client_id=${client.id}`}
            className="bg-[#389fe0] hover:bg-[#1d65c5] text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            + Nueva cotización
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 gap-1">
        {([
          ['info', 'Información'],
          ['instalaciones', `Instalaciones (${client.installations?.length ?? 0})`],
          ['actividades', `Actividades (${activities.length})`],
          ['cotizaciones', `Cotizaciones (${quotes.length})`],
          ['proyectos', `Proyectos (${projects.length})`],
        ] as const).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t
                ? 'border-[#389fe0] text-[#1d65c5]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Información */}
      {tab === 'info' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          {!editMode ? (
            <>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                {[
                  ['Nombre', client.nombre],
                  ['RUT', client.rut ?? '—'],
                  ['Empresa', client.empresa ?? '—'],
                  ['Email', client.email ?? '—'],
                  ['Teléfono', client.telefono ?? '—'],
                  ['Ciudad', client.ciudad ?? '—'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                    <p className="text-gray-900">{value}</p>
                  </div>
                ))}
                {client.notas && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400 mb-0.5">Notas</p>
                    <p className="text-gray-900 whitespace-pre-wrap">{client.notas}</p>
                  </div>
                )}
              </div>
              <button
                onClick={() => setEditMode(true)}
                className="mt-4 text-sm text-[#389fe0] hover:text-[#1d65c5] font-medium"
              >
                Editar información
              </button>
            </>
          ) : (
            <form
              action={(fd) => {
                startTransition(async () => {
                  await updateClient(client.id, fd);
                  setEditMode(false);
                });
              }}
              className="flex flex-col gap-4"
            >
              <div className="grid grid-cols-2 gap-3">
                {([
                  ['nombre', 'Nombre *', 'text', true],
                  ['rut', 'RUT', 'text', false],
                  ['empresa', 'Empresa', 'text', false],
                  ['email', 'Email', 'email', false],
                  ['telefono', 'Teléfono', 'tel', false],
                  ['ciudad', 'Ciudad', 'text', false],
                ] as [string, string, string, boolean][]).map(([name, label, type, req]) => (
                  <label key={name} className="block">
                    <span className="text-xs text-gray-500 mb-1 block">{label}</span>
                    <input name={name} type={type} required={req}
                      defaultValue={(client as unknown as Record<string, string>)[name] ?? ''}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]" />
                  </label>
                ))}
                <label className="block col-span-2">
                  <span className="text-xs text-gray-500 mb-1 block">Notas</span>
                  <textarea name="notas" rows={3} defaultValue={client.notas ?? ''}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#389fe0]" />
                </label>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setEditMode(false)}
                  className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit" disabled={isPending}
                  className="flex-1 bg-[#389fe0] hover:bg-[#1d65c5] text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50">
                  {isPending ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Tab: Instalaciones */}
      {tab === 'instalaciones' && (
        <div className="flex flex-col gap-4">
          {(client.installations ?? []).map((inst: Installation) => (
            <div key={inst.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="font-semibold text-gray-900 mb-3">{inst.nombre_instalacion}</p>
              <div className="grid grid-cols-3 gap-3 text-xs text-gray-600">
                {inst.direccion && <div><span className="text-gray-400">Dirección</span><p>{inst.direccion}</p></div>}
                {inst.region_id && <div><span className="text-gray-400">Región</span><p>{inst.region_id}</p></div>}
                {inst.distribuidora && <div><span className="text-gray-400">Distribuidora</span><p>{inst.distribuidora}</p></div>}
                {inst.tarifa && <div><span className="text-gray-400">Tarifa</span><p>{inst.tarifa}</p></div>}
                {inst.amperaje_a && <div><span className="text-gray-400">Empalme</span><p>{inst.amperaje_a} A</p></div>}
                {inst.potencia_contratada_kw && <div><span className="text-gray-400">Potencia contratada</span><p>{inst.potencia_contratada_kw} kW</p></div>}
                {inst.consumo_promedio_mensual_kwh && <div><span className="text-gray-400">Consumo prom.</span><p>{inst.consumo_promedio_mensual_kwh} kWh/mes</p></div>}
              </div>
            </div>
          ))}

          {!showInstForm ? (
            <button
              onClick={() => setShowInstForm(true)}
              className="py-3 border-2 border-dashed border-gray-200 rounded-2xl text-sm text-gray-400 hover:border-[#389fe0] hover:text-[#389fe0] transition-colors"
            >
              + Agregar instalación
            </button>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="font-semibold text-gray-900 mb-4">Nueva instalación</p>
              <form
                action={(fd) => {
                  fd.append('client_id', client.id);
                  startTransition(async () => {
                    await addInstallation(fd);
                    setShowInstForm(false);
                  });
                }}
                className="flex flex-col gap-3"
              >
                <div className="grid grid-cols-2 gap-3">
                  <label className="block col-span-2">
                    <span className="text-xs text-gray-500 mb-1 block">Nombre de la instalación *</span>
                    <input name="nombre_instalacion" required
                      placeholder="Ej: Casa principal, Local comercial…"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]" />
                  </label>
                  <label className="block">
                    <span className="text-xs text-gray-500 mb-1 block">Dirección</span>
                    <input name="direccion"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]" />
                  </label>
                  <label className="block">
                    <span className="text-xs text-gray-500 mb-1 block">Ciudad</span>
                    <input name="ciudad"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]" />
                  </label>
                  <label className="block">
                    <span className="text-xs text-gray-500 mb-1 block">Tipo</span>
                    <select name="customer_type"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]">
                      <option value="">— Seleccionar —</option>
                      <option value="natural">Residencial</option>
                      <option value="business">Empresa</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs text-gray-500 mb-1 block">Consumo prom. (kWh/mes)</span>
                    <input name="consumo_kwh" type="number" step="1"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]" />
                  </label>
                </div>
                <div className="flex gap-3 mt-2">
                  <button type="button" onClick={() => setShowInstForm(false)}
                    className="flex-1 border border-gray-200 rounded-xl py-2 text-sm text-gray-600 hover:bg-gray-50">
                    Cancelar
                  </button>
                  <button type="submit" disabled={isPending}
                    className="flex-1 bg-[#389fe0] hover:bg-[#1d65c5] text-white rounded-xl py-2 text-sm font-semibold disabled:opacity-50">
                    {isPending ? 'Guardando…' : 'Agregar'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Tab: Actividades */}
      {tab === 'actividades' && (
        <div className="flex flex-col gap-4">
          {!showActForm ? (
            <button
              onClick={() => setShowActForm(true)}
              className="py-3 border-2 border-dashed border-gray-200 rounded-2xl text-sm text-gray-400 hover:border-[#389fe0] hover:text-[#389fe0] transition-colors"
            >
              + Registrar actividad
            </button>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <form
                action={(fd) => {
                  fd.append('client_id', client.id);
                  startTransition(async () => {
                    await addActivity(fd);
                    setShowActForm(false);
                  });
                }}
                className="flex flex-col gap-3"
              >
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs text-gray-500 mb-1 block">Tipo</span>
                    <select name="tipo"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]">
                      <option value="nota">Nota</option>
                      <option value="llamada">Llamada</option>
                      <option value="visita">Visita</option>
                      <option value="email">Email</option>
                      <option value="reunion">Reunión</option>
                      <option value="otro">Otro</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs text-gray-500 mb-1 block">Fecha</span>
                    <input name="fecha" type="datetime-local"
                      defaultValue={new Date().toISOString().slice(0, 16)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]" />
                  </label>
                  <label className="block col-span-2">
                    <span className="text-xs text-gray-500 mb-1 block">Descripción *</span>
                    <textarea name="descripcion" required rows={3}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#389fe0]" />
                  </label>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowActForm(false)}
                    className="flex-1 border border-gray-200 rounded-xl py-2 text-sm text-gray-600 hover:bg-gray-50">
                    Cancelar
                  </button>
                  <button type="submit" disabled={isPending}
                    className="flex-1 bg-[#389fe0] hover:bg-[#1d65c5] text-white rounded-xl py-2 text-sm font-semibold disabled:opacity-50">
                    {isPending ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activities.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sin actividades registradas.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {activities.map((a) => (
                <div key={a.id} className="bg-white rounded-xl border border-gray-100 p-4 flex gap-3">
                  <span className="text-lg mt-0.5">{ACTIVITY_ICONS[a.tipo] ?? '•'}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-gray-700 capitalize">{a.tipo}</span>
                      <span className="text-xs text-gray-400">{dateStr(a.fecha)}</span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{a.descripcion}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Cotizaciones */}
      {tab === 'cotizaciones' && (
        <div className="flex flex-col gap-3">
          {quotes.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-gray-400 mb-3">Sin cotizaciones aún.</p>
              <Link
                href={`/admin/quotes/new?client_id=${client.id}`}
                className="bg-[#389fe0] hover:bg-[#1d65c5] text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              >
                Crear primera cotización
              </Link>
            </div>
          ) : (
            quotes.map((q) => {
              const st = STATUS_LABELS[q.status] ?? { label: q.status, color: 'bg-gray-100 text-gray-600' };
              return (
                <Link
                  key={q.id}
                  href={`/admin/quotes/${q.id}`}
                  className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 hover:border-[#389fe0]/30 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{q.quote_number}</p>
                    <p className="text-xs text-gray-400">{dateStr(q.created_at)}</p>
                  </div>
                  <p className="font-semibold text-gray-900">{clp(q.total_clp)}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.color}`}>
                    {st.label}
                  </span>
                </Link>
              );
            })
          )}
        </div>
      )}

      {/* Tab: Proyectos */}
      {tab === 'proyectos' && (
        <div className="flex flex-col gap-3">
          {projects.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-gray-400">Sin proyectos aún.</p>
              <p className="text-xs text-gray-400 mt-1">Los proyectos se crean desde una cotización aceptada.</p>
            </div>
          ) : (
            projects.map((p) => (
              <Link
                key={p.id}
                href={`/admin/projects/${p.id}`}
                className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 hover:border-[#389fe0]/30 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{p.nombre}</p>
                  {p.quote_number && (
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{p.quote_number}</p>
                  )}
                </div>
                {p.fecha_inicio && (
                  <p className="text-xs text-gray-400">
                    {new Date(p.fecha_inicio).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </p>
                )}
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ESTADO_COLORS[p.estado] ?? 'bg-gray-100 text-gray-500'}`}>
                  {ESTADO_LABELS[p.estado] ?? p.estado}
                </span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
