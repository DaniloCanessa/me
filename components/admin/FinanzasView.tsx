'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { FinanzasResumen, Monto } from '@/lib/db/finanzas';

function clp(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
}

export default function FinanzasView({
  resumen,
  mes,
  label,
}: {
  resumen: FinanzasResumen;
  mes: string;
  label: string;
}) {
  const router = useRouter();
  const [base, setBase] = useState<'neto' | 'iva'>('neto');
  const pick = (m: Monto) => (base === 'neto' ? m.neto : m.conIva);

  function shiftMonth(delta: number) {
    const [y, m] = mes.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    const nm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    router.push(`/admin/finanzas?mes=${nm}`);
  }

  const { ventas, gastosProyectos, gastosGenerales, resultado, generalesPorCategoria } = resumen;
  const result = pick(resultado);

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      {/* Controles: mes + base IVA */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={() => shiftMonth(-1)} className="w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">←</button>
          <span className="text-sm font-semibold text-gray-800 capitalize min-w-40 text-center">{label}</span>
          <button onClick={() => shiftMonth(1)} className="w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">→</button>
          <input
            type="month"
            value={mes}
            onChange={(e) => e.target.value && router.push(`/admin/finanzas?mes=${e.target.value}`)}
            className="ml-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-900"
          />
        </div>
        <div className="flex rounded-xl border border-gray-200 overflow-hidden text-xs">
          {(['neto', 'iva'] as const).map((b) => (
            <button key={b} onClick={() => setBase(b)}
              className={`px-3 py-1.5 font-medium transition-colors ${base === b ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              {b === 'neto' ? 'Neto' : 'Con IVA'}
            </button>
          ))}
        </div>
      </div>

      {/* Estado de resultados */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <Row label="Ventas (cobrado)" value={pick(ventas)} sign="+" color="text-[#1d65c5]" />
        <Row label="Gastos de proyectos" value={pick(gastosProyectos)} sign="−" color="text-red-600" />
        <Row label="Gastos generales" value={pick(gastosGenerales)} sign="−" color="text-red-600" />
        <div className={`flex items-center justify-between px-5 py-4 border-t-2 ${result >= 0 ? 'border-green-200 bg-green-50/40' : 'border-red-200 bg-red-50/40'}`}>
          <span className="text-sm font-bold text-gray-800">Resultado del mes</span>
          <span className={`text-lg font-bold ${result >= 0 ? 'text-green-700' : 'text-red-600'}`}>
            {result >= 0 ? '' : '−'}{clp(Math.abs(result))}
          </span>
        </div>
      </div>

      {/* Desglose gastos generales */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Gastos generales por categoría</p>
        </div>
        {generalesPorCategoria.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Sin gastos generales este mes.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {generalesPorCategoria.map((c) => (
              <div key={c.categoria} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-gray-700">{c.categoria}</span>
                <span className="text-sm font-medium text-gray-900 tabular-nums">{clp(base === 'neto' ? c.neto : c.conIva)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400">
        Base caja: las ventas son los pagos recibidos de clientes; los gastos, lo efectivamente registrado en el mes.
        Montos en {base === 'neto' ? 'neto (sin IVA)' : 'con IVA'}.
      </p>
    </div>
  );
}

function Row({ label, value, sign, color }: { label: string; value: number; sign: string; color: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${color}`}>{sign}{clp(value)}</span>
    </div>
  );
}
