import Link from 'next/link';
import { Suspense } from 'react';
import { getSupabaseAdmin } from '@/lib/supabase';
import UserFilter from '@/components/admin/UserFilter';

function clp(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
}

function dateShort(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
}

const STATUS_LEAD: Record<string, { label: string; color: string }> = {
  new:          { label: 'Nuevo',        color: 'bg-gray-100 text-gray-600' },
  contacted:    { label: 'Contactado',   color: 'bg-blue-100 text-blue-700' },
  evaluating:   { label: 'Evaluando',    color: 'bg-purple-100 text-purple-700' },
  negotiating:  { label: 'Negociando',   color: 'bg-amber-100 text-amber-700' },
  quoted:       { label: 'Cotizado',     color: 'bg-cyan-100 text-cyan-700' },
  won:          { label: 'Ganado',       color: 'bg-green-100 text-green-700' },
  lost:         { label: 'Perdido',      color: 'bg-red-100 text-red-600' },
};

const STATUS_QUOTE: Record<string, { label: string; color: string }> = {
  draft:    { label: 'Borrador',  color: 'bg-gray-100 text-gray-600' },
  sent:     { label: 'Enviada',   color: 'bg-blue-100 text-blue-700' },
  accepted: { label: 'Aceptada',  color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rechazada', color: 'bg-red-100 text-red-600' },
  expired:  { label: 'Vencida',   color: 'bg-amber-100 text-amber-700' },
};

const ESTADO_PROJECT: Record<string, { label: string; color: string }> = {
  pendiente:    { label: 'Pendiente',    color: 'bg-amber-100 text-amber-700' },
  en_ejecucion: { label: 'En ejecución', color: 'bg-blue-100 text-blue-700' },
  completado:   { label: 'Completado',   color: 'bg-green-100 text-green-700' },
  cancelado:    { label: 'Cancelado',    color: 'bg-gray-100 text-gray-500' },
};

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ user?: string }>;
}) {
  const { user: filterUserId } = await searchParams;
  const db = getSupabaseAdmin();

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Usuarios activos para el filtro
  const { data: users } = await db
    .from('users')
    .select('id, name')
    .eq('is_active', true)
    .order('name');

  const uid = filterUserId ?? null;

  // KPI queries — se aplica filtro de usuario cuando corresponde
  let followupsQ = db
    .from('leads')
    .select('id, name, contact_name, email, follow_up_date, assigned_to, status')
    .not('status', 'in', '("won","lost")')
    .not('follow_up_date', 'is', null)
    .lte('follow_up_date', today)
    .order('follow_up_date', { ascending: true })
    .limit(8);

  let leadsKpiQ = db.from('leads').select('*', { count: 'exact', head: true }).not('status', 'in', '("won","lost")');
  let quotesKpiQ = db.from('quotes').select('*', { count: 'exact', head: true }).eq('status', 'sent');
  let projectsKpiQ = db.from('projects').select('*', { count: 'exact', head: true }).eq('estado', 'en_ejecucion');
  let leadsQ = db.from('leads').select('id, name, contact_name, email, status, region, created_at').order('created_at', { ascending: false }).limit(6);
  let quotesQ = db.from('quotes').select('id, quote_number, client_name, status, total_clp, created_at').eq('status', 'sent').order('created_at', { ascending: false }).limit(6);
  let projectsQ = db.from('projects').select('id, nombre, estado, client_id, clients!inner(nombre), created_at').order('created_at', { ascending: false }).limit(6);
  let acceptedQ = db.from('quotes').select('total_clp').eq('status', 'accepted').gte('accepted_at', firstOfMonth);

  if (uid) {
    followupsQ   = followupsQ.eq('assigned_to', uid) as typeof followupsQ;
    leadsKpiQ    = leadsKpiQ.eq('assigned_to', uid) as typeof leadsKpiQ;
    quotesKpiQ   = quotesKpiQ.eq('assigned_to', uid) as typeof quotesKpiQ;
    projectsKpiQ = projectsKpiQ.eq('assigned_to', uid) as typeof projectsKpiQ;
    leadsQ       = leadsQ.eq('assigned_to', uid) as typeof leadsQ;
    quotesQ      = quotesQ.eq('assigned_to', uid) as typeof quotesQ;
    projectsQ    = projectsQ.eq('assigned_to', uid) as typeof projectsQ;
    acceptedQ    = acceptedQ.eq('assigned_to', uid) as typeof acceptedQ;
  }

  const [
    { count: totalLeadsActivos },
    { count: totalCotsPendientes },
    { count: totalProyectosActivos },
    { data: leads },
    { data: quotes },
    { data: projects },
    { data: acceptedThisMonth },
    { data: followups },
  ] = await Promise.all([
    leadsKpiQ, quotesKpiQ, projectsKpiQ,
    leadsQ, quotesQ, projectsQ, acceptedQ, followupsQ,
  ]);

  const ingresosDelMes = (acceptedThisMonth ?? []).reduce((s: number, q: { total_clp: number }) => s + (q.total_clp ?? 0), 0);

  const selectedUser = (users ?? []).find(u => u.id === filterUserId);

  const kpis = [
    { label: 'Leads activos',          value: String(totalLeadsActivos ?? 0),   href: '/admin/leads',    color: 'text-[#1d65c5]', bg: 'bg-blue-50' },
    { label: 'Cotizaciones enviadas',   value: String(totalCotsPendientes ?? 0), href: '/admin/quotes',   color: 'text-purple-700', bg: 'bg-purple-50' },
    { label: 'Proyectos en ejecución',  value: String(totalProyectosActivos ?? 0), href: '/admin/projects', color: 'text-amber-700', bg: 'bg-amber-50' },
    { label: 'Ingresos del mes',        value: clp(ingresosDelMes),              href: '/admin/quotes',   color: 'text-green-700', bg: 'bg-green-50' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Dashboard</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {now.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              {selectedUser && (
                <span className="ml-2 text-[#389fe0] font-medium">· {selectedUser.name}</span>
              )}
            </p>
          </div>
          <Suspense>
            <UserFilter users={users ?? []} />
          </Suspense>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-6">

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map(kpi => (
            <Link key={kpi.label} href={kpi.href}
              className={`${kpi.bg} rounded-2xl p-5 flex flex-col gap-2 hover:shadow-sm transition-shadow`}>
              <p className="text-xs text-gray-500 font-medium">{kpi.label}</p>
              <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
            </Link>
          ))}
        </div>

        {/* Seguimientos pendientes */}
        {(followups ?? []).length > 0 && (
          <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-amber-100 flex items-center justify-between bg-amber-50">
              <div className="flex items-center gap-2">
                <span className="text-amber-600 text-sm">⚠</span>
                <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
                  Seguimientos pendientes ({followups!.length})
                </p>
              </div>
              <Link href="/admin/leads?followup=pending" className="text-xs text-amber-700 hover:underline font-medium">
                Ver todos →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-amber-50">
              {(followups ?? []).map((lead: Record<string, string>) => {
                const isOverdue = lead.follow_up_date < today;
                const nombre = lead.name || lead.contact_name || lead.email || '—';
                return (
                  <Link key={lead.id} href={`/admin/leads/${lead.id}`}
                    className="flex items-start gap-3 px-5 py-3.5 hover:bg-amber-50/40 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{nombre}</p>
                      <p className="text-xs text-gray-400 truncate">{lead.email}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {lead.follow_up_date}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Grilla de 3 columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Últimos leads */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Últimos leads</p>
              <Link href="/admin/leads" className="text-xs text-[#389fe0] hover:underline">Ver todos →</Link>
            </div>
            <div className="divide-y divide-gray-50">
              {(leads ?? []).length === 0 && (
                <p className="text-xs text-gray-400 text-center py-8">Sin leads.</p>
              )}
              {(leads ?? []).map((lead: Record<string, string>) => {
                const st = STATUS_LEAD[lead.status] ?? { label: lead.status, color: 'bg-gray-100 text-gray-500' };
                const nombre = lead.name || lead.contact_name || lead.email || '—';
                return (
                  <Link key={lead.id} href={`/admin/leads/${lead.id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/60 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{nombre}</p>
                      <p className="text-xs text-gray-400">{lead.region ?? '—'} · {dateShort(lead.created_at)}</p>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${st.color}`}>
                      {st.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Cotizaciones enviadas */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cotizaciones enviadas</p>
              <Link href="/admin/quotes" className="text-xs text-[#389fe0] hover:underline">Ver todas →</Link>
            </div>
            <div className="divide-y divide-gray-50">
              {(quotes ?? []).length === 0 && (
                <p className="text-xs text-gray-400 text-center py-8">Sin cotizaciones enviadas.</p>
              )}
              {(quotes ?? []).map((q: Record<string, string | number>) => {
                const st = STATUS_QUOTE[q.status as string] ?? { label: q.status, color: 'bg-gray-100 text-gray-500' };
                return (
                  <Link key={q.id} href={`/admin/quotes/${q.id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/60 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{q.client_name as string}</p>
                      <p className="text-xs text-gray-400 font-mono">{q.quote_number as string} · {dateShort(q.created_at as string)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold text-gray-700">{clp(q.total_clp as number)}</p>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Proyectos recientes */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Proyectos recientes</p>
              <Link href="/admin/projects" className="text-xs text-[#389fe0] hover:underline">Ver todos →</Link>
            </div>
            <div className="divide-y divide-gray-50">
              {(projects ?? []).length === 0 && (
                <p className="text-xs text-gray-400 text-center py-8">Sin proyectos.</p>
              )}
              {(projects ?? []).map((p: Record<string, unknown>) => {
                const est = ESTADO_PROJECT[p.estado as string] ?? { label: p.estado, color: 'bg-gray-100 text-gray-500' };
                const clientName = (p.clients as { nombre: string } | null)?.nombre ?? '—';
                return (
                  <Link key={p.id as string} href={`/admin/projects/${p.id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/60 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{p.nombre as string}</p>
                      <p className="text-xs text-gray-400">{clientName} · {dateShort(p.created_at as string)}</p>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${est.color}`}>
                      {est.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
