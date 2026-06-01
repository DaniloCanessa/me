'use client';

import { useState, useTransition, useEffect, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import {
  updateProject, upsertProjectItem, deleteProjectItem,
  addProjectCost, deleteProjectCost,
  reimportItemsFromQuote,
  addProjectPayment, deleteProjectPayment,
  addProjectPurchase, deleteProjectPurchase,
} from '../actions';
import type { ProjectRow, ProjectItem, ProjectCost, ProjectPayment, ProjectPurchase } from '@/lib/db/projects';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clp(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
}

function pct(n: number) { return `${n.toFixed(1)}%`; }

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

type Tab = 'resumen' | 'items' | 'compras' | 'costos' | 'pagos' | 'cuenta' | 'cotizacion';

type QuoteItem = { id: string; description: string; quantity: number; unit_price_clp: number; costo_proveedor_clp: number; total_clp: number };

// ─── AvanceBadge ──────────────────────────────────────────────────────────────

function AvanceBadge({ pct: p, overrun }: { pct: number; overrun: boolean }) {
  if (overrun) return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">⚠ {p.toFixed(0)}%</span>
  );
  if (p >= 100) return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">✓ 100%</span>
  );
  if (p === 0) return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">○ 0%</span>
  );
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-600">◑ {p.toFixed(0)}%</span>
  );
}

// ─── PurchaseForm ─────────────────────────────────────────────────────────────

function PurchaseForm({
  items,
  defaultItemId,
  onSubmit,
  onCancel,
  isPending,
}: {
  items: ProjectItem[];
  defaultItemId: string | null;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap gap-3 items-end">
      {defaultItemId !== null ? (
        <input type="hidden" name="project_item_id" value={defaultItemId} />
      ) : (
        <div className="w-52">
          <label className="text-xs text-gray-500 mb-1 block">Ítem</label>
          <select name="project_item_id"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#389fe0] bg-white">
            <option value="">Sin ítem específico</option>
            {items.map(item => (
              <option key={item.id} value={item.id}>{item.description}</option>
            ))}
          </select>
        </div>
      )}

      <div className="w-32">
        <label className="text-xs text-gray-500 mb-1 block">Tipo</label>
        <select name="tipo"
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#389fe0] bg-white">
          <option value="factura">Factura</option>
          <option value="anticipo">Anticipo</option>
        </select>
      </div>

      <div className="w-36">
        <label className="text-xs text-gray-500 mb-1 block">Proveedor</label>
        <input name="proveedor" placeholder="Vitel, Solis…"
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#389fe0]" />
      </div>

      <div className="w-28">
        <label className="text-xs text-gray-500 mb-1 block">Folio / N°</label>
        <input name="folio" placeholder="4521"
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#389fe0]" />
      </div>

      <div className="w-32">
        <label className="text-xs text-gray-500 mb-1 block">Monto (CLP)</label>
        <input name="monto_clp" type="number" required min={0} placeholder="0"
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#389fe0]" />
      </div>

      <div className="w-36">
        <label className="text-xs text-gray-500 mb-1 block">Fecha</label>
        <input name="fecha" type="date" required
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#389fe0]" />
      </div>

      <div className="flex-1 min-w-32">
        <label className="text-xs text-gray-500 mb-1 block">Notas</label>
        <input name="notas" placeholder="Opcional"
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#389fe0]" />
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={isPending}
          className="bg-[#389fe0] hover:bg-[#1d65c5] disabled:opacity-50 text-white px-3 py-2 rounded-xl text-xs font-semibold transition-colors">
          {isPending ? '…' : 'Registrar'}
        </button>
        <button type="button" onClick={onCancel}
          className="border border-gray-200 text-gray-500 hover:bg-gray-50 px-3 py-2 rounded-xl text-xs transition-colors">
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProjectDetail({
  project,
  items: initItems,
  costs: initCosts,
  payments: initPayments,
  purchases: initPurchases,
  quoteItems,
}: {
  project:    ProjectRow;
  items:      ProjectItem[];
  costs:      ProjectCost[];
  payments:   ProjectPayment[];
  purchases:  ProjectPurchase[];
  quoteItems: QuoteItem[];
}) {
  const router = useRouter();
  const [tab, setTab]               = useState<Tab>('resumen');
  const [items, setItems]           = useState<ProjectItem[]>(initItems);
  const [costs, setCosts]           = useState<ProjectCost[]>(initCosts);
  const [payments, setPayments]     = useState<ProjectPayment[]>(initPayments);
  const [purchases, setPurchases]   = useState<ProjectPurchase[]>(initPurchases);
  const [editingItem, setEditingItem] = useState<ProjectItem | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddCost, setShowAddCost] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showGlobalAdd, setShowGlobalAdd]   = useState(false);
  const [addingForItem, setAddingForItem]   = useState<string | null>(null);
  const [expandedItems, setExpandedItems]   = useState<Set<string>>(new Set());
  const [purchaseError, setPurchaseError]   = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Sincronizar estado local cuando el servidor actualiza (router.refresh)
  const _costIds     = initCosts.map(c => c.id).join(',');
  const _paymentIds  = initPayments.map(p => p.id).join(',');
  const _purchaseIds = initPurchases.map(p => p.id).join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setCosts(initCosts); },     [_costIds]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setPayments(initPayments); }, [_paymentIds]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setPurchases(initPurchases); }, [_purchaseIds]);

  const [isPending,         start]          = useTransition();
  const [isItemPending,     startItem]      = useTransition();
  const [isCostPending,     startCost]      = useTransition();
  const [isPaymentPending,  startPayment]   = useTransition();
  const [isPurchasePending, startPurchase]  = useTransition();
  const [isImporting,       startImport]    = useTransition();
  const [importError, setImportError]       = useState<string | null>(null);

  // ── Financiero ──────────────────────────────────────────────────────────────
  const IVA            = 1.19;
  const revenue        = items.reduce((s, i) => s + i.total_clp, 0);         // c/IVA
  const costBase       = items.reduce((s, i) => s + i.costo_proveedor_clp * i.quantity, 0); // net
  const costExtra      = costs.reduce((s, c) => s + c.monto_clp, 0);         // net
  const totalComprado  = purchases.reduce((s, p) => s + p.monto_clp, 0);     // c/IVA (facturas reales)
  const totalCobrado   = payments.reduce((s, p) => s + p.monto_clp, 0);      // c/IVA
  const porCobrar      = revenue - totalCobrado;
  const cobradoPct     = revenue > 0 ? (totalCobrado / revenue) * 100 : 0;
  const compradoPct    = costBase > 0 ? (totalComprado / (costBase * IVA)) * 100 : 0;

  // Con IVA
  const costBaseIva    = Math.round(costBase * IVA);
  const costExtraIva   = costExtra;                      // ingresado c/IVA
  const compradoIva    = totalComprado;
  const profitIva      = revenue - costBaseIva - costExtraIva;
  const marginIvaPct   = revenue > 0 ? (profitIva / revenue) * 100 : 0;

  // Sin IVA
  const revenueSinIva  = Math.round(revenue / IVA);
  const costBaseSinIva = costBase;
  const costExtraSinIva= Math.round(costExtra / IVA);   // c/IVA → neto
  const compradoSinIva = Math.round(totalComprado / IVA);
  const profitSinIva   = revenueSinIva - costBaseSinIva - costExtraSinIva;
  const marginSinIvaPct= revenueSinIva > 0 ? (profitSinIva / revenueSinIva) * 100 : 0;
  const cobradoSinIva  = Math.round(totalCobrado / IVA);
  const porCobrarSinIva= Math.round(porCobrar / IVA);

  // Para compatibilidad con resto del código
  const profit         = profitIva;
  const marginPct      = marginIvaPct;

  // ── Toggle expand ───────────────────────────────────────────────────────────
  function toggleExpand(itemId: string) {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

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
    const fd = new FormData(e.currentTarget);
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

    const optimistic: ProjectCost = {
      id:          `temp-${Date.now()}`,
      project_id:  project.id,
      descripcion: fd.get('descripcion') as string,
      monto_clp:   parseFloat(fd.get('monto_clp') as string) || 0,
      categoria:   (fd.get('categoria') as string) || 'otro',
      notas:       (fd.get('notas') as string) || null,
      created_at:  new Date().toISOString(),
    };

    setCosts(prev => [...prev, optimistic]);
    setShowAddCost(false);
    form.reset();

    startCost(async () => {
      const res = await addProjectCost(project.id, fd);
      if (res?.error) {
        setCosts(prev => prev.filter(c => c.id !== optimistic.id));
        return;
      }
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

    const optimistic: ProjectPayment = {
      id: `temp-${Date.now()}`,
      project_id: project.id,
      monto_clp:  parseFloat(fd.get('monto_clp') as string) || 0,
      fecha:      fd.get('fecha') as string,
      metodo:     fd.get('metodo') as string,
      referencia: (fd.get('referencia') as string) || null,
      notas:      (fd.get('notas') as string) || null,
      created_at: new Date().toISOString(),
    };

    setPayments(prev => [optimistic, ...prev]);
    setShowAddPayment(false);
    form.reset();

    startPayment(async () => {
      const res = await addProjectPayment(project.id, fd);
      if (res?.error) {
        setPayments(prev => prev.filter(p => p.id !== optimistic.id));
        return;
      }
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

  function handleAddPurchase(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const itemId = (fd.get('project_item_id') as string) || null;
    setPurchaseError(null);

    const optimistic: ProjectPurchase = {
      id:              `temp-${Date.now()}`,
      project_id:      project.id,
      project_item_id: itemId || null,
      tipo:            (fd.get('tipo') as 'factura' | 'anticipo') || 'factura',
      proveedor:       (fd.get('proveedor') as string) || null,
      folio:           (fd.get('folio') as string) || null,
      monto_clp:       parseFloat(fd.get('monto_clp') as string) || 0,
      fecha:           fd.get('fecha') as string,
      notas:           (fd.get('notas') as string) || null,
      created_at:      new Date().toISOString(),
    };

    setPurchases(prev => [optimistic, ...prev]);
    setShowGlobalAdd(false);
    setAddingForItem(null);
    if (itemId) setExpandedItems(prev => new Set([...prev, itemId]));
    form.reset();

    startPurchase(async () => {
      const res = await addProjectPurchase(project.id, fd);
      if (res?.error) {
        setPurchases(prev => prev.filter(p => p.id !== optimistic.id));
        setPurchaseError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function handleDeletePurchase(purchase: ProjectPurchase) {
    setPurchases(prev => prev.filter(p => p.id !== purchase.id));
    startPurchase(async () => {
      await deleteProjectPurchase(project.id, purchase.id);
      router.refresh();
    });
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'resumen',    label: 'Resumen' },
    { id: 'items',      label: `Ítems (${items.length})` },
    { id: 'compras',    label: `Compras (${purchases.length})` },
    { id: 'costos',     label: `Costos adicionales (${costs.length})` },
    { id: 'pagos',      label: `Pagos (${payments.length})` },
    { id: 'cuenta',     label: 'Cuenta corriente' },
    { id: 'cotizacion', label: 'Cotización original' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-screen-2xl mx-auto">
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
        <div className="max-w-screen-2xl mx-auto grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
          {([
            { label: 'Ingresos',           ci: revenue,       si: revenueSinIva,  isPct: false, color: 'text-gray-900' },
            { label: 'Costo cotizado',     ci: costBaseIva,   si: costBaseSinIva, isPct: false, color: 'text-gray-500' },
            { label: 'Comprado real',      ci: compradoIva,   si: compradoSinIva, isPct: false, color: compradoPct > 100 ? 'text-red-600' : 'text-emerald-700' },
            { label: 'Costos adicionales', ci: costExtraIva,  si: costExtraSinIva,isPct: false, color: 'text-red-600' },
            { label: 'Utilidad bruta',     ci: profitIva,     si: profitSinIva,   isPct: false, color: profitIva >= 0 ? 'text-green-700' : 'text-red-600' },
            { label: 'Margen',             ci: marginIvaPct,  si: marginSinIvaPct,isPct: true,  color: marginIvaPct >= 0 ? 'text-green-700' : 'text-red-600' },
            { label: 'Cobrado',            ci: totalCobrado,  si: cobradoSinIva,  isPct: false, color: 'text-[#1d65c5]' },
            { label: 'Por cobrar',         ci: porCobrar,     si: porCobrarSinIva,isPct: false, color: porCobrar > 0 ? 'text-amber-600' : 'text-green-700' },
          ] as { label: string; ci: number; si: number; isPct: boolean; color: string }[]).map(kpi => (
            <div key={kpi.label} className="text-center">
              <p className="text-xs text-gray-400 mb-1">{kpi.label}</p>
              <p className={`text-sm font-bold ${kpi.color}`}>
                {kpi.isPct ? pct(kpi.ci) : clp(kpi.ci)}
              </p>
              <p className="text-sm text-gray-400 mt-0.5">
                {kpi.isPct ? pct(kpi.si) : clp(kpi.si)} <span className="text-gray-300">s/IVA</span>
              </p>
            </div>
          ))}
        </div>

        <div className="max-w-screen-2xl mx-auto mt-3 flex flex-col gap-1.5">
          {revenue > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-[#389fe0] rounded-full transition-all" style={{ width: `${Math.min(cobradoPct, 100)}%` }} />
              </div>
              <span className="text-xs text-gray-400 shrink-0 w-36 text-right">{cobradoPct.toFixed(0)}% cobrado</span>
            </div>
          )}
          {costBase > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${compradoPct > 100 ? 'bg-red-400' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(compradoPct, 100)}%` }}
                />
              </div>
              <span className="text-xs text-gray-400 shrink-0 w-36 text-right">{compradoPct.toFixed(0)}% compras ejecutadas</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-screen-2xl mx-auto px-6 flex gap-0 overflow-x-auto">
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

      <div className="max-w-screen-2xl mx-auto px-6 py-6">

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

        {/* ═══ COMPRAS ══════════════════════════════════════════════════════ */}
        {tab === 'compras' && (
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Compras por ítem</p>
                <button
                  onClick={() => { setShowGlobalAdd(v => !v); setAddingForItem(null); }}
                  className="text-xs text-[#389fe0] hover:underline font-medium">
                  + Registrar compra
                </button>
              </div>

              {purchaseError && (
                <div className="px-5 py-2 bg-red-50 border-b border-red-100">
                  <p className="text-xs text-red-600">Error: {purchaseError}</p>
                </div>
              )}

              {showGlobalAdd && (
                <div className="px-5 py-4 border-b border-gray-100 bg-blue-50/30">
                  <p className="text-xs font-medium text-gray-500 mb-3">Nueva compra</p>
                  <PurchaseForm
                    items={items}
                    defaultItemId={null}
                    onSubmit={handleAddPurchase}
                    onCancel={() => setShowGlobalAdd(false)}
                    isPending={isPurchasePending}
                  />
                </div>
              )}

              {items.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">
                  Sin ítems. Agrega ítems al proyecto primero.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
                      <th className="text-left px-4 py-2 font-medium">Ítem</th>
                      <th className="text-right px-4 py-2 font-medium">Cotizado</th>
                      <th className="text-right px-4 py-2 font-medium">Comprado</th>
                      <th className="text-right px-4 py-2 font-medium">Pendiente</th>
                      <th className="text-right px-4 py-2 font-medium">Avance</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => {
                      const itemPurchases = purchases.filter(p => p.project_item_id === item.id);
                      const cotizado  = item.costo_proveedor_clp * item.quantity;
                      const comprado  = itemPurchases.reduce((s, p) => s + p.monto_clp, 0);
                      const pendiente = cotizado - comprado;
                      const avancePct = cotizado > 0 ? (comprado / cotizado) * 100 : 0;
                      const isExpanded = expandedItems.has(item.id);
                      const overrun   = pendiente < 0;

                      return (
                        <Fragment key={item.id}>
                          <tr
                            onClick={() => toggleExpand(item.id)}
                            className={`border-b cursor-pointer ${isExpanded ? 'border-blue-100 bg-blue-50/20' : 'border-gray-50 hover:bg-gray-50/50'}`}
                          >
                            <td className="px-4 py-3 text-gray-800">
                              <span className="mr-2 text-gray-400 text-xs select-none">{isExpanded ? '▼' : '▶'}</span>
                              {item.description}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-500">{cotizado > 0 ? clp(cotizado) : '—'}</td>
                            <td className="px-4 py-3 text-right font-medium text-gray-700">{clp(comprado)}</td>
                            <td className={`px-4 py-3 text-right font-medium ${
                              overrun ? 'text-red-600' : pendiente === 0 && cotizado > 0 ? 'text-green-600' : 'text-amber-600'
                            }`}>
                              {overrun
                                ? `+${clp(Math.abs(pendiente))} exceso`
                                : cotizado > 0 ? clp(pendiente) : '—'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <AvanceBadge pct={avancePct} overrun={overrun} />
                            </td>
                            <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => {
                                  setAddingForItem(addingForItem === item.id ? null : item.id);
                                  if (!isExpanded) toggleExpand(item.id);
                                  setShowGlobalAdd(false);
                                }}
                                className="text-xs text-[#389fe0] hover:underline"
                              >
                                + Agregar
                              </button>
                            </td>
                          </tr>

                          {isExpanded && (
                            <>
                              {itemPurchases.length === 0 && addingForItem !== item.id && (
                                <tr className="bg-gray-50/40">
                                  <td colSpan={6} className="px-10 py-2 text-xs text-gray-400 italic">
                                    Sin compras registradas — haz clic en "+ Agregar" para registrar.
                                  </td>
                                </tr>
                              )}

                              {itemPurchases.map(purchase => (
                                <tr key={purchase.id} className="bg-gray-50/40 border-b border-gray-100/60">
                                  <td className="pl-10 pr-4 py-2.5 text-xs text-gray-600" colSpan={3}>
                                    <span className="text-gray-300 mr-2">└</span>
                                    <span className="text-gray-400 mr-2">
                                      {new Date(purchase.fecha + 'T12:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </span>
                                    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium mr-2 ${
                                      purchase.tipo === 'factura' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                                    }`}>
                                      {purchase.tipo === 'factura' ? 'Factura' : 'Anticipo'}
                                    </span>
                                    {purchase.proveedor && (
                                      <span className="font-medium text-gray-700 mr-2">{purchase.proveedor}</span>
                                    )}
                                    {purchase.folio && (
                                      <span className="font-mono text-gray-400 mr-2">#{purchase.folio}</span>
                                    )}
                                    {purchase.notas && (
                                      <span className="text-gray-400 italic">{purchase.notas}</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2.5 text-right text-xs font-semibold text-gray-800">
                                    {clp(purchase.monto_clp)}
                                  </td>
                                  <td></td>
                                  <td className="px-4 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                                    <button
                                      onClick={() => handleDeletePurchase(purchase)}
                                      className="text-xs text-red-400 hover:text-red-600"
                                    >
                                      ×
                                    </button>
                                  </td>
                                </tr>
                              ))}

                              {addingForItem === item.id && (
                                <tr className="bg-blue-50/30 border-b border-blue-100">
                                  <td colSpan={6} className="px-5 py-4">
                                    <PurchaseForm
                                      items={items}
                                      defaultItemId={item.id}
                                      onSubmit={handleAddPurchase}
                                      onCancel={() => setAddingForItem(null)}
                                      isPending={isPurchasePending}
                                    />
                                  </td>
                                </tr>
                              )}
                            </>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                      <td className="px-4 py-3 text-sm font-semibold text-gray-700">TOTAL</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-500">{clp(costBase)}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">{clp(totalComprado)}</td>
                      <td className={`px-4 py-3 text-right font-bold ${
                        costBase - totalComprado < 0 ? 'text-red-600' : costBase - totalComprado === 0 && costBase > 0 ? 'text-green-600' : 'text-amber-600'
                      }`}>
                        {costBase - totalComprado < 0
                          ? `+${clp(Math.abs(costBase - totalComprado))} exceso`
                          : clp(costBase - totalComprado)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs font-medium text-gray-500">{compradoPct.toFixed(0)}% ejecutado</span>
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>

            {/* Compras sin ítem asignado */}
            {purchases.filter(p => !p.project_item_id).length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sin ítem asignado</p>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {purchases.filter(p => !p.project_item_id).map(purchase => (
                      <tr key={purchase.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {new Date(purchase.fecha + 'T12:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
                          {' · '}
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                            purchase.tipo === 'factura' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                          }`}>
                            {purchase.tipo === 'factura' ? 'Factura' : 'Anticipo'}
                          </span>
                          {purchase.proveedor && <span className="ml-2 font-medium text-gray-700">{purchase.proveedor}</span>}
                          {purchase.folio && <span className="ml-1 font-mono text-gray-400">#{purchase.folio}</span>}
                          {purchase.notas && <span className="ml-2 text-gray-400 italic">{purchase.notas}</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-800">{clp(purchase.monto_clp)}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleDeletePurchase(purchase)}
                            className="text-xs text-red-400 hover:text-red-600">×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══ COSTOS ADICIONALES ═══════════════════════════════════════════ */}
        {tab === 'costos' && (
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Costos de ejecución no cotizados</p>
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
                      <label className="text-xs text-gray-500 mb-1 block">Monto (CLP c/IVA)</label>
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
                          {new Date(payment.fecha + 'T12:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
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

        {/* ═══ CUENTA CORRIENTE ═════════════════════════════════════════════ */}
        {tab === 'cuenta' && (() => {
          const movements: Array<{
            id: string; fecha: string; concepto: string;
            tipo: 'cobro' | 'gasto'; badge: string; badgeColor: string; monto: number;
          }> = [
            ...payments.map(p => ({
              id: p.id, fecha: p.fecha,
              concepto: `Pago cliente · ${METODO_LABELS[p.metodo] ?? p.metodo}${p.referencia ? ` · ${p.referencia}` : ''}`,
              tipo: 'cobro' as const, badge: 'Ingreso', badgeColor: 'bg-blue-50 text-blue-600',
              monto: p.monto_clp,
            })),
            ...purchases.filter(p => !p.id.startsWith('temp-')).map(p => ({
              id: p.id, fecha: p.fecha,
              concepto: [p.tipo === 'factura' ? 'Factura' : 'Anticipo', p.proveedor, p.folio ? `#${p.folio}` : null, p.notas].filter(Boolean).join(' · '),
              tipo: 'gasto' as const,
              badge: p.tipo === 'factura' ? 'Factura' : 'Anticipo',
              badgeColor: p.tipo === 'factura' ? 'bg-amber-50 text-amber-600' : 'bg-purple-50 text-purple-600',
              monto: p.monto_clp,
            })),
            ...costs.filter(c => !c.id.startsWith('temp-')).map(c => ({
              id: c.id, fecha: c.created_at.slice(0, 10),
              concepto: c.descripcion,
              tipo: 'gasto' as const,
              badge: CATEGORIA_LABELS[c.categoria] ?? c.categoria,
              badgeColor: 'bg-red-50 text-red-600',
              monto: c.monto_clp,
            })),
          ].sort((a, b) => a.fecha.localeCompare(b.fecha));

          const totalGastado  = totalComprado + costExtra;
          const resultadoReal = totalCobrado - totalGastado;
          const margenRealPct = totalCobrado > 0 ? (resultadoReal / totalCobrado) * 100 : 0;

          return (
            <div className="flex flex-col gap-4">

              {/* KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Cobrado',      value: clp(totalCobrado),   sub: `${cobradoPct.toFixed(0)}% de ${clp(revenue)}`,    color: 'text-[#1d65c5]' },
                  { label: 'Gastado',      value: clp(totalGastado),   sub: `${costBase > 0 ? ((totalGastado/costBase)*100).toFixed(0) : 0}% de ${clp(costBase)}`, color: 'text-red-600' },
                  { label: 'Por cobrar',   value: clp(Math.max(0, porCobrar)), sub: '', color: porCobrar > 0 ? 'text-amber-600' : 'text-green-600' },
                  { label: 'Resultado real', value: clp(resultadoReal), sub: `${margenRealPct.toFixed(1)}% margen`, color: resultadoReal >= 0 ? 'text-green-700' : 'text-red-600' },
                ].map(k => (
                  <div key={k.label} className="bg-white rounded-2xl border border-gray-100 p-4">
                    <p className="text-xs text-gray-400 mb-1">{k.label}</p>
                    <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
                    {k.sub && <p className="text-xs text-gray-400 mt-0.5">{k.sub}</p>}
                  </div>
                ))}
              </div>

              {/* Tabla de movimientos */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Movimientos</p>
                </div>

                {/* Línea de referencia */}
                <div className="px-5 py-3 border-b border-dashed border-gray-100 flex items-center justify-between bg-gray-50/60">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">Ref.</span>
                    <span className="text-sm text-gray-500">Cotización {project.quote_number ?? ''}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">{clp(revenue)}</span>
                </div>

                {movements.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-10">Sin movimientos registrados aún.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
                        <th className="text-left px-5 py-2 font-medium">Fecha</th>
                        <th className="text-left px-4 py-2 font-medium">Concepto</th>
                        <th className="text-right px-4 py-2 font-medium text-[#1d65c5]">Ingresos</th>
                        <th className="text-right px-4 py-2 font-medium text-red-500">Egresos</th>
                        <th className="text-right px-5 py-2 font-medium text-gray-500">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        let saldo = 0;
                        return movements.map(m => {
                          saldo += m.tipo === 'cobro' ? m.monto : -m.monto;
                          const s = saldo;
                          return (
                            <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                              <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">
                                {new Date(m.fecha + 'T12:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${m.badgeColor}`}>{m.badge}</span>
                                  <span className="text-sm text-gray-700">{m.concepto}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                {m.tipo === 'cobro' && (
                                  <span className="text-sm font-semibold text-[#1d65c5]">+{clp(m.monto)}</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {m.tipo === 'gasto' && (
                                  <span className="text-sm font-semibold text-red-600">-{clp(m.monto)}</span>
                                )}
                              </td>
                              <td className="px-5 py-3 text-right">
                                <span className={`text-sm font-bold ${s >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                                  {clp(s)}
                                </span>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-gray-200 bg-gray-50/60">
                        <td colSpan={2} className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Subtotal</td>
                        <td className="px-4 py-3 text-right font-bold text-[#1d65c5]">+{clp(totalCobrado)}</td>
                        <td className="px-4 py-3 text-right font-bold text-red-600">-{clp(totalGastado)}</td>
                        <td></td>
                      </tr>
                      <tr className={`border-t border-gray-200 ${resultadoReal >= 0 ? 'bg-green-50/50' : 'bg-red-50/50'}`}>
                        <td colSpan={2} className="px-5 py-3 text-sm font-semibold text-gray-700">Resultado real</td>
                        <td></td>
                        <td></td>
                        <td className={`px-5 py-3 text-right text-base font-bold ${resultadoReal >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                          {resultadoReal >= 0 ? '+' : ''}{clp(resultadoReal)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            </div>
          );
        })()}

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
