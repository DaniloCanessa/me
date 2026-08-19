'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  getUnlinkedInvoices, linkInvoicesToProject, unlinkInvoiceFromProject,
} from '@/app/admin/facturas/actions';

type Disponible = {
  id: string; proveedor: string | null; folio: string | null;
  fecha: string | null; total: number | null; cuenta: string | null;
};

type Vinculada = {
  id: string; proveedor: string | null; folio: string | null;
  fecha: string | null; total: number | null;
};

const clp = (n: number | null) =>
  n == null ? '—' : new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

// Centro de costo del proyecto: las facturas se ingresan sueltas y aquí se
// eligen las que corresponden a esta obra. Vincular crea la compra en su cuenta
// corriente; desvincular la deshace.
export default function LinkInvoicesPanel({
  projectId, vinculadas,
}: {
  projectId: string;
  vinculadas: Vinculada[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [disponibles, setDisponibles] = useState<Disponible[]>([]);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [buscar, setBuscar] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function abrir() {
    setAbierto(true); setCargando(true); setError(null);
    try {
      setDisponibles(await getUnlinkedInvoices());
    } catch {
      setError('No se pudieron cargar las facturas');
    } finally {
      setCargando(false);
    }
  }

  function toggle(id: string) {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function vincular() {
    setError(null);
    start(async () => {
      const res = await linkInvoicesToProject(projectId, [...seleccion]);
      if (res?.error) { setError(res.error); return; }
      setAbierto(false); setSeleccion(new Set()); router.refresh();
    });
  }

  function desvincular(id: string) {
    setError(null);
    start(async () => {
      const res = await unlinkInvoiceFromProject(id);
      if (res?.error) { setError(res.error); return; }
      router.refresh();
    });
  }

  const filtradas = buscar.trim()
    ? disponibles.filter((f) =>
        `${f.proveedor ?? ''} ${f.folio ?? ''}`.toLowerCase().includes(buscar.toLowerCase()))
    : disponibles;

  const totalVinculado = vinculadas.reduce((s, f) => s + (Number(f.total) || 0), 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Facturas de este proyecto</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {vinculadas.length
              ? `${vinculadas.length} factura(s) · ${clp(totalVinculado)}`
              : 'Ninguna vinculada todavía — el costo de la obra se arma aquí.'}
          </p>
        </div>
        <button onClick={abrir} disabled={pending}
          className="rounded-xl bg-[#010101] hover:bg-[#1d65c5] text-white text-sm font-semibold px-4 py-2 transition-colors disabled:opacity-60">
          + Vincular facturas
        </button>
      </div>

      {error && <p className="px-5 pt-3 text-sm text-red-600">{error}</p>}

      {vinculadas.length > 0 && (
        <div className="px-5 py-3 flex flex-col gap-1.5">
          {vinculadas.map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-3 text-sm border-b border-gray-50 pb-1.5 last:border-0">
              <span className="min-w-0">
                <span className="text-gray-800">{f.proveedor ?? 'Sin proveedor'}</span>
                <span className="text-xs text-gray-400 ml-2">
                  {f.folio ? `N° ${f.folio}` : ''}{f.fecha ? ` · ${f.fecha}` : ''}
                </span>
              </span>
              <span className="flex items-center gap-3 shrink-0">
                <span className="tabular-nums font-medium text-gray-900">{clp(f.total)}</span>
                <button onClick={() => desvincular(f.id)} disabled={pending}
                  className="text-xs text-gray-400 hover:text-red-500">Quitar</button>
              </span>
            </div>
          ))}
        </div>
      )}

      {abierto && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start sm:items-center justify-center p-4 overflow-y-auto"
          onClick={() => !pending && setAbierto(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl my-8" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">Vincular facturas al proyecto</h2>
              <button onClick={() => setAbierto(false)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
            </div>

            <div className="px-5 py-3 border-b border-gray-100">
              <input value={buscar} onChange={(e) => setBuscar(e.target.value)}
                placeholder="Buscar por proveedor o folio…"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-[#389fe0] focus:ring-1 focus:ring-[#389fe0] outline-none" />
            </div>

            <div className="max-h-96 overflow-y-auto px-5 py-2">
              {cargando ? (
                <p className="text-sm text-gray-400 py-8 text-center">Cargando…</p>
              ) : filtradas.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">
                  No hay facturas sin proyecto asignado.
                </p>
              ) : (
                filtradas.map((f) => (
                  <label key={f.id}
                    className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded">
                    <input type="checkbox" checked={seleccion.has(f.id)} onChange={() => toggle(f.id)}
                      className="rounded border-gray-300 text-[#389fe0] focus:ring-[#389fe0]" />
                    <span className="min-w-0 flex-1">
                      <span className="text-sm text-gray-800 block truncate">{f.proveedor ?? 'Sin proveedor'}</span>
                      <span className="text-xs text-gray-400">
                        {f.folio ? `N° ${f.folio}` : 's/folio'}{f.fecha ? ` · ${f.fecha}` : ''}
                        {f.cuenta ? ` · ${f.cuenta}` : ''}
                      </span>
                    </span>
                    <span className="text-sm tabular-nums font-medium text-gray-900 shrink-0">{clp(f.total)}</span>
                  </label>
                ))
              )}
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between gap-2">
              <span className="text-xs text-gray-400">
                {seleccion.size} seleccionada(s)
              </span>
              <span className="flex gap-2">
                <button onClick={() => setAbierto(false)} disabled={pending}
                  className="rounded-lg border border-gray-200 text-gray-600 text-sm px-4 py-2 hover:bg-gray-50">Cancelar</button>
                <button onClick={vincular} disabled={pending || seleccion.size === 0}
                  className="rounded-lg bg-[#010101] hover:bg-[#1d65c5] text-white text-sm font-semibold px-4 py-2 disabled:opacity-60 transition-colors">
                  {pending ? 'Vinculando…' : 'Vincular'}
                </button>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
