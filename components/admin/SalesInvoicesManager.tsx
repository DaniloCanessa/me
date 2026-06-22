'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { SalesInvoice } from '@/lib/db/sales';
import {
  createSalesInvoice, updateSalesInvoice, deleteSalesInvoice,
  setSalesInvoiceEstado, prefillSalesInvoice,
} from '@/app/admin/facturas-venta/actions';

type Row = SalesInvoice & { signedUrl: string | null };
type ProjectOpt = { id: string; nombre: string; client_name: string };

const IVA = 1.19;
const TIPOS: Array<{ value: string; label: string }> = [
  { value: 'factura', label: 'Factura' },
  { value: 'boleta', label: 'Boleta' },
  { value: 'nota_credito', label: 'Nota de crédito' },
  { value: 'nota_debito', label: 'Nota de débito' },
];

function clp(n: number | null) {
  if (n == null) return '—';
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
}
function isPdf(path: string | null | undefined) {
  return !!path && path.toLowerCase().endsWith('.pdf');
}

type Draft = {
  project_id: string; client_id: string; client_nombre: string; client_rut: string;
  tipo: string; folio: string; fecha_emision: string;
  neto_clp: string; iva_clp: string; total_clp: string; notas: string;
};

const emptyDraft = (): Draft => ({
  project_id: '', client_id: '', client_nombre: '', client_rut: '',
  tipo: 'factura', folio: '', fecha_emision: new Date().toISOString().slice(0, 10),
  neto_clp: '', iva_clp: '', total_clp: '', notas: '',
});

function draftFrom(r: Row): Draft {
  return {
    project_id: r.project_id ?? '', client_id: r.client_id ?? '',
    client_nombre: r.client_nombre ?? '', client_rut: r.client_rut ?? '',
    tipo: r.tipo, folio: r.folio ?? '', fecha_emision: r.fecha_emision,
    neto_clp: r.neto_clp ? String(r.neto_clp) : '',
    iva_clp: r.iva_clp ? String(r.iva_clp) : '',
    total_clp: r.total_clp ? String(r.total_clp) : '',
    notas: r.notas ?? '',
  };
}

const inputCls = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-[#389fe0] focus:ring-1 focus:ring-[#389fe0] outline-none';

export default function SalesInvoicesManager({ invoices, projects }: { invoices: Row[]; projects: ProjectOpt[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [d, setD] = useState<Draft>(emptyDraft());
  const [ocrJson, setOcrJson] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrNote, setOcrNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const set = (patch: Partial<Draft>) => setD((prev) => ({ ...prev, ...patch }));

  function startNew() {
    setEditId(null); setD(emptyDraft()); setOcrJson(null); setFile(null);
    setOcrNote(null); setError(null); setOpen(true);
  }
  function startEdit(r: Row) {
    setEditId(r.id); setD(draftFrom(r)); setOcrJson(null); setFile(null);
    setOcrNote(null); setError(null); setOpen(true);
  }

  // Al elegir proyecto: trae cliente (snapshot) y monto sugerido del proyecto.
  async function onPickProject(projectId: string) {
    set({ project_id: projectId });
    if (!projectId) return;
    const pre = await prefillSalesInvoice(projectId);
    if (pre) {
      set({
        client_id: pre.client_id ?? '', client_nombre: pre.client_nombre ?? '',
        client_rut: pre.client_rut ?? '',
        // Solo sugiere el monto si aún no se ingresó nada.
        ...(d.total_clp ? {} : {
          neto_clp: pre.neto_clp ? String(pre.neto_clp) : '',
          iva_clp: pre.iva_clp ? String(pre.iva_clp) : '',
          total_clp: pre.total_clp ? String(pre.total_clp) : '',
        }),
      });
    }
  }

  // Coherencia neto/iva/total: editar uno recalcula los otros (IVA 19%).
  function onTotal(v: string) {
    const total = parseFloat(v.replace(/[^\d]/g, '')) || 0;
    const neto = Math.round(total / IVA);
    set({ total_clp: v, neto_clp: total ? String(neto) : '', iva_clp: total ? String(total - neto) : '' });
  }
  function onNeto(v: string) {
    const neto = parseFloat(v.replace(/[^\d]/g, '')) || 0;
    const iva = Math.round(neto * 0.19);
    set({ neto_clp: v, iva_clp: neto ? String(iva) : '', total_clp: neto ? String(neto + iva) : '' });
  }

  async function runOcr() {
    if (!file) return;
    setOcrLoading(true); setOcrNote(null); setError(null);
    try {
      const fd = new FormData(); fd.set('file', file);
      const res = await fetch('/api/parse-receipt', { method: 'POST', body: fd });
      const json = await res.json();
      if (!json.ok) { setError(json.message || 'No se pudo leer el documento'); return; }
      const x = json.data as { folio?: string; fecha?: string; neto?: number; iva?: number; total?: number; incluyeIva?: boolean };
      const patch: Partial<Draft> = {};
      if (x.folio) patch.folio = String(x.folio);
      if (x.fecha) patch.fecha_emision = x.fecha;
      // El OCR puede traer neto+iva, o solo total. Completamos con coherencia 19%.
      if (x.neto != null && x.iva != null) {
        patch.neto_clp = String(x.neto); patch.iva_clp = String(x.iva);
        patch.total_clp = String(x.total ?? x.neto + x.iva);
      } else if (x.total != null) {
        const total = x.incluyeIva === false ? Math.round(x.total * IVA) : x.total;
        const neto = Math.round(total / IVA);
        patch.total_clp = String(total); patch.neto_clp = String(neto); patch.iva_clp = String(total - neto);
      }
      setD((prev) => ({ ...prev, ...patch }));
      setOcrJson(JSON.stringify(json.data));
      setOcrNote(json.mock ? 'OCR en modo demo (sin API key): datos de ejemplo.' : 'Datos del documento extraídos. Revisa el cliente.');
    } catch {
      setError('Error al procesar el documento');
    } finally {
      setOcrLoading(false);
    }
  }

  function buildFormData(): FormData {
    const fd = new FormData();
    fd.set('project_id', d.project_id); fd.set('client_id', d.client_id);
    fd.set('client_nombre', d.client_nombre); fd.set('client_rut', d.client_rut);
    fd.set('tipo', d.tipo); fd.set('folio', d.folio); fd.set('fecha_emision', d.fecha_emision);
    fd.set('neto_clp', d.neto_clp); fd.set('iva_clp', d.iva_clp); fd.set('total_clp', d.total_clp);
    fd.set('notas', d.notas);
    if (file) fd.set('file', file);
    if (ocrJson) fd.set('ocr_json', ocrJson);
    return fd;
  }

  function save() {
    setError(null);
    start(async () => {
      const res = editId
        ? await updateSalesInvoice(editId, buildFormData())
        : await createSalesInvoice(buildFormData());
      if (res?.error) { setError(res.error); return; }
      setOpen(false); router.refresh();
    });
  }

  function act(fn: () => Promise<{ error?: string } | void>) {
    start(async () => { const r = await fn(); if (r && 'error' in r && r.error) setError(r.error); else router.refresh(); });
  }

  const emitidas = invoices.filter((i) => i.estado === 'emitida');
  const totalDebito = emitidas.reduce((s, i) => s + (i.iva_clp || 0), 0);

  return (
    <div className="flex flex-col gap-4 max-w-4xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-gray-500">
          {emitidas.length} emitida(s) · IVA débito acumulado <span className="font-semibold text-[#1d65c5]">{clp(totalDebito)}</span>
        </div>
        <button onClick={startNew}
          className="rounded-xl bg-[#010101] hover:bg-[#1d65c5] text-white text-sm font-semibold px-4 py-2.5 transition-colors">
          + Registrar factura
        </button>
      </div>

      {invoices.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-12 text-center text-sm text-gray-400">
          Aún no hay facturas de venta registradas.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {invoices.map((inv) => (
            <div key={inv.id}
              className={`bg-white rounded-2xl border shadow-sm px-4 py-3 flex items-center justify-between gap-3 flex-wrap ${inv.estado === 'anulada' ? 'border-gray-100 opacity-60' : 'border-gray-100'}`}>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">{inv.client_nombre || 'Sin cliente'}</span>
                  {inv.estado === 'anulada' && <span className="text-[10px] uppercase tracking-wide bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Anulada</span>}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {TIPOS.find((t) => t.value === inv.tipo)?.label ?? inv.tipo}
                  {inv.folio ? ` N° ${inv.folio}` : ''} · {inv.fecha_emision}
                  {inv.project_name ? ` · ${inv.project_name}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900 tabular-nums">{clp(inv.total_clp)}</p>
                  <p className="text-xs text-gray-400 tabular-nums">IVA {clp(inv.iva_clp)}</p>
                </div>
                {inv.signedUrl && (
                  <a href={inv.signedUrl} target="_blank" rel="noopener noreferrer" title="Ver documento"
                    className="text-gray-400 hover:text-[#1d65c5] text-lg">{isPdf(inv.image_path) ? '📄' : '📎'}</a>
                )}
                <button onClick={() => startEdit(inv)} className="text-xs text-[#1d65c5] hover:underline">Editar</button>
                {inv.estado === 'emitida'
                  ? <button onClick={() => act(() => setSalesInvoiceEstado(inv.id, 'anulada'))} className="text-xs text-amber-600 hover:underline">Anular</button>
                  : <button onClick={() => act(() => setSalesInvoiceEstado(inv.id, 'emitida'))} className="text-xs text-green-600 hover:underline">Reactivar</button>}
                <button onClick={() => act(() => deleteSalesInvoice(inv.id))} className="text-xs text-red-500 hover:underline">Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de registro / edición */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start sm:items-center justify-center p-4 overflow-y-auto"
          onClick={() => !pending && setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-8" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">{editId ? 'Editar factura' : 'Registrar factura de venta'}</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
            </div>

            <div className="px-5 py-4 flex flex-col gap-3">
              {/* Documento + OCR (solo al registrar) */}
              {!editId && (
                <div className="bg-[#389fe0]/5 rounded-xl p-3 flex flex-col gap-2">
                  <label className="text-xs text-gray-500">Documento del SII (PDF o imagen) — opcional</label>
                  <input type="file" accept="image/*,application/pdf"
                    onChange={(e) => { setFile(e.target.files?.[0] ?? null); setOcrNote(null); }}
                    className="text-xs text-gray-600" />
                  {file && (
                    <button type="button" onClick={runOcr} disabled={ocrLoading}
                      className="self-start rounded-lg bg-[#1d65c5] text-white text-xs font-medium px-3 py-1.5 disabled:opacity-60">
                      {ocrLoading ? 'Leyendo…' : 'Procesar OCR'}
                    </button>
                  )}
                  {ocrNote && <p className="text-xs text-[#1d65c5]">{ocrNote}</p>}
                </div>
              )}

              {/* Proyecto (prellenado) */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Proyecto (prellena cliente y monto) — opcional</label>
                <select className={inputCls} value={d.project_id} onChange={(e) => onPickProject(e.target.value)}>
                  <option value="">— Sin proyecto —</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.nombre} · {p.client_name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Cliente</label>
                  <input className={inputCls} value={d.client_nombre} onChange={(e) => set({ client_nombre: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">RUT cliente</label>
                  <input className={inputCls} value={d.client_rut} onChange={(e) => set({ client_rut: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Tipo</label>
                  <select className={inputCls} value={d.tipo} onChange={(e) => set({ tipo: e.target.value })}>
                    {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Folio</label>
                  <input className={inputCls} value={d.folio} onChange={(e) => set({ folio: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Fecha emisión</label>
                  <input type="date" className={inputCls} value={d.fecha_emision} onChange={(e) => set({ fecha_emision: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Neto</label>
                  <input inputMode="numeric" className={inputCls} value={d.neto_clp} onChange={(e) => onNeto(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">IVA (19%)</label>
                  <input inputMode="numeric" className={inputCls} value={d.iva_clp} onChange={(e) => set({ iva_clp: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Total</label>
                  <input inputMode="numeric" className={inputCls} value={d.total_clp} onChange={(e) => onTotal(e.target.value)} />
                </div>
              </div>
              <p className="text-[11px] text-gray-400 -mt-1">Editar el total recalcula neto/IVA al 19%, y viceversa. Ajusta a mano si el documento difiere.</p>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Nota</label>
                <input className={inputCls} value={d.notas} onChange={(e) => set({ notas: e.target.value })} />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} disabled={pending}
                className="rounded-lg border border-gray-200 text-gray-600 text-sm px-4 py-2 hover:bg-gray-50">Cancelar</button>
              <button onClick={save} disabled={pending}
                className="rounded-lg bg-[#010101] hover:bg-[#1d65c5] text-white text-sm font-semibold px-4 py-2 disabled:opacity-60 transition-colors">
                {pending ? 'Guardando…' : editId ? 'Guardar cambios' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
