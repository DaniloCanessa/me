'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ConciliacionResult, ConciliacionCompra, ConciliacionVenta, ConciliacionEstado } from '@/lib/db/sii';
import { uploadRcvCsv, registrarGastoGeneral, registrarTodasGenerales } from '@/app/admin/conciliacion/actions';
import type { PurchaseAccount, AccountGroup } from '@/lib/db/accounts';
import { ACCOUNT_GROUP_LABEL } from '@/lib/db/accounts';

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
  conciliacion, mes, label, accounts,
}: {
  conciliacion: ConciliacionResult;
  mes: string;
  label: string;
  accounts: PurchaseAccount[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const c = conciliacion;

  const url = (m: string) => `/admin/facturas?tab=conciliacion&mes=${m}`;

  function shiftMonth(delta: number) {
    const [y, m] = mes.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    router.push(url(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`));
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

  // Registro de una factura del SII que falta en la app (pre-llenada del RCV).
  const [reg, setReg] = useState<ConciliacionCompra['sii'] | null>(null);
  const [accountId, setAccountId] = useState('');
  const [regFile, setRegFile] = useState<File | null>(null);

  const cuentaPorDefecto = accounts.find((a) => a.es_default)?.id ?? '';

  function openReg(sii: NonNullable<ConciliacionCompra['sii']>) {
    setReg(sii); setAccountId(cuentaPorDefecto); setRegFile(null); setError(null);
  }
  function saveReg() {
    if (!reg) return;
    const fd = new FormData();
    fd.set('razon_social', reg.razon_social ?? ''); fd.set('rut', reg.rut_proveedor ?? '');
    fd.set('folio', reg.folio ?? ''); fd.set('fecha', reg.fecha_docto ?? '');
    fd.set('neto', String(reg.monto_neto)); fd.set('iva', String(reg.monto_iva)); fd.set('total', String(reg.monto_total));
    fd.set('account_id', accountId);
    if (regFile) fd.set('file', regFile);
    start(async () => {
      const res = await registrarGastoGeneral(fd);
      if (res?.error) { setError(res.error); return; }
      setReg(null); router.refresh();
    });
  }
  function registrarTodas() {
    setError(null);
    start(async () => {
      const res = await registrarTodasGenerales(mes);
      if (res?.error) { setError(res.error); return; }
      setMsg(
        `Registradas ${res.count ?? 0} facturas. Revisa su clasificación en la pestaña Compras.` +
        (res.omitidas ? ` Se omitieron ${res.omitidas} que ya estaban registradas.` : ''),
      );
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
            onChange={(e) => e.target.value && router.push(url(e.target.value))}
            className="ml-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-900" />
        </div>
        <label className="rounded-xl bg-[#010101] hover:bg-[#1d65c5] text-white text-sm font-semibold px-4 py-2.5 cursor-pointer transition-colors">
          {pending ? 'Importando…' : '+ Subir CSV del SII'}
          <input type="file" accept=".csv,text/csv" className="hidden" disabled={pending}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }} />
        </label>
      </div>
      <p className="text-xs text-gray-400 -mt-2">
        Sube el <code>RCV_COMPRA_REGISTRO…csv</code> y el de ventas del mes (se detecta el tipo solo).
        Para conciliar las ventas <strong>folio a folio</strong> descarga el CSV de <strong>detalle</strong>, no el resumen.
      </p>
      {msg && <p className="text-sm text-green-600">{msg}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Veredicto del mes: la respuesta a "¿puedo declarar tranquilo?" */}
      <div className={`rounded-2xl border p-4 ${c.veredicto.cuadra ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className="flex items-start gap-3">
          <span className="text-2xl leading-none">{c.veredicto.cuadra ? '✅' : '⚠️'}</span>
          <div className="min-w-0">
            <p className={`text-sm font-bold ${c.veredicto.cuadra ? 'text-green-800' : 'text-amber-800'}`}>
              {c.veredicto.cuadra
                ? `Todo cuadra con el SII en ${label}`
                : `Hay ${c.veredicto.problemas.length} cosa(s) que revisar antes de declarar`}
            </p>
            <p className="text-xs text-gray-600 mt-0.5">
              Compras {c.veredicto.comprasOk}/{c.veredicto.comprasTotal} calzan
              {c.tieneDetalleVentas
                ? ` · Ventas ${c.veredicto.ventasOk}/${c.veredicto.ventasTotal} calzan`
                : ' · Ventas comparadas solo por total (sube el detalle para el folio a folio)'}
            </p>
            {!c.veredicto.cuadra && (
              <ul className="mt-2 flex flex-col gap-0.5">
                {c.veredicto.problemas.map((p, i) => (
                  <li key={i} className="text-xs text-amber-900">• {p}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Resumen crédito / débito */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <CompareCard title="Crédito (compras)" sii={c.creditoSii} app={c.creditoApp}
          hint={c.tieneRcvCompras ? 'IVA del RCV de compras vs tus facturas de gasto.' : 'Aún no importas el RCV de compras de este mes.'} />
        <CompareCard title="Débito (ventas)" sii={c.ventas.debitoSii} app={c.ventas.debitoApp}
          hint={c.tieneRcvVentas ? 'IVA del RCV de ventas vs tus facturas de venta.' : 'Aún no importas el RCV de ventas de este mes.'} />
      </div>

      {/* Semáforo resumen */}
      <div className="flex flex-wrap items-center gap-2">
        <Chip n={c.resumen.calza} label="Calzan" estado="calza" />
        <Chip n={c.resumen.faltaEnApp} label="Falta en tu app" estado="falta_en_app" />
        <Chip n={c.resumen.faltaEnSii} label="No está en el SII" estado="falta_en_sii" />
        <Chip n={c.resumen.montoDistinto} label="Monto distinto" estado="monto_distinto" />
        {c.resumen.faltaEnApp > 0 && (
          <button onClick={registrarTodas} disabled={pending}
            className="ml-auto text-xs rounded-lg bg-[#1d65c5] hover:bg-[#1450a0] text-white font-medium px-3 py-1.5 disabled:opacity-60">
            Registrar las {c.resumen.faltaEnApp} que faltan
          </button>
        )}
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
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {c.compras.map((row, i) => <CompraRow key={i} row={row} onRegister={openReg} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ventas — documento por documento cuando hay detalle */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ventas — SII vs tu app</p>
          {c.tieneRcvVentas && (
            <span className="text-xs text-gray-500">
              SII <strong className="text-gray-900">{clp(c.ventas.debitoSii)}</strong> ·
              app <strong className="text-gray-900">{clp(c.ventas.debitoApp)}</strong>
              <span className={`ml-2 px-2 py-0.5 rounded ${c.ventas.calza ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                {c.ventas.calza ? 'Calza' : 'Revisar'}
              </span>
            </span>
          )}
        </div>

        {!c.tieneRcvVentas ? (
          <p className="text-sm text-gray-400 text-center py-10">Sube el RCV de ventas del SII para conciliar el débito.</p>
        ) : !c.tieneDetalleVentas ? (
          <p className="text-sm text-gray-500 px-5 py-6">
            Subiste el <strong>resumen</strong> de ventas, que solo permite comparar totales.
            Descarga del SII el CSV de <strong>detalle de ventas</strong> del mes y súbelo aquí para ver
            exactamente qué factura falta.
          </p>
        ) : (
          <>
            <div className="px-5 py-2.5 flex flex-wrap items-center gap-2 border-b border-gray-50">
              <Chip n={c.resumenVentas.calza} label="Calzan" estado="calza" />
              <Chip n={c.resumenVentas.faltaEnApp} label="Falta en tu app" estado="falta_en_app" />
              <Chip n={c.resumenVentas.faltaEnSii} label="No está en el SII" estado="falta_en_sii" />
              <Chip n={c.resumenVentas.montoDistinto} label="Monto distinto" estado="monto_distinto" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-100">
                    <th className="text-left font-medium px-4 py-2">Estado</th>
                    <th className="text-left font-medium px-4 py-2">Cliente</th>
                    <th className="text-left font-medium px-4 py-2">Folio</th>
                    <th className="text-right font-medium px-4 py-2">IVA SII</th>
                    <th className="text-right font-medium px-4 py-2">IVA app</th>
                  </tr>
                </thead>
                <tbody>
                  {c.ventasDocs.map((row, i) => <VentaRow key={i} row={row} />)}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <p className="text-xs text-gray-400">
        🔴 <strong>Falta en tu app</strong>: el SII la tiene, regístrala. 🟠 <strong>No está en el SII</strong>: tú la tienes
        pero el SII no la cuenta — crédito que el SII pudo haber omitido, revísalo para no perderlo.
      </p>

      {/* Modal: registrar como gasto general */}
      {reg && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => !pending && setReg(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">Registrar factura de compra</h2>
              <button onClick={() => setReg(null)} className="text-gray-400 hover:text-gray-700 text-xl">×</button>
            </div>
            <div className="px-5 py-4 flex flex-col gap-3">
              <div className="bg-gray-50 rounded-xl p-3 text-sm">
                <p className="font-semibold text-gray-800">{reg.razon_social}</p>
                <p className="text-xs text-gray-500 mt-0.5">{reg.rut_proveedor} · folio {reg.folio} · {reg.fecha_docto}</p>
                <p className="text-xs text-gray-500 mt-1">Neto {clp(reg.monto_neto)} · IVA {clp(reg.monto_iva)} · Total {clp(reg.monto_total)}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">¿Qué tipo de factura es?</label>
                <select value={accountId} onChange={(e) => setAccountId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900">
                  <option value="">— Sin clasificar —</option>
                  {(['costo_giro', 'gasto_admin', 'activo_fijo'] as AccountGroup[]).map((g) => (
                    <optgroup key={g} label={ACCOUNT_GROUP_LABEL[g]}>
                      {accounts.filter((a) => a.grupo === g).map((a) => (
                        <option key={a.id} value={a.id}>{a.nombre}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Adjuntar imagen/PDF (opcional)</label>
                <input type="file" accept="image/*,application/pdf" onChange={(e) => setRegFile(e.target.files?.[0] ?? null)} className="text-xs text-gray-600" />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setReg(null)} className="rounded-lg border border-gray-200 text-gray-600 text-sm px-4 py-2 hover:bg-gray-50">Cancelar</button>
              <button onClick={saveReg} disabled={pending} className="rounded-lg bg-[#010101] hover:bg-[#1d65c5] text-white text-sm font-semibold px-4 py-2 disabled:opacity-60">{pending ? 'Guardando…' : 'Registrar'}</button>
            </div>
          </div>
        </div>
      )}
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

function VentaRow({ row }: { row: ConciliacionVenta }) {
  const meta = ESTADO_META[row.estado];
  const cliente = row.sii?.razon_social || row.app?.client_nombre || '—';
  const folio = row.sii?.folio || row.app?.folio || '—';
  return (
    <tr className={`border-b border-gray-50 ${meta.row}`}>
      <td className="px-4 py-2.5">
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
          <span className={`w-2 h-2 rounded-full ${meta.dot}`} /> {meta.label}
        </span>
      </td>
      <td className="px-4 py-2.5 text-gray-700">{cliente}</td>
      <td className="px-4 py-2.5 text-gray-500 tabular-nums">{folio}</td>
      <td className="px-4 py-2.5 text-right tabular-nums text-gray-900">{row.sii ? clp(row.sii.monto_iva) : '—'}</td>
      <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">{row.app ? clp(row.app.iva) : '—'}</td>
    </tr>
  );
}

function CompraRow({ row, onRegister }: { row: ConciliacionCompra; onRegister: (sii: NonNullable<ConciliacionCompra['sii']>) => void }) {
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
      <td className="px-4 py-2.5 text-right">
        {row.estado === 'falta_en_app' && row.sii && (
          <button onClick={() => onRegister(row.sii!)} className="text-xs text-[#1d65c5] hover:underline whitespace-nowrap">Registrar</button>
        )}
      </td>
    </tr>
  );
}
