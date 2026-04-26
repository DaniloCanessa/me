import { Suspense } from 'react';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getUsers } from '@/lib/db/users';
import StatusSelect from './StatusSelect';
import LeadDetail, { type QuoteSummary } from './LeadDetail';
import LeadsFilter from '@/components/admin/LeadsFilter';
import LeadsKanban from '@/components/admin/LeadsKanban';
import { updateStatus } from './actions';

// ─── Types ────────────────────────────────────────────────────────────────────

export type LeadStatus = 'new' | 'contacted' | 'quoted' | 'won' | 'lost';

export interface Lead {
  id: string;
  created_at: string;
  customer_category: 'natural' | 'business';
  name: string | null;
  contact_name: string | null;
  email: string;
  phone: string | null;
  region_name: string | null;
  city: string | null;
  tarifa: string | null;
  distribuidora: string | null;
  avg_monthly_kwh: number | null;
  kit_size_kwp: number | null;
  kit_price_clp: number | null;
  monthly_benefit_clp: number | null;
  payback_years: number | null;
  coverage_percent: number | null;
  status: LeadStatus;
  notes: string | null;
  visit_date: string | null;
  quoted_price_clp: number | null;
  consumption_profile: unknown;
  scenarios_json: unknown;
  future_consumption: unknown;
  supply_details: unknown;
  client_id: string | null;
  assigned_to: string | null;
  follow_up_date: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<LeadStatus, string> = {
  new:       'Nuevo',
  contacted: 'Contactado',
  quoted:    'Cotizado',
  won:       'Ganado',
  lost:      'Perdido',
};

function clp(n: number | null) {
  if (n == null) return '—';
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
}

function dateLabel(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: '2-digit' });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; region?: string; tipo?: string; view?: string; followup?: string }>;
}) {
  const { status: filterStatus, region: filterRegion, tipo: filterTipo, view: filterView, followup: filterFollowup } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const db = getSupabaseAdmin();
  const users = await getUsers();
  const usersMap = Object.fromEntries(users.map(u => [u.id, u.name]));

  let query = db
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });

  if (filterStatus && filterStatus !== 'all') query = query.eq('status', filterStatus);
  if (filterRegion) query = query.eq('region_name', filterRegion);
  if (filterTipo)   query = query.eq('customer_category', filterTipo);
  if (filterFollowup === 'pending') {
    query = query.lte('follow_up_date', today).not('status', 'in', '("won","lost")');
  }

  const { data: leads, error } = await query;

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-red-500">Error cargando leads: {error.message}</p>
      </div>
    );
  }

  const counts = await db.from('leads').select('status');
  const allLeads = counts.data ?? [];
  const countByStatus = (s: string) => allLeads.filter((l) => l.status === s).length;

  // Regiones distintas para el filtro
  const { data: regionRows } = await db
    .from('leads')
    .select('region_name')
    .not('region_name', 'is', null)
    .order('region_name');
  const regions = [...new Set((regionRows ?? []).map(r => r.region_name as string))];

  // Helpers para construir hrefs preservando filtros activos
  function statusHref(s: string) {
    const params = new URLSearchParams();
    if (s !== 'all') params.set('status', s);
    if (filterRegion) params.set('region', filterRegion);
    if (filterTipo)   params.set('tipo', filterTipo);
    if (filterFollowup) params.set('followup', filterFollowup);
    if (filterView && filterView !== 'list') params.set('view', filterView);
    const qs = params.toString();
    return `/admin/leads${qs ? `?${qs}` : ''}`;
  }

  function viewHref(v: string) {
    const params = new URLSearchParams();
    if (filterStatus && filterStatus !== 'all') params.set('status', filterStatus);
    if (filterRegion) params.set('region', filterRegion);
    if (filterTipo)   params.set('tipo', filterTipo);
    if (filterFollowup) params.set('followup', filterFollowup);
    if (v !== 'list') params.set('view', v);
    const qs = params.toString();
    return `/admin/leads${qs ? `?${qs}` : ''}`;
  }

  // Cotizaciones por lead
  const { data: leadQuotes } = await db
    .from('quotes')
    .select('id, quote_number, status, total_clp, created_at, lead_id')
    .not('lead_id', 'is', null)
    .order('created_at', { ascending: false });

  const quotesMap = (leadQuotes ?? []).reduce<Record<string, QuoteSummary[]>>((acc, q) => {
    if (!q.lead_id) return acc;
    (acc[q.lead_id] ??= []).push(q as QuoteSummary);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Leads solares</h1>
          <p className="text-xs text-gray-400 mt-0.5">Mercado Energy — Back-office</p>
        </div>
        <a href="/api/admin/logout" className="text-xs text-gray-400 hover:text-gray-600 underline">
          Cerrar sesión
        </a>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-4">
          {(['all', 'new', 'contacted', 'quoted', 'won', 'lost'] as const).map((s) => {
            const isActive = s === 'all' ? (!filterStatus || filterStatus === 'all') : filterStatus === s;
            return (
              <a
                key={s}
                href={statusHref(s)}
                className={`rounded-xl border px-3 py-3 text-center transition-colors ${isActive ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-100 text-gray-700 hover:border-gray-300'}`}
              >
                <p className="text-lg font-bold">{s === 'all' ? allLeads.length : countByStatus(s)}</p>
                <p className="text-xs mt-0.5">{s === 'all' ? 'Todos' : STATUS_LABELS[s as LeadStatus]}</p>
              </a>
            );
          })}
        </div>

        {/* Filtros adicionales */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <p className="text-xs text-gray-400">{leads?.length ?? 0} resultado{(leads?.length ?? 0) !== 1 ? 's' : ''}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <Suspense>
              <LeadsFilter regions={regions} />
            </Suspense>
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden text-xs">
              <a href={viewHref('list')} className={`px-3 py-2 transition-colors ${!filterView || filterView === 'list' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>≡ Lista</a>
              <a href={viewHref('kanban')} className={`px-3 py-2 border-l border-gray-200 transition-colors ${filterView === 'kanban' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>⊞ Kanban</a>
            </div>
          </div>
        </div>

        {/* Kanban view */}
        {filterView === 'kanban' && (
          <LeadsKanban leads={(leads ?? []) as Lead[]} users={users} />
        )}

        {/* Table */}
        {filterView !== 'kanban' && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {(!leads || leads.length === 0) ? (
            <div className="py-16 text-center">
              <p className="text-sm text-gray-400">No hay leads{filterStatus && filterStatus !== 'all' ? ` con estado "${STATUS_LABELS[filterStatus as LeadStatus] ?? filterStatus}"` : ''}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Región</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">kWh/mes</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Kit</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ahorro/mes</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Payback</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {(leads as Lead[]).map((lead) => (
                    <tr key={lead.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                          {dateLabel(lead.created_at)}
                          {lead.visit_date && (
                            <p className="text-green-600 mt-0.5">Visita: {dateLabel(lead.visit_date)}</p>
                          )}
                          {lead.follow_up_date && (
                            <p className={`mt-0.5 ${lead.follow_up_date < today ? 'text-red-600 font-semibold' : 'text-amber-600'}`}>
                              {lead.follow_up_date < today ? '⚠ ' : '📅 '}Seg: {dateLabel(lead.follow_up_date)}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <a href={`/admin/leads/${lead.id}`} className="font-medium text-gray-900 hover:text-[#389fe0] hover:underline transition-colors">
                            {lead.name ?? '—'}
                          </a>
                          <a href={`mailto:${lead.email}`} className="block text-xs text-green-600 hover:underline">{lead.email}</a>
                          {lead.phone && <p className="text-xs text-gray-400">{lead.phone}</p>}
                          {lead.assigned_to && usersMap[lead.assigned_to] && (
                            <p className="text-xs text-blue-500 mt-0.5">{usersMap[lead.assigned_to]}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                          <p>{lead.region_name ?? '—'}</p>
                          {lead.city && <p className="text-gray-400">{lead.city}</p>}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700 font-medium">{lead.avg_monthly_kwh ?? '—'}</td>
                        <td className="px-4 py-3 text-right text-gray-700 font-medium whitespace-nowrap">
                          {lead.kit_size_kwp ? `${lead.kit_size_kwp} kWp` : '—'}
                          {lead.quoted_price_clp
                            ? <p className="text-xs text-green-600">{clp(lead.quoted_price_clp)}</p>
                            : lead.kit_price_clp
                              ? <p className="text-xs text-gray-400">{clp(lead.kit_price_clp)}</p>
                              : null}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-green-700">{clp(lead.monthly_benefit_clp)}</td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {lead.payback_years ? `${lead.payback_years % 1 === 0 ? lead.payback_years : lead.payback_years.toFixed(1)} a` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col items-center gap-1">
                            <StatusSelect id={lead.id} status={lead.status} action={updateStatus} />
                            {(quotesMap[lead.id]?.length ?? 0) > 0 && (
                              <span className="text-[10px] text-[#389fe0] font-medium">
                                {quotesMap[lead.id].length} cot.
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <LeadDetail lead={lead} quotes={quotesMap[lead.id] ?? []} />
                        </td>
                      </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>}
      </div>
    </div>
  );
}
