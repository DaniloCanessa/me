'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { SalesInvoiceWithPago, EstadoPago, CondicionPago } from '@/lib/db/sales';
import { CONDICION_LABEL } from '@/lib/db/sales';
import {
  addSalesPayment, deleteSalesPayment, updateCompromisoPago, setCobranzaPausada,
} from '@/app/admin/facturas/actions';

const clp = (n: number | null | undefined) =>
  n == null ? '—' : new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

const inputCls = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-[#389fe0] focus:ring-1 focus:ring-[#389fe0] outline-none';

const ESTADO: Record<EstadoPago, { label: string; cls: string; bar: string }> = {
  pagada:     { label: 'Pagada',     cls: 'bg-green-50 text-green-700',   bar: 'bg-green-500' },
  parcial:    { label: 'Abonada',    cls: 'bg-[#eaf4fb] text-[#1d65c5]',  bar: 'bg-[#389fe0]' },
  por_vencer: { label: 'Por vencer', cls: 'bg-gray-100 text-gray-600',    bar: 'bg-gray-300' },
  vencida:    { label: 'Vencida',    cls: 'bg-red-50 text-red-700',       bar: 'bg-red-500' },
};

const CONDICIONES: CondicionPago[] = ['contado', '15', '30', '60', '90', 'manual'];

function textoPlazo(inv: SalesInvoiceWithPago): string {
  if (!inv.fecha_compromiso) return 'Sin compromiso de pago';
  if (inv.estadoPago === 'pagada') return `Pagada · vencía el ${inv.fecha_compromiso}`;
  if (inv.diasVencido > 0) return `Vencida hace ${inv.diasVencido} ${inv.diasVencido === 1 ? 'día' : 'días'} (${inv.fecha_compromiso})`;
  if (inv.diasVencido === 0) return `Vence hoy (${inv.fecha_compromiso})`;
  return `Vence en ${Math.abs(inv.diasVencido)} ${Math.abs(inv.diasVencido) === 1 ? 'día' : 'días'} (${inv.fecha_compromiso})`;
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'red' | 'blue' }) {
  return (
    <div className={`rounded-2xl border p-4 ${tone === 'red' ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100 shadow-sm'}`}>
      <p className="text-[11px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`text-2xl font-bold tabular-nums mt-1 ${tone === 'red' ? 'text-red-700' : 'text-[#1d65c5]'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function CobranzaTab({ invoices }: { invoices: SalesInvoiceWithPago[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [expandida, setExpandida] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'abiertas' | 'vencidas' | 'todas'>('abiertas');

  // Formulario de abono (una factura a la vez)
  const [pago, setPago] = useState({ monto: '', fecha: new Date().toISOString().slice(0, 10), metodo: 'transferencia', referencia: '' });

  const abiertas = useMemo(
    () => invoices.filter((i) => i.estado === 'emitida' && i.saldo > 1), [invoices],
  );
  const vencidas = useMemo(() => abiertas.filter((i) => i.estadoPago === 'vencida'), [abiertas]);

  const visibles = useMemo(() => {
    const base = filtro === 'todas' ? invoices.filter((i) => i.estado === 'emitida')
      : filtro === 'vencidas' ? vencidas : abiertas;
    // Lo más atrasado primero; lo que no vence aún, por fecha de compromiso.
    return [...base].sort((a, b) => b.diasVencido - a.diasVencido);
  }, [filtro, invoices, abiertas, vencidas]);

  const porCobrar = abiertas.reduce((s, i) => s + i.saldo, 0);
  const totalVencido = vencidas.reduce((s, i) => s + i.saldo, 0);
  const masAtrasada = vencidas.length ? Math.max(...vencidas.map((i) => i.diasVencido)) : 0;

  function act(fn: () => Promise<{ error?: string } | void>) {
    setError(null);
    start(async () => {
      const r = await fn();
      if (r && 'error' in r && r.error) setError(r.error);
      else router.refresh();
    });
  }

  function guardarPago(invoiceId: string) {
    const fd = new FormData();
    fd.set('monto_clp', pago.monto); fd.set('fecha', pago.fecha);
    fd.set('metodo', pago.metodo); fd.set('referencia', pago.referencia);
    act(async () => {
      const r = await addSalesPayment(invoiceId, fd);
      if (!r?.error) setPago({ monto: '', fecha: new Date().toISOString().slice(0, 10), metodo: 'transferencia', referencia: '' });
      return r;
    });
  }

  function guardarCompromiso(invoiceId: string, condicion: CondicionPago, manual: string) {
    const fd = new FormData();
    fd.set('condicion_pago', condicion);
    fd.set('fecha_compromiso', manual);
    act(() => updateCompromisoPago(invoiceId, fd));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile label="Por cobrar" value={clp(porCobrar)} sub={`${abiertas.length} ${abiertas.length === 1 ? 'factura abierta' : 'facturas abiertas'}`} />
        <Tile label="Vencido" value={clp(totalVencido)} sub={`${vencidas.length} ${vencidas.length === 1 ? 'factura' : 'facturas'}`} tone={vencidas.length ? 'red' : undefined} />
        <Tile label="Mayor atraso" value={masAtrasada ? `${masAtrasada} d` : '—'} sub={masAtrasada ? 'días de la más antigua' : 'nada vencido'} />
        <Tile label="Cobrado" value={clp(invoices.reduce((s, i) => s + i.pagado, 0))} sub="acumulado histórico" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {([['abiertas', `Abiertas (${abiertas.length})`], ['vencidas', `Vencidas (${vencidas.length})`], ['todas', 'Todas']] as const).map(([k, label]) => (
            <button key={k} onClick={() => setFiltro(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filtro === k ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400">
          El aviso por correo sale 3 días antes del compromiso, el día del vencimiento y luego cada 7 días.
        </p>
      </div>

      {error && <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-sm text-red-700">{error}</div>}

      {visibles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-12 text-center text-sm text-gray-400">
          {filtro === 'vencidas' ? 'Nada vencido. 👌' : 'No hay facturas por cobrar.'}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {visibles.map((inv) => {
            const est = ESTADO[inv.estadoPago];
            const abierta = expandida === inv.id;
            return (
              <div key={inv.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900">{inv.client_nombre || 'Sin cliente'}</span>
                        <span className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded font-medium ${est.cls}`}>{est.label}</span>
                        {inv.cobranza_pausada && (
                          <span className="text-[10px] uppercase tracking-wide bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded" title="No se envían avisos de esta factura">
                            Aviso pausado
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Factura {inv.folio ?? 's/folio'} · {inv.fecha_emision}
                        {inv.project_name ? ` · ${inv.project_name}` : ''}
                      </p>
                      <p className={`text-xs mt-0.5 ${inv.diasVencido > 0 && inv.saldo > 1 ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                        {textoPlazo(inv)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-gray-900 tabular-nums">{clp(inv.saldo)}</p>
                      <p className="text-xs text-gray-400 tabular-nums">de {clp(inv.total_clp)}</p>
                    </div>
                  </div>

                  {/* Progreso del pago */}
                  <div className="mt-2.5 flex items-center gap-3">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${est.bar}`} style={{ width: `${inv.pctPagado}%` }} />
                    </div>
                    <span className="text-xs font-medium text-gray-500 tabular-nums w-20 text-right">
                      {inv.pctPagado}% pagado
                    </span>
                    <button onClick={() => setExpandida(abierta ? null : inv.id)}
                      className="text-xs text-[#1d65c5] hover:underline shrink-0">
                      {abierta ? 'Cerrar' : 'Gestionar'}
                    </button>
                  </div>
                </div>

                {abierta && (
                  <div className="border-t border-gray-100 px-4 py-4 flex flex-col gap-4 bg-gray-50/50 rounded-b-2xl">
                    {/* Compromiso de pago */}
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-2">Compromiso de pago</p>
                      <div className="flex flex-wrap items-end gap-2">
                        <div>
                          <label className="text-[11px] text-gray-500 mb-1 block">Condición</label>
                          <select
                            className={inputCls + ' w-auto'}
                            defaultValue={inv.condicion_pago}
                            onChange={(e) => guardarCompromiso(inv.id, e.target.value as CondicionPago, inv.fecha_compromiso ?? '')}>
                            {CONDICIONES.map((c) => <option key={c} value={c}>{CONDICION_LABEL[c]}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] text-gray-500 mb-1 block">Vence el</label>
                          <input type="date" className={inputCls + ' w-auto'}
                            defaultValue={inv.fecha_compromiso ?? ''}
                            onChange={(e) => guardarCompromiso(inv.id, 'manual', e.target.value)} />
                        </div>
                        <button
                          onClick={() => act(() => setCobranzaPausada(inv.id, !inv.cobranza_pausada))}
                          disabled={pending}
                          className="rounded-lg border border-gray-200 bg-white text-gray-600 text-xs px-3 py-2 hover:bg-gray-50">
                          {inv.cobranza_pausada ? 'Reactivar avisos' : 'Pausar avisos'}
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1.5">
                        Los plazos en días se cuentan desde la emisión ({inv.fecha_emision}).
                      </p>
                    </div>

                    {/* Registrar abono */}
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-2">
                        Registrar pago {inv.project_name && <span className="font-normal text-gray-400">— entra también a la cuenta corriente de {inv.project_name}</span>}
                      </p>
                      <div className="flex flex-wrap items-end gap-2">
                        <div>
                          <label className="text-[11px] text-gray-500 mb-1 block">Monto</label>
                          <input inputMode="numeric" className={inputCls + ' w-36'} value={pago.monto}
                            placeholder={String(inv.saldo)}
                            onChange={(e) => setPago((p) => ({ ...p, monto: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-[11px] text-gray-500 mb-1 block">Fecha</label>
                          <input type="date" className={inputCls + ' w-auto'} value={pago.fecha}
                            onChange={(e) => setPago((p) => ({ ...p, fecha: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-[11px] text-gray-500 mb-1 block">Medio</label>
                          <select className={inputCls + ' w-auto'} value={pago.metodo}
                            onChange={(e) => setPago((p) => ({ ...p, metodo: e.target.value }))}>
                            <option value="transferencia">Transferencia</option>
                            <option value="cheque">Cheque</option>
                            <option value="efectivo">Efectivo</option>
                            <option value="credito">Crédito</option>
                            <option value="otro">Otro</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] text-gray-500 mb-1 block">Referencia</label>
                          <input className={inputCls + ' w-40'} value={pago.referencia}
                            placeholder="N° operación"
                            onChange={(e) => setPago((p) => ({ ...p, referencia: e.target.value }))} />
                        </div>
                        <button onClick={() => guardarPago(inv.id)} disabled={pending || !pago.monto}
                          className="rounded-lg bg-[#010101] hover:bg-[#1d65c5] text-white text-xs font-semibold px-4 py-2 disabled:opacity-60 transition-colors">
                          {pending ? 'Guardando…' : 'Registrar pago'}
                        </button>
                        {inv.saldo > 1 && (
                          <button onClick={() => setPago((p) => ({ ...p, monto: String(inv.saldo) }))}
                            className="text-xs text-[#1d65c5] hover:underline pb-2">
                            Pagó el saldo completo
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Pagos registrados */}
                    {inv.pagos.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-2">Pagos recibidos</p>
                        <div className="flex flex-col gap-1">
                          {inv.pagos.map((p) => (
                            <div key={p.id} className="flex items-center justify-between gap-3 text-xs bg-white rounded-lg border border-gray-100 px-3 py-2">
                              <span className="text-gray-500">
                                {p.fecha} · {p.metodo}{p.referencia ? ` · ${p.referencia}` : ''}
                              </span>
                              <span className="flex items-center gap-3">
                                <span className="font-semibold text-gray-900 tabular-nums">{clp(p.monto_clp)}</span>
                                <button onClick={() => act(() => deleteSalesPayment(p.id))}
                                  className="text-red-500 hover:underline">Eliminar</button>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
