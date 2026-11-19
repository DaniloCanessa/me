'use client';

import { useState, useTransition } from 'react';
import {
  createProduct,
  updateProduct,
  toggleProductActive,
  deleteProduct,
  deleteProducts,
  duplicateProducts,
  verifyProductCosts,
} from '@/app/admin/products/actions';
import { requiredSurfaceM2 } from '@/lib/constants';
import type { SolarPanel } from '@/lib/types';
import CostosInternos from '@/components/admin/CostosInternos';
import SortableHeader, { useSort } from '@/components/admin/SortableHeader';
import { isoChile, formatFecha } from '@/lib/quote-date';

interface Product {
  id: string;
  panel_id?: string | null;
  name: string;
  sku: string;
  category: string;
  customer_type: string;
  specs: Record<string, unknown>;
  marca?: string | null;
  /** Última vez que se revisó el costo del proveedor (cambió o se confirmó). */
  costo_verificado_at?: string | null;
  proveedor: string | null;
  costo_proveedor_clp: number;
  margen_pct: number | null;
  base_price_clp: number;
  installation_price_clp: number;
  stock: number;
  is_active: boolean;
  sort_order: number;
  notes: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  solar_kit:        'Kit Solar',
  panel:            'Panel Solar',
  inverter:         'Inversor',
  microinverter:    'Microinversor',
  charge_controller:'Regulador de Carga',
  battery:          'Batería',
  charger:          'Cargador Batería',
  ev_charger:       'Cargador EV',
  pump:             'Bomba de Agua',
  dc_converter:     'Conversor DC/DC',
  lighting:         'Iluminación',
  ac:               'Aire Acondicionado',
  instalacion:      'Instalación',
  accessory:        'Accesorio',
};

const CUSTOMER_LABELS: Record<string, string> = {
  residential: 'Residencial',
  business:    'Empresa',
  both:        'Ambos',
};

/** 'YYYY-MM-DD' (hora Chile) de la última verificación del costo, o null. */
function fechaPrecioISO(p: { costo_verificado_at?: string | null }) {
  return p.costo_verificado_at ? isoChile(p.costo_verificado_at) : null;
}

/** Días desde la última actualización de precio. */
function diasDesde(iso: string) {
  return Math.floor((Date.now() - new Date(`${iso}T12:00:00Z`).getTime()) / 86_400_000);
}

/** Gris si está al día; ámbar sobre 90 días, para detectar precios viejos. */
function FechaPrecio({ iso, className = '' }: { iso: string | null; className?: string }) {
  if (!iso) return <span className={`text-gray-300 ${className}`}>—</span>;
  const viejo = diasDesde(iso) > 90;
  return (
    <span className={`${viejo ? 'text-amber-600' : 'text-gray-500'} ${className}`}
      title={viejo ? `Costo sin verificar hace ${diasDesde(iso)} días` : undefined}>
      {formatFecha(iso, 'short')}
    </span>
  );
}

function clp(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
}

// ─── Formulario de specs según categoría ─────────────────────────────────────

function SolarKitSpecs({ specs, panel }: { specs?: Record<string, unknown>; panel?: SolarPanel | null }) {
  // Igual que en la ficha completa: la cantidad de paneles es lo único editable
  // y la potencia real y los m² se derivan del panel asignado al kit.
  const [paneles, setPaneles] = useState<string>(String(specs?.panelCount ?? ''));
  const n = parseInt(paneles) || 0;
  const kWpReal = panel ? Math.round((n * panel.potenciaW) / 10) / 100 : null;
  const m2      = panel ? requiredSurfaceM2(n, panel) : null;

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-gray-500 mb-1 block">kW del nombre comercial</span>
          <input name="sizekWp" type="number" step="0.1" required
            defaultValue={specs?.sizekWp as number ?? ''}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]" />
        </label>
        <label className="block">
          <span className="text-xs text-gray-500 mb-1 block">Cantidad de paneles</span>
          <input name="panelCount" type="number" step="1" min="0" required
            value={paneles} onChange={(e) => setPaneles(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]" />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="block">
          <span className="text-xs text-gray-500 mb-1 block">Potencia real (kWp)</span>
          <div className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm font-semibold text-gray-900">
            {kWpReal ?? '—'}
          </div>
        </div>
        <div className="block">
          <span className="text-xs text-gray-500 mb-1 block">Superficie (m²)</span>
          <div className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm font-semibold text-gray-900">
            {m2 ?? '—'}
          </div>
        </div>
      </div>
      <p className="text-[11px] text-gray-400 -mt-1">
        {panel
          ? `Calculado con ${panel.nombre} de ${panel.potenciaW} W (${panel.largoMm} × ${panel.anchoMm} mm).`
          : 'Este kit no tiene panel asignado, así que no se puede calcular.'}{' '}
        <a href="/admin/paneles" className="text-[#1d65c5] font-semibold hover:underline">Paneles ↗</a>
      </p>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-gray-500 mb-1 block">¿Incluye batería?</span>
          <select name="includesBattery"
            defaultValue={specs?.includesBattery ? 'true' : 'false'}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]">
            <option value="false">No</option>
            <option value="true">Sí</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-gray-500 mb-1 block">Capacidad batería (kWh)</span>
          <input name="batteryCapacityKWh" type="number" step="1" placeholder="Solo si incluye batería"
            defaultValue={specs?.batteryCapacityKWh as number ?? ''}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]" />
        </label>
      </div>
    </>
  );
}

function BatterySpecs({ specs }: { specs?: Record<string, unknown> }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <label className="block">
        <span className="text-xs text-gray-500 mb-1 block">Capacidad (kWh)</span>
        <input name="capacityKWh" type="number" step="1" required
          defaultValue={specs?.capacityKWh as number ?? ''}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]" />
      </label>
      <label className="block">
        <span className="text-xs text-gray-500 mb-1 block">Fracción usable (0-1)</span>
        <input name="usableFraction" type="number" step="0.01" min="0" max="1" required
          defaultValue={specs?.usableFraction as number ?? 0.7}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]" />
      </label>
      <label className="block">
        <span className="text-xs text-gray-500 mb-1 block">Eficiencia ciclo (0-1)</span>
        <input name="cycleEfficiency" type="number" step="0.01" min="0" max="1" required
          defaultValue={specs?.cycleEfficiency as number ?? 0.8}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]" />
      </label>
    </div>
  );
}

// ─── Modal de creación / edición ──────────────────────────────────────────────

function ProductModal({
  product,
  panels,
  onClose,
  onSave,
  onDelete,
  onVerify,
  isPending,
}: {
  product: Product | null;
  /** Catálogo de paneles: de aquí sale el del kit para calcular kWp y m². */
  panels: SolarPanel[];
  onClose: () => void;
  onSave: (formData: FormData) => void;
  /** Solo al editar: elimina el producto desde la ficha. */
  onDelete?: () => void;
  /** Solo al editar: confirma que el costo del proveedor sigue vigente. */
  onVerify?: () => void;
  isPending: boolean;
}) {
  const [category,   setCategory]  = useState(product?.category ?? 'solar_kit');

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {product ? 'Editar producto' : 'Nuevo producto'}
            {product && (
              <span className="block text-xs font-normal text-gray-400 mt-0.5">
                Costo verificado: <FechaPrecio iso={fechaPrecioISO(product)} />
                {onVerify && (
                  <button type="button" onClick={onVerify} disabled={isPending}
                    className="ml-2 text-[#389fe0] hover:text-[#1d65c5] font-medium disabled:opacity-40">
                    ✓ Precio vigente
                  </button>
                )}
              </span>
            )}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* Form */}
        <form
          action={(fd) => onSave(fd)}
          className="px-6 py-5 flex flex-col gap-4"
        >
          {/* Nombre + SKU */}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-gray-500 mb-1 block">Nombre *</span>
              <input name="name" type="text" required defaultValue={product?.name ?? ''}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]" />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 mb-1 block">SKU *</span>
              <input name="sku" type="text" required defaultValue={product?.sku ?? ''}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#389fe0]" />
            </label>
          </div>

          {/* Marca + Proveedor */}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-gray-500 mb-1 block">Marca</span>
              <input name="marca" type="text" defaultValue={product?.marca ?? ''}
                placeholder="Ej: Huawei, JA Solar, BYD…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]" />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 mb-1 block">Proveedor</span>
              <input name="proveedor" type="text" defaultValue={product?.proveedor ?? ''}
                placeholder="A quién se le compra"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]" />
            </label>
          </div>

          {/* Categoría + Tipo cliente */}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-gray-500 mb-1 block">Categoría *</span>
              <select name="category" required value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]">
                <option value="solar_kit">Kit Solar</option>
                <option value="panel">Panel Solar</option>
                <option value="inverter">Inversor</option>
                <option value="microinverter">Microinversor</option>
                <option value="charge_controller">Regulador de Carga</option>
                <option value="battery">Batería</option>
                <option value="charger">Cargador Batería</option>
                <option value="ev_charger">Cargador EV</option>
                <option value="pump">Bomba de Agua</option>
                <option value="dc_converter">Conversor DC/DC</option>
                <option value="lighting">Iluminación</option>
                <option value="ac">Aire Acondicionado</option>
                <option value="instalacion">Instalación</option>
                <option value="accessory">Accesorio</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 mb-1 block">Tipo cliente</span>
              <select name="customer_type" defaultValue={product?.customer_type ?? 'residential'}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]">
                <option value="residential">Residencial</option>
                <option value="business">Empresa</option>
                <option value="both">Ambos</option>
              </select>
            </label>
          </div>

          {/* Specs dinámicos */}
          <div className="bg-gray-50 rounded-xl p-4 flex flex-col gap-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Especificaciones técnicas</p>
            {category === 'solar_kit' && (
              <SolarKitSpecs specs={product?.specs} panel={panels.find((p) => p.id === product?.panel_id) ?? null} />
            )}
            {category === 'battery'   && <BatterySpecs  specs={product?.specs} />}
            {!['solar_kit', 'battery'].includes(category) && (
              <p className="text-xs text-gray-400">Sin specs adicionales para esta categoría.</p>
            )}
          </div>

          <CostosInternos
            precioGuardado={product?.base_price_clp ?? null}
            costoInicial={product?.costo_proveedor_clp ?? 0}
            margenInicial={product?.margen_pct ?? null}
          />

          {/* Precios adicionales */}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-gray-500 mb-1 block">Precio instalación (CLP)</span>
              <input name="installation_price_clp" type="number" step="1"
                defaultValue={product?.installation_price_clp ?? 0}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm tabular-nums focus:outline-none focus:border-[#389fe0]" />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 mb-1 block">Stock disponible</span>
              <input name="stock" type="number" step="1" min="0"
                defaultValue={product?.stock ?? 0}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm tabular-nums focus:outline-none focus:border-[#389fe0]" />
            </label>
          </div>

          {/* Orden + Estado */}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-gray-500 mb-1 block">Orden de visualización</span>
              <input name="sort_order" type="number" step="1"
                defaultValue={product?.sort_order ?? 0}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]" />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 mb-1 block">Estado</span>
              <select name="is_active" defaultValue={product?.is_active === false ? 'false' : 'true'}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]">
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
            </label>
          </div>

          {/* Notas internas */}
          <label className="block">
            <span className="text-xs text-gray-500 mb-1 block">Notas internas</span>
            <textarea name="notes" rows={2} defaultValue={product?.notes ?? ''}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#389fe0]" />
          </label>

          {/* Acciones */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isPending}
              className="flex-1 bg-[#389fe0] hover:bg-[#1d65c5] text-white rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-50">
              {isPending ? 'Guardando…' : product ? 'Guardar cambios' : 'Crear producto'}
            </button>
          </div>
          {product && onDelete && (
            <div className="pt-3 border-t border-gray-100 text-center">
              <button type="button" onClick={onDelete} disabled={isPending}
                className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors disabled:opacity-40">
                Eliminar producto
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

// ─── Tabla principal ──────────────────────────────────────────────────────────

export default function ProductsManager({ products, panels }: { products: Product[]; panels: SolarPanel[] }) {
  const [modalProduct, setModalProduct] = useState<Product | null | 'new'>('new' as never);
  const [showModal, setShowModal]       = useState(false);

  const [filterCat, setFilterCat]       = useState<string>('all');
  const [filterStock, setFilterStock]   = useState<'all' | 'in' | 'out'>('all');
  const [isPending, startTransition]    = useTransition();
  const [selected, setSelected]         = useState<Set<string>>(new Set());
  const [search, setSearch]             = useState('');

  // Busca en nombre, SKU, marca, proveedor y notas; todas las palabras deben
  // aparecer (ej. "huawei 10" → inversores Huawei de 10 kW).
  const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
  const filteredRaw = products
    .filter((p) => filterCat === 'all' || p.category === filterCat)
    .filter((p) => filterStock === 'all' || (filterStock === 'in' ? p.stock > 0 : p.stock === 0))
    .filter((p) => {
      if (!terms.length) return true;
      const hay = [p.name, p.sku, p.marca, p.proveedor, p.notes].filter(Boolean).join(' ').toLowerCase();
      return terms.every((t) => hay.includes(t));
    });

  const { sorted: filtered, sort, toggle: toggleSort } = useSort(filteredRaw, {
    producto:  (p) => p.name,
    marca:     (p) => p.marca,
    categoria: (p) => CATEGORY_LABELS[p.category] ?? p.category,
    precio:    (p) => p.base_price_clp,
    fechaPrecio: (p) => fechaPrecioISO(p),
    estado:    (p) => (p.is_active ? 'Activo' : 'Inactivo'),
  });

  function openNew() { setModalProduct(null); setShowModal(true); }
  function openEdit(p: Product) { setModalProduct(p); setShowModal(true); }
  function closeModal() { setShowModal(false); setModalProduct(null); }

  function handleSave(formData: FormData) {
    startTransition(async () => {
      const result = modalProduct
        ? await updateProduct((modalProduct as Product).id, formData)
        : await createProduct(formData);
      if (!result?.error) closeModal();
    });
  }

  function handleToggle(id: string, current: boolean) {
    startTransition(async () => { await toggleProductActive(id, !current); });
  }

  // Eliminar desde la ficha del producto (modal)
  function handleDeleteFromModal() {
    const p = modalProduct as Product | null;
    if (!p) return;
    if (!confirm(`¿Eliminar "${p.name}" del catálogo? Esta acción no se puede deshacer.`)) return;
    startTransition(async () => {
      const res = await deleteProduct(p.id);
      if (res?.error) {
        alert(`No se pudo eliminar: ${res.error}`);
        return;
      }
      setSelected((prev) => { const n = new Set(prev); n.delete(p.id); return n; });
      closeModal();
    });
  }

  // Selección múltiple: "todos" = los visibles con los filtros y la búsqueda actuales
  const visibleIds   = filtered.map((p) => p.id);
  const allSelected  = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const someSelected = !allSelected && visibleIds.some((id) => selected.has(id));
  // Solo cuentan los seleccionados que se ven: si cambias el filtro, los que
  // quedaron ocultos no se eliminan por accidente.
  const selectedVisible = visibleIds.filter((id) => selected.has(id));

  function toggleAll() {
    setSelected((prev) => {
      const n = new Set(prev);
      if (allSelected) visibleIds.forEach((id) => n.delete(id));
      else visibleIds.forEach((id) => n.add(id));
      return n;
    });
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  // "✓ Precio vigente" desde la ficha
  function handleVerifyFromModal() {
    const p = modalProduct as Product | null;
    if (!p) return;
    startTransition(async () => {
      const res = await verifyProductCosts([p.id]);
      if (res.error) { alert(`No se pudo confirmar: ${res.error}`); return; }
      setModalProduct({ ...p, costo_verificado_at: res.at });
    });
  }

  // "✓ Precio vigente" con varios seleccionados
  function handleBulkVerify() {
    const ids = selectedVisible;
    const n = ids.length;
    if (n > 1 && !confirm(`¿Confirmar que el costo de ${n} productos sigue vigente?`)) return;
    startTransition(async () => {
      const res = await verifyProductCosts(ids);
      if (res.error) { alert(`No se pudo confirmar: ${res.error}`); return; }
      setSelected(new Set());
    });
  }

  function handleDuplicate() {
    const ids = selectedVisible;
    const n = ids.length;
    if (n > 1 && !confirm(`¿Duplicar ${n} productos? Las copias quedan inactivas y con stock 0.`)) return;
    startTransition(async () => {
      const res = await duplicateProducts(ids);
      if (res.error) { alert(`No se pudo duplicar: ${res.error}`); return; }
      setSelected(new Set());
      // Con uno solo, se abre la ficha de la copia para ajustarla de inmediato
      if (res.created.length === 1) openEdit(res.created[0] as unknown as Product);
    });
  }

  function handleBulkDelete() {
    const ids = selectedVisible;
    const n = ids.length;
    if (!confirm(`¿Eliminar ${n} producto${n > 1 ? 's' : ''} del catálogo? Esta acción no se puede deshacer.`)) return;
    startTransition(async () => {
      const res = await deleteProducts(ids);
      setSelected(new Set(res.failed));
      if (res.failed.length) {
        alert(`Se eliminaron ${res.deleted}. No se pudieron eliminar ${res.failed.length} (quedan seleccionados). Intenta de nuevo o márcalos como Inactivos.`);
      }
    });
  }

  // Categorías ordenadas por cantidad de productos
  const categories = ['all', ...Array.from(new Set(products.map((p) => p.category)))
    .sort((a, b) => products.filter(p => p.category === b).length - products.filter(p => p.category === a).length)];

  const countCat = (cat: string) => cat === 'all' ? products.length : products.filter(p => p.category === cat).length;
  const countStock = (s: 'all' | 'in' | 'out') => {
    const base = filterCat === 'all' ? products : products.filter(p => p.category === filterCat);
    if (s === 'all') return base.length;
    return base.filter(p => s === 'in' ? p.stock > 0 : p.stock === 0).length;
  };

  return (
    <>
      {showModal && (
        <ProductModal
          product={modalProduct as Product | null}
          panels={panels}
          onClose={closeModal}
          onSave={handleSave}
          onDelete={modalProduct ? handleDeleteFromModal : undefined}
          onVerify={modalProduct ? handleVerifyFromModal : undefined}
          isPending={isPending}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
        <div className="flex gap-1.5">
          {(['all', 'in', 'out'] as const).map((s) => (
            <button key={s} onClick={() => setFilterStock(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterStock === s ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
              {s === 'all' ? 'Todos' : s === 'in' ? 'Con stock' : 'Sin stock'}
              <span className={`ml-1.5 ${filterStock === s ? 'text-gray-300' : 'text-gray-400'}`}>
                ({countStock(s)})
              </span>
            </button>
          ))}
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 bg-[#389fe0] hover:bg-[#1d65c5] text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
          + Nuevo producto
        </button>
      </div>

      {/* Buscador */}
      <div className="mb-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, SKU, marca o proveedor…"
          aria-label="Buscar productos"
          className="w-full md:w-96 border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#389fe0]"
        />
      </div>

      {/* Selector de categoría (móvil) */}
      <div className="md:hidden mb-3">
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#389fe0]"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {(cat === 'all' ? 'Todas las categorías' : (CATEGORY_LABELS[cat] ?? cat))} ({countCat(cat)})
            </option>
          ))}
        </select>
      </div>

      {/* Layout: sidebar izquierdo + tabla */}
      <div className="flex flex-col md:flex-row gap-4 items-start">

        {/* Sidebar de categorías (escritorio) */}
        <div className="hidden md:block w-48 shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-3 py-2.5 border-b border-gray-100">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Categoría</p>
          </div>
          <nav className="py-1">
            {categories.map((cat) => (
              <button key={cat} onClick={() => setFilterCat(cat)}
                className={`w-full text-left px-3 py-2 text-xs flex justify-between items-center transition-colors ${
                  filterCat === cat
                    ? 'bg-[#389fe0]/10 text-[#1d65c5] font-semibold'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}>
                <span className="truncate">{cat === 'all' ? 'Todos' : (CATEGORY_LABELS[cat] ?? cat)}</span>
                <span className={`ml-1 tabular-nums shrink-0 text-[10px] px-1.5 py-0.5 rounded-full ${
                  filterCat === cat ? 'bg-[#389fe0]/20 text-[#1d65c5]' : 'bg-gray-100 text-gray-400'
                }`}>
                  {countCat(cat)}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tabla de productos */}
        <div className="flex-1 min-w-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Barra de selección */}
        {selectedVisible.length > 0 && (
          <div className="px-5 py-3 bg-[#389fe0]/5 border-b border-[#389fe0]/20 flex items-center justify-between gap-3 flex-wrap">
            <span className="text-sm text-[#1d65c5] font-medium">
              {selectedVisible.length} producto{selectedVisible.length > 1 ? 's' : ''} seleccionado{selectedVisible.length > 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-3">
              <button onClick={() => setSelected(new Set())}
                className="text-xs text-gray-500 hover:text-gray-700 font-medium">
                Quitar selección
              </button>
              <button onClick={handleBulkVerify} disabled={isPending}
                title="Confirmar que el costo del proveedor sigue vigente"
                className="border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 text-gray-700 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors">
                ✓ Precio vigente
              </button>
              <button onClick={handleDuplicate} disabled={isPending}
                className="border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 text-gray-700 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors">
                Duplicar
              </button>
              <button onClick={handleBulkDelete} disabled={isPending}
                className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors">
                Eliminar
              </button>
            </div>
          </div>
        )}
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-gray-400">
              {search.trim() ? `Sin resultados para "${search.trim()}".` : 'No hay productos con estos filtros.'}
            </p>
          </div>
        ) : (
          <>
          {/* Tarjetas (móvil) */}
          <div className="md:hidden divide-y divide-gray-100">
            <label className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 text-xs text-gray-500">
              <input type="checkbox" checked={allSelected} onChange={toggleAll}
                ref={(el) => { if (el) el.indeterminate = someSelected; }}
                className="rounded border-gray-300 text-[#389fe0] focus:ring-[#389fe0]" />
              Seleccionar todos ({filtered.length})
            </label>
            {filtered.map((p) => (
              <div key={p.id} className={`p-4 ${!p.is_active ? 'opacity-50' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)}
                    aria-label={`Seleccionar ${p.name}`}
                    className="mt-1 shrink-0 rounded border-gray-300 text-[#389fe0] focus:ring-[#389fe0]" />
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      className="text-left font-medium text-gray-900 hover:text-[#389fe0] transition-colors break-words"
                    >
                      {p.name}
                    </button>
                    <p className="text-xs font-mono text-gray-400 mt-0.5 break-all">{p.sku}</p>
                    {p.marca && <p className="text-xs text-gray-700 font-medium">{p.marca}</p>}
                    {p.proveedor && <p className="text-xs text-gray-500">{p.proveedor}</p>}
                  </div>
                  <button
                    onClick={() => handleToggle(p.id, p.is_active)}
                    disabled={isPending}
                    className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${
                      p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {p.is_active ? 'Activo' : 'Inactivo'}
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-500">
                  <span>{CATEGORY_LABELS[p.category] ?? p.category}</span>
                  <span>{CUSTOMER_LABELS[p.customer_type] ?? p.customer_type}</span>
                  <span>Stock: {p.stock}</span>
                  <span>Costo verif.: <FechaPrecio iso={fechaPrecioISO(p)} /></span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="font-semibold text-gray-900 tabular-nums">{clp(p.base_price_clp)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Tabla (escritorio) */}
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-left">
                  <th className="pl-5 pr-2 py-3 w-8">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll}
                      ref={(el) => { if (el) el.indeterminate = someSelected; }}
                      aria-label="Seleccionar todos"
                      className="rounded border-gray-300 text-[#389fe0] focus:ring-[#389fe0]" />
                  </th>
                  <SortableHeader label="Producto"    sortKey="producto"  sort={sort} onSort={toggleSort} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide" />
                  <SortableHeader label="Marca"       sortKey="marca"     sort={sort} onSort={toggleSort} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide" />
                  <SortableHeader label="Categoría"   sortKey="categoria" sort={sort} onSort={toggleSort} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide" />
                  <SortableHeader label="Precio base" sortKey="precio"    sort={sort} onSort={toggleSort} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide" align="right" />
                  <SortableHeader label="Costo verif." sortKey="fechaPrecio" sort={sort} onSort={toggleSort} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap" />
                  <SortableHeader label="Estado"      sortKey="estado"    sort={sort} onSort={toggleSort} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide" align="center" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}
                    className={`border-b border-gray-50 transition-colors ${selected.has(p.id) ? 'bg-[#389fe0]/5' : 'hover:bg-gray-50/40'} ${!p.is_active ? 'opacity-50' : ''}`}>
                    <td className="pl-5 pr-2 py-3.5">
                      <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)}
                        aria-label={`Seleccionar ${p.name}`}
                        className="rounded border-gray-300 text-[#389fe0] focus:ring-[#389fe0]" />
                    </td>
                    <td className="px-5 py-3.5 max-w-md">
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        title="Editar producto"
                        className="text-left font-medium text-gray-900 hover:text-[#389fe0] transition-colors break-words"
                      >
                        {p.name}
                      </button>
                      <p className="text-xs font-mono text-gray-400 mt-0.5 break-all">{p.sku}</p>
                      {p.proveedor && <p className="text-xs text-gray-500 mt-0.5">{p.proveedor}</p>}
                      {p.notes && <p className="text-xs text-gray-400 mt-0.5 italic line-clamp-2">{p.notes}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-700">{p.marca || <span className="text-gray-300">—</span>}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-medium text-gray-600">
                        {CATEGORY_LABELS[p.category] ?? p.category}
                      </span>
                      <p className="text-xs text-gray-400 mt-0.5">{CUSTOMER_LABELS[p.customer_type] ?? p.customer_type}</p>
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums whitespace-nowrap">
                      <p className="font-semibold text-gray-900">{clp(p.base_price_clp)}</p>
                      {p.installation_price_clp > 0 && (
                        <p className="text-xs text-gray-400">+ {clp(p.installation_price_clp)} inst.</p>
                      )}
                      {p.costo_proveedor_clp > 0 && (
                        <p className="text-xs text-amber-600">
                          Costo: {clp(p.costo_proveedor_clp)}
                          {p.margen_pct != null ? ` · ${p.margen_pct}%` : ' · 30% (global)'}
                        </p>
                      )}
                      <p className="text-xs text-gray-400">Stock: {p.stock}</p>
                    </td>
                    <td className="px-5 py-3.5 text-xs whitespace-nowrap">
                      <FechaPrecio iso={fechaPrecioISO(p)} />
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => handleToggle(p.id, p.is_active)}
                        disabled={isPending}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          p.is_active
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {p.is_active ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
        </div>

      </div>{/* /flex layout */}
    </>
  );
}
