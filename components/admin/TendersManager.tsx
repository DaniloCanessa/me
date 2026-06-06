'use client';

import { useState, useTransition } from 'react';
import type { Tender, TenderKeyword, TenderRecipient, TenderStatus } from '@/lib/types';
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

// ─── Componente ───────────────────────────────────────────────────────────────

export default function TendersManager({
  tenders,
  keywords,
  recipients,
}: {
  tenders: Tender[];
  keywords: TenderKeyword[];
  recipients: TenderRecipient[];
}) {
  const [filter, setFilter] = useState<TenderStatus | 'todas'>('todas');
  const [newKeyword, setNewKeyword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [isSyncing, startSync] = useTransition();
  const [isPending, startTransition] = useTransition();

  const newCount = tenders.filter((t) => t.estado_interno === 'nueva').length;
  const visible = filter === 'todas'
    ? tenders.filter((t) => t.estado_interno !== 'descartada')
    : tenders.filter((t) => t.estado_interno === filter);

  function handleSync() {
    setSyncMessage(null);
    startSync(async () => {
      const r = await syncTendersNow();
      setSyncMessage(
        r.error
          ? `Error: ${r.error}`
          : `Revisadas ${r.revisadas} publicaciones · ${r.calzaron} calzaron · ${r.nuevas} nuevas${r.emailEnviado ? ' · email enviado' : ''}`,
      );
    });
  }

  function handleAddKeyword(e: React.FormEvent) {
    e.preventDefault();
    if (!newKeyword.trim()) return;
    startTransition(async () => {
      await addTenderKeyword(newKeyword);
      setNewKeyword('');
    });
  }

  function handleAddEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setEmailError(null);
    startTransition(async () => {
      const r = await addTenderRecipient(newEmail);
      if (r.ok) setNewEmail('');
      else setEmailError(r.message ?? 'Error');
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

      {/* ── Palabras clave ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">Palabras clave del filtro</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Click para activar/desactivar · el match ignora mayúsculas y acentos
            </p>
          </div>
          <form onSubmit={handleAddKeyword} className="flex gap-2">
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              placeholder="Nueva palabra clave…"
              className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#389fe0]/50 focus:border-transparent transition w-48"
            />
            <button
              type="submit"
              disabled={isPending || !newKeyword.trim()}
              className="px-3 py-1.5 rounded-xl text-sm font-semibold bg-[#389fe0] hover:bg-[#1d65c5] text-white disabled:bg-gray-100 disabled:text-gray-400 transition-colors"
            >
              + Agregar
            </button>
          </form>
        </div>
        <div className="flex flex-wrap gap-2">
          {keywords.map((kw) => (
            <span
              key={kw.id}
              className={[
                'group inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors',
                kw.is_active
                  ? 'bg-[#389fe0]/10 text-[#1d65c5] hover:bg-[#389fe0]/20'
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200',
              ].join(' ')}
              onClick={() => startTransition(async () => { await toggleTenderKeyword(kw.id, !kw.is_active); })}
              title={kw.is_active ? 'Click para desactivar' : 'Click para activar'}
            >
              {kw.keyword}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`¿Eliminar la palabra clave "${kw.keyword}"?`)) {
                    startTransition(async () => { await deleteTenderKeyword(kw.id); });
                  }
                }}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity leading-none"
                aria-label={`Eliminar ${kw.keyword}`}
              >
                ×
              </button>
            </span>
          ))}
          {keywords.length === 0 && (
            <p className="text-xs text-gray-400">
              No hay palabras clave — ejecuta el SQL de <code>supabase/tenders.sql</code> para crear el seed inicial.
            </p>
          )}
        </div>
      </div>

      {/* ── Correos de notificación ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">Correos de notificación</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Reciben el email cuando aparecen licitaciones nuevas · click para activar/desactivar
            </p>
          </div>
          <form onSubmit={handleAddEmail} className="flex gap-2 items-start">
            <div>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => { setNewEmail(e.target.value); setEmailError(null); }}
                placeholder="correo@empresa.cl"
                className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#389fe0]/50 focus:border-transparent transition w-56"
              />
              {emailError && <p className="text-[11px] text-red-500 mt-1">{emailError}</p>}
            </div>
            <button
              type="submit"
              disabled={isPending || !newEmail.trim()}
              className="px-3 py-1.5 rounded-xl text-sm font-semibold bg-[#389fe0] hover:bg-[#1d65c5] text-white disabled:bg-gray-100 disabled:text-gray-400 transition-colors"
            >
              + Agregar
            </button>
          </form>
        </div>
        <div className="flex flex-wrap gap-2">
          {recipients.map((r) => (
            <span
              key={r.id}
              className={[
                'group inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors',
                r.is_active
                  ? 'bg-[#389fe0]/10 text-[#1d65c5] hover:bg-[#389fe0]/20'
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200',
              ].join(' ')}
              onClick={() => startTransition(async () => { await toggleTenderRecipient(r.id, !r.is_active); })}
              title={r.is_active ? 'Click para desactivar' : 'Click para activar'}
            >
              ✉ {r.email}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`¿Eliminar el correo ${r.email}?`)) {
                    startTransition(async () => { await deleteTenderRecipient(r.id); });
                  }
                }}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity leading-none"
                aria-label={`Eliminar ${r.email}`}
              >
                ×
              </button>
            </span>
          ))}
          {recipients.length === 0 && (
            <p className="text-xs text-gray-400">
              Sin correos configurados — se usará <code>LEAD_RECIPIENT_EMAIL</code> como respaldo.
            </p>
          )}
        </div>
      </div>

      {/* ── Filtros ── */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => {
          const count = f.value === 'todas'
            ? tenders.filter((t) => t.estado_interno !== 'descartada').length
            : tenders.filter((t) => t.estado_interno === f.value).length;
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
