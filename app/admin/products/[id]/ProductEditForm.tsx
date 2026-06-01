'use client';

import { useState, useTransition } from 'react';
import { updateProduct } from '../actions';

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  customer_type: string;
  specs: Record<string, unknown>;
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

function clp(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
}

function SolarKitSpecs({ specs }: { specs?: Record<string, unknown> }) {
  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <label className="block">
          <span className="text-xs text-gray-500 mb-1 block">Potencia (kWp)</span>
          <input name="sizekWp" type="number" step="0.1" required defaultValue={specs?.sizekWp as number ?? ''}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]" />
        </label>
        <label className="block">
          <span className="text-xs text-gray-500 mb-1 block">Paneles</span>
          <input name="panelCount" type="number" step="1" required defaultValue={specs?.panelCount as number ?? ''}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]" />
        </label>
        <label className="block">
          <span className="text-xs text-gray-500 mb-1 block">Área (m²)</span>
          <input name="areaM2" type="number" step="0.5" required defaultValue={specs?.areaM2 as number ?? ''}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]" />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-gray-500 mb-1 block">¿Incluye batería?</span>
          <select name="includesBattery" defaultValue={specs?.includesBattery ? 'true' : 'false'}
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
        <input name="capacityKWh" type="number" step="1" required defaultValue={specs?.capacityKWh as number ?? ''}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]" />
      </label>
      <label className="block">
        <span className="text-xs text-gray-500 mb-1 block">Fracción usable</span>
        <input name="usableFraction" type="number" step="0.01" min="0" max="1" required
          defaultValue={specs?.usableFraction as number ?? 0.7}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]" />
      </label>
      <label className="block">
        <span className="text-xs text-gray-500 mb-1 block">Eficiencia ciclo</span>
        <input name="cycleEfficiency" type="number" step="0.01" min="0" max="1" required
          defaultValue={specs?.cycleEfficiency as number ?? 0.8}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]" />
      </label>
    </div>
  );
}

export default function ProductEditForm({ product, onSaved }: { product: Product; onSaved?: () => void }) {
  const [category,  setCategory]  = useState(product.category);
  const [costo,     setCosto]     = useState(product.costo_proveedor_clp);
  const [margenStr, setMargenStr] = useState(String(product.margen_pct ?? 30));
  const [saved,     setSaved]     = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const margen       = parseFloat(margenStr) || 0;
  const precioNeto   = Math.round(costo * (1 + margen / 100));
  const precioConIva = Math.round(precioNeto * 1.19);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const res = await updateProduct(product.id, fd);
      if (res?.error) { setError(res.error); return; }
      setSaved(true);
      setTimeout(() => { setSaved(false); onSaved?.(); }, 1500);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-gray-500 mb-1 block">Nombre *</span>
          <input name="name" type="text" required defaultValue={product.name}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]" />
        </label>
        <label className="block">
          <span className="text-xs text-gray-500 mb-1 block">SKU *</span>
          <input name="sku" type="text" required defaultValue={product.sku}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#389fe0]" />
        </label>
      </div>

      <label className="block">
        <span className="text-xs text-gray-500 mb-1 block">Proveedor</span>
        <input name="proveedor" type="text" defaultValue={product.proveedor ?? ''}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]" />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-gray-500 mb-1 block">Categoría *</span>
          <select name="category" required value={category} onChange={(e) => setCategory(e.target.value)}
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
          <select name="customer_type" defaultValue={product.customer_type}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]">
            <option value="residential">Residencial</option>
            <option value="business">Empresa</option>
            <option value="both">Ambos</option>
          </select>
        </label>
      </div>

      {(category === 'solar_kit' || category === 'battery') && (
        <div className="bg-gray-50 rounded-xl p-4 flex flex-col gap-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Especificaciones</p>
          {category === 'solar_kit' && <SolarKitSpecs specs={product.specs} />}
          {category === 'battery'   && <BatterySpecs  specs={product.specs} />}
        </div>
      )}

      <div className="bg-amber-50 rounded-xl p-4 flex flex-col gap-3">
        <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Costos internos</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-gray-500 mb-1 block">Costo proveedor neto (CLP) *</span>
            <input
              type="text" inputMode="numeric" required
              value={costo > 0 ? new Intl.NumberFormat('es-CL').format(costo) : ''}
              onChange={e => setCosto(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm tabular-nums focus:outline-none focus:border-[#389fe0] bg-white"
              placeholder="0" />
            <input type="hidden" name="costo_proveedor_clp" value={costo} />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500 mb-1 block">Margen %</span>
            <input type="number" step="0.1" min="0" max="100"
              value={margenStr}
              onChange={e => setMargenStr(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm tabular-nums focus:outline-none focus:border-[#389fe0] bg-white" />
            <input type="hidden" name="margen_pct" value={margen} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-amber-100">
          <div>
            <p className="text-xs text-amber-600 mb-1">Precio venta s/IVA</p>
            <p className="text-sm font-bold text-amber-800 tabular-nums">{clp(precioNeto)}</p>
          </div>
          <div>
            <p className="text-xs text-amber-600 mb-1">Precio venta c/IVA</p>
            <p className="text-sm font-bold text-amber-800 tabular-nums">{clp(precioConIva)}</p>
          </div>
        </div>
        <input type="hidden" name="base_price_clp" value={precioNeto} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-gray-500 mb-1 block">Precio instalación (CLP)</span>
          <input name="installation_price_clp" type="number" step="1" defaultValue={product.installation_price_clp ?? 0}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm tabular-nums focus:outline-none focus:border-[#389fe0]" />
        </label>
        <label className="block">
          <span className="text-xs text-gray-500 mb-1 block">Stock disponible</span>
          <input name="stock" type="number" step="1" min="0" defaultValue={product.stock ?? 0}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm tabular-nums focus:outline-none focus:border-[#389fe0]" />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-gray-500 mb-1 block">Orden</span>
          <input name="sort_order" type="number" step="1" defaultValue={product.sort_order ?? 0}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]" />
        </label>
        <label className="block">
          <span className="text-xs text-gray-500 mb-1 block">Estado</span>
          <select name="is_active" defaultValue={product.is_active === false ? 'false' : 'true'}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]">
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className="text-xs text-gray-500 mb-1 block">Notas internas</span>
        <textarea name="notes" rows={2} defaultValue={product.notes ?? ''}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#389fe0]" />
      </label>

      <button type="submit" disabled={isPending}
        className="bg-[#389fe0] hover:bg-[#1d65c5] text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
        {saved ? '✓ Guardado' : isPending ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </form>
  );
}
