'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ExpenseCapture } from '@/lib/db/expenses';
import { GENERAL_EXPENSE_CATEGORIES } from '@/lib/db/expenses';
import {
  saveExpenseCapture, approveExpenseCapture, rejectExpenseCapture,
  deleteExpenseCapture, getProjectItemsForExpense,
} from '@/app/admin/gastos/actions';

type Row = ExpenseCapture & { signedUrl: string | null };
type ProjectOpt = { id: string; nombre: string };

const STATUS_META: Record<string, { label: string; color: string }> = {
  pendiente: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700' },
  aprobado:  { label: 'Aprobado',  color: 'bg-green-100 text-green-700' },
  rechazado: { label: 'Rechazado', color: 'bg-gray-100 text-gray-500' },
};

function clp(n: number | null) {
  if (n == null) return '—';
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
}

// El archivo subido puede ser imagen o PDF (el path conserva la extensión).
function isPdfPath(path: string | null | undefined): boolean {
  return !!path && path.toLowerCase().endsWith('.pdf');
}

type Draft = {
  proveedor: string; rut: string; tipo: string; folio: string; fecha: string;
  neto: string; iva: string; total: string; con_iva: boolean; notas: string;
  project_select: string; project_item_id: string; categoria: string;
};

function draftFrom(c: Row): Draft {
  return {
    proveedor: c.proveedor ?? '', rut: c.rut ?? '', tipo: c.tipo ?? 'factura',
    folio: c.folio ?? '', fecha: c.fecha ?? '', neto: c.neto?.toString() ?? '',
    iva: c.iva?.toString() ?? '', total: c.total?.toString() ?? '', con_iva: c.con_iva,
    notas: c.notas ?? '',
    project_select: c.sin_proyecto ? '__sin__' : (c.project_id ?? ''),
    project_item_id: c.project_item_id ?? '',
    categoria: c.categoria ?? '',
  };
}

function draftToFormData(d: Draft, extra?: Record<string, string>): FormData {
  const fd = new FormData();
  fd.set('proveedor', d.proveedor); fd.set('rut', d.rut); fd.set('tipo', d.tipo);
  fd.set('folio', d.folio); fd.set('fecha', d.fecha); fd.set('neto', d.neto);
  fd.set('iva', d.iva); fd.set('total', d.total); fd.set('con_iva', String(d.con_iva));
  fd.set('notas', d.notas); fd.set('project_select', d.project_select);
  fd.set('project_item_id', d.project_item_id); fd.set('categoria', d.categoria);
  for (const [k, v] of Object.entries(extra ?? {})) fd.set(k, v);
  return fd;
}

export default function GastosManager({ captures, projects }: { captures: Row[]; projects: ProjectOpt[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<'pendiente' | 'aprobado' | 'rechazado'>('pendiente');
  const [active, setActive] = useState<Row | null>(null);

  const counts = {
    pendiente: captures.filter((c) => c.status === 'pendiente').length,
    aprobado:  captures.filter((c) => c.status === 'aprobado').length,
    rechazado: captures.filter((c) => c.status === 'rechazado').length,
  };
  const list = captures.filter((c) => c.status === filter);

  return (
    <>
      {/* Filtros */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {(['pendiente', 'aprobado', 'rechazado'] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === s ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {STATUS_META[s].label}
            <span className={`ml-1.5 ${filter === s ? 'text-gray-300' : 'text-gray-400'}`}>({counts[s]})</span>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
          <p className="text-sm text-gray-400">No hay gastos {STATUS_META[filter].label.toLowerCase()}s.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map((c) => (
            <button key={c.id} onClick={() => setActive(c)}
              className="text-left bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:border-[#389fe0]/40 transition-colors">
              <div className="h-32 bg-gray-50 flex items-center justify-center overflow-hidden">
                {isPdfPath(c.image_path)
                  ? <span className="text-3xl">📄<span className="block text-[10px] text-gray-400 mt-1 font-medium">PDF</span></span>
                  : c.signedUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={c.signedUrl} alt="Boleta" className="w-full h-full object-cover" />
                  : <span className="text-3xl">🧾</span>}
              </div>
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-gray-900 text-sm truncate">{c.proveedor ?? 'Sin proveedor'}</p>
                  <span className="font-semibold text-gray-900 text-sm tabular-nums shrink-0">{clp(c.total)}</span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <span className="text-xs text-gray-400 truncate">
                    {c.sin_proyecto ? 'Sin proyecto' : (c.project_name ?? 'Proyecto a definir')}
                  </span>
                  {c.ocr_status === 'ok' && <span className="text-[10px] text-[#389fe0]">OCR ✓</span>}
                </div>
                {c.captured_by && <p className="text-[10px] text-gray-300 mt-1">por {c.captured_by}</p>}
              </div>
            </button>
          ))}
        </div>
      )}

      {active && (
        <ReviewModal
          key={active.id}
          capture={active}
          projects={projects}
          onClose={() => setActive(null)}
          onDone={() => { setActive(null); router.refresh(); }}
        />
      )}
    </>
  );
}

// ─── Modal de revisión ────────────────────────────────────────────────────────

function ReviewModal({
  capture, projects, onClose, onDone,
}: {
  capture: Row; projects: ProjectOpt[]; onClose: () => void; onDone: () => void;
}) {
  const [d, setD] = useState<Draft>(() => draftFrom(capture));
  const [items, setItems] = useState<Array<{ id: string; description: string }>>([]);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrMock, setOcrMock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [isPending, start] = useTransition();
  const readOnly = capture.status !== 'pendiente';
  const isPdf = isPdfPath(capture.image_path);

  const set = (patch: Partial<Draft>) => setD((prev) => ({ ...prev, ...patch }));
  const hasProject = d.project_select !== '' && d.project_select !== '__sin__';

  // Carga ítems del proyecto seleccionado
  useEffect(() => {
    if (!hasProject) { setItems([]); return; }
    let alive = true;
    getProjectItemsForExpense(d.project_select).then((rows) => { if (alive) setItems(rows); });
    return () => { alive = false; };
  }, [d.project_select, hasProject]);

  async function runOcr() {
    setError(null); setOcrLoading(true);
    try {
      const fd = new FormData();
      fd.set('path', capture.image_path);
      const res = await fetch('/api/parse-receipt', { method: 'POST', body: fd });
      const json = await res.json();
      if (!json.ok) { setError(json.message ?? 'No se pudo leer la boleta'); return; }
      setOcrMock(!!json.mock);
      const x = json.data as {
        proveedor?: string; rut?: string; tipo?: string; folio?: string; fecha?: string;
        neto?: number; iva?: number; total?: number; incluyeIva?: boolean;
      };
      set({
        proveedor: x.proveedor ?? d.proveedor,
        rut: x.rut ?? d.rut,
        tipo: x.tipo ?? d.tipo,
        folio: x.folio ?? d.folio,
        fecha: x.fecha ?? d.fecha,
        neto: x.neto?.toString() ?? d.neto,
        iva: x.iva?.toString() ?? d.iva,
        total: x.total?.toString() ?? d.total,
        con_iva: x.incluyeIva ?? d.con_iva,
      });
      // Persistir el OCR
      start(async () => {
        await saveExpenseCapture(capture.id, draftToFormData(
          { ...d, proveedor: x.proveedor ?? d.proveedor, rut: x.rut ?? d.rut, tipo: x.tipo ?? d.tipo,
            folio: x.folio ?? d.folio, fecha: x.fecha ?? d.fecha, neto: x.neto?.toString() ?? d.neto,
            iva: x.iva?.toString() ?? d.iva, total: x.total?.toString() ?? d.total, con_iva: x.incluyeIva ?? d.con_iva },
          { ocr_json: JSON.stringify(json.data) },
        ));
      });
    } catch {
      setError('Error al procesar el OCR');
    } finally {
      setOcrLoading(false);
    }
  }

  function doApprove() {
    setError(null);
    start(async () => {
      const res = await approveExpenseCapture(capture.id, draftToFormData(d));
      if (res?.error) { setError(res.error); return; }
      onDone();
    });
  }
  function doReject() {
    start(async () => { await rejectExpenseCapture(capture.id); onDone(); });
  }
  function doDelete() {
    if (!confirm('¿Eliminar este gasto y su imagen? No se puede deshacer.')) return;
    start(async () => { await deleteExpenseCapture(capture.id); onDone(); });
  }

  const inputCls = 'w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#389fe0] disabled:bg-gray-50 disabled:text-gray-600';

  return (
    <div className="fixed inset-0 z-50 bg-black/40 overflow-y-auto py-6 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            Revisar gasto
            <span className={`ml-2 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_META[capture.status].color}`}>
              {STATUS_META[capture.status].label}
            </span>
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="grid md:grid-cols-2 gap-5 p-5">
          {/* Boleta / factura — imagen o PDF */}
          <div className="flex flex-col gap-3">
            <div className="relative rounded-xl border border-gray-100 bg-gray-50 overflow-hidden flex items-center justify-center min-h-48">
              {!capture.signedUrl
                ? <span className="text-4xl py-12">🧾</span>
                : isPdf
                ? <iframe src={capture.signedUrl} title="Boleta / factura (PDF)" className="w-full h-96 border-0" />
                // eslint-disable-next-line @next/next/no-img-element
                : <img src={capture.signedUrl} alt="Boleta" className="w-full max-h-96 object-contain" />}
              {capture.signedUrl && (
                <button onClick={() => setExpanded(true)} title="Ampliar"
                  className="absolute top-2 right-2 bg-white/90 hover:bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-700 shadow-sm">
                  ⛶ Ampliar
                </button>
              )}
            </div>
            {capture.signedUrl && (
              <a href={capture.signedUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs text-[#1d65c5] hover:underline text-center">
                {isPdf ? '📄 Abrir PDF en pestaña nueva' : '🔍 Abrir imagen en pestaña nueva'}
              </a>
            )}
            {!readOnly && (
              <button onClick={runOcr} disabled={ocrLoading || isPending}
                className="rounded-xl border border-[#389fe0] text-[#1d65c5] hover:bg-[#389fe0]/5 disabled:opacity-50 py-2 text-sm font-semibold transition-colors">
                {ocrLoading ? 'Leyendo la boleta…' : '⚙️ Procesar OCR (rellenar datos)'}
              </button>
            )}
            {ocrMock && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                ⚠ OCR en <b>modo demo</b>: falta <code>ANTHROPIC_API_KEY</code> en el entorno. Los datos mostrados son de ejemplo, no de tu boleta.
              </p>
            )}
          </div>

          {/* Datos */}
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Proveedor</label>
              <input className={inputCls} value={d.proveedor} disabled={readOnly} onChange={(e) => set({ proveedor: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">RUT</label>
                <input className={inputCls} value={d.rut} disabled={readOnly} onChange={(e) => set({ rut: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Folio / N°</label>
                <input className={inputCls} value={d.folio} disabled={readOnly} onChange={(e) => set({ folio: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Tipo</label>
                <select className={inputCls} value={d.tipo} disabled={readOnly} onChange={(e) => set({ tipo: e.target.value })}>
                  <option value="factura">Factura</option>
                  <option value="boleta">Boleta</option>
                  <option value="anticipo">Anticipo</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Fecha</label>
                <input type="date" className={inputCls} value={d.fecha} disabled={readOnly} onChange={(e) => set({ fecha: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Neto</label>
                <input inputMode="numeric" className={inputCls} value={d.neto} disabled={readOnly} onChange={(e) => set({ neto: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">IVA</label>
                <input inputMode="numeric" className={inputCls} value={d.iva} disabled={readOnly} onChange={(e) => set({ iva: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Total</label>
                <input inputMode="numeric" className={inputCls} value={d.total} disabled={readOnly} onChange={(e) => set({ total: e.target.value })} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={d.con_iva} disabled={readOnly} onChange={(e) => set({ con_iva: e.target.checked })}
                className="rounded border-gray-300 text-[#389fe0] focus:ring-[#389fe0]" />
              El total incluye IVA
            </label>

            <div className="border-t border-gray-100 pt-3">
              <label className="text-xs text-gray-500 mb-1 block">Proyecto</label>
              <select className={inputCls} value={d.project_select} disabled={readOnly}
                onChange={(e) => set({ project_select: e.target.value, project_item_id: '' })}>
                <option value="">— Elegir —</option>
                <option value="__sin__">Sin proyecto (gasto general)</option>
                <optgroup label="Proyectos">
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </optgroup>
              </select>
            </div>
            {hasProject && items.length > 0 && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Ítem de la lista de compra (opcional)</label>
                <select className={inputCls} value={d.project_item_id} disabled={readOnly}
                  onChange={(e) => set({ project_item_id: e.target.value })}>
                  <option value="">Sin ítem específico</option>
                  {items.map((it) => <option key={it.id} value={it.id}>{it.description}</option>)}
                </select>
              </div>
            )}
            {d.project_select === '__sin__' && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Categoría del gasto general</label>
                <select className={inputCls} value={d.categoria} disabled={readOnly}
                  onChange={(e) => set({ categoria: e.target.value })}>
                  <option value="">— Sin categoría —</option>
                  {GENERAL_EXPENSE_CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nota</label>
              <input className={inputCls} value={d.notas} disabled={readOnly} onChange={(e) => set({ notas: e.target.value })} />
            </div>
          </div>
        </div>

        {error && <p className="px-5 text-sm text-red-600">{error}</p>}

        {/* Acciones */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-gray-100">
          <button onClick={doDelete} disabled={isPending}
            className="text-xs text-red-400 hover:text-red-600 font-medium disabled:opacity-40">Eliminar</button>
          {!readOnly ? (
            <div className="flex gap-2">
              <button onClick={doReject} disabled={isPending}
                className="border border-gray-200 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-50">
                Rechazar
              </button>
              <button onClick={doApprove} disabled={isPending}
                className="bg-[#389fe0] hover:bg-[#1d65c5] text-white px-5 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
                {isPending ? 'Guardando…' : hasProject ? 'Aprobar → crear compra' : 'Aprobar (gasto general)'}
              </button>
            </div>
          ) : (
            <span className="text-xs text-gray-400">
              {capture.reviewed_by ? `Revisado por ${capture.reviewed_by}` : ''}
              {capture.purchase_id ? ' · compra creada en el proyecto' : ''}
            </span>
          )}
        </div>
      </div>

      {expanded && capture.signedUrl && (
        <Lightbox url={capture.signedUrl} isPdf={isPdf} onClose={() => setExpanded(false)} />
      )}
    </div>
  );
}

// ─── Lightbox: boleta/PDF a pantalla completa, con zoom para imágenes ─────────

function Lightbox({ url, isPdf, onClose }: { url: string; isPdf: boolean; onClose: () => void }) {
  const [zoomed, setZoomed] = useState(false);

  // Cerrar con Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] bg-black/85 flex flex-col" onClick={onClose}>
      <div className="flex justify-end p-3 shrink-0">
        <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
          className="text-white/80 hover:text-white text-xs mr-4 self-center">Abrir en pestaña ↗</a>
        <button onClick={onClose} className="text-white/90 hover:text-white text-3xl leading-none px-2">×</button>
      </div>
      <div className="flex-1 overflow-auto flex items-center justify-center px-4 pb-4" onClick={(e) => e.stopPropagation()}>
        {isPdf ? (
          <iframe src={url} title="Boleta / factura (PDF)" className="w-full h-full bg-white rounded-lg border-0" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Boleta"
            onClick={() => setZoomed((z) => !z)}
            className={zoomed
              ? 'max-w-none cursor-zoom-out'
              : 'max-w-full max-h-full object-contain cursor-zoom-in'}
            style={zoomed ? { width: 'auto', height: 'auto' } : undefined} />
        )}
      </div>
      {!isPdf && (
        <p className="text-center text-white/50 text-xs pb-3 shrink-0">Clic en la imagen para {zoomed ? 'reducir' : 'ampliar'} · Esc para cerrar</p>
      )}
    </div>
  );
}
