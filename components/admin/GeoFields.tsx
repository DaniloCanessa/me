'use client';

/**
 * Región · Comuna · Ciudad para los formularios de instalación.
 *
 * Los tres salen de listas cerradas (`lib/chile-geo.ts`) para que no convivan
 * "SANTIAGO", "Santiago" y "santiago" en la base. Comuna y ciudad se filtran por
 * la región elegida, y siempre queda la salida "Otra…" para lo que no está en
 * el listado oficial: una parcela, una localidad chica, un nombre local.
 *
 * Emite tres inputs ocultos —`region_id`, `comuna`, `ciudad`— así el formulario
 * que lo contiene sigue siendo un <form> con server action, sin cambios.
 */

import { useId, useState } from 'react';
import { REGIONS } from '@/lib/regions';
import {
  CHILE_GEO,
  OTRA,
  canonizar,
  ciudadDeComuna,
  ciudadesDe,
  comunasDe,
  regionDeComuna,
} from '@/lib/chile-geo';

const INPUT =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]';

/** Separa el valor guardado en "opción del combo" + "texto libre". */
function split(valor: string | null | undefined, opciones: string[]) {
  const canonico = canonizar(valor, opciones);
  if (canonico) return { opcion: canonico, libre: '' };
  return valor ? { opcion: OTRA, libre: valor } : { opcion: '', libre: '' };
}

/** Lista agrupada por región, para cuando todavía no hay región elegida. */
function GruposPorRegion({ campo }: { campo: 'comunas' | 'ciudades' }) {
  return (
    <>
      {REGIONS.map((r) => (
        <optgroup key={r.id} label={r.name}>
          {(CHILE_GEO[r.id]?.[campo] ?? []).map((v) => (
            <option key={`${r.id}-${v}`} value={v}>
              {v}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );
}

export default function GeoFields({
  regionId,
  comuna,
  ciudad,
}: {
  regionId?: string | null;
  comuna?: string | null;
  ciudad?: string | null;
}) {
  // Las fichas antiguas se crearon sin región. Si la comuna guardada permite
  // deducirla, se propone ya elegida y se avisa para que la confirmen al guardar.
  const deducida = !regionId ? regionDeComuna(comuna) : null;
  const uid = useId();

  const [region, setRegion] = useState(regionId || deducida || '');
  const [com, setCom] = useState(() => split(comuna, comunasDe(regionId || deducida)));
  const [ciu, setCiu] = useState(() => split(ciudad, ciudadesDe(regionId || deducida)));

  const comunas = comunasDe(region);
  const ciudades = ciudadesDe(region);

  function cambiarRegion(nueva: string) {
    setRegion(nueva);
    // Al cambiar de región, lo elegido antes deja de tener sentido salvo que
    // siga perteneciendo a la nueva (o sea texto libre, que no se pisa).
    const vigente = (v: { opcion: string; libre: string }, lista: string[]) =>
      v.opcion === OTRA || !v.opcion || lista.includes(v.opcion) ? v : { opcion: '', libre: '' };
    setCom((c) => vigente(c, comunasDe(nueva)));
    setCiu((c) => vigente(c, ciudadesDe(nueva)));
  }

  function cambiarComuna(valor: string) {
    setCom({ opcion: valor, libre: valor === OTRA ? com.libre : '' });
    if (valor === OTRA || !valor) return;
    // La ciudad casi siempre se llama igual que la comuna, o es Santiago para
    // el Gran Santiago. Se propone solo si está vacía: no pisar lo escrito.
    if (!ciu.opcion && !ciu.libre) {
      const sugerida = ciudadDeComuna(valor);
      if (sugerida) setCiu({ opcion: sugerida, libre: '' });
    }
    if (!region) {
      const r = regionDeComuna(valor);
      if (r) setRegion(r);
    }
  }

  const valorComuna = com.opcion === OTRA ? com.libre : com.opcion;
  const valorCiudad = ciu.opcion === OTRA ? ciu.libre : ciu.opcion;

  return (
    <>
      <input type="hidden" name="region_id" value={region} />
      <input type="hidden" name="comuna" value={valorComuna} />
      <input type="hidden" name="ciudad" value={valorCiudad} />

      <div>
        <label htmlFor={`${uid}-region`} className="text-xs text-gray-500 mb-1 block">Región</label>
        <select
          id={`${uid}-region`}
          value={region}
          onChange={(e) => cambiarRegion(e.target.value)}
          className={INPUT}
        >
          <option value="">— Seleccionar —</option>
          {REGIONS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        {deducida && region === deducida && (
          <span className="text-[11px] text-amber-600 mt-1 block">
            Deducida de la comuna — confírmala al guardar
          </span>
        )}
      </div>

      <div>
        <label htmlFor={`${uid}-comuna`} className="text-xs text-gray-500 mb-1 block">Comuna</label>
        <select id={`${uid}-comuna`} value={com.opcion} onChange={(e) => cambiarComuna(e.target.value)} className={INPUT}>
          <option value="">— Seleccionar —</option>
          {region ? (
            comunas.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))
          ) : (
            <GruposPorRegion campo="comunas" />
          )}
          <option value={OTRA}>Otra…</option>
        </select>
        {com.opcion === OTRA && (
          <input
            value={com.libre}
            onChange={(e) => setCom({ opcion: OTRA, libre: e.target.value })}
            placeholder="Escribe la comuna"
            aria-label="Comuna"
            className={`${INPUT} mt-2`}
          />
        )}
      </div>

      <div>
        <label htmlFor={`${uid}-ciudad`} className="text-xs text-gray-500 mb-1 block">Ciudad</label>
        <select
          id={`${uid}-ciudad`}
          value={ciu.opcion}
          onChange={(e) => setCiu({ opcion: e.target.value, libre: e.target.value === OTRA ? ciu.libre : '' })}
          className={INPUT}
        >
          <option value="">— Seleccionar —</option>
          {region ? (
            ciudades.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))
          ) : (
            <GruposPorRegion campo="ciudades" />
          )}
          <option value={OTRA}>Otra…</option>
        </select>
        {ciu.opcion === OTRA && (
          <input
            value={ciu.libre}
            onChange={(e) => setCiu({ opcion: OTRA, libre: e.target.value })}
            placeholder="Escribe la ciudad o localidad"
            aria-label="Ciudad"
            className={`${INPUT} mt-2`}
          />
        )}
      </div>
    </>
  );
}
