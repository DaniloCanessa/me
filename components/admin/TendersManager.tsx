'use client';

import { useState, useTransition } from 'react';
import type { Tender, TenderKeyword, TenderRecipient, TenderSearch, TenderStatus } from '@/lib/types';
import {
  syncTendersNow,
  updateTenderStatus,
  markAllTendersSeen,
  addTenderKeyword,
  toggleTenderKeyword,
  deleteTenderKeyword,
  addTenderRecipient,
  toggleTenderRecipient,
  deleteTenderRecipient,
  addTenderSearch,
  renameTenderSearch,
  toggleTenderSearch,
  deleteTenderSearch,
} from '@/app/admin/licitaciones/actions';

// ─── Constantes UI ────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<TenderStatus, string> = {
  nueva:      'Nueva',
  vista:      'Vista',
  interesa:   'Me interesa',
  descartada: 'Descartada',
  postulada:  'Postulada',
};

const STATUS_STYLES: Record<TenderStatus, string> = {
  nueva:      'bg-[#389fe0]/10 text-[#1d65c5]',
  vista:      'bg-gray-100 text-gray-500',
  interesa:   'bg-amber-50 text-amber-700',
  descartada: 'bg-gray-100 text-gray-400 line-through',
  postulada:  'bg-emerald-50 text-emerald-700',
};

const FILTERS: Array<{ value: TenderStatus | 'todas'; label: string }> = [
  { value: 'todas',      label: 'Todas' },
  { value: 'nueva',      label: 'Nuevas' },
  { value: 'interesa',   label: 'Me interesan' },
  { value: 'postulada',  label: 'Postuladas' },
  { value: 'descartada', label: 'Descartadas' },
];

function tenderUrl(codigo: string) {
  return `https://www.mercadopublico.cl/fichaLicitacion.html?idLicitacion=${encodeURIComponent(codigo)}`;
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

function formatCLP(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
}

// ─── Tarjeta de una búsqueda ──────────────────────────────────────────────────
// Nombre, activar/desactivar, sus palabras clave y sus correos.

function Chip({
  label,
  active,
  onToggle,
  onDelete,
  confirmText,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
  onDelete: () => void;
  confirmText: string;
}) {
  return (
    <span
      className={[
        'group inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors',
        active
          ? 'bg-[#389fe0]/10 text-[#1d65c5] hover:bg-[#389fe0]/20'
          : 'bg-gray-100 text-gray-400 hover:bg-gray-200',
      ].join(' ')}
      onClick={onToggle}
      title={active ? 'Click para desactivar' : 'Click para activar'}
    >
      {label}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (confirm(confirmText)) onDelete();
        }}
        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity leading-none"
        aria-label={`Eliminar ${label}`}
      >
        ×
      </button>
    </span>
  );
}

function AddForm({
  placeholder,
  type,
  width,
  onAdd,
}: {
  placeholder: string;
  type: 'text' | 'email';
  width: string;
  onAdd: (value: string) => Promise<{ ok: boolean; message?: string }>;
}) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.trim()) return;
        setError(null);
        start(async () => {
          const r = await onAdd(value);
          if (r.ok) setValue('');
          else setError(r.message ?? 'Error');
        });
      }}
      className="flex gap-2 items-start"
    >
      <div>
        <input
          type={type}
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(null); }}
          placeholder={placeholder}
          className={`rounded-xl border border-gray-200 px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#389fe0]/50 focus:border-transparent transition ${width}`}
        />
        {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
      </div>
      <button
        type="submit"
        disabled={isPending || !value.trim()}
        className="px-3 py-1.5 rounded-xl text-sm font-semibold bg-[#389fe0] hover:bg-[#1d65c5] text-white disabled:bg-gray-100 disabled:text-gray-400 transition-colors"
      >
        + Agregar
      </button>
    </form>
  );
}

function SearchCard({
  search,
  keywords,
  recipients,
  tenderCount,
}: {
  search: TenderSearch;
  keywords: TenderKeyword[];
  recipients: TenderRecipient[];
  tenderCount: number;
}) {
  const [isPending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [nombre, setNombre] = useState(search.nombre);
  const [nameError, setNameError] = useState<string | null>(null);
  const activeRecipients = recipients.filter((r) => r.is_active).length;
  const activeKeywords = keywords.filter((k) => k.is_active).length;

  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-5 flex flex-col gap-4 ${search.is_active ? 'border-gray-100' : 'border-dashed border-gray-200 opacity-70'} ${isPending ? 'opacity-60' : ''}`}>
      {/* Encabezado */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          {editing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                start(async () => {
                  const r = await renameTenderSearch(search.id, nombre);
                  if (r.ok) { setEditing(false); setNameError(null); } else setNameError(r.message ?? 'Error');
                });
              }}
              className="flex gap-2 items-center"
            >
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                autoFocus
                className="rounded-lg border border-gray-200 px-2 py-1 text-sm font-semibold text-gray-900 focus:outline-none focus:border-[#389fe0]"
              />
              <button type="submit" className="text-xs font-semibold text-[#1d65c5]">Guardar</button>
              <button type="button" onClick={() => { setEditing(false); setNombre(search.nombre); setNameError(null); }} className="text-xs text-gray-400">Cancelar</button>
            </form>
          ) : (
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              {search.nombre}
              <button type="button" onClick={() => setEditing(true)} className="text-[11px] font-normal text-gray-400 hover:text-[#1d65c5]">
                renombrar
              </button>
            </h2>
          )}
          {nameError && <p className="text-[11px] text-red-500 mt-1">{nameError}</p>}
          <p className="text-xs text-gray-400 mt-0.5">
            {activeKeywords} palabra{activeKeywords !== 1 ? 's' : ''} activa{activeKeywords !== 1 ? 's' : ''} ·{' '}
            {activeRecipients} correo{activeRecipients !== 1 ? 's' : ''} · {tenderCount} licitaci{tenderCount !== 1 ? 'ones' : 'ón'} guardada{tenderCount !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => start(async () => { await toggleTenderSearch(search.id, !search.is_active); })}
            className={[
              'px-3 py-1 rounded-lg text-xs font-semibold border transition-colors',
              search.is_active
                ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                : 'border-gray-200 text-gray-500 hover:text-[#1d65c5]',
            ].join(' ')}
            title={search.is_active ? 'Click para pausar esta búsqueda' : 'Click para reactivarla'}
          >
            {search.is_active ? '● Activa' : '○ Pausada'}
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm(`¿Eliminar la búsqueda "${search.nombre}" con sus palabras y correos? Las licitaciones ya guardadas se conservan.`)) {
                start(async () => { await deleteTenderSearch(search.id); });
              }
            }}
            className="px-3 py-1 rounded-lg text-xs font-medium border border-gray-200 text-gray-400 hover:text-red-500 transition-colors"
          >
            Eliminar
          </button>
        </div>
      </div>

      {/* Palabras clave */}
      <div>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Palabras clave</p>
          <AddForm placeholder="Nueva palabra clave…" type="text" width="w-48"
            onAdd={(v) => addTenderKeyword(search.id, v)} />
        </div>
        <div className="flex flex-wrap gap-2">
          {keywords.map((kw) => (
            <Chip
              key={kw.id}
              label={kw.keyword}
              active={kw.is_active}
              onToggle={() => start(async () => { await toggleTenderKeyword(kw.id, !kw.is_active); })}
              onDelete={() => start(async () => { await deleteTenderKeyword(kw.id); })}
              confirmText={`¿Eliminar la palabra clave "${kw.keyword}"?`}
            />
          ))}
          {keywords.length === 0 && <p className="text-xs text-gray-400">Sin palabras clave: esta búsqueda no encuentra nada todavía.</p>}
        </div>
      </div>

      {/* Correos */}
      <div>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Correos que reciben el aviso</p>
          <AddForm placeholder="correo@empresa.cl" type="email" width="w-56"
            onAdd={(v) => addTenderRecipient(search.id, v)} />
        </div>
        <div className="flex flex-wrap gap-2">
          {recipients.map((r) => (
            <Chip
              key={r.id}
              label={`✉ ${r.email}`}
              active={r.is_active}
              onToggle={() => start(async () => { await toggleTenderRecipient(r.id, !r.is_active); })}
              onDelete={() => start(async () => { await deleteTenderRecipient(r.id); })}
              confirmText={`¿Quitar ${r.email} de esta búsqueda?`}
            />
          ))}
          {activeRecipients === 0 && (
            <p className="text-xs text-amber-600">Sin correos activos: sus licitaciones solo se verán aquí, no llega aviso.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function TendersManager({
  tenders,
  searches,
  keywords,
  recipients,
}: {
  tenders: Tender[];
  searches: TenderSearch[];
  keywords: TenderKeyword[];
  recipients: TenderRecipient[];
}) {
  const [filter, setFilter] = useState<TenderStatus | 'todas'>('todas');
  const [searchFilter, setSearchFilter] = useState<string>('todas');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [isSyncing, startSync] = useTransition();
  const [isPending, startTransition] = useTransition();

  const searchName = new Map(searches.map((s) => [s.id, s.nombre]));
  const enBusqueda = searchFilter === 'todas'
    ? tenders
    : tenders.filter((t) => (t.searches_matched ?? []).includes(searchFilter));
  const newCount = tenders.filter((t) => t.estado_interno === 'nueva').length;
  const visible = filter === 'todas'
    ? enBusqueda.filter((t) => t.estado_interno !== 'descartada')
    : enBusqueda.filter((t) => t.estado_interno === filter);

  function handleSync() {
    setSyncMessage(null);
    startSync(async () => {
      const r = await syncTendersNow();
      setSyncMessage(
        r.error
          ? `Error: ${r.error}`
          : `Revisadas ${r.revisadas} publicaciones (${r.dudosas} por descripción) · ${r.calzaron} calzaron · ${r.nuevas} nuevas`
            + r.busquedas.map((b) => ` · ${b.nombre}: ${b.nuevas} nueva${b.nuevas !== 1 ? 's' : ''}${b.emailEnviado ? ' ✉' : ''}`).join(''),
      );
    });
  }

  return (
    <div className="flex flex-col gap-5">

      {/* ── Barra de acciones ── */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSync}
          disabled={isSyncing}
          className={[
            'px-4 py-2 rounded-xl text-sm font-semibold transition-colors',
            isSyncing
              ? 'bg-gray-100 text-gray-400 cursor-wait'
              : 'bg-[#389fe0] hover:bg-[#1d65c5] text-white',
          ].join(' ')}
        >
          {isSyncing ? 'Sincronizando… (puede tardar 1-2 min)' : '↻ Sincronizar ahora'}
        </button>

        {newCount > 0 && (
          <button
            type="button"
            onClick={() => startTransition(async () => { await markAllTendersSeen(); })}
            disabled={isPending}
            className="px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:border-[#389fe0] hover:text-[#1d65c5] transition-colors"
          >
            Marcar {newCount} nueva{newCount !== 1 ? 's' : ''} como vistas
          </button>
        )}

        {syncMessage && (
          <span className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">{syncMessage}</span>
        )}
      </div>

      {/* ── Búsquedas ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">Búsquedas</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Cada búsqueda envía su propio correo con sus licitaciones · click en una palabra o correo para activarlo/desactivarlo · el match ignora mayúsculas y acentos
            </p>
          </div>
          <AddForm placeholder="Nombre de la nueva búsqueda…" type="text" width="w-60"
            onAdd={(v) => addTenderSearch(v)} />
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {searches.map((s) => (
            <SearchCard
              key={s.id}
              search={s}
              keywords={keywords.filter((k) => k.search_id === s.id)}
              recipients={recipients.filter((r) => r.search_id === s.id)}
              tenderCount={tenders.filter((t) => (t.searches_matched ?? []).includes(s.id)).length}
            />
          ))}
        </div>
        {searches.length === 0 && (
          <p className="text-xs text-gray-400">
            No hay búsquedas — ejecuta <code>supabase/tender_searches.sql</code> o crea una arriba.
          </p>
        )}
      </div>

      {/* ── Filtro por búsqueda ── */}
      {searches.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {[{ id: 'todas', nombre: 'Todas las búsquedas' }, ...searches].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSearchFilter(s.id)}
              className={[
                'px-3 py-1 rounded-lg text-xs font-medium transition-colors',
                searchFilter === s.id
                  ? 'bg-gray-900 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400',
              ].join(' ')}
            >
              {s.nombre}
            </button>
          ))}
        </div>
      )}

      {/* ── Filtros ── */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => {
          const count = f.value === 'todas'
            ? enBusqueda.filter((t) => t.estado_interno !== 'descartada').length
            : enBusqueda.filter((t) => t.estado_interno === f.value).length;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={[
                'px-3.5 py-1.5 rounded-xl text-sm font-medium transition-colors',
                filter === f.value
                  ? 'bg-[#1d65c5] text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-[#389fe0]',
              ].join(' ')}
            >
              {f.label} <span className="opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* ── Lista de licitaciones ── */}
      {visible.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-sm text-gray-400">
          {tenders.length === 0
            ? 'Aún no hay licitaciones sincronizadas. Usa "Sincronizar ahora" o espera la sincronización diaria.'
            : 'No hay licitaciones en este filtro.'}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((t) => {
            const days = daysUntil(t.fecha_cierre);
            const closingSoon = days !== null && days >= 0 && days <= 3;
            const closed = days !== null && days < 0;
            return (
              <div
                key={t.codigo_externo}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLES[t.estado_interno]}`}>
                        {STATUS_LABELS[t.estado_interno]}
                      </span>
                      <span className="text-[11px] text-gray-400 font-mono">{t.codigo_externo}</span>
                      {t.estado_mp && <span className="text-[11px] text-gray-400">· {t.estado_mp}</span>}
                    </div>
                    <a
                      href={tenderUrl(t.codigo_externo)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block font-semibold text-gray-900 hover:text-[#1d65c5] transition-colors mt-1.5 leading-snug"
                    >
                      {t.nombre} ↗
                    </a>
                    <p className="text-xs text-gray-500 mt-1">
                      {t.organismo ?? 'Organismo no informado'}
                      {t.region ? ` · ${t.region}` : ''}
                    </p>
                    {t.descripcion && (
                      <p className="text-xs text-gray-400 mt-1.5 line-clamp-2">{t.descripcion}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {t.monto_estimado != null && t.monto_estimado > 0 && (
                      <p className="text-sm font-bold text-gray-900">
                        {formatCLP(t.monto_estimado)}
                        {t.moneda && t.moneda !== 'CLP' ? ` ${t.moneda}` : ''}
                      </p>
                    )}
                    {t.fecha_cierre && (
                      <p className={[
                        'text-xs mt-1 font-medium',
                        closed ? 'text-gray-400' : closingSoon ? 'text-red-600' : 'text-gray-500',
                      ].join(' ')}>
                        Cierre: {new Date(t.fecha_cierre).toLocaleDateString('es-CL')}
                        {days !== null && !closed && (
                          <> · {days === 0 ? 'hoy' : `${days} día${days !== 1 ? 's' : ''}`}</>
                        )}
                        {closed && ' · cerrada'}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 flex-wrap border-t border-gray-50 pt-3">
                  <div className="flex gap-1.5 flex-wrap">
                    {(t.searches_matched ?? []).map((id) => searchName.get(id) && (
                      <span key={id} className="bg-gray-900 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        {searchName.get(id)}
                      </span>
                    ))}
                    {t.keywords_matched.map((kw) => (
                      <span key={kw} className="bg-[#dde3e9]/60 text-[#1d65c5] text-[10px] font-medium px-2 py-0.5 rounded-full">
                        {kw}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {t.estado_interno !== 'interesa' && (
                      <button
                        type="button"
                        onClick={() => startTransition(async () => { await updateTenderStatus(t.codigo_externo, 'interesa'); })}
                        className="px-3 py-1 rounded-lg text-xs font-semibold border border-amber-200 text-amber-700 hover:bg-amber-50 transition-colors"
                      >
                        Me interesa
                      </button>
                    )}
                    {t.estado_interno !== 'postulada' && (
                      <button
                        type="button"
                        onClick={() => startTransition(async () => { await updateTenderStatus(t.codigo_externo, 'postulada'); })}
                        className="px-3 py-1 rounded-lg text-xs font-semibold border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors"
                      >
                        Postulada
                      </button>
                    )}
                    {t.estado_interno !== 'descartada' ? (
                      <button
                        type="button"
                        onClick={() => startTransition(async () => { await updateTenderStatus(t.codigo_externo, 'descartada'); })}
                        className="px-3 py-1 rounded-lg text-xs font-medium border border-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        Descartar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startTransition(async () => { await updateTenderStatus(t.codigo_externo, 'vista'); })}
                        className="px-3 py-1 rounded-lg text-xs font-medium border border-gray-200 text-gray-500 hover:text-[#1d65c5] transition-colors"
                      >
                        Restaurar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
