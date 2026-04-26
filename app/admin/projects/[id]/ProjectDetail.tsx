'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateProject, upsertProjectItem, deleteProjectItem, addProjectCost, deleteProjectCost, reimportItemsFromQuote, addProjectPayment, deleteProjectPayment } from '../actions';
import type { ProjectRow, ProjectItem, ProjectCost, ProjectPayment } from '@/lib/db/projects';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clp(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
}

function pct(n: number) { return `${n.toFixed(1)}%`; }

function dateShort(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Constants ────────────────────────────────────────────────────────────────

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

const CATEGORIA_LABELS: Record<string, string> = {
  mano_de_obra: 'Mano de obra',
  materiales:   'Materiales',
  transporte:   'Transporte',
  subcontrato:  'Subcontrato',
  otro:         'Otro',
};

const METODO_LABELS: Record<string, string> = {
  transferencia: 'Transferencia',
  cheque:        'Cheque',
  efectivo:      'Efectivo',
  credito:       'Crédito',
  otro:          'Otro',
};

type Tab = 'resumen' | 'items' | 'costos' | 'pagos' | 'cotizacion';

type QuoteItem = { id: string; description: string; quantity: number; unit_price_clp: number; costo_proveedor_clp: number; total_clp: number };

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProjectDetail({
  project,
  items: initItems,
  costs: initCosts,
  payments: initPayments,
  quoteItems,
}: {
  project:    ProjectRow;
  items:      ProjectItem[];
  costs:      ProjectCost[];
  payments:   ProjectPayment[];
  quoteItems: QuoteItem[];
}) {
  const router = useRouter();
  const [tab, setTab]           = useState<Tab>('resumen');
  const [items, setItems]       = useState<ProjectItem[]>(initItems);
  const [costs, setCosts]       = useState<ProjectCost[]>(initCosts);
  const [payments, setPayments] = useState<ProjectPayment[]>(initPayments);
  const [editingItem, setEditingItem] = useState<ProjectItem | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddCost, setShowAddCost] = useState(false);
  const [saved, setSaved]   = useState(false);

  const [isPending, start]              = useTransition();
  const [isItemPending, startItem]      = useTransition();
  const [isCostPending, startCost]      = useTransition();
  const [isPaymentPending, startPayment] = useTransition();
  const [isImporting, startImport]      = useTransition();
  const [importError, setImportError]   = useState<string | null>(null);
  const [showAddPayment, setShowAddPayment] = useState(false);

  // ── Financiero ──────────────────────────────────────────────────────────────
  const revenue     = items.reduce((s, i) => s + i.total_clp, 0);
  const costBase    = items.reduce((s, i) => s + i.costo_proveedor_clp * i.quantity, 0);
  const costExtra   = costs.reduce((s, c) => s + c.monto_clp, 0);
  const profit      = revenue - costBase - costExtra;
  const marginPct   = revenue > 0 ? (profit / revenue) * 100 : 0;
  const totalCobrado = payments.reduce((s, p) => s + p.monto_clp, 0);
  const porCobrar    = revenue - totalCobrado;
  const cobradoPct   = revenue > 0 ? (totalCobrado / revenue) * 100 : 0;

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleSaveProject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      await updateProject(project.id, fd);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    });
  }

  function handleDeleteItem(item: ProjectItem) {
    setItems(prev => prev.filter(i => i.id !== item.id));
    startItem(async () => {
      await deleteProjectItem(project.id, item.id);
      router.refresh();
    });
  }

  function handleUpsertItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    startItem(async () => {
      await upsertProjectItem(project.id, fd);
      setEditingItem(null);
      setShowAddItem(false);
      router.refresh();
    });
  }

  function handleAddCost(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    form.reset();
    startCost(async () => {
      await addProjectCost(project.id, fd);
      setShowAddCost(false);
      router.refresh();
    });
  }

  function handleDeleteCost(cost: ProjectCost) {
    setCosts(prev => prev.filter(c => c.id !== cost.id));
    startCost(async () => {
      await deleteProjectCost(project.id, cost.id);
      router.refresh();
    });
  }

  function handleAddPayment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    form.reset();
    startPayment(async () => {
      await addProjectPayment(project.id, fd);
      setShowAddPayment(false);
      router.refresh();
    });
  }

  function handleDeletePayment(payment: ProjectPayment) {
    setPayments(prev => prev.filter(p => p.id !== payment.id));
    startPayment(async () => {
      await deleteProjectPayment(project.id, payment.id);
      router.refresh();
    });
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'resumen',    label: 'Resumen' },
    { id: 'items',      label: `Ítems (${items.length})` },
    { id: 'costos',     label: `Costos adicionales (${costs.length})` },
    { id: 'pagos',      label: `Pagos (${payments.length})` },
    { id: 'cotizacion', label: 'Cotización original' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <a href="/admin/projects" className="text-xs text-gray-400 hover:text-gray-600 mb-3 inline-block">← Proyectos</a>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{project.nombre}</h1>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <a href={`/admin/clients/${project.client_id}`} className="text-sm text-[#389fe0] hover:underline">{project.client_name}</a>
                {project.quote_number && (
                  <a href={`/admin/quotes/${project.quote_id}`} className="text-xs font-mono text-gray-400 hover:underline">
                    {project.quote_number}
                  </a>
                )}
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${ESTADO_COLORS[project.estado]}`}>
              {ESTADO_LABELS[project.estado]}
            </span>
          </div>
        </div>
      </div>

      {/* ── KPIs financieros ───────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
          {[
            { label: 'Ingresos (c/IVA)',  value: clp(revenue),      color: 'text-gray-900' },
            { label: 'Costo base',        value: clp(costBase),     color: 'text-gray-600' },
            { label: 'Costos adicionales',value: clp(costExtra),    color: 'text-red-600' },
            { label: 'Utilidad bruta',    value: clp(profit),       color: profit >= 0 ? 'text-green-700' : 'text-red-600' },
            { label: 'Margen',            value: pct(marginPct),    color: marginPct >= 0 ? 'text-green-700' : 'text-red-600' },
            { label: 'Cobrado',           value: clp(totalCobrado), color: 'text-[#1d65c5]' },
            { label: 'Por cobrar',        value: clp(porCobrar),    color: porCobrar > 0 ? 'text-amber-600' : 'text-green-700' },
          ].map(kpi => (
            <div key={kpi.label} className="text-center">
              <p className="text-xs text-gray-400 mb-1">{kpi.label}</p>
              <p className={`text-base font-bold ${kpi.color}`}>{kpi.value}</p>
            </div>
          ))}
        </div>
        {/* Barra de progreso de cobro */}
        {revenue > 0 && (
          <div className="max-w-5xl mx-auto mt-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-[#389fe0] rounded-full transition-all"
                  style={{ width: `${Math.min(cobradoPct, 100)}%` }}
                />
              </div>
              <span className="text-xs text-gray-400 shrink-0">{cobradoPct.toFixed(0)}% cobrado</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 flex gap-0">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t.id ? 'border-[#389fe0] text-[#389fe0]' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">

        {/* ═══ RESUMEN ══════════════════════════════════════════════════════ */}
        {tab === 'resumen' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Datos del proyecto</p>
            <form onSubmit={handleSaveProject} className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Nombre del proyecto</label>
                <input name="nombre" defaultValue={project.nombre} required
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#389fe0]" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Estado</label>
                <select name="estado" defaultValue={project.estado}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#389fe0] bg-white">
                  {Object.entries(ESTADO_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Fecha de inicio</label>
                  <input type="date" name="fecha_inicio" defaultValue={project.fecha_inicio ?? ''}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#389fe0]" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Fecha de término</label>
                  <input type="date" name="fecha_termino" defaultValue={project.fecha_termino ?? ''}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#389fe0]" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Notas</label>
                <textarea name="notas" defaultValue={project.notas ?? ''} rows={3} placeholder="Observaciones, estado de avance..."
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#389fe0] resize-none" />
              </div>
              <button type="submit" disabled={isPending}
                className="bg-[#389fe0] hover:bg-[#1d65c5] disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
                {saved ? '✓ Guardado' : isPending ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </form>
          </div>
        )}

        {/* ═══ ÍTEMS ════════════════════════════════════════════════════════ */}
        {tab === 'items' && (
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ítems de venta</p>
                <button onClick={() => { setShowAddItem(true); setEditingItem(null); }}
                  className="text-xs text-[#389fe0] hover:underline font-medium">+ Agregar ítem</button>
              </div>

              {items.length === 0 && !showAddItem ? (
                <p className="text-sm text-gray-400 text-center py-10">Sin ítems. Agrega o importa desde la cotización original.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
                      <th className="text-left px-4 py-2 font-medium">Descripción</th>
                      <th className="text-right px-4 py-2 font-medium">Cant.</th>
                      <th className="text-right px-4 py-2 font-medium">P. unitario</th>
                      <th className="text-right px-4 py-2 font-medium">Costo</th>
                      <th className="text-right px-4 py-2 font-medium">Total c/IVA</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      editingItem?.id === item.id ? (
                        <ItemForm key={item.id} item={item} onSubmit={handleUpsertItem} onCancel={() => setEditingItem(null)} isPending={isItemPending} />
                      ) : (
                        <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="px-4 py-3 text-gray-800">{item.description}</td>
                          <td className="px-4 py-3 text-right text-gray-600">{item.quantity}</td>
                          <td className="px-4 py-3 text-right text-gray-600">{clp(item.unit_price_clp)}</td>
                          <td className="px-4 py-3 text-right text-gray-400">{clp(item.costo_proveedor_clp)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">{clp(item.total_clp)}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-3 justify-end">
                              <button onClick={() => { setEditingItem(item); setShowAddItem(false); }}
                                className="text-xs text-[#389fe0] hover:underline">Editar</button>
                              <button onClick={() => handleDeleteItem(item)}
                                className="text-xs text-red-400 hover:underline">Eliminar</button>
                            </div>
                          </td>
                        </tr>
                      )
                    ))}
                    {showAddItem && (
                      <ItemForm item={null} onSubmit={handleUpsertItem} onCancel={() => setShowAddItem(false)} isPending={isItemPending} />
                    )}
                  </tbody>
                </table>
              )}

              {items.length > 0 && (
                <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-6 text-sm">
                  <span className="text-gray-400">Subtotal ingresos:</span>
                  <span className="font-bold text-gray-900">{clp(revenue)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ COSTOS ADICIONALES ═══════════════════════════════════════════ */}
        {tab === 'costos' && (
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Costos de ejecución</p>
                <button onClick={() => setShowAddCost(v => !v)}
                  className="text-xs text-[#389fe0] hover:underline font-medium">+ Agregar costo</button>
              </div>

              {showAddCost && (
                <form onSubmit={handleAddCost} className="px-5 py-4 border-b border-gray-100 bg-blue-50/30 flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-xs text-gray-500 mb-1 block">Descripción</label>
                      <input name="descripcion" required placeholder="ej: Cable adicional no cotizado"
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#389fe0]" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Monto (CLP neto)</label>
                      <input name="monto_clp" type="number" required placeholder="0"
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#389fe0]" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Categoría</label>
                      <select name="categoria"
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#389fe0] bg-white">
                        {Object.entries(CATEGORIA_LABELS).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-gray-500 mb-1 block">Notas (opcional)</label>
                      <input name="notas" placeholder="Descripción adicional"
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#389fe0]" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={isCostPending}
                      className="bg-[#389fe0] hover:bg-[#1d65c5] disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
                      {isCostPending ? 'Guardando…' : 'Agregar'}
                    </button>
                    <button type="button" onClick={() => setShowAddCost(false)}
                      className="border border-gray-200 text-gray-500 hover:bg-gray-50 px-4 py-2 rounded-xl text-sm transition-colors">
                      Cancelar
                    </button>
                  </div>
                </form>
              )}

              {costs.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">Sin costos adicionales registrados.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
                      <th className="text-left px-4 py-2 font-medium">Descripción</th>
                      <th className="text-left px-4 py-2 font-medium">Categoría</th>
                      <th className="text-left px-4 py-2 font-medium">Notas</th>
                      <th className="text-right px-4 py-2 font-medium">Monto</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {costs.map(cost => (
                      <tr key={cost.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-gray-800">{cost.descripcion}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{CATEGORIA_LABELS[cost.categoria] ?? cost.categoria}</td>
                        <td className="px-4 py-3 text-xs text-gray-400">{cost.notas ?? '—'}</td>
                        <td className="px-4 py-3 text-right font-semibold text-red-600">{clp(cost.monto_clp)}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => handleDeleteCost(cost)}
                            className="text-xs text-red-400 hover:underline">Eliminar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200 bg-red-50/30">
                      <td colSpan={3} className="px-4 py-3 text-sm text-gray-500 font-medium">Total costos adicionales</td>
                      <td className="px-4 py-3 text-right font-bold text-red-600">{clp(costExtra)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ═══ PAGOS ════════════════════════════════════════════════════════ */}
        {tab === 'pagos' && (
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pagos recibidos</p>
                <button onClick={() => setShowAddPayment(v => !v)}
                  className="text-xs text-[#389fe0] hover:underline font-medium">+ Registrar pago</button>
              </div>

              {showAddPayment && (
                <form onSubmit={handleAddPayment} className="px-5 py-4 border-b border-gray-100 bg-blue-50/30 flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Monto (CLP)</label>
                      <input name="monto_clp" type="number" required placeholder="0"
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#389fe0]" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Fecha</label>
                      <input name="fecha" type="date" required
                        defaultValue={new Date().toISOString().slice(0, 10)}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#389fe0]" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Método</label>
                      <select name="metodo"
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#389fe0] bg-white">
                        {Object.entries(METODO_LABELS).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Referencia (opcional)</label>
                      <input name="referencia" placeholder="Nº transferencia, cheque…"
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#389fe0]" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-gray-500 mb-1 block">Notas (opcional)</label>
                      <input name="notas" placeholder="Descripción adicional"
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#389fe0]" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={isPaymentPending}
                      className="bg-[#389fe0] hover:bg-[#1d65c5] disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
                      {isPaymentPending ? 'Guardando…' : 'Registrar'}
                    </button>
                    <button type="button" onClick={() => setShowAddPayment(false)}
                      className="border border-gray-200 text-gray-500 hover:bg-gray-50 px-4 py-2 rounded-xl text-sm transition-colors">
                      Cancelar
                    </button>
                  </div>
                </form>
              )}

              {payments.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">Sin pagos registrados.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
                      <th className="text-left px-4 py-2 font-medium">Fecha</th>
                      <th className="text-left px-4 py-2 font-medium">Método</th>
                      <th className="text-left px-4 py-2 font-medium">Referencia</th>
                      <th className="text-left px-4 py-2 font-medium">Notas</th>
                      <th className="text-right px-4 py-2 font-medium">Monto</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(payment => (
                      <tr key={payment.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-gray-700">
                          {new Date(payment.fecha).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{METODO_LABELS[payment.metodo] ?? payment.metodo}</td>
                        <td className="px-4 py-3 text-xs text-gray-400 font-mono">{payment.referencia ?? '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-400">{payment.notas ?? '—'}</td>
                        <td className="px-4 py-3 text-right font-semibold text-[#1d65c5]">{clp(payment.monto_clp)}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => handleDeletePayment(payment)}
                            className="text-xs text-red-400 hover:underline">Eliminar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200 bg-blue-50/30">
                      <td colSpan={4} className="px-4 py-3 text-sm text-gray-500 font-medium">Total cobrado</td>
                      <td className="px-4 py-3 text-right font-bold text-[#1d65c5]">{clp(totalCobrado)}</td>
                      <td></td>
                    </tr>
                    {porCobrar > 0 && (
                      <tr className="bg-amber-50/40">
                        <td colSpan={4} className="px-4 py-3 text-sm text-amber-700 font-medium">Por cobrar</td>
                        <td className="px-4 py-3 text-right font-bold text-amber-700">{clp(porCobrar)}</td>
                        <td></td>
                      </tr>
                    )}
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ═══ COTIZACIÓN ORIGINAL ══════════════════════════════════════════ */}
        {tab === 'cotizacion' && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-4 flex-wrap">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Cotización original {project.quote_number ? `— ${project.quote_number}` : ''}
              </p>
              <div className="flex items-center gap-3">
                {project.quote_id && (
                  <>
                    <button
                      onClick={() => {
                        if (!confirm('¿Reemplazar los ítems actuales del proyecto con los de la cotización original?')) return;
                        setImportError(null);
                        startImport(async () => {
                          const res = await reimportItemsFromQuote(project.id);
                          if (res?.error) { setImportError(res.error); return; }
                          router.refresh();
                        });
                      }}
                      disabled={isImporting}
                      className="text-xs text-amber-600 hover:underline disabled:opacity-50 font-medium"
                    >
                      {isImporting ? 'Importando…' : '↺ Reimportar ítems'}
                    </button>
                    <a href={`/admin/quotes/${project.quote_id}`} className="text-xs text-[#389fe0] hover:underline">
                      Abrir en editor →
                    </a>
                  </>
                )}
              </div>
            </div>
            {importError && (
              <p className="px-5 py-2 text-xs text-red-600 bg-red-50">{importError}</p>
            )}
            {quoteItems.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">Sin cotización vinculada.</p>
            ) : (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
                      <th className="text-left px-4 py-2 font-medium">Descripción</th>
                      <th className="text-right px-4 py-2 font-medium">Cant.</th>
                      <th className="text-right px-4 py-2 font-medium">P. unitario</th>
                      <th className="text-right px-4 py-2 font-medium">Costo</th>
                      <th className="text-right px-4 py-2 font-medium">Total c/IVA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quoteItems.map(item => (
                      <tr key={item.id} className="border-b border-gray-50">
                        <td className="px-4 py-3 text-gray-700">{item.description}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{clp(item.unit_price_clp)}</td>
                        <td className="px-4 py-3 text-right text-gray-400">{clp(item.costo_proveedor_clp)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">{clp(item.total_clp)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200 bg-gray-50">
                      <td colSpan={4} className="px-4 py-3 text-sm text-gray-500 font-medium">Total cotización</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">
                        {clp(quoteItems.reduce((s, i) => s + i.total_clp, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// ─── ItemForm ─────────────────────────────────────────────────────────────────

function ItemForm({ item, onSubmit, onCancel, isPending }: {
  item: ProjectItem | null;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <tr className="border-b border-blue-100 bg-blue-50/30">
      <td colSpan={6} className="px-4 py-3">
        <form onSubmit={onSubmit} className="flex flex-wrap gap-3 items-end">
          {item && <input type="hidden" name="item_id" value={item.id} />}
          <input type="hidden" name="sort_order" value={item?.sort_order ?? 0} />
          <div className="flex-1 min-w-48">
            <label className="text-xs text-gray-500 mb-1 block">Descripción</label>
            <input name="description" required defaultValue={item?.description ?? ''}
              className="w-full rounded-xl border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#389fe0]" />
          </div>
          <div className="w-20">
            <label className="text-xs text-gray-500 mb-1 block">Cantidad</label>
            <input name="quantity" type="number" step="0.01" required defaultValue={item?.quantity ?? 1}
              className="w-full rounded-xl border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#389fe0]" />
          </div>
          <div className="w-32">
            <label className="text-xs text-gray-500 mb-1 block">P. unitario neto</label>
            <input name="unit_price_clp" type="number" required defaultValue={item?.unit_price_clp ?? 0}
              className="w-full rounded-xl border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#389fe0]" />
          </div>
          <div className="w-32">
            <label className="text-xs text-gray-500 mb-1 block">Costo proveedor</label>
            <input name="costo_proveedor_clp" type="number" defaultValue={item?.costo_proveedor_clp ?? 0}
              className="w-full rounded-xl border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#389fe0]" />
          </div>
          <div className="w-20">
            <label className="text-xs text-gray-500 mb-1 block">Descuento %</label>
            <input name="discount_percent" type="number" defaultValue={item?.discount_percent ?? 0}
              className="w-full rounded-xl border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#389fe0]" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={isPending}
              className="bg-[#389fe0] hover:bg-[#1d65c5] disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors">
              {isPending ? '…' : item ? 'Guardar' : 'Agregar'}
            </button>
            <button type="button" onClick={onCancel}
              className="border border-gray-200 text-gray-500 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-xs transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      </td>
    </tr>
  );
}
