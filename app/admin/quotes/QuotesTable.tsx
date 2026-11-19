'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { QuoteStatus } from '@/lib/types';
import { deleteQuotes } from './actions';
import { fechaEmisionISO, formatFecha } from '@/lib/quote-date';
import SortableHeader, { useSort } from '@/components/admin/SortableHeader';

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

type QuoteRow = {
  id: string;
  quote_number: string;
  client_name: string;
  client_email: string;
  created_at: string;
  fecha_emision: string | null;
  total_clp: number;
  status: QuoteStatus;
};

/** Deja solo letras y dígitos en minúscula: "COT-2026-0012" → "cot20260012". */
function normalizar(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * ¿El número de cotización calza con lo buscado? Se ignoran guiones/espacios,
 * y si se escribe solo un número (ej. "12") también calza con el correlativo
 * sin ceros a la izquierda ("COT-2026-0012").
 */
function calzaNumero(quoteNumber: string, query: string) {
  const q = normalizar(query);
  if (!q) return true;
  if (normalizar(quoteNumber).includes(q)) return true;
  if (/^\d+$/.test(q)) {
    const partes = quoteNumber.match(/\d+/g) ?? [];
    return partes.some((p) => String(parseInt(p, 10)) === String(parseInt(q, 10)));
  }
  return false;
}

export default function QuotesTable({ quotes: allQuotes }: { quotes: QuoteRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? allQuotes.filter((q) => calzaNumero(q.quote_number, query))
    : allQuotes;

  const { sorted: quotes, sort, toggle: toggleSort } = useSort(filtered, {
    numero:  (q) => q.quote_number,
    cliente: (q) => q.client_name,
    fecha:   (q) => fechaEmisionISO(q),
    total:   (q) => q.total_clp,
    estado:  (q) => STATUS[q.status]?.label ?? q.status,
  });

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
    <>
    {/* Buscador por número de cotización */}
    <div className="mb-4 flex items-center gap-3">
      <div className="relative w-full sm:w-72">
        <input
          type="search"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelected(new Set()); }}
          placeholder="Buscar por N° de cotización…"
          aria-label="Buscar por número de cotización"
          className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-[#389fe0] bg-white"
        />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
        </svg>
      </div>
      {query.trim() && (
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {quotes.length} resultado{quotes.length === 1 ? '' : 's'}
        </span>
      )}
    </div>

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
          <p className="text-sm text-gray-400">
            {query.trim() ? `No hay cotizaciones con el número "${query.trim()}".` : 'No hay cotizaciones en esta categoría.'}
          </p>
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
                    <span className="text-xs text-gray-400">{formatFecha(fechaEmisionISO(q), 'short')}</span>
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
                <SortableHeader label="Cotización" sortKey="numero"  sort={sort} onSort={toggleSort} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide" />
                <SortableHeader label="Cliente"    sortKey="cliente" sort={sort} onSort={toggleSort} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide" />
                <SortableHeader label="Fecha"      sortKey="fecha"   sort={sort} onSort={toggleSort} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide" />
                <SortableHeader label="Total"      sortKey="total"   sort={sort} onSort={toggleSort} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide" align="right" />
                <SortableHeader label="Estado"     sortKey="estado"  sort={sort} onSort={toggleSort} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide" align="center" />
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
                    <td className="px-4 py-3.5 text-sm text-gray-500">{formatFecha(fechaEmisionISO(q), 'short')}</td>
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
    </>
  );
}
