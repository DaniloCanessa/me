'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { F29Result, F29Fuente } from '@/lib/db/f29';
import { saveF29Period } from '@/app/admin/finanzas/actions';

function clp(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
}

type Manual = {
  remanente_anterior: string; ppm_base: string; ppm_tasa: string; ppm_neto: string;
  retencion_honorarios: string; otros_impuestos: string; reajustes: string; multas: string;
  notas: string; revisado: boolean;
};

const numStr = (n: number) => (n ? String(n) : '');
const toNum = (s: string) => Math.round(parseFloat(s.replace(/[^\d.-]/g, '')) || 0);

export default function F29View({ f29, mes, label }: { f29: F29Result; mes: string; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [m, setM] = useState<Manual>({
    remanente_anterior: numStr(f29.manual.remanente_anterior),
    ppm_base: numStr(f29.manual.ppm_base),
    ppm_tasa: f29.manual.ppm_tasa ? String(f29.manual.ppm_tasa) : '',
    ppm_neto: numStr(f29.manual.ppm_neto),
    retencion_honorarios: numStr(f29.manual.retencion_honorarios),
    otros_impuestos: numStr(f29.manual.otros_impuestos),
    reajustes: numStr(f29.manual.reajustes),
    multas: numStr(f29.manual.multas),
    notas: f29.manual.notas ?? '',
    revisado: f29.manual.revisado,
  });
  const set = (patch: Partial<Manual>) => { setM((p) => ({ ...p, ...patch })); setSaved(false); };

  function shiftMonth(delta: number) {
    const [y, mm] = mes.split('-').map(Number);
    const d = new Date(y, mm - 1 + delta, 1);
    router.push(`/admin/finanzas?mes=${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  // PPM neto sugerido = base × tasa/100 (editable a mano).
  function onPpm(patch: Partial<Pick<Manual, 'ppm_base' | 'ppm_tasa'>>) {
    const next = { ...m, ...patch };
    const base = toNum(next.ppm_base), tasa = parseFloat(next.ppm_tasa.replace(',', '.')) || 0;
    set({ ...patch, ppm_neto: base && tasa ? String(Math.round(base * tasa / 100)) : m.ppm_neto });
  }

  // Recalcula determinación con el remanente anterior editado (display en vivo).
  const remAnterior = toNum(m.remanente_anterior);
  const creditoTotal = f29.credito.delMes + remAnterior;
  const ivaDeterminado = Math.max(0, f29.debito.iva - creditoTotal);
  const remSiguiente = Math.max(0, creditoTotal - f29.debito.iva);
  const totalAPagar = ivaDeterminado + toNum(m.ppm_neto) + toNum(m.retencion_honorarios)
    + toNum(m.otros_impuestos) + toNum(m.reajustes) + toNum(m.multas);

  function save() {
    setError(null);
    const fd = new FormData();
    fd.set('remanente_anterior', m.remanente_anterior); fd.set('ppm_base', m.ppm_base);
    fd.set('ppm_tasa', m.ppm_tasa); fd.set('ppm_neto', m.ppm_neto);
    fd.set('retencion_honorarios', m.retencion_honorarios); fd.set('otros_impuestos', m.otros_impuestos);
    fd.set('reajustes', m.reajustes); fd.set('multas', m.multas);
    fd.set('notas', m.notas); fd.set('revisado', String(m.revisado));
    start(async () => {
      const res = await saveF29Period(mes, fd);
      if (res?.error) { setError(res.error); return; }
      setSaved(true); router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      {/* Mes */}
      <div className="flex items-center gap-2">
        <button onClick={() => shiftMonth(-1)} className="w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">←</button>
        <span className="text-sm font-semibold text-gray-800 capitalize min-w-40 text-center">{label}</span>
        <button onClick={() => shiftMonth(1)} className="w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">→</button>
        <input type="month" value={mes}
          onChange={(e) => e.target.value && router.push(`/admin/finanzas?mes=${e.target.value}`)}
          className="ml-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-900" />
      </div>

      {/* A. Débito fiscal */}
      <Section title="Débito fiscal — ventas del mes" hint={f29.debito.fuente === 'rcv' ? 'Desde el RCV de ventas del SII importado.' : 'Desde las facturas de venta registradas (aún sin importar el RCV).'}>
        <CalcLine code="502" label="Ventas afectas" iva={f29.debito.iva} docs={f29.debito.docs} fuente={f29.debito.fuente} />
        <TotalRow code="538" label="Total débitos" value={f29.debito.iva} />
      </Section>

      {/* B. Crédito fiscal */}
      <Section title="Crédito fiscal — compras del mes" hint={f29.credito.fuente === 'rcv' ? 'Desde el RCV de compras del SII importado.' : 'Desde las facturas de la bandeja de gastos (aún sin importar el RCV).'}>
        <CalcLine code="520" label="Facturas de compra recibidas" iva={f29.credito.delMes} docs={f29.credito.docs} fuente={f29.credito.fuente} />
        <ManualRow code="504" label="Remanente crédito mes anterior"
          value={m.remanente_anterior} onChange={(v) => set({ remanente_anterior: v })}
          hint={!f29.manualExiste && f29.remanenteAnteriorSugerido > 0 ? `Sugerido del mes previo: ${clp(f29.remanenteAnteriorSugerido)}` : undefined} />
        <TotalRow code="537" label="Total créditos" value={creditoTotal} />
      </Section>

      {/* C. Determinación */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {ivaDeterminado > 0 ? (
          <div className="flex items-center justify-between px-5 py-4 bg-amber-50/50">
            <span className="text-sm font-bold text-gray-800">IVA determinado <Code>89</Code></span>
            <span className="text-base font-bold text-amber-700 tabular-nums">{clp(ivaDeterminado)}</span>
          </div>
        ) : (
          <div className="flex items-center justify-between px-5 py-4 bg-green-50/50">
            <span className="text-sm font-bold text-gray-800">Remanente para mes siguiente <Code>77</Code></span>
            <span className="text-base font-bold text-green-700 tabular-nums">{clp(remSiguiente)}</span>
          </div>
        )}
      </div>

      {/* D. PPM y otros (manual) */}
      <Section title="PPM, retenciones y otros" hint="Completa estos renglones al declarar para corroborar con el SII.">
        <div className="px-5 py-3 grid grid-cols-3 gap-3 border-b border-gray-50">
          <FieldNum label="Base PPM" code="563" value={m.ppm_base} onChange={(v) => onPpm({ ppm_base: v })} />
          <FieldNum label="Tasa %" code="115" value={m.ppm_tasa} onChange={(v) => onPpm({ ppm_tasa: v })} decimal />
          <FieldNum label="PPM neto" code="062" value={m.ppm_neto} onChange={(v) => set({ ppm_neto: v })} />
        </div>
        <ManualRow code="151" label="Retención honorarios (2ª cat.)" value={m.retencion_honorarios} onChange={(v) => set({ retencion_honorarios: v })} />
        <ManualRow code="—" label="Otros impuestos / débitos" value={m.otros_impuestos} onChange={(v) => set({ otros_impuestos: v })} />
        <ManualRow code="92" label="Reajustes (fuera de plazo)" value={m.reajustes} onChange={(v) => set({ reajustes: v })} />
        <ManualRow code="93" label="Multas (fuera de plazo)" value={m.multas} onChange={(v) => set({ multas: v })} />
      </Section>

      {/* Total a pagar */}
      <div className="bg-white rounded-2xl border-2 border-[#1d65c5]/30 shadow-sm flex items-center justify-between px-5 py-4">
        <span className="text-sm font-bold text-gray-900">Total a pagar <Code>91</Code></span>
        <span className="text-xl font-bold text-[#1d65c5] tabular-nums">{clp(totalAPagar)}</span>
      </div>

      {/* Nota + revisado + guardar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
        <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
          placeholder="Nota del período (opcional)" value={m.notas} onChange={(e) => set({ notas: e.target.value })} />
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={m.revisado} onChange={(e) => set({ revisado: e.target.checked })}
            className="rounded border-gray-300 text-[#389fe0] focus:ring-[#389fe0]" />
          Cuadrado con el SII
        </label>
        <div className="flex items-center justify-between">
          {error ? <p className="text-sm text-red-600">{error}</p>
            : saved ? <p className="text-sm text-green-600">✓ Guardado</p> : <span />}
          <button onClick={save} disabled={pending}
            className="rounded-lg bg-[#010101] hover:bg-[#1d65c5] text-white text-sm font-semibold px-4 py-2 disabled:opacity-60 transition-colors">
            {pending ? 'Guardando…' : 'Guardar período'}
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Base devengada: el IVA se imputa por la fecha del documento (no del pago). Los renglones con código gris
        son calculados por el sistema; los editables los completas al declarar. Independiente de la vista Caja.
      </p>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <span className="ml-1 text-[10px] font-mono text-gray-400 align-middle">[{children}]</span>;
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
        {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function CalcLine({ code, label, iva, docs, fuente }: { code: string; label: string; iva: number; docs: number; fuente: F29Fuente }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50">
      <span className="text-sm text-gray-600">
        {label} <Code>{code}</Code>
        {docs > 0 && <span className="text-xs text-gray-400 ml-1">· {docs} doc.</span>}
        <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${fuente === 'rcv' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
          {fuente === 'rcv' ? 'RCV SII' : 'app'}
        </span>
      </span>
      <span className="text-sm font-medium text-gray-900 tabular-nums">{clp(iva)}</span>
    </div>
  );
}

function TotalRow({ code, label, value }: { code: string; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 bg-gray-50/60">
      <span className="text-sm font-semibold text-gray-700">{label} <Code>{code}</Code></span>
      <span className="text-sm font-bold text-gray-900 tabular-nums">{clp(value)}</span>
    </div>
  );
}

function ManualRow({ code, label, value, onChange, hint }: { code: string; label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-2.5 border-b border-gray-50 gap-3">
      <div className="min-w-0">
        <span className="text-sm text-gray-600">{label} <Code>{code}</Code></span>
        {hint && <p className="text-[11px] text-[#1d65c5]/70">{hint}</p>}
      </div>
      <input inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value)} placeholder="0"
        className="w-32 text-right rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-900 tabular-nums focus:border-[#389fe0] focus:ring-1 focus:ring-[#389fe0] outline-none" />
    </div>
  );
}

function FieldNum({ label, code, value, onChange, decimal }: { label: string; code: string; value: string; onChange: (v: string) => void; decimal?: boolean }) {
  return (
    <div>
      <label className="text-xs text-gray-500 mb-1 block">{label} <Code>{code}</Code></label>
      <input inputMode={decimal ? 'decimal' : 'numeric'} value={value} onChange={(e) => onChange(e.target.value)} placeholder="0"
        className="w-full text-right rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-900 tabular-nums focus:border-[#389fe0] focus:ring-1 focus:ring-[#389fe0] outline-none" />
    </div>
  );
}
