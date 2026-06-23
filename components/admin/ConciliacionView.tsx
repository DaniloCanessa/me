'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ConciliacionResult, ConciliacionCompra, ConciliacionEstado } from '@/lib/db/sii';
import { uploadRcvCsv } from '@/app/admin/conciliacion/actions';

function clp(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
}

const ESTADO_META: Record<ConciliacionEstado, { label: string; dot: string; row: string }> = {
  calza:          { label: 'Calza',                  dot: 'bg-green-500',  row: '' },
  falta_en_app:   { label: 'En SII, falta en tu app', dot: 'bg-red-500',    row: 'bg-red-50/40' },
  falta_en_sii:   { label: 'En tu app, no en el SII', dot: 'bg-amber-500',  row: 'bg-amber-50/40' },
  monto_distinto: { label: 'Monto distinto',          dot: 'bg-yellow-400', row: 'bg-yellow-50/40' },
};

export default function ConciliacionView({
  conciliacion, mes, label,
}: {
  conciliacion: ConciliacionResult;
  mes: string;
  label: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const c = conciliacion;

  function shiftMonth(delta: number) {
    const [y, m] = mes.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    router.push(`/admin/conciliacion?mes=${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  function onUpload(file: File) {
    setMsg(null); setError(null);
    const fd = new FormData(); fd.set('file', file);
    start(async () => {
      const res = await uploadRcvCsv(mes, fd);
      if (res?.error) { setError(res.error); return; }
      setMsg(`Importado: ${res.kind === 'compras' ? `${res.count} compras` : res.kind === 'ventas' ? `${res.count} líneas de ventas` : 'archivo'}.`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4 max-w-4xl">
      {/* Mes + carga */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={() => shiftMonth(-1)} className="w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">←</button>
          <span className="text-sm font-semibold text-gray-800 capitalize min-w-40 text-center">{label}</span>
          <button onClick={() => shiftMonth(1)} className="w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">→</button>
          <input type="month" value={mes}
            onChange={(e) => e.target.value && router.push(`/admin/conciliacion?mes=${e.target.value}`)}
            className="ml-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-900" />
        </div>
        <label className="rounded-xl bg-[#010101] hover:bg-[#1d65c5] text-white text-sm font-semibold px-4 py-2.5 cursor-pointer transition-colors">
          {pending ? 'Importando…' : '+ Subir CSV del SII'}
          <input type="file" accept=".csv,text/csv" className="hidden" disabled={pending}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }} />
        </label>
      </div>
      <p className="text-xs text-gray-400 -mt-2">
        Sube el <code>RCV_COMPRA_REGISTRO…csv</code> y el <code>RCV_RESUMEN_VENTA…csv</code> del mes (se detecta el tipo solo).
      </p>
      {msg && <p className="text-sm text-green-600">{msg}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Resumen crédito / débito */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <CompareCard title="Crédito (compras)" sii={c.creditoSii} app={c.creditoApp}
          hint={c.tieneRcvCompras ? 'IVA del RCV de compras vs tus facturas de gasto.' : 'Aún no importas el RCV de compras de este mes.'} />
        <CompareCard title="Débito (ventas)" sii={c.ventas.debitoSii} app={c.ventas.debitoApp}
          hint={c.tieneRcvVentas ? 'IVA del RCV de ventas vs tus facturas de venta.' : 'Aún no importas el RCV de ventas de este mes.'} />
      </div>

      {/* Semáforo resumen */}
      <div className="flex flex-wrap gap-2">
        <Chip n={c.resumen.calza} label="Calzan" estado="calza" />
        <Chip n={c.resumen.faltaEnApp} label="Falta en tu app" estado="falta_en_app" />
        <Chip n={c.resumen.faltaEnSii} label="No está en el SII" estado="falta_en_sii" />
        <Chip n={c.resumen.montoDistinto} label="Monto distinto" estado="monto_distinto" />
      </div>

      {/* Tabla de conciliación de compras */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Compras — SII vs tu app</p>
        </div>
        {c.compras.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">
            {c.tieneRcvCompras ? 'Sin diferencias.' : 'Sube el RCV de compras del SII para empezar a conciliar.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="text-left font-medium px-4 py-2">Estado</th>
                  <th className="text-left font-medium px-4 py-2">Proveedor</th>
                  <th className="text-left font-medium px-4 py-2">Folio</th>
                  <th className="text-right font-medium px-4 py-2">IVA SII</th>
                  <th className="text-right font-medium px-4 py-2">IVA app</th>
                </tr>
              </thead>
              <tbody>
                {c.compras.map((row, i) => <CompraRow key={i} row={row} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ventas */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ventas — débito</p>
        {c.tieneRcvVentas ? (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">SII (RCV ventas): <strong>{clp(c.ventas.debitoSii)}</strong> · {c.ventas.docsSii} doc.</span>
            <span className="text-gray-600">Tu app: <strong>{clp(c.ventas.debitoApp)}</strong></span>
            <span className={`text-xs px-2 py-0.5 rounded ${c.ventas.calza ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
              {c.ventas.calza ? 'Calza' : 'Revisar'}
            </span>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Sube el RCV de ventas del SII para conciliar el débito.</p>
        )}
      </div>

      <p className="text-xs text-gray-400">
        🔴 <strong>Falta en tu app</strong>: el SII la tiene, regístrala. 🟠 <strong>No está en el SII</strong>: tú la tienes
        pero el SII no la cuenta — crédito que el SII pudo haber omitido, revísalo para no perderlo.
      </p>
    </div>
  );
}

function CompareCard({ title, sii, app, hint }: { title: string; sii: number; app: number; hint: string }) {
  const diff = sii - app;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
      <div className="flex items-end justify-between mt-2">
        <div><p className="text-[11px] text-gray-400">SII</p><p className="text-base font-bold text-gray-900 tabular-nums">{clp(sii)}</p></div>
        <div className="text-right"><p className="text-[11px] text-gray-400">Tu app</p><p className="text-base font-bold text-gray-700 tabular-nums">{clp(app)}</p></div>
      </div>
      <p className={`text-xs mt-1 ${Math.abs(diff) <= 2 ? 'text-green-600' : 'text-amber-600'}`}>
        {Math.abs(diff) <= 2 ? '✓ Calzan' : `Diferencia ${clp(Math.abs(diff))}`}
      </p>
      <p className="text-[11px] text-gray-400 mt-1">{hint}</p>
    </div>
  );
}

function Chip({ n, label, estado }: { n: number; label: string; estado: ConciliacionEstado }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600">
      <span className={`w-2 h-2 rounded-full ${ESTADO_META[estado].dot}`} />
      <strong className="text-gray-900">{n}</strong> {label}
    </span>
  );
}

function CompraRow({ row }: { row: ConciliacionCompra }) {
  const meta = ESTADO_META[row.estado];
  const prov = row.sii?.razon_social || row.app?.proveedor || '—';
  const folio = row.sii?.folio || row.app?.folio || '—';
  return (
    <tr className={`border-b border-gray-50 ${meta.row}`}>
      <td className="px-4 py-2.5">
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
          <span className={`w-2 h-2 rounded-full ${meta.dot}`} /> {meta.label}
        </span>
      </td>
      <td className="px-4 py-2.5 text-gray-700">{prov}</td>
      <td className="px-4 py-2.5 text-gray-500 tabular-nums">{folio}</td>
      <td className="px-4 py-2.5 text-right tabular-nums text-gray-900">{row.sii ? clp(row.sii.monto_iva) : '—'}</td>
      <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">{row.app?.iva != null ? clp(row.app.iva) : '—'}</td>
    </tr>
  );
}
