'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { BalanceAnual, Honorario } from '@/lib/db/balance';
import { saveBalanceConfig, addHonorario, deleteHonorario } from '@/app/admin/balance/actions';

function clp(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
}
const MES_LABEL = (p: string) => {
  const [y, m] = p.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('es-CL', { month: 'short' });
};

export default function BalanceView({ balance, honorarios, anio }: { balance: BalanceAnual; honorarios: Honorario[]; anio: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const b = balance;

  // Saldos de apertura (editables)
  const [cfg, setCfg] = useState({
    capital_social: String(b.config.capital_social || ''),
    aportes_socio: String(b.config.aportes_socio || ''),
    perdida_acumulada_anterior: String(b.config.perdida_acumulada_anterior || ''),
    caja_inicial: String(b.config.caja_inicial || ''),
    notas: b.config.notas ?? '',
  });
  const [cfgSaved, setCfgSaved] = useState(false);
  const setC = (patch: Partial<typeof cfg>) => { setCfg((p) => ({ ...p, ...patch })); setCfgSaved(false); };

  function saveCfg() {
    const fd = new FormData();
    Object.entries(cfg).forEach(([k, v]) => fd.set(k, v));
    start(async () => { await saveBalanceConfig(anio, fd); setCfgSaved(true); router.refresh(); });
  }

  // Honorarios — alta
  const [showHon, setShowHon] = useState(false);
  const [hon, setHon] = useState({ fecha: new Date().toISOString().slice(0, 10), emisor: '', rut: '', folio: '', monto_bruto: '', retencion: '', glosa: '' });
  const [honErr, setHonErr] = useState<string | null>(null);
  const setH = (patch: Partial<typeof hon>) => setHon((p) => ({ ...p, ...patch }));

  function saveHon() {
    setHonErr(null);
    const fd = new FormData();
    Object.entries(hon).forEach(([k, v]) => fd.set(k, v));
    start(async () => {
      const res = await addHonorario(fd);
      if (res?.error) { setHonErr(res.error); return; }
      setShowHon(false); setHon({ fecha: new Date().toISOString().slice(0, 10), emisor: '', rut: '', folio: '', monto_bruto: '', retencion: '', glosa: '' });
      router.refresh();
    });
  }
  function delHon(id: string) { start(async () => { await deleteHonorario(id); router.refresh(); }); }

  const resultadoPositivo = b.resultadoEjercicio >= 0;
  const remanenteIva = b.ivaCredito - b.ivaDebito; // >0 = a favor

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      {/* Año */}
      <div className="flex items-center gap-2">
        <button onClick={() => router.push(`/admin/balance?anio=${anio - 1}`)} className="w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">←</button>
        <span className="text-sm font-bold text-gray-800 min-w-24 text-center">Ejercicio {anio}</span>
        <button onClick={() => router.push(`/admin/balance?anio=${anio + 1}`)} className="w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">→</button>
      </div>

      {/* Estado de resultado */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100"><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Resultado del ejercicio</p></div>
        <Row label="Ingresos por ventas del giro" code="4.1.01" value={b.ingresos} sign="+" color="text-[#1d65c5]" />
        <Row label="Costo de ventas / compras del giro" code="5.1.01" value={b.costos} sign="−" color="text-red-600" />
        <Row label="Gastos por honorarios" code="5.1.02" value={b.honorarios} sign="−" color="text-red-600" />
        {b.activoFijo > 0 && (
          <div className="flex items-center justify-between px-5 py-2 bg-blue-50/30">
            <span className="text-xs text-gray-500">Activo fijo (no es gasto, va a Activos) <span className="font-mono text-[10px] text-gray-400">[1.1.05]</span></span>
            <span className="text-xs text-gray-500 tabular-nums">{clp(b.activoFijo)}</span>
          </div>
        )}
        <div className={`flex items-center justify-between px-5 py-4 border-t-2 ${resultadoPositivo ? 'border-green-200 bg-green-50/40' : 'border-red-200 bg-red-50/40'}`}>
          <span className="text-sm font-bold text-gray-800">{resultadoPositivo ? 'Utilidad' : 'Pérdida'} del ejercicio {anio}</span>
          <span className={`text-lg font-bold ${resultadoPositivo ? 'text-green-700' : 'text-red-600'}`}>{resultadoPositivo ? '' : '−'}{clp(Math.abs(b.resultadoEjercicio))}</span>
        </div>
      </div>

      {/* IVA + PPM */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <MiniCard title="Situación IVA (acumulado)" rows={[
          ['IVA débito (ventas)', b.ivaDebito], ['IVA crédito (compras)', b.ivaCredito],
          [remanenteIva >= 0 ? 'Remanente a favor' : 'IVA por pagar', Math.abs(remanenteIva)],
        ]} />
        <MiniCard title="PPM y retenciones" rows={[
          ['PPM del año', b.ppm], ['Retención honorarios', b.retencionHonorarios],
        ]} />
      </div>

      {/* Saldos de apertura (editables, por confirmar) */}
      <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-amber-100 bg-amber-50/50">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Saldos de apertura — por confirmar con contador</p>
          <p className="text-[11px] text-amber-600/80 mt-0.5">Aportes y pérdida acumulada son saldos derivados; verifícalos con el F22 / cartola antes del cierre.</p>
        </div>
        <div className="p-5 grid grid-cols-2 gap-3">
          <Field label="Capital social (3.1.01)" value={cfg.capital_social} onChange={(v) => setC({ capital_social: v })} />
          <Field label="Aportes socio / cta cte (3.1.02)" value={cfg.aportes_socio} onChange={(v) => setC({ aportes_socio: v })} />
          <Field label="Pérdida acumulada anterior (3.1.03)" value={cfg.perdida_acumulada_anterior} onChange={(v) => setC({ perdida_acumulada_anterior: v })} />
          <Field label="Caja / banco inicial" value={cfg.caja_inicial} onChange={(v) => setC({ caja_inicial: v })} />
        </div>
        <div className="px-5 pb-4 flex items-center justify-between">
          {cfgSaved ? <span className="text-sm text-green-600">✓ Guardado</span> : <span />}
          <button onClick={saveCfg} disabled={pending} className="rounded-lg bg-[#010101] hover:bg-[#1d65c5] text-white text-sm font-semibold px-4 py-2 disabled:opacity-60 transition-colors">Guardar apertura</button>
        </div>
      </div>

      {/* Patrimonio */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100"><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Patrimonio al cierre (estimado)</p></div>
        <Row label="Capital social" value={b.config.capital_social} sign="+" color="text-gray-700" />
        <Row label="Aportes socio" value={b.config.aportes_socio} sign="+" color="text-gray-700" />
        <Row label="Pérdida acumulada anterior" value={b.config.perdida_acumulada_anterior} sign="−" color="text-red-600" />
        <Row label={`Resultado del ejercicio ${anio}`} value={Math.abs(b.resultadoEjercicio)} sign={resultadoPositivo ? '+' : '−'} color={resultadoPositivo ? 'text-green-700' : 'text-red-600'} />
        <div className="flex items-center justify-between px-5 py-4 border-t-2 border-gray-200 bg-gray-50/60">
          <span className="text-sm font-bold text-gray-800">Patrimonio final</span>
          <span className={`text-base font-bold ${b.patrimonioFinal >= 0 ? 'text-gray-900' : 'text-red-600'}`}>{clp(b.patrimonioFinal)}</span>
        </div>
      </div>

      {/* Honorarios */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Honorarios (BHE) {anio}</p>
          <button onClick={() => setShowHon(true)} className="text-xs text-[#1d65c5] hover:underline font-medium">+ Agregar boleta</button>
        </div>
        {honorarios.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Sin honorarios registrados este año.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {honorarios.map((h) => (
              <div key={h.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                <div className="min-w-0">
                  <span className="text-gray-700">{h.emisor || 'Honorario'}</span>
                  <span className="text-xs text-gray-400 ml-2">{h.fecha}{h.folio ? ` · #${h.folio}` : ''}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums text-gray-900">{clp(h.monto_bruto)}</span>
                  <span className="text-xs text-gray-400 tabular-nums">ret. {clp(h.retencion)}</span>
                  <button onClick={() => delHon(h.id)} className="text-xs text-red-500 hover:underline">×</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Desglose mensual */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100"><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Detalle por mes</p></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="text-left font-medium px-4 py-2">Mes</th>
                <th className="text-right font-medium px-4 py-2">Ventas</th>
                <th className="text-right font-medium px-4 py-2">Compras</th>
                <th className="text-right font-medium px-4 py-2">Honorarios</th>
                <th className="text-right font-medium px-4 py-2">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {b.meses.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-gray-400 py-8">Sin datos del RCV para este año. Súbelos en Conciliación SII.</td></tr>
              ) : b.meses.map((m) => (
                <tr key={m.periodo} className="border-b border-gray-50">
                  <td className="px-4 py-2 capitalize text-gray-700">{MES_LABEL(m.periodo)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-700">{clp(m.ventasNeto)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-700">{clp(m.comprasNeto)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-700">{clp(m.honorarios)}</td>
                  <td className={`px-4 py-2 text-right tabular-nums font-medium ${m.resultado >= 0 ? 'text-green-700' : 'text-red-600'}`}>{clp(m.resultado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Pre-balance derivado del RCV del SII (ingresos/costos/IVA), el F29 (PPM) y los honorarios cargados. Los saldos de
        apertura (capital, aportes, pérdida acumulada) son editables y deben confirmarse con el contador para el cierre oficial.
      </p>

      {/* Modal honorarios */}
      {showHon && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => !pending && setShowHon(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">Agregar boleta de honorarios</h2>
              <button onClick={() => setShowHon(false)} className="text-gray-400 hover:text-gray-700 text-xl">×</button>
            </div>
            <div className="px-5 py-4 grid grid-cols-2 gap-3">
              <Field label="Fecha" type="date" value={hon.fecha} onChange={(v) => setH({ fecha: v })} />
              <Field label="Emisor (profesional)" value={hon.emisor} onChange={(v) => setH({ emisor: v })} text />
              <Field label="RUT" value={hon.rut} onChange={(v) => setH({ rut: v })} text />
              <Field label="Folio / N°" value={hon.folio} onChange={(v) => setH({ folio: v })} text />
              <Field label="Monto bruto" value={hon.monto_bruto} onChange={(v) => setH({ monto_bruto: v })} />
              <Field label="Retención" value={hon.retencion} onChange={(v) => setH({ retencion: v })} />
              <div className="col-span-2"><Field label="Glosa" value={hon.glosa} onChange={(v) => setH({ glosa: v })} text /></div>
            </div>
            {honErr && <p className="px-5 text-sm text-red-600">{honErr}</p>}
            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setShowHon(false)} className="rounded-lg border border-gray-200 text-gray-600 text-sm px-4 py-2 hover:bg-gray-50">Cancelar</button>
              <button onClick={saveHon} disabled={pending} className="rounded-lg bg-[#010101] hover:bg-[#1d65c5] text-white text-sm font-semibold px-4 py-2 disabled:opacity-60">{pending ? 'Guardando…' : 'Agregar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, code, value, sign, color }: { label: string; code?: string; value: number; sign: string; color: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50">
      <span className="text-sm text-gray-600">{label}{code && <span className="ml-1 text-[10px] font-mono text-gray-400">[{code}]</span>}</span>
      <span className={`text-sm font-semibold tabular-nums ${color}`}>{sign}{clp(value)}</span>
    </div>
  );
}

function MiniCard({ title, rows }: { title: string; rows: Array<[string, number]> }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</p>
      {rows.map(([l, v]) => (
        <div key={l} className="flex items-center justify-between py-1 text-sm">
          <span className="text-gray-600">{l}</span><span className="tabular-nums text-gray-900">{clp(v)}</span>
        </div>
      ))}
    </div>
  );
}

function Field({ label, value, onChange, type, text }: { label: string; value: string; onChange: (v: string) => void; type?: string; text?: boolean }) {
  return (
    <div>
      <label className="text-xs text-gray-500 mb-1 block">{label}</label>
      <input type={type ?? 'text'} inputMode={text || type === 'date' ? undefined : 'numeric'} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 tabular-nums focus:border-[#389fe0] focus:ring-1 focus:ring-[#389fe0] outline-none" />
    </div>
  );
}
