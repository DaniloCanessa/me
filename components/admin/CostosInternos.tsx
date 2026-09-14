'use client';

import { useState } from 'react';

function clp(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
}

/**
 * Bloque "Costos internos" del formulario de producto (alta y edición).
 *
 * El precio de catálogo NO es un campo que se escriba: sale de
 * `costo × (1 + margen/100)`. Eso hacía que editar **cualquier** cosa de un kit
 * —la cantidad de paneles, por ejemplo— reescribiera su precio en silencio: en
 * la sesión 34 se movieron 5 precios así, uno a $439.530 por un dígito de menos
 * en el costo. Ahora, cuando el precio calculado no coincide con el guardado,
 * el bloque lo dice y hay que elegir: **conservar** el del catálogo o
 * **actualizarlo**. Por defecto conserva, salvo que se haya tocado el costo o
 * el margen en esta edición — que es la única forma de decir "quiero mover el
 * precio".
 */
export default function CostosInternos({
  precioGuardado,
  costoInicial,
  margenInicial,
}: {
  /** Precio hoy en el catálogo. `null` en un producto nuevo (no hay qué conservar). */
  precioGuardado: number | null;
  costoInicial: number;
  margenInicial: number | null;
}) {
  const [costo,     setCosto]     = useState(costoInicial);
  const [margenStr, setMargenStr] = useState(String(margenInicial ?? 30));
  /** ¿Se tocó costo o margen en esta edición? Entonces mover el precio es la intención. */
  const [tocado,    setTocado]    = useState(false);
  /** Elección explícita del usuario; manda por sobre el default. */
  const [eleccion,  setEleccion]  = useState<'conservar' | 'actualizar' | null>(null);

  const margen     = parseFloat(margenStr) || 0;
  const precioCalc = Math.round(costo * (1 + margen / 100));

  const difiere  = precioGuardado != null && precioCalc !== precioGuardado;
  const conserva = difiere && (eleccion ?? (tocado ? 'actualizar' : 'conservar')) === 'conservar';

  const precioFinal  = conserva ? (precioGuardado as number) : precioCalc;
  const precioConIva = Math.round(precioFinal * 1.19);

  const btn = (activo: boolean) =>
    `flex-1 rounded-lg px-3 py-2 text-xs font-semibold border transition ${
      activo
        ? 'bg-amber-600 text-white border-amber-600'
        : 'bg-white text-amber-800 border-amber-200 hover:border-amber-400'
    }`;

  return (
    <div className="bg-amber-50 rounded-xl p-4 flex flex-col gap-3">
      <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Costos internos</p>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-gray-500 mb-1 block">Costo proveedor neto (CLP) *</span>
          <input
            type="text" inputMode="numeric" required
            value={costo > 0 ? new Intl.NumberFormat('es-CL').format(costo) : ''}
            onChange={e => { setCosto(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0); setTocado(true); }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm tabular-nums focus:outline-none focus:border-[#389fe0] bg-white"
            placeholder="0" />
          <input type="hidden" name="costo_proveedor_clp" value={costo} />
        </label>
        <label className="block">
          <span className="text-xs text-gray-500 mb-1 block">Margen %</span>
          <input type="number" step="0.1" min="0" max="100"
            value={margenStr}
            onChange={e => { setMargenStr(e.target.value); setTocado(true); }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm tabular-nums focus:outline-none focus:border-[#389fe0] bg-white" />
          <input type="hidden" name="margen_pct" value={margen} />
        </label>
      </div>

      {difiere && (
        <div className="rounded-lg border border-amber-300 bg-white p-3 flex flex-col gap-2">
          <p className="text-xs text-amber-900">
            <span className="font-semibold">⚠ El precio del catálogo cambiaría.</span>{' '}
            Hoy está en <span className="font-semibold tabular-nums">{clp(precioGuardado as number)}</span> y
            costo × margen da <span className="font-semibold tabular-nums">{clp(precioCalc)}</span>{' '}
            ({precioCalc > (precioGuardado as number) ? '+' : '−'}
            {clp(Math.abs(precioCalc - (precioGuardado as number)))}).
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setEleccion('conservar')} className={btn(conserva)}>
              Conservar {clp(precioGuardado as number)}
            </button>
            <button type="button" onClick={() => setEleccion('actualizar')} className={btn(!conserva)}>
              Actualizar a {clp(precioCalc)}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 pt-1 border-t border-amber-100">
        <div>
          <p className="text-xs text-amber-600 mb-1">Precio venta s/IVA</p>
          <p className="text-sm font-bold text-amber-800 tabular-nums">{clp(precioFinal)}</p>
        </div>
        <div>
          <p className="text-xs text-amber-600 mb-1">Precio venta c/IVA</p>
          <p className="text-sm font-bold text-amber-800 tabular-nums">{clp(precioConIva)}</p>
        </div>
      </div>
      <input type="hidden" name="base_price_clp" value={precioFinal} />
    </div>
  );
}
