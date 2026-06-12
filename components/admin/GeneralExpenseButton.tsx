'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createGeneralExpense } from '@/app/admin/gastos/actions';
import { GENERAL_EXPENSE_CATEGORIES } from '@/lib/db/expenses';

export default function GeneralExpenseButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [monto, setMonto] = useState('');
  const [categoria, setCategoria] = useState<string>(GENERAL_EXPENSE_CATEGORIES[0]);
  const [conIva, setConIva] = useState(true);
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [proveedor, setProveedor] = useState('');
  const [notas, setNotas] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  function reset() {
    setMonto(''); setCategoria(GENERAL_EXPENSE_CATEGORIES[0]); setConIva(true);
    setFecha(new Date().toISOString().slice(0, 10)); setProveedor(''); setNotas('');
    setFile(null); setError(null);
  }

  function submit() {
    setError(null);
    const fd = new FormData();
    fd.set('total', monto.replace(/[^\d]/g, ''));
    fd.set('categoria', categoria);
    fd.set('con_iva', String(conIva));
    fd.set('fecha', fecha);
    fd.set('proveedor', proveedor);
    fd.set('notas', notas);
    if (file) fd.set('file', file);
    start(async () => {
      const res = await createGeneralExpense(fd);
      if (res?.error) { setError(res.error); return; }
      reset();
      setOpen(false);
      router.refresh();
    });
  }

  const inputCls = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#389fe0]';

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
        + Gasto general
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 overflow-y-auto py-6 px-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Nuevo gasto general</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <div className="p-5 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Monto</label>
                  <input inputMode="numeric" className={inputCls} value={monto}
                    onChange={(e) => setMonto(e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Categoría</label>
                  <select className={inputCls} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                    {GENERAL_EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" checked={conIva} onChange={(e) => setConIva(e.target.checked)}
                  className="rounded border-gray-300 text-[#389fe0] focus:ring-[#389fe0]" />
                El monto incluye IVA
              </label>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Fecha</label>
                  <input type="date" className={inputCls} value={fecha} onChange={(e) => setFecha(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Proveedor (opcional)</label>
                  <input className={inputCls} value={proveedor} onChange={(e) => setProveedor(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Descripción (opcional)</label>
                <input className={inputCls} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej: arriendo oficina marzo" />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Boleta (opcional)</label>
                <input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="text-xs text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-xs" />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            <div className="flex gap-3 px-5 py-4 border-t border-gray-100">
              <button onClick={() => setOpen(false)} disabled={isPending}
                className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl py-2.5 text-sm transition-colors disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={submit} disabled={isPending}
                className="flex-1 bg-[#389fe0] hover:bg-[#1d65c5] text-white rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-50">
                {isPending ? 'Guardando…' : 'Registrar gasto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
