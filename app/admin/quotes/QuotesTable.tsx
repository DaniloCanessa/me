'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { QuoteStatus } from '@/lib/types';
import { deleteQuotes } from './actions';

const STATUS: Record<QuoteStatus, { label: string; color: string }> = {
  draft:    { label: 'Borrador',  color: 'bg-gray-100 text-gray-600' },
  sent:     { label: 'Enviada',   color: 'bg-blue-100 text-blue-700' },
  accepted: { label: 'Aceptada',  color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rechazada', color: 'bg-red-100 text-red-600' },
  expired:  { label: 'Vencida',   color: 'bg-amber-100 text-amber-700' },
};

function clp(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
}

function dateStr(d: string) {
  return new Date(d).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
}

type QuoteRow = {
  id: string;
  quote_number: string;
  client_name: string;
  client_email: string;
  created_at: string;
  total_clp: number;
  status: QuoteStatus;
};

export default function QuotesTable({ quotes }: { quotes: QuoteRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const allSelected = quotes.length > 0 && selected.size === quotes.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(quotes.map(q => q.id)));
  }

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleDelete() {
    const ids = [...selected];
    const n = ids.length;
    if (!confirm(`¿Eliminar ${n} cotización${n > 1 ? 'es' : ''}? Esta acción no se puede deshacer.`)) return;
    startTransition(async () => {
      await deleteQuotes(ids);
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Barra de selección */}
      {selected.size > 0 && (
        <div className="px-5 py-3 bg-red-50 border-b border-red-100 flex items-center justify-between">
          <span className="text-sm text-red-700 font-medium">
            {selected.size} cotización{selected.size > 1 ? 'es' : ''} seleccionada{selected.size > 1 ? 's' : ''}
          </span>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
          >
            {isPending ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      )}

      {quotes.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-gray-400">No hay cotizaciones en esta categoría.</p>
        </div>
      ) : (
        <>
        {/* Tarjetas (móvil) */}
        <div className="md:hidden divide-y divide-gray-100">
          {quotes.map((q) => {
            const st = STATUS[q.status] ?? { label: q.status, color: 'bg-gray-100 text-gray-600' };
            const isSelected = selected.has(q.id);
            return (
              <div key={q.id} className={`p-4 flex gap-3 ${isSelected ? 'bg-red-50/40' : ''}`}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(q.id)}
                  className="mt-1 rounded border-gray-300 text-[#389fe0] focus:ring-[#389fe0]"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/admin/quotes/${q.id}`} className="font-mono text-xs text-[#389fe0] hover:text-[#1d65c5] font-medium">
                      {q.quote_number}
                    </Link>
                    <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${st.color}`}>
                      {st.label}
                    </span>
                  </div>
                  <p className="font-medium text-gray-900 mt-0.5">{q.client_name}</p>
                  {q.client_email && <p className="text-xs text-gray-400 truncate">{q.client_email}</p>}
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="text-xs text-gray-400">{dateStr(q.created_at)}</span>
                    <span className="text-sm font-semibold text-gray-900 tabular-nums">{clp(q.total_clp)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tabla (escritorio) */}
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-left">
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="rounded border-gray-300 text-[#389fe0] focus:ring-[#389fe0]"
                  />
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cotización</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Total</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => {
                const st = STATUS[q.status] ?? { label: q.status, color: 'bg-gray-100 text-gray-600' };
                const isSelected = selected.has(q.id);
                return (
                  <tr
                    key={q.id}
                    className={`border-b border-gray-50 transition-colors ${isSelected ? 'bg-red-50/40' : 'hover:bg-gray-50/40'}`}
                  >
                    <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggle(q.id)}
                        className="rounded border-gray-300 text-[#389fe0] focus:ring-[#389fe0]"
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      <Link href={`/admin/quotes/${q.id}`} className="font-mono text-xs text-[#389fe0] hover:text-[#1d65c5] hover:underline font-medium">
                        {q.quote_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-gray-900">{q.client_name}</p>
                      {q.client_email && <p className="text-xs text-gray-400">{q.client_email}</p>}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-500">{dateStr(q.created_at)}</td>
                    <td className="px-4 py-3.5 text-right font-semibold text-gray-900 tabular-nums">
                      {clp(q.total_clp)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${st.color}`}>
                        {st.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}
