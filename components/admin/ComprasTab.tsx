'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ExpenseCapture } from '@/lib/db/expenses';
import type { PurchaseAccount, AccountGroup } from '@/lib/db/accounts';
import { ACCOUNT_GROUP_LABEL } from '@/lib/db/accounts';
import {
  importDteXmlFiles, createPurchaseInvoice, updatePurchaseInvoice,
  classifyPurchaseInvoice, deletePurchaseInvoice,
  type ImportDteResult,
} from '@/app/admin/facturas/actions';

type Row = ExpenseCapture & { docUrl: string | null };

const IVA = 1.19;

const TIPOS = [
  { value: 'factura', label: 'Factura' },
  { value: 'boleta', label: 'Boleta' },
  { value: 'nota_credito', label: 'Nota de crédito' },
  { value: 'nota_debito', label: 'Nota de débito' },
];

const clp = (n: number | null | undefined) =>
  n == null ? '—' : new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

const inputCls = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-[#389fe0] focus:ring-1 focus:ring-[#389fe0] outline-none';

const GRUPO_COLOR: Record<AccountGroup, string> = {
  costo_giro:  'bg-[#eaf4fb] text-[#1d65c5]',
  gasto_admin: 'bg-amber-50 text-amber-700',
  activo_fijo: 'bg-violet-50 text-violet-700',
};

const ORIGEN_BADGE: Record<string, { label: string; title: string }> = {
  xml:    { label: 'XML', title: 'Leída del XML del DTE — datos exactos del SII' },
  foto:   { label: 'OCR', title: 'Leída de una imagen o PDF con OCR' },
  rcv:    { label: 'RCV', title: 'Dada de alta desde la conciliación con el SII' },
  manual: { label: 'Manual', title: 'Ingresada a mano' },
};

// El neto de una factura, tomando el declarado o derivándolo del total.
function netoDe(r: ExpenseCapture): number {
  if (r.neto != null) return Number(r.neto);
  const t = Number(r.total) || 0;
  return r.con_iva ? Math.round(t / IVA) : t;
}
function ivaDe(r: ExpenseCapture): number {
  if (r.iva != null) return Number(r.iva);
  const t = Number(r.total) || 0;
  return r.con_iva ? Math.round(t - t / IVA) : Math.round(t * 0.19);
}

type Draft = {
  proveedor: string; rut: string; tipo: string; folio: string; fecha: string;
  neto: string; iva: string; total: string; account_id: string; notas: string;
};

const emptyDraft = (accountId: string): Draft => ({
  proveedor: '', rut: '', tipo: 'factura', folio: '',
  fecha: new Date().toISOString().slice(0, 10),
  neto: '', iva: '', total: '', account_id: accountId, notas: '',
});

export default function ComprasTab({
  rows, accounts, periodo, defaultAccountId,
}: {
  rows: Row[];
  accounts: PurchaseAccount[];
  periodo: string;
  defaultAccountId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [importRes, setImportRes] = useState<ImportDteResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [filtro, setFiltro] = useState<'todas' | 'sin_clasificar' | AccountGroup>('todas');

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [d, setD] = useState<Draft>(emptyDraft(defaultAccountId));
  const [file, setFile] = useState<File | null>(null);
  const [ocrJson, setOcrJson] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrNote, setOcrNote] = useState<string | null>(null);

  const xmlInput = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<Draft>) => setD((prev) => ({ ...prev, ...patch }));

  const accountsById = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])), [accounts],
  );

  const sinClasificar = rows.filter((r) => !r.account_id).length;

  const visibles = useMemo(() => {
    if (filtro === 'todas') return rows;
    if (filtro === 'sin_clasificar') return rows.filter((r) => !r.account_id);
    return rows.filter((r) => r.account_grupo === filtro);
  }, [rows, filtro]);

  const totales = useMemo(() => {
    // Las notas de crédito recibidas restan (devolución al proveedor).
    const signo = (r: Row) => (r.tipo === 'nota_credito' ? -1 : 1);
    return {
      neto: visibles.reduce((s, r) => s + signo(r) * netoDe(r), 0),
      iva:  visibles.reduce((s, r) => s + signo(r) * ivaDe(r), 0),
      docs: visibles.length,
    };
  }, [visibles]);

  // ─── Ingreso por XML ───────────────────────────────────────────────────────

  async function onPickXml(files: FileList | null) {
    if (!files || files.length === 0) return;
    setImporting(true); setImportRes(null); setError(null);
    const fd = new FormData();
    for (const f of Array.from(files)) fd.append('files', f);
    try {
      const res = await importDteXmlFiles(fd);
      setImportRes(res);
      if (res.error) setError(res.error);
      router.refresh();
    } catch {
      setError('No se pudieron procesar los archivos');
    } finally {
      setImporting(false);
      if (xmlInput.current) xmlInput.current.value = '';
    }
  }

  // ─── Ingreso por imagen / a mano ───────────────────────────────────────────

  function startNew() {
    setEditId(null); setD(emptyDraft(defaultAccountId)); setFile(null);
    setOcrJson(null); setOcrNote(null); setError(null); setOpen(true);
  }

  function startEdit(r: Row) {
    setEditId(r.id);
    setD({
      proveedor: r.proveedor ?? '', rut: r.rut ?? '', tipo: r.tipo ?? 'factura',
      folio: r.folio ?? '', fecha: r.fecha ?? '',
      neto: r.neto != null ? String(r.neto) : '',
      iva: r.iva != null ? String(r.iva) : '',
      total: r.total != null ? String(r.total) : '',
      account_id: r.account_id ?? '', notas: r.notas ?? '',
    });
    setFile(null); setOcrJson(null); setOcrNote(null); setError(null); setOpen(true);
  }

  function onTotal(v: string) {
    const total = parseFloat(v.replace(/[^\d]/g, '')) || 0;
    const neto = Math.round(total / IVA);
    set({ total: v, neto: total ? String(neto) : '', iva: total ? String(total - neto) : '' });
  }
  function onNeto(v: string) {
    const neto = parseFloat(v.replace(/[^\d]/g, '')) || 0;
    const iva = Math.round(neto * 0.19);
    set({ neto: v, iva: neto ? String(iva) : '', total: neto ? String(neto + iva) : '' });
  }

  async function runOcr() {
    if (!file) return;
    setOcrLoading(true); setOcrNote(null); setError(null);
    try {
      const fd = new FormData(); fd.set('file', file);
      const res = await fetch('/api/parse-receipt', { method: 'POST', body: fd });
      const json = await res.json();
      if (!json.ok) { setError(json.message || 'No se pudo leer el documento'); return; }
      const x = json.data as {
        proveedor?: string; rut?: string; tipo?: string; folio?: string;
        fecha?: string; neto?: number; iva?: number; total?: number; incluyeIva?: boolean;
      };
      const patch: Partial<Draft> = {};
      if (x.proveedor) patch.proveedor = String(x.proveedor);
      if (x.rut) patch.rut = String(x.rut);
      if (x.folio) patch.folio = String(x.folio);
      if (x.fecha) patch.fecha = x.fecha;
      if (x.tipo && TIPOS.some((t) => t.value === x.tipo)) patch.tipo = x.tipo;
      if (x.neto != null && x.iva != null) {
        patch.neto = String(x.neto); patch.iva = String(x.iva);
        patch.total = String(x.total ?? x.neto + x.iva);
      } else if (x.total != null) {
        const total = x.incluyeIva === false ? Math.round(x.total * IVA) : x.total;
        const neto = Math.round(total / IVA);
        patch.total = String(total); patch.neto = String(neto); patch.iva = String(total - neto);
      }
      setD((prev) => ({ ...prev, ...patch }));
      setOcrJson(JSON.stringify(json.data));
      setOcrNote(json.mock
        ? 'OCR en modo demo (sin API key): son datos de ejemplo, corrígelos.'
        : 'Datos extraídos. Revísalos antes de guardar.');
    } catch {
      setError('Error al procesar el documento');
    } finally {
      setOcrLoading(false);
    }
  }

  function save() {
    setError(null);
    const fd = new FormData();
    fd.set('proveedor', d.proveedor); fd.set('rut', d.rut); fd.set('tipo', d.tipo);
    fd.set('folio', d.folio); fd.set('fecha', d.fecha);
    fd.set('neto', d.neto); fd.set('iva', d.iva); fd.set('total', d.total);
    fd.set('account_id', d.account_id); fd.set('notas', d.notas);
    fd.set('con_iva', 'true');
    if (file) fd.set('file', file);
    if (ocrJson) fd.set('ocr_json', ocrJson);

    start(async () => {
      const res = editId
        ? await updatePurchaseInvoice(editId, fd)
        : await createPurchaseInvoice(fd);
      if (res?.error) { setError(res.error); return; }
      setOpen(false); router.refresh();
    });
  }

  function act(fn: () => Promise<{ error?: string } | void>) {
    start(async () => {
      const r = await fn();
      if (r && 'error' in r && r.error) setError(r.error);
      else router.refresh();
    });
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      {/* Ingreso */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={xmlInput} type="file" accept=".xml,text/xml,application/xml" multiple
            className="hidden" onChange={(e) => onPickXml(e.target.files)} />
          <button
            onClick={() => xmlInput.current?.click()} disabled={importing}
            className="rounded-xl bg-[#010101] hover:bg-[#1d65c5] text-white text-sm font-semibold px-4 py-2.5 transition-colors disabled:opacity-60">
            {importing ? 'Leyendo XML…' : '📄 Subir XML de facturas'}
          </button>
          <button
            onClick={startNew}
            className="rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium px-4 py-2.5 transition-colors">
            📷 Foto / PDF o ingreso manual
          </button>
          <p className="text-xs text-gray-400 sm:ml-2">
            Los XML se leen exacto y sin OCR. Puedes soltar varios de una vez.
          </p>
        </div>

        {/* Resultado de la importación */}
        {importRes && (
          <div className="mt-3 border-t border-gray-100 pt-3">
            <div className="flex flex-wrap gap-3 text-sm">
              {importRes.creadas > 0 && <span className="text-green-700 font-medium">✓ {importRes.creadas} registrada(s)</span>}
              {importRes.duplicadas > 0 && <span className="text-amber-600 font-medium">⊘ {importRes.duplicadas} ya estaban</span>}
              {importRes.ventas > 0 && <span className="text-[#1d65c5] font-medium">↗ {importRes.ventas} son de venta</span>}
              {importRes.errores > 0 && <span className="text-red-600 font-medium">✕ {importRes.errores} con error</span>}
            </div>
            <div className="mt-2 flex flex-col gap-1 max-h-56 overflow-y-auto">
              {importRes.docs.map((doc, i) => (
                <div key={i} className="text-xs flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className={
                    doc.estado === 'creada' ? 'text-green-600'
                    : doc.estado === 'duplicada' ? 'text-amber-600'
                    : doc.estado === 'venta' ? 'text-[#1d65c5]' : 'text-red-600'}>
                    {doc.estado === 'creada' ? '✓' : doc.estado === 'duplicada' ? '⊘' : doc.estado === 'venta' ? '↗' : '✕'}
                  </span>
                  <span className="font-medium text-gray-700">{doc.emisor}</span>
                  <span className="text-gray-400">{doc.tipo} {doc.folio} · {clp(doc.total)}</span>
                  {doc.detalle && <span className="text-gray-400">— {doc.detalle}</span>}
                </div>
              ))}
            </div>
            <button onClick={() => setImportRes(null)} className="mt-2 text-xs text-gray-400 hover:text-gray-600">Ocultar</button>
          </div>
        )}
      </div>

      {error && !open && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-sm text-red-700">{error}</div>
      )}

      {/* Filtros + totales */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {([
            ['todas', `Todas (${rows.length})`],
            ...(sinClasificar > 0 ? [['sin_clasificar', `Sin clasificar (${sinClasificar})`] as const] : []),
            ['costo_giro', ACCOUNT_GROUP_LABEL.costo_giro],
            ['gasto_admin', ACCOUNT_GROUP_LABEL.gasto_admin],
            ['activo_fijo', ACCOUNT_GROUP_LABEL.activo_fijo],
          ] as Array<[typeof filtro, string]>).map(([k, label]) => (
            <button key={k} onClick={() => setFiltro(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filtro === k ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="text-sm text-gray-500">
          {totales.docs} doc. · neto <span className="font-semibold text-gray-900 tabular-nums">{clp(totales.neto)}</span>
          {' · '}IVA crédito <span className="font-semibold text-[#1d65c5] tabular-nums">{clp(totales.iva)}</span>
        </div>
      </div>

      {/* Listado */}
      {visibles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-12 text-center text-sm text-gray-400">
          {rows.length === 0
            ? `No hay facturas de compra en ${periodo}. Sube los XML de tus proveedores para empezar.`
            : 'Ninguna factura calza con este filtro.'}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {visibles.map((r) => {
            const cuenta = r.account_id ? accountsById.get(r.account_id) : null;
            const origen = ORIGEN_BADGE[r.origen] ?? ORIGEN_BADGE.manual;
            return (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900">{r.proveedor || 'Sin proveedor'}</span>
                      <span title={origen.title}
                        className="text-[10px] uppercase tracking-wide bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                        {origen.label}
                      </span>
                      {r.tipo === 'nota_credito' && (
                        <span className="text-[10px] uppercase tracking-wide bg-red-50 text-red-600 px-1.5 py-0.5 rounded">
                          Nota de crédito
                        </span>
                      )}
                      {r.project_name && (
                        <span className="text-[10px] bg-[#eaf4fb] text-[#1d65c5] px-1.5 py-0.5 rounded" title="Centro de costo">
                          {r.project_name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {TIPOS.find((t) => t.value === r.tipo)?.label ?? r.tipo ?? 'Documento'}
                      {r.folio ? ` N° ${r.folio}` : ''} · {r.fecha ?? 'sin fecha'}
                      {r.rut ? ` · ${r.rut}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900 tabular-nums">{clp(Number(r.total))}</p>
                      <p className="text-xs text-gray-400 tabular-nums">IVA {clp(ivaDe(r))}</p>
                    </div>
                    {r.docUrl && (
                      <a href={r.docUrl} target="_blank" rel="noopener noreferrer"
                        title={r.xml_path ? 'Ver XML del DTE' : 'Ver documento'}
                        className="text-gray-400 hover:text-[#1d65c5] text-lg">
                        {r.xml_path ? '🗎' : '📎'}
                      </a>
                    )}
                    <button onClick={() => startEdit(r)} className="text-xs text-[#1d65c5] hover:underline">Editar</button>
                    <button onClick={() => act(() => deletePurchaseInvoice(r.id))} className="text-xs text-red-500 hover:underline">Eliminar</button>
                  </div>
                </div>

                {/* Clasificación en un clic, sin abrir nada */}
                <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                  <select
                    value={r.account_id ?? ''}
                    onChange={(e) => act(() => classifyPurchaseInvoice(r.id, e.target.value))}
                    disabled={pending}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs outline-none focus:border-[#389fe0] ${
                      r.account_id ? 'border-gray-200 text-gray-700' : 'border-amber-300 bg-amber-50 text-amber-800'}`}>
                    <option value="">⚠ Sin clasificar — elige la cuenta</option>
                    {(['costo_giro', 'gasto_admin', 'activo_fijo'] as AccountGroup[]).map((g) => (
                      <optgroup key={g} label={ACCOUNT_GROUP_LABEL[g]}>
                        {accounts.filter((a) => a.grupo === g).map((a) => (
                          <option key={a.id} value={a.id}>{a.nombre}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  {cuenta && (
                    <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${GRUPO_COLOR[cuenta.grupo]}`}>
                      {ACCOUNT_GROUP_LABEL[cuenta.grupo]}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de ingreso / edición */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start sm:items-center justify-center p-4 overflow-y-auto"
          onClick={() => !pending && setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-8" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">
                {editId ? 'Editar factura de compra' : 'Registrar factura de compra'}
              </h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
            </div>

            <div className="px-5 py-4 flex flex-col gap-3">
              {!editId && (
                <div className="bg-[#389fe0]/5 rounded-xl p-3 flex flex-col gap-2">
                  <label className="text-xs text-gray-500">Foto o PDF de la factura — opcional</label>
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
                  <p className="text-[11px] text-gray-400">
                    Si tienes el XML de la factura, ciérrala y usa &ldquo;Subir XML&rdquo;: se lee exacto y sin errores.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Proveedor</label>
                  <input className={inputCls} value={d.proveedor} onChange={(e) => set({ proveedor: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">RUT proveedor</label>
                  <input className={inputCls} value={d.rut} onChange={(e) => set({ rut: e.target.value })} placeholder="76123456-7" />
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
                  <label className="text-xs text-gray-500 mb-1 block">Fecha</label>
                  <input type="date" className={inputCls} value={d.fecha} onChange={(e) => set({ fecha: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Neto</label>
                  <input inputMode="numeric" className={inputCls} value={d.neto} onChange={(e) => onNeto(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">IVA (19%)</label>
                  <input inputMode="numeric" className={inputCls} value={d.iva} onChange={(e) => set({ iva: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Total</label>
                  <input inputMode="numeric" className={inputCls} value={d.total} onChange={(e) => onTotal(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">¿Qué tipo de factura es?</label>
                <select className={inputCls} value={d.account_id} onChange={(e) => set({ account_id: e.target.value })}>
                  <option value="">— Sin clasificar —</option>
                  {(['costo_giro', 'gasto_admin', 'activo_fijo'] as AccountGroup[]).map((g) => (
                    <optgroup key={g} label={ACCOUNT_GROUP_LABEL[g]}>
                      {accounts.filter((a) => a.grupo === g).map((a) => (
                        <option key={a.id} value={a.id}>{a.nombre}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {d.account_id && accountsById.get(d.account_id)?.descripcion && (
                  <p className="text-[11px] text-gray-400 mt-1">{accountsById.get(d.account_id)!.descripcion}</p>
                )}
              </div>

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
