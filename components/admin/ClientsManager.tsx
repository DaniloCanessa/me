'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import type { Client } from '@/lib/types';
import { createClient, deleteClient } from '@/app/admin/clients/actions';

const SOURCE_LABELS: Record<string, string> = {
  simulador: 'Simulador',
  referido:  'Referido',
  llamada:   'Llamada',
  visita:    'Visita',
  manual:    'Manual',
  otro:      'Otro',
};

function ClientModal({
  onClose,
  isPending,
}: {
  onClose: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Nuevo cliente</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <form
          action={(fd) => createClient(fd).then((r) => { if (!r?.error) onClose(); })}
          className="px-6 py-5 flex flex-col gap-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <label className="block col-span-2">
              <span className="text-xs text-gray-500 mb-1 block">Nombre completo *</span>
              <input name="nombre" type="text" required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]" />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 mb-1 block">RUT</span>
              <input name="rut" type="text" placeholder="12.345.678-9"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]" />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 mb-1 block">Empresa</span>
              <input name="empresa" type="text"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]" />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 mb-1 block">Email</span>
              <input name="email" type="email"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]" />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 mb-1 block">Teléfono</span>
              <input name="telefono" type="tel"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]" />
            </label>
            <label className="block col-span-2">
              <span className="text-xs text-gray-500 mb-1 block">Ciudad</span>
              <input name="ciudad" type="text"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]" />
            </label>
            <label className="block col-span-2">
              <span className="text-xs text-gray-500 mb-1 block">Origen</span>
              <select name="source" defaultValue="manual"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]">
                {Object.entries(SOURCE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </label>
            <label className="block col-span-2">
              <span className="text-xs text-gray-500 mb-1 block">Notas internas</span>
              <textarea name="notas" rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#389fe0]" />
            </label>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={isPending}
              className="flex-1 bg-[#389fe0] hover:bg-[#1d65c5] text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50">
              {isPending ? 'Guardando…' : 'Crear cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ClientsManager({ clients }: { clients: Client[] }) {
  const [showModal, setShowModal]    = useState(false);
  const [search, setSearch]          = useState('');
  const [isPending, startTransition] = useTransition();

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.nombre.toLowerCase().includes(q) ||
      (c.empresa ?? '').toLowerCase().includes(q) ||
      (c.email ?? '').toLowerCase().includes(q) ||
      (c.ciudad ?? '').toLowerCase().includes(q)
    );
  });

  function handleDelete(c: Client) {
    if (!confirm(`¿Eliminar a ${c.nombre}? Se eliminarán también sus instalaciones y actividades.`)) return;
    startTransition(async () => { await deleteClient(c.id); });
  }

  return (
    <>
      {showModal && (
        <ClientModal onClose={() => setShowModal(false)} isPending={isPending} />
      )}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3 flex-wrap">
          <input
            type="search"
            placeholder="Buscar por nombre, empresa, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-48 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]"
          />
          <button
            onClick={() => setShowModal(true)}
            className="bg-[#389fe0] hover:bg-[#1d65c5] text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            + Nuevo cliente
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-gray-400">
              {search ? 'Sin resultados para esa búsqueda.' : 'No hay clientes aún.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Contacto</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ciudad</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Origen</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/40">
                    <td className="px-5 py-3.5">
                      <Link href={`/admin/clients/${c.id}`} className="font-medium text-gray-900 hover:text-[#389fe0] transition-colors">
                        {c.nombre}
                      </Link>
                      {c.empresa && <p className="text-xs text-gray-400">{c.empresa}</p>}
                      {c.rut && <p className="text-xs text-gray-300 font-mono">{c.rut}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-500">
                      {c.email && <p>{c.email}</p>}
                      {c.telefono && <p>{c.telefono}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{c.ciudad ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        c.source === 'simulador'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {SOURCE_LABELS[c.source] ?? c.source}
                      </span>
                      {c.lead_id && (
                        <span className="ml-1.5 text-[10px] text-gray-400">+ lead</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/admin/quotes/new?client_id=${c.id}`}
                        className="text-xs text-[#389fe0] hover:text-[#1d65c5] font-medium whitespace-nowrap"
                      >
                        + Cotizar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
