'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import type { Quote, QuoteItem, QuoteStatus } from '@/lib/types';
import {
  upsertQuoteItem, deleteQuoteItem,
  updateQuoteHeader, updateQuoteStatus, deleteQuote,
} from '@/app/admin/quotes/actions';
import { createProjectFromQuote } from '@/app/admin/projects/actions';

// ─── Tipos locales ────────────────────────────────────────────────────────────

interface ProductOption {
  id: string;
  name: string;
  sku: string;
  category: string;
  costo_proveedor_clp: number;
  margen_pct: number | null;
  base_price_clp: number;
}

interface InstallationOption {
  id: string;
  nombre_instalacion: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clp(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
}

function calcItem(costo: number, margen: number, qty: number, desc: number) {
  const neto     = costo * (1 + margen / 100);
  const conIva   = neto * 1.19;
  const subtotal = conIva * qty * (1 - desc / 100);
  return {
    neto:        Math.round(neto),
    margenPesos: Math.round(neto - costo),
    conIva:      Math.round(conIva),
    subtotal:    Math.round(subtotal),
  };
}

const STATUS_MAP: Record<QuoteStatus, { label: string; color: string; next?: QuoteStatus; nextLabel?: string }> = {
  draft:    { label: 'Borrador',  color: 'bg-gray-100 text-gray-600',   next: 'sent',     nextLabel: 'Enviada' },
  sent:     { label: 'Enviada',   color: 'bg-blue-100 text-blue-700',   next: 'accepted', nextLabel: 'Aceptada' },
  accepted: { label: 'Aceptada',  color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rechazada', color: 'bg-red-100 text-red-600' },
  expired:  { label: 'Vencida',   color: 'bg-amber-100 text-amber-700' },
};

// ─── Fila de ítem ─────────────────────────────────────────────────────────────

function ItemRow({
  item,
  quoteId,
  sortOrder,
}: {
  item: QuoteItem;
  quoteId: string;
  sortOrder: number;
}) {
  const [costo,   setCosto]   = useState(item.costo_proveedor_clp);
  const [margen,  setMargen]  = useState(item.margen_pct);
  const [qty,     setQty]     = useState(item.quantity);
  const [desc,    setDesc]    = useState(item.discount_percent);
  const [editing, setEditing] = useState(false);
  const [isPending, start]    = useTransition();

  const calc = calcItem(costo, margen, qty, desc);

  function save() {
    const fd = new FormData();
    fd.set('item_id',            item.id);
    fd.set('quote_id',           quoteId);
    fd.set('product_id',         item.product_id ?? '');
    fd.set('description',        item.description);
    fd.set('quantity',           String(qty));
    fd.set('costo_proveedor_clp', String(costo));
    fd.set('margen_pct',         String(margen));
    fd.set('discount_percent',   String(desc));
    fd.set('sort_order',         String(sortOrder));
    start(async () => { await upsertQuoteItem(quoteId, fd); setEditing(false); });
  }

  function remove() {
    if (!confirm('¿Eliminar este ítem?')) return;
    start(async () => { await deleteQuoteItem(quoteId, item.id); });
  }

  return (
    <tr className={`border-b border-gray-50 text-sm ${isPending ? 'opacity-50' : ''}`}>
      {/* Producto */}
      <td className="px-3 py-3 text-gray-900">
        <p className="font-medium">{item.description}</p>
      </td>
      {/* Cantidad */}
      <td className="px-2 py-3 text-center">
        {editing ? (
          <input type="number" min="0.01" step="0.01" value={qty}
            onChange={(e) => setQty(parseFloat(e.target.value) || 1)}
            className="w-14 text-center border border-gray-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-[#389fe0]" />
        ) : (
          <span className="tabular-nums">{qty}</span>
        )}
      </td>
      {/* Margen % — interno */}
      <td className="px-2 py-3 text-center bg-amber-50/30">
        {editing ? (
          <input type="number" min="0" max="100" step="0.5" value={margen}
            onChange={(e) => setMargen(parseFloat(e.target.value) || 0)}
            className="w-14 text-center border border-gray-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-[#389fe0]" />
        ) : (
          <span className="tabular-nums text-amber-700">{margen}%</span>
        )}
      </td>
      {/* Margen $ — interno */}
      <td className="px-2 py-3 text-right bg-amber-50/30 tabular-nums text-green-700 text-xs">
        {clp(calc.margenPesos)}
      </td>
      {/* P. neto unit — interno */}
      <td className="px-2 py-3 text-right bg-amber-50/30 tabular-nums text-gray-500 text-xs">
        {editing ? (
          <input type="number" min="0" step="1000" value={costo}
            onChange={(e) => setCosto(parseFloat(e.target.value) || 0)}
            className="w-24 text-right border border-gray-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-[#389fe0]"
            placeholder="Costo" />
        ) : (
          clp(calc.neto)
        )}
      </td>
      {/* Desc % — cliente */}
      <td className="px-2 py-3 text-center">
        {editing ? (
          <input type="number" min="0" max="100" step="0.5" value={desc}
            onChange={(e) => setDesc(parseFloat(e.target.value) || 0)}
            className="w-14 text-center border border-gray-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-[#389fe0]" />
        ) : (
          <span className="tabular-nums">{desc > 0 ? `${desc}%` : '—'}</span>
        )}
      </td>
      {/* P. unit c/IVA — cliente */}
      <td className="px-2 py-3 text-right tabular-nums font-medium text-gray-900">
        {clp(calc.conIva)}
      </td>
      {/* Subtotal — cliente */}
      <td className="px-2 py-3 text-right tabular-nums font-semibold text-gray-900">
        {clp(calc.subtotal)}
      </td>
      {/* Acciones */}
      <td className="px-2 py-3 text-right">
        <div className="flex gap-2 justify-end">
          {editing ? (
            <>
              <button onClick={save} disabled={isPending}
                className="text-xs text-[#389fe0] hover:text-[#1d65c5] font-medium">
                Guardar
              </button>
              <button onClick={() => setEditing(false)}
                className="text-xs text-gray-400 hover:text-gray-600">
                ×
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)}
                className="text-xs text-[#389fe0] hover:text-[#1d65c5] font-medium">
                Editar
              </button>
              <button onClick={remove} disabled={isPending}
                className="text-xs text-red-400 hover:text-red-600">
                Eliminar
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Formulario para agregar ítem ─────────────────────────────────────────────

const QUICK_ITEMS = [
  'Mano de obra',
  'Despacho',
  'Materiales varios',
  'Ingeniería y proyecto',
  'Puesta en marcha',
  'Garantía extendida',
];

function AddItemSection({
  quoteId,
  products,
  nextOrder,
}: {
  quoteId: string;
  products: ProductOption[];
  nextOrder: number;
}) {
  const DEFAULT_MARGIN = 30;
  const [mode,       setMode]       = useState<'catalog' | 'free'>('catalog');
  const [search,     setSearch]     = useState('');
  const [costo,      setCosto]      = useState(0);
  const [margen,     setMargen]     = useState(DEFAULT_MARGIN);
  const [qty,        setQty]        = useState(1);
  const [desc,       setDesc]       = useState(0);
  const [descTxt,    setDescTxt]    = useState('');
  const [productId,  setProductId]  = useState('');
  const [showList,   setShowList]   = useState(false);
  const [freePrice,  setFreePrice]  = useState(0);
  const [isPending,  start]         = useTransition();

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 10);

  const calc = calcItem(costo, margen, qty, desc);

  function switchMode(m: 'catalog' | 'free') {
    setMode(m);
    setSearch(''); setDescTxt(''); setProductId('');
    setCosto(0); setMargen(DEFAULT_MARGIN); setQty(1); setDesc(0); setFreePrice(0);
  }

  function selectProduct(p: ProductOption) {
    setDescTxt(p.name);
    setProductId(p.id);
    setCosto(p.costo_proveedor_clp);
    setMargen(p.margen_pct ?? DEFAULT_MARGIN);
    setSearch(p.name);
    setShowList(false);
  }

  function addItem() {
    if (!descTxt) return;
    const fd = new FormData();
    fd.set('product_id',       productId);
    fd.set('description',      descTxt);
    fd.set('quantity',         String(qty));
    fd.set('discount_percent', String(desc));
    fd.set('sort_order',       String(nextOrder));
    if (mode === 'free') {
      fd.set('unit_price_direct',   String(freePrice));
      fd.set('costo_proveedor_clp', '0');
      fd.set('margen_pct',          '');
    } else {
      fd.set('costo_proveedor_clp', String(costo));
      fd.set('margen_pct',          String(margen));
    }
    start(async () => {
      await upsertQuoteItem(quoteId, fd);
      setSearch(''); setDescTxt(''); setProductId('');
      setCosto(0); setMargen(DEFAULT_MARGIN); setQty(1); setDesc(0); setFreePrice(0);
    });
  }

  const canAdd = mode === 'catalog' ? !!descTxt : (!!descTxt && freePrice > 0);

  return (
    <div className="flex flex-col gap-2.5">

      {/* Toggle de modo */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-gray-400 uppercase tracking-wide mr-1">Agregar:</span>
        {(['catalog', 'free'] as const).map((m) => (
          <button key={m} onClick={() => switchMode(m)}
            className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
              mode === m
                ? 'bg-[#389fe0] text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}>
            {m === 'catalog' ? 'Desde catálogo' : 'Ítem libre'}
          </button>
        ))}
      </div>

      <div className="flex items-end gap-2 flex-wrap">

        {mode === 'catalog' ? (
          <>
            {/* Buscador de producto */}
            <div className="relative flex-1 min-w-52">
              <span className="text-[10px] text-gray-400 mb-1 block">Producto</span>
              <input
                type="text"
                placeholder="Buscar por nombre o SKU…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setDescTxt(e.target.value); setShowList(true); }}
                onFocus={() => setShowList(true)}
                onBlur={() => setTimeout(() => setShowList(false), 150)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#389fe0]"
              />
              {showList && filtered.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-[200] max-h-60 overflow-y-auto">
                  {filtered.map((p) => (
                    <button
                      key={p.id}
                      onMouseDown={() => selectProduct(p)}
                      className="w-full text-left px-3 py-2.5 text-xs hover:bg-blue-50 flex justify-between items-center border-b border-gray-50 last:border-0"
                    >
                      <span>
                        <span className="font-medium text-gray-900">{p.name}</span>
                        <span className="text-gray-400 ml-2 font-mono">{p.sku}</span>
                      </span>
                      <span className="text-gray-400 tabular-nums">{clp(p.costo_proveedor_clp)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cantidad */}
            <div>
              <span className="text-[10px] text-gray-400 mb-1 block">Cant.</span>
              <input type="number" min="0.01" step="0.01" value={qty}
                onChange={(e) => setQty(parseFloat(e.target.value) || 1)}
                className="w-14 text-center border border-gray-200 rounded-lg px-1 py-2 text-xs focus:outline-none focus:border-[#389fe0]" />
            </div>

            {/* Margen % */}
            <div>
              <span className="text-[10px] text-amber-600 mb-1 block">Margen %</span>
              <input type="number" min="0" max="100" step="0.5" value={margen}
                onChange={(e) => setMargen(parseFloat(e.target.value) || 0)}
                className="w-16 text-center border border-amber-200 bg-amber-50/60 rounded-lg px-1 py-2 text-xs focus:outline-none focus:border-amber-400" />
            </div>

            {/* Costo proveedor */}
            <div>
              <span className="text-[10px] text-amber-600 mb-1 block">Costo neto</span>
              <input type="number" min="0" step="1000" value={costo}
                onChange={(e) => setCosto(parseFloat(e.target.value) || 0)}
                className="w-28 text-right border border-amber-200 bg-amber-50/60 rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-amber-400" />
            </div>

            {/* Desc % */}
            <div>
              <span className="text-[10px] text-gray-400 mb-1 block">Desc %</span>
              <input type="number" min="0" max="100" step="0.5" value={desc}
                onChange={(e) => setDesc(parseFloat(e.target.value) || 0)}
                className="w-14 text-center border border-gray-200 rounded-lg px-1 py-2 text-xs focus:outline-none focus:border-[#389fe0]" />
            </div>

            {/* Precio calculado */}
            {calc.conIva > 0 && (
              <div>
                <span className="text-[10px] text-gray-400 mb-1 block">P. unit c/IVA</span>
                <div className="py-2 text-xs text-gray-600 tabular-nums font-medium">{clp(calc.conIva)}</div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Descripción libre con ítems rápidos */}
            <div className="w-full flex flex-col gap-1.5">
              <div className="flex flex-wrap gap-1">
                {QUICK_ITEMS.map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setDescTxt(label)}
                    className={`px-2.5 py-1 rounded-md text-[10px] border transition-colors ${
                      descTxt === label
                        ? 'bg-[#389fe0]/10 border-[#389fe0]/40 text-[#1d65c5] font-semibold'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="O escribe una descripción personalizada…"
                value={descTxt}
                onChange={(e) => setDescTxt(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#389fe0]"
              />
            </div>

            {/* Cantidad */}
            <div>
              <span className="text-[10px] text-gray-400 mb-1 block">Cant.</span>
              <input type="number" min="0.01" step="0.01" value={qty}
                onChange={(e) => setQty(parseFloat(e.target.value) || 1)}
                className="w-14 text-center border border-gray-200 rounded-lg px-1 py-2 text-xs focus:outline-none focus:border-[#389fe0]" />
            </div>

            {/* Precio directo c/IVA */}
            <div>
              <span className="text-[10px] text-gray-400 mb-1 block">Precio c/IVA</span>
              <input type="number" min="0" step="1000" value={freePrice || ''}
                placeholder="0"
                onChange={(e) => setFreePrice(parseFloat(e.target.value) || 0)}
                className="w-32 text-right border border-gray-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-[#389fe0]" />
            </div>

            {/* Desc % */}
            <div>
              <span className="text-[10px] text-gray-400 mb-1 block">Desc %</span>
              <input type="number" min="0" max="100" step="0.5" value={desc}
                onChange={(e) => setDesc(parseFloat(e.target.value) || 0)}
                className="w-14 text-center border border-gray-200 rounded-lg px-1 py-2 text-xs focus:outline-none focus:border-[#389fe0]" />
            </div>

            {/* Subtotal preview */}
            {freePrice > 0 && (
              <div>
                <span className="text-[10px] text-gray-400 mb-1 block">Subtotal</span>
                <div className="py-2 text-xs text-gray-600 tabular-nums font-medium">
                  {clp(Math.round(freePrice * qty * (1 - desc / 100)))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Botón agregar */}
        <button
          onClick={addItem}
          disabled={isPending || !canAdd}
          className="bg-[#389fe0] hover:bg-[#1d65c5] text-white px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-40 transition-colors whitespace-nowrap"
        >
          {isPending ? '…' : '+ Agregar ítem'}
        </button>

      </div>
    </div>
  );
}

// ─── Editor principal ─────────────────────────────────────────────────────────

export default function QuoteEditor({
  quote,
  products,
  installations,
  existingProjectId,
}: {
  quote: Quote;
  products: ProductOption[];
  installations: InstallationOption[];
  existingProjectId?: string | null;
}) {
  const [isPending, start] = useTransition();
  const [showPanel, setShowPanel] = useState(true);
  const items = quote.items ?? [];

  // Totales calculados en tiempo real desde los ítems
  const subtotalNeto = items.reduce((acc, item) => {
    return acc + item.unit_price_clp * item.quantity * (1 - item.discount_percent / 100);
  }, 0);
  const iva   = Math.round(subtotalNeto * 0.19);
  const total = Math.round(subtotalNeto * 1.19);

  const st = STATUS_MAP[quote.status] ?? { label: quote.status, color: 'bg-gray-100 text-gray-600' };

  function changeStatus(newStatus: QuoteStatus) {
    start(async () => { await updateQuoteStatus(quote.id, newStatus); });
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href="/admin/quotes" className="text-sm text-gray-400 hover:text-gray-600 mb-2 block">
            ← Cotizaciones
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900 font-mono">{quote.quote_number}</h1>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${st.color}`}>
              {st.label}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">{quote.client_name}</p>
        </div>
        <div className="flex gap-2">
          {st.next && (
            <button
              onClick={() => changeStatus(st.next!)}
              disabled={isPending}
              className="border border-[#389fe0] text-[#1d65c5] hover:bg-[#389fe0]/10 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              {st.nextLabel}
            </button>
          )}
          {quote.status === 'sent' && (
            <button
              onClick={() => changeStatus('rejected')}
              disabled={isPending}
              className="border border-red-200 text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              Rechazada
            </button>
          )}
          {quote.status === 'accepted' && (
            existingProjectId ? (
              <Link
                href={`/admin/projects/${existingProjectId}`}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              >
                🏗️ Ver proyecto →
              </Link>
            ) : (
              <button
                onClick={() => start(async () => { await createProjectFromQuote(quote.id); })}
                disabled={isPending}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
              >
                🏗️ Crear proyecto
              </button>
            )
          )}
          <a
            href={`/api/admin/quotes/${quote.id}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="bg-gray-900 hover:bg-gray-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            Descargar PDF
          </a>
        </div>
      </div>

      <div className="flex gap-6 items-start">
        {/* Columna principal: tabla de ítems */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Tabla */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">Ítems</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.open('/admin/products', 'catalogo', 'width=1280,height=800,resizable=yes,scrollbars=yes')}
                  className="text-xs text-[#389fe0] hover:text-[#1d65c5] hover:underline"
                >
                  Gestionar catálogo ↗
                </button>
                <div className="flex gap-2 text-[10px] text-gray-400">
                  <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">interno</span>
                  <span>= no visible en PDF</span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-left">
                    <th className="px-3 py-2.5 text-gray-500 font-semibold uppercase tracking-wide">Producto</th>
                    <th className="px-2 py-2.5 text-gray-500 font-semibold uppercase tracking-wide text-center">Cant.</th>
                    <th className="px-2 py-2.5 text-amber-600 font-semibold uppercase tracking-wide text-center bg-amber-50/50">Margen %</th>
                    <th className="px-2 py-2.5 text-amber-600 font-semibold uppercase tracking-wide text-right bg-amber-50/50">Margen $</th>
                    <th className="px-2 py-2.5 text-amber-600 font-semibold uppercase tracking-wide text-right bg-amber-50/50">P. neto</th>
                    <th className="px-2 py-2.5 text-gray-500 font-semibold uppercase tracking-wide text-center">Desc %</th>
                    <th className="px-2 py-2.5 text-gray-500 font-semibold uppercase tracking-wide text-right">P. unit c/IVA</th>
                    <th className="px-2 py-2.5 text-gray-500 font-semibold uppercase tracking-wide text-right">Subtotal</th>
                    <th className="px-2 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <ItemRow key={item.id} item={item} quoteId={quote.id} sortOrder={i} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Agregar ítem — fuera del overflow para que el dropdown no quede tapado */}
            <div className="px-4 py-3 border-t border-dashed border-[#389fe0]/20 bg-blue-50/10">
              <AddItemSection quoteId={quote.id} products={products} nextOrder={items.length} />
            </div>

            {/* Totales */}
            <div className="px-5 py-4 border-t border-gray-100 flex justify-end">
              <div className="w-64 flex flex-col gap-1.5 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal neto</span>
                  <span className="tabular-nums">{clp(Math.round(subtotalNeto))}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>IVA 19%</span>
                  <span className="tabular-nums">{clp(iva)}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-200 pt-2 mt-1">
                  <span>Total con IVA</span>
                  <span className="tabular-nums">{clp(total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Columna lateral: datos de la cotización */}
        {!showPanel && (
          <div className="shrink-0 w-8">
            <button
              onClick={() => setShowPanel(true)}
              title="Mostrar datos de cotización"
              className="w-full bg-white border border-gray-100 rounded-2xl px-1 py-4 flex flex-col items-center gap-2 text-gray-400 hover:text-[#389fe0] hover:border-[#389fe0]/30 transition-colors"
            >
              <span className="text-base leading-none">‹</span>
              <span className="text-[9px] font-medium text-gray-400 tracking-wide"
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                Datos cotización
              </span>
            </button>
          </div>
        )}
        {showPanel && <div className="shrink-0 w-72 flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-gray-900">Datos de la cotización</p>
              <button
                onClick={() => setShowPanel(false)}
                title="Ocultar panel"
                className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors text-base leading-none"
              >
                ›
              </button>
            </div>
            <form
              action={(fd) => { start(async () => { await updateQuoteHeader(quote.id, fd); }); }}
              className="flex flex-col gap-3"
            >
              <label className="block">
                <span className="text-xs text-gray-500 mb-1 block">Cliente</span>
                <input name="client_name" type="text" required defaultValue={quote.client_name}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#389fe0]" />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500 mb-1 block">Email</span>
                <input name="client_email" type="email" defaultValue={quote.client_email}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#389fe0]" />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500 mb-1 block">Teléfono</span>
                <input name="client_phone" type="tel" defaultValue={quote.client_phone ?? ''}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#389fe0]" />
              </label>
              {installations.length > 0 && (
                <label className="block">
                  <span className="text-xs text-gray-500 mb-1 block">Instalación</span>
                  <select name="installation_id" defaultValue={quote.installation_id ?? ''}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#389fe0]">
                    <option value="">— Sin especificar —</option>
                    {installations.map((i) => (
                      <option key={i.id} value={i.id}>{i.nombre_instalacion}</option>
                    ))}
                  </select>
                </label>
              )}
              <label className="block">
                <span className="text-xs text-gray-500 mb-1 block">Validez (días)</span>
                <input name="validity_days" type="number" min="1" defaultValue={quote.validity_days}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#389fe0]" />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500 mb-1 block">Notas internas</span>
                <textarea name="notes" rows={3} defaultValue={quote.notes ?? ''}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:border-[#389fe0]" />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500 mb-1 block">Condiciones para el cliente</span>
                <textarea name="client_notes" rows={3} defaultValue={quote.client_notes ?? ''}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:border-[#389fe0]" />
              </label>
              <button type="submit" disabled={isPending}
                className="w-full bg-[#389fe0] hover:bg-[#1d65c5] text-white rounded-xl py-2 text-sm font-semibold disabled:opacity-50 transition-colors">
                {isPending ? 'Guardando…' : 'Guardar datos'}
              </button>
            </form>
          </div>

          {/* Eliminar */}
          <button
            onClick={() => {
              if (!confirm('¿Eliminar esta cotización? No se puede deshacer.')) return;
              start(async () => { await deleteQuote(quote.id); });
            }}
            disabled={isPending}
            className="text-xs text-red-400 hover:text-red-600 text-center py-2 transition-colors disabled:opacity-40"
          >
            Eliminar cotización
          </button>
        </div>}
      </div>
    </div>
  );
}
