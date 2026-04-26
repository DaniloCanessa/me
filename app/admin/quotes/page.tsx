import Link from 'next/link';
import { getQuotes } from '@/lib/db/quotes';
import type { QuoteStatus } from '@/lib/types';

const STATUS: Record<QuoteStatus, { label: string; color: string }> = {
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

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const all    = await getQuotes();
  const quotes = status ? all.filter((q) => q.status === status) : all;

  const counts = all.reduce<Record<string, number>>((acc, q) => {
    acc[q.status] = (acc[q.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Cotizaciones</h1>
          <p className="text-sm text-gray-500 mt-1">{all.length} en total</p>
        </div>
        <Link
          href="/admin/clients"
          className="bg-[#389fe0] hover:bg-[#1d65c5] text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
        >
          + Nueva cotización
        </Link>
      </div>

      {/* Filtros de estado */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <Link
          href="/admin/quotes"
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            !status ? 'bg-[#389fe0]/10 text-[#1d65c5]' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          Todas ({all.length})
        </Link>
        {(Object.entries(STATUS) as [QuoteStatus, typeof STATUS[QuoteStatus]][]).map(([key, { label }]) => (
          <Link
            key={key}
            href={`/admin/quotes?status=${key}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              status === key ? 'bg-[#389fe0]/10 text-[#1d65c5]' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            {label} ({counts[key] ?? 0})
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {quotes.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-gray-400">No hay cotizaciones en esta categoría.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cotización</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Total</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((q) => {
                  const st = STATUS[q.status] ?? { label: q.status, color: 'bg-gray-100 text-gray-600' };
                  return (
                    <tr key={q.id} className="border-b border-gray-50 hover:bg-gray-50/40">
                      <td className="px-5 py-3.5">
                        <Link href={`/admin/quotes/${q.id}`} className="font-mono text-xs text-[#389fe0] hover:text-[#1d65c5] hover:underline font-medium">
                          {q.quote_number}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-gray-900">{q.client_name}</p>
                        {q.client_email && <p className="text-xs text-gray-400">{q.client_email}</p>}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-500">{dateStr(q.created_at)}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-gray-900 tabular-nums">
                        {clp(q.total_clp)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
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
        )}
      </div>
    </div>
  );
}
