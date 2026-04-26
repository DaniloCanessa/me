'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  addLeadNote,
  createQuoteFromLead,
  createQuoteFromSimulation,
  updateStatus,
  assignLead,
  setFollowUpDate as setFollowUpDateAction,
} from '../actions';
import { convertLeadToClient } from '../../clients/actions';
import StatusSelect from '../StatusSelect';
import type { Lead } from '../page';
import type { LeadNote, LeadStatusHistory, QuoteSummaryForLead } from './page';
import type { AdminUser } from '@/lib/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clp(n: number | null | undefined) {
  if (n == null) return '—';
  return new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: 'CLP', maximumFractionDigits: 0,
  }).format(n);
}

function dateFull(iso: string) {
  return new Date(iso).toLocaleString('es-CL', {
    day: '2-digit', month: 'short', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function dateShort(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL', {
    day: '2-digit', month: 'short', year: '2-digit',
  });
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LEAD_STATUS_LABELS: Record<string, string> = {
  new: 'Nuevo', contacted: 'Contactado', quoted: 'Cotizado', won: 'Ganado', lost: 'Perdido',
};

const QUOTE_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-500',
  sent: 'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
  expired: 'bg-amber-100 text-amber-700',
};

const QUOTE_STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador', sent: 'Enviada', accepted: 'Aceptada',
  rejected: 'Rechazada', expired: 'Expirada',
};

const TIPO_ICONS: Record<string, string> = {
  nota: '📝', llamada: '📞', email: '✉️', visita: '🏠', reunion: '👥', otro: '•',
};

const TIPO_LABELS: Record<string, string> = {
  nota: 'Nota', llamada: 'Llamada', email: 'Email', visita: 'Visita', reunion: 'Reunión', otro: 'Otro',
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'simulacion' | 'cotizaciones' | 'notas' | 'historial';

type Bill = { month: number; year: number; consumptionKWh: number; variableAmountCLP?: number };
type Scenario = { kitSizeKWp: number; kitPriceCLP: number; monthlyBenefitCLP: number; paybackYears: number; coveragePercent: number; panelCount: number; areaM2: number; batteryKWh?: number };
type Supply = { tarifa: string; distribuidora: string; amperajeA?: number; potenciaContratadaKW?: number; tensionSuministro?: string; hasExistingSolar: boolean; existingSystemKWp?: number; propertyType: string };
type Future = { totalAdditionalMonthlyKWh: number; evCharger?: { carCount: number; estimatedMonthlyKWh: number }; airConditioners?: Array<{ count: number; btu: number; estimatedMonthlyKWh: number }>; waterHeater?: { occupants: number; estimatedMonthlyKWh: number } };

const MONTH_NAMES: Record<number, string> = {
  1:'Ene',2:'Feb',3:'Mar',4:'Abr',5:'May',6:'Jun',
  7:'Jul',8:'Ago',9:'Sep',10:'Oct',11:'Nov',12:'Dic',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function LeadCRM({
  lead,
  notes: initNotes,
  history,
  quotes,
  users,
}: {
  lead: Lead;
  notes: LeadNote[];
  history: LeadStatusHistory[];
  quotes: QuoteSummaryForLead[];
  users: AdminUser[];
}) {
  const router = useRouter();
  const [tab, setTab]           = useState<Tab>('simulacion');
  const [clientId, setClientId] = useState<string | null>(lead.client_id ?? null);
  const [notes, setNotes]       = useState<LeadNote[]>(initNotes);
  const [assignedTo, setAssignedTo]     = useState<string>(lead.assigned_to ?? '');
  const [followUpDate, setFollowUpDate] = useState<string>(lead.follow_up_date ?? '');

  const [isConverting, startConvert]     = useTransition();
  const [isQuoting, startQuote]          = useTransition();
  const [isQuotingSim, startQuoteSim]    = useTransition();
  const [isAddingNote, startNote]        = useTransition();
  const [, startAssign]                  = useTransition();
  const [, startSetDate]                 = useTransition();
  const [convertError, setConvertError]  = useState<string | null>(null);

  const profile   = lead.consumption_profile as { bills: Bill[] } | null;
  const scenarios = lead.scenarios_json as Record<string, Scenario | null> | null;
  const future    = lead.future_consumption as Future | null;
  const supply    = lead.supply_details as Supply | null;

  const hasSimData = !!(scenarios?.A || lead.kit_size_kwp);
  const TABS: { id: Tab; label: string }[] = [
    { id: 'simulacion',    label: 'Simulación' },
    { id: 'cotizaciones',  label: `Cotizaciones (${quotes.length})` },
    { id: 'notas',         label: `Notas (${notes.length})` },
    { id: 'historial',     label: 'Historial' },
  ];

  function handleConvert() {
    setConvertError(null);
    startConvert(async () => {
      const res = await convertLeadToClient(lead.id);
      if (res.clientId) {
        setClientId(res.clientId);
      } else if (res.error) {
        setConvertError(res.error);
      }
    });
  }

  function handleNewQuote() {
    startQuote(async () => { await createQuoteFromLead(lead.id); });
  }

  function handleQuoteFromSim() {
    startQuoteSim(async () => { await createQuoteFromSimulation(lead.id); });
  }

  function handleAssign(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value || null;
    setAssignedTo(val ?? '');
    startAssign(async () => { await assignLead(lead.id, val); });
  }

  function handleSetDate(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value || null;
    setFollowUpDate(val ?? '');
    startSetDate(async () => { await setFollowUpDateAction(lead.id, val); });
  }

  function handleAddNote(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const contenido = (fd.get('contenido') as string).trim();
    if (!contenido) return;

    const opt: LeadNote = {
      id: `opt-${Date.now()}`,
      lead_id: lead.id,
      tipo: fd.get('tipo') as string,
      contenido,
      created_at: new Date().toISOString(),
    };
    setNotes(prev => [opt, ...prev]);
    form.reset();

    startNote(async () => {
      await addLeadNote(fd);
      router.refresh();
    });
  }

  // ── Bills chart data
  const bills = profile?.bills ?? [];
  const maxKwh = Math.max(...bills.map(b => b.consumptionKWh), 1);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <a href="/admin/leads" className="text-xs text-gray-400 hover:text-gray-600 mb-3 inline-block">
            ← Volver a leads
          </a>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{lead.name ?? lead.email}</h1>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <a href={`mailto:${lead.email}`} className="text-sm text-[#389fe0] hover:underline">{lead.email}</a>
                {lead.phone && <span className="text-sm text-gray-400">{lead.phone}</span>}
                <span className="text-xs text-gray-400">{lead.region_name}</span>
                <span className="text-xs text-gray-400">{dateShort(lead.created_at)}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                  {lead.customer_category === 'business' ? 'Empresa' : 'Residencial'}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                <label className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-400">Vendedor:</span>
                  <select
                    value={assignedTo}
                    onChange={handleAssign}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:border-[#389fe0]"
                  >
                    <option value="">Sin asignar</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-400">Recordatorio:</span>
                  <input
                    type="date"
                    value={followUpDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={handleSetDate}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-[#389fe0]"
                  />
                  {followUpDate && (
                    <button
                      type="button"
                      onClick={() => { setFollowUpDate(''); startSetDate(async () => { await setFollowUpDateAction(lead.id, null); }); }}
                      className="text-gray-300 hover:text-gray-500 text-sm leading-none"
                    >×</button>
                  )}
                </label>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                {clientId && (
                  <a
                    href={`/admin/clients/${clientId}`}
                    className="border border-green-500 text-green-700 hover:bg-green-50 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                  >
                    Ver cliente →
                  </a>
                )}
                <StatusSelect id={lead.id} status={lead.status} action={updateStatus} />
              </div>
              {convertError && (
                <p className="text-xs text-red-500">{convertError}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Banner venta ganada ────────────────────────────────────────────── */}
      {lead.status === 'won' && !clientId && (
        <div className="bg-green-50 border-b border-green-200 px-6 py-3">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-green-800">¡Venta cerrada!</p>
              <p className="text-xs text-green-700 mt-0.5">Registra a este prospecto como cliente para gestionar la instalación.</p>
            </div>
            <button
              onClick={handleConvert}
              disabled={isConverting}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap"
            >
              {isConverting ? 'Convirtiendo…' : 'Convertir a cliente →'}
            </button>
          </div>
        </div>
      )}

      {/* ── Tab nav ────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 flex gap-0">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t.id
                  ? 'border-[#389fe0] text-[#389fe0]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 py-6">

        {/* ═══ SIMULACIÓN ═══════════════════════════════════════════════════ */}
        {tab === 'simulacion' && (
          <div className="flex flex-col gap-6">

            {/* KPIs rápidos */}
            {lead.kit_size_kwp && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'PFV recomendada', value: `${lead.kit_size_kwp} kWp` },
                  { label: 'Consumo promedio', value: lead.avg_monthly_kwh ? `${lead.avg_monthly_kwh} kWh/mes` : '—' },
                  { label: 'Ahorro mensual', value: clp(lead.monthly_benefit_clp) },
                  { label: 'Payback', value: lead.payback_years ? `${lead.payback_years % 1 === 0 ? lead.payback_years : lead.payback_years.toFixed(1)} años` : '—' },
                ].map(kpi => (
                  <div key={kpi.label} className="bg-white rounded-xl border border-gray-100 px-4 py-3">
                    <p className="text-xs text-gray-400 mb-1">{kpi.label}</p>
                    <p className="text-base font-bold text-gray-900">{kpi.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Consumo mensual */}
            {bills.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Consumo mensual</p>
                <div className="flex items-end gap-1 h-28 mb-3">
                  {bills.map((b, i) => {
                    const pct = (b.consumptionKWh / maxKwh) * 100;
                    const isMax = b.consumptionKWh === maxKwh;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
                        <span className="text-[9px] text-gray-400 leading-none">{b.consumptionKWh}</span>
                        <div
                          style={{ height: `${pct}%` }}
                          className={`w-full rounded-t-sm ${isMax ? 'bg-[#389fe0]' : 'bg-blue-200'}`}
                        />
                        <span className="text-[9px] text-gray-400 leading-none">{MONTH_NAMES[b.month]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Escenarios */}
            {scenarios && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Escenarios simulados</p>
                <div className="flex flex-col gap-2">
                  {(['A', 'B', 'C'] as const).map(s => {
                    const sc = scenarios[s];
                    if (!sc) return null;
                    return (
                      <div key={s} className="bg-gray-50 rounded-xl border border-gray-100 px-4 py-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm text-gray-800">
                            Escenario {s} — {sc.kitSizeKWp} kWp
                            {sc.batteryKWh ? ` + ${sc.batteryKWh} kWh batería` : ''}
                          </span>
                          <span className="text-green-700 font-semibold text-sm">{clp(sc.monthlyBenefitCLP)}/mes</span>
                        </div>
                        <div className="flex gap-4 text-xs text-gray-500 flex-wrap">
                          <span>Precio ref: {clp(sc.kitPriceCLP)}</span>
                          <span>Payback: {sc.paybackYears % 1 === 0 ? sc.paybackYears : sc.paybackYears.toFixed(1)} años</span>
                          <span>Cobertura: {Math.round(sc.coveragePercent)}%</span>
                          <span>{sc.panelCount} paneles · {sc.areaM2} m²</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Suministro técnico */}
            {supply && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Suministro técnico</p>
                <div className="grid grid-cols-2 gap-y-2 gap-x-6 text-sm">
                  <div className="flex justify-between col-span-2 sm:col-span-1"><span className="text-gray-400">Tarifa</span><span className="font-medium">{supply.tarifa === 'unknown' ? 'No sabe (BT1 ref.)' : supply.tarifa}</span></div>
                  <div className="flex justify-between col-span-2 sm:col-span-1"><span className="text-gray-400">Distribuidora</span><span>{supply.distribuidora ?? '—'}</span></div>
                  {supply.amperajeA && <div className="flex justify-between col-span-2 sm:col-span-1"><span className="text-gray-400">Empalme</span><span>{supply.amperajeA} A · {Math.round(supply.amperajeA * 220 / 1000 * 10) / 10} kW máx</span></div>}
                  {supply.potenciaContratadaKW && <div className="flex justify-between col-span-2 sm:col-span-1"><span className="text-gray-400">Potencia contratada</span><span>{supply.potenciaContratadaKW} kW{supply.tensionSuministro ? ` · ${supply.tensionSuministro}` : ''}</span></div>}
                  <div className="flex justify-between col-span-2 sm:col-span-1"><span className="text-gray-400">Tipo propiedad</span><span className="capitalize">{supply.propertyType}</span></div>
                  {supply.hasExistingSolar && <div className="flex justify-between col-span-2 sm:col-span-1"><span className="text-gray-400">Solar existente</span><span>{supply.existingSystemKWp} kWp</span></div>}
                </div>
              </div>
            )}

            {/* Consumos futuros */}
            {future && future.totalAdditionalMonthlyKWh > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Consumos futuros planificados</p>
                <div className="flex flex-col gap-1.5 text-sm">
                  {future.evCharger && <div className="flex justify-between"><span className="text-gray-400">Auto eléctrico</span><span>{future.evCharger.carCount} auto{future.evCharger.carCount > 1 ? 's' : ''} · +{future.evCharger.estimatedMonthlyKWh} kWh/mes</span></div>}
                  {future.airConditioners?.map((ac, i) => (
                    <div key={i} className="flex justify-between"><span className="text-gray-400">Aire acondicionado</span><span>{ac.count} unid. {ac.btu} BTU · +{ac.estimatedMonthlyKWh} kWh/mes</span></div>
                  ))}
                  {future.waterHeater && <div className="flex justify-between"><span className="text-gray-400">Calefón eléctrico</span><span>{future.waterHeater.occupants} personas · +{future.waterHeater.estimatedMonthlyKWh} kWh/mes</span></div>}
                  <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold text-gray-700"><span>Total adicional</span><span>+{future.totalAdditionalMonthlyKWh} kWh/mes</span></div>
                </div>
              </div>
            )}

            {!lead.kit_size_kwp && !bills.length && (
              <p className="text-sm text-gray-400 text-center py-12">Este lead no completó la simulación.</p>
            )}
          </div>
        )}

        {/* ═══ COTIZACIONES ══════════════════════════════════════════════════ */}
        {tab === 'cotizaciones' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={handleNewQuote}
                disabled={isQuoting}
                className="flex items-center gap-1.5 bg-[#389fe0] hover:bg-[#1d65c5] disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              >
                {isQuoting ? 'Creando…' : '+ Nueva cotización vacía'}
              </button>
              {hasSimData && (
                <button
                  onClick={handleQuoteFromSim}
                  disabled={isQuotingSim}
                  className="flex items-center gap-1.5 border border-[#389fe0] text-[#389fe0] hover:bg-blue-50 disabled:opacity-50 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                >
                  {isQuotingSim ? 'Creando…' : '⚡ Crear desde simulación'}
                </button>
              )}
            </div>

            {quotes.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 py-14 text-center">
                <p className="text-sm text-gray-400">No hay cotizaciones para este lead.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {quotes.map((q, i) => (
                  <a
                    key={q.id}
                    href={`/admin/quotes/${q.id}`}
                    className={`flex items-center justify-between px-5 py-4 hover:bg-blue-50/40 transition-colors ${i > 0 ? 'border-t border-gray-100' : ''}`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{q.quote_number}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{dateShort(q.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-semibold text-gray-800 tabular-nums">{clp(q.total_clp)}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${QUOTE_STATUS_COLORS[q.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {QUOTE_STATUS_LABELS[q.status] ?? q.status}
                      </span>
                      <span className="text-gray-300 text-sm">→</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ NOTAS ════════════════════════════════════════════════════════ */}
        {tab === 'notas' && (
          <div className="flex flex-col gap-5">
            {/* Formulario nueva nota */}
            <form onSubmit={handleAddNote} className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Nueva nota</p>
              <input type="hidden" name="lead_id" value={lead.id} />
              <div className="flex gap-3 mb-3">
                <select
                  name="tipo"
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#389fe0] bg-white"
                >
                  {Object.entries(TIPO_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <textarea
                name="contenido"
                required
                rows={3}
                placeholder="Escribe una nota, resultado de llamada, acuerdo..."
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#389fe0] resize-none mb-3"
              />
              <button
                type="submit"
                disabled={isAddingNote}
                className="bg-[#389fe0] hover:bg-[#1d65c5] disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              >
                {isAddingNote ? 'Guardando…' : 'Agregar nota'}
              </button>
            </form>

            {/* Lista de notas */}
            {notes.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Sin notas aún.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {notes.map(n => (
                  <div key={n.id} className="bg-white rounded-2xl border border-gray-100 px-5 py-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-base">{TIPO_ICONS[n.tipo] ?? '•'}</span>
                      <span className="text-xs font-semibold text-gray-700">{TIPO_LABELS[n.tipo] ?? n.tipo}</span>
                      <span className="text-xs text-gray-400 ml-auto">{dateFull(n.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{n.contenido}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ HISTORIAL ════════════════════════════════════════════════════ */}
        {tab === 'historial' && (
          <div className="flex flex-col gap-3">
            {history.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-12">Sin cambios de estado registrados.</p>
            ) : (
              history.map(h => (
                <div key={h.id} className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm flex-1">
                    <span className="text-gray-400">{LEAD_STATUS_LABELS[h.from_status ?? ''] ?? h.from_status ?? 'Inicio'}</span>
                    <span className="text-gray-300">→</span>
                    <span className="font-semibold text-gray-800">{LEAD_STATUS_LABELS[h.to_status] ?? h.to_status}</span>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{dateFull(h.created_at)}</span>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
}
