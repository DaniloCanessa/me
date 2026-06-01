import Link from 'next/link';
import { getQuotes } from '@/lib/db/quotes';
import type { QuoteStatus } from '@/lib/types';
import QuotesTable from './QuotesTable';

const STATUS: Record<QuoteStatus, { label: string; color: string }> = {
  draft:    { label: 'Borrador', color: 'bg-gray-100 text-gray-600' },
  sent:     { label: 'Enviada',  color: 'bg-blue-100 text-blue-700' },
  accepted: { label: 'Aceptada', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rechazada', color: 'bg-red-100 text-red-600' },
  expired:  { label: 'Vencida',  color: 'bg-amber-100 text-amber-700' },
};

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
          href="/admin/clients?from=quotes"
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

      <QuotesTable quotes={quotes} />
    </div>
  );
}
