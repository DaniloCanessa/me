'use client';

import { useState, useTransition } from 'react';
import {
  createProduct,
  updateProduct,
  toggleProductActive,
  deleteProduct,
} from '@/app/admin/products/actions';

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  customer_type: string;
  specs: Record<string, unknown>;
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
  accessory:        'Accesorio',
};

const CUSTOMER_LABELS: Record<string, string> = {
  residential: 'Residencial',
  business:    'Empresa',
  both:        'Ambos',
};

function clp(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
}

// ─── Formulario de specs según categoría ─────────────────────────────────────

function SolarKitSpecs({ specs }: { specs?: Record<string, unknown> }) {
  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <label className="block">
          <span className="text-xs text-gray-500 mb-1 block">Potencia (kWp)</span>
          <input name="sizekWp" type="number" step="0.1" required
            defaultValue={specs?.sizekWp as number ?? ''}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]" />
        </label>
        <label className="block">
          <span className="text-xs text-gray-500 mb-1 block">Cantidad de paneles</span>
          <input name="panelCount" type="number" step="1" required
            defaultValue={specs?.panelCount as number ?? ''}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]" />
        </label>
        <label className="block">
          <span className="text-xs text-gray-500 mb-1 block">Área (m²)</span>
          <input name="areaM2" type="number" step="0.5" required
            defaultValue={specs?.areaM2 as number ?? ''}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]" />
        </label>
      </div>
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
  onClose,
  onSave,
  isPending,
}: {
  product: Product | null;
  onClose: () => void;
  onSave: (formData: FormData) => void;
  isPending: boolean;
}) {
  const [category, setCategory] = useState(product?.category ?? 'solar_kit');

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {product ? 'Editar producto' : 'Nuevo producto'}
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
            {category === 'solar_kit' && <SolarKitSpecs specs={product?.specs} />}
            {category === 'battery'   && <BatterySpecs  specs={product?.specs} />}
            {!['solar_kit', 'battery'].includes(category) && (
              <p className="text-xs text-gray-400">Sin specs adicionales para esta categoría.</p>
            )}
          </div>

          {/* Costos y margen */}
          <div className="bg-amber-50 rounded-xl p-4 flex flex-col gap-3">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Costos internos</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-gray-500 mb-1 block">Costo proveedor neto (CLP) *</span>
                <input name="costo_proveedor_clp" type="number" step="1000" required
                  defaultValue={product?.costo_proveedor_clp ?? 0}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm tabular-nums focus:outline-none focus:border-[#389fe0] bg-white" />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500 mb-1 block">Margen % (vacío = global 30%)</span>
                <input name="margen_pct" type="number" step="0.5" min="0" max="100" placeholder="30"
                  defaultValue={product?.margen_pct ?? ''}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm tabular-nums focus:outline-none focus:border-[#389fe0] bg-white" />
              </label>
            </div>
          </div>

          {/* Precios */}
          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className="text-xs text-gray-500 mb-1 block">Precio base (CLP) *</span>
              <input name="base_price_clp" type="number" step="1000" required
                defaultValue={product?.base_price_clp ?? ''}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm tabular-nums focus:outline-none focus:border-[#389fe0]" />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 mb-1 block">Precio instalación (CLP)</span>
              <input name="installation_price_clp" type="number" step="1000"
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
        </form>
      </div>
    </div>
  );
}

// ─── Tabla principal ──────────────────────────────────────────────────────────

export default function ProductsManager({ products }: { products: Product[] }) {
  const [modalProduct, setModalProduct] = useState<Product | null | 'new'>('new' as never);
  const [showModal, setShowModal]       = useState(false);
  const [filterCat, setFilterCat]       = useState<string>('all');
  const [filterStock, setFilterStock]   = useState<'all' | 'in' | 'out'>('all');
  const [isPending, startTransition]    = useTransition();
  const [deletingId, setDeletingId]     = useState<string | null>(null);

  const filtered = products
    .filter((p) => filterCat === 'all' || p.category === filterCat)
    .filter((p) => filterStock === 'all' || (filterStock === 'in' ? p.stock > 0 : p.stock === 0));

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

  function handleDelete(id: string) {
    if (!confirm('¿Eliminar este producto del catálogo? Esta acción no se puede deshacer.')) return;
    setDeletingId(id);
    startTransition(async () => { await deleteProduct(id); setDeletingId(null); });
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
          onClose={closeModal}
          onSave={handleSave}
          isPending={isPending}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
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

      {/* Layout: sidebar izquierdo + tabla */}
      <div className="flex gap-4 items-start">

        {/* Sidebar de categorías */}
        <div className="w-48 shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
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
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-gray-400">No hay productos con estos filtros.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Producto</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Categoría</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Especificaciones</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Precio base</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Estado</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}
                    className={`border-b border-gray-50 hover:bg-gray-50/40 transition-colors ${!p.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-gray-900">{p.name}</p>
                      <p className="text-xs font-mono text-gray-400 mt-0.5">{p.sku}</p>
                      {p.notes && <p className="text-xs text-gray-400 mt-0.5 italic">{p.notes}</p>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-medium text-gray-600">
                        {CATEGORY_LABELS[p.category] ?? p.category}
                      </span>
                      <p className="text-xs text-gray-400 mt-0.5">{CUSTOMER_LABELS[p.customer_type] ?? p.customer_type}</p>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-500">
                      {p.category === 'solar_kit' && (
                        <span>
                          {(p.specs as { sizekWp?: number }).sizekWp ?? '?'} kWp ·{' '}
                          {(p.specs as { panelCount?: number }).panelCount ?? '?'} paneles ·{' '}
                          {(p.specs as { areaM2?: number }).areaM2 ?? '?'} m²
                          {(p.specs as { includesBattery?: boolean }).includesBattery && (
                            <span className="ml-1 text-[#1d65c5]">
                              + {(p.specs as { batteryCapacityKWh?: number }).batteryCapacityKWh ?? '?'} kWh bat.
                            </span>
                          )}
                        </span>
                      )}
                      {p.category === 'battery' && (
                        <span>
                          {(p.specs as { capacityKWh?: number }).capacityKWh ?? '?'} kWh ·{' '}
                          {Math.round(((p.specs as { usableFraction?: number }).usableFraction ?? 0.7) * 100)}% usable
                        </span>
                      )}
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
                    <td className="px-5 py-3.5">
                      <div className="flex gap-3 justify-end">
                        <button
                          onClick={() => openEdit(p)}
                          className="text-xs text-[#389fe0] hover:text-[#1d65c5] font-medium transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          disabled={deletingId === p.id || isPending}
                          className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors disabled:opacity-40"
                        >
                          {deletingId === p.id ? '…' : 'Eliminar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </div>

      </div>{/* /flex layout */}
    </>
  );
}
