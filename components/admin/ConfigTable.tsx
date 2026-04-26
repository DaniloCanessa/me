'use client';

import { useState, useTransition } from 'react';
import { updateConfigParam } from '@/app/admin/config/actions';

interface ConfigParam {
  id: string;
  key: string;
  value: unknown;
  description: string | null;
  category: string | null;
  updated_at: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  simulator:  'Simulador',
  battery:    'Baterías',
  business:   'Empresas',
  regulatory: 'Regulatorio',
};

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function formatValue(key: string, value: unknown): string {
  const n = Number(value);
  if (isNaN(n)) return String(value);
  if (key.endsWith('_clp')) {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
  }
  return new Intl.NumberFormat('es-CL').format(n);
}

export default function ConfigTable({ params }: { params: ConfigParam[] }) {
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editValue, setEditValue]   = useState('');
  const [savedKey, setSavedKey]     = useState<string | null>(null);
  const [errorKey, setErrorKey]     = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const grouped = params.reduce<Record<string, ConfigParam[]>>((acc, p) => {
    const cat = p.category ?? 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  function startEdit(p: ConfigParam) {
    setEditingId(p.id);
    setEditValue(String(p.value));
    setSavedKey(null);
    setErrorKey(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue('');
  }

  function saveEdit(id: string, key: string) {
    startTransition(async () => {
      const result = await updateConfigParam(id, editValue);
      setEditingId(null);
      if (result?.error) {
        setErrorKey(key);
        setTimeout(() => setErrorKey(null), 3000);
      } else {
        setSavedKey(key);
        setTimeout(() => setSavedKey(null), 2500);
      }
    });
  }

  const categoryOrder = ['simulator', 'battery', 'business', 'regulatory'];
  const sortedCategories = [
    ...categoryOrder.filter((c) => grouped[c]),
    ...Object.keys(grouped).filter((c) => !categoryOrder.includes(c)),
  ];

  return (
    <div className="flex flex-col gap-5">
      {sortedCategories.map((cat) => (
        <div key={cat} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Cabecera de categoría */}
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {CATEGORY_LABELS[cat] ?? cat}
            </h2>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 text-left">
                <th className="px-5 py-2.5 text-xs font-medium text-gray-400">Parámetro</th>
                <th className="px-5 py-2.5 text-xs font-medium text-gray-400">Descripción</th>
                <th className="px-5 py-2.5 text-xs font-medium text-gray-400 text-right">Valor</th>
                <th className="px-5 py-2.5 text-xs font-medium text-gray-400 text-right">Actualizado</th>
                <th className="px-5 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {grouped[cat].map((p) => {
                const isEditing = editingId === p.id;
                const isSaved   = savedKey === p.key;
                const isError   = errorKey === p.key;

                return (
                  <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs text-gray-500 whitespace-nowrap">
                      {p.key}
                    </td>
                    <td className="px-5 py-3.5 text-gray-600 text-xs max-w-xs">
                      {p.description ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      {isEditing ? (
                        <input
                          type="number"
                          step="any"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-28 text-right border border-[#389fe0] rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#389fe0]/20"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter')  saveEdit(p.id, p.key);
                            if (e.key === 'Escape') cancelEdit();
                          }}
                        />
                      ) : (
                        <span className={`font-semibold tabular-nums ${isSaved ? 'text-green-600' : isError ? 'text-red-600' : 'text-gray-900'}`}>
                          {formatValue(p.key, p.value)}
                          {isSaved && <span className="ml-1.5 text-xs font-normal">✓</span>}
                          {isError && <span className="ml-1.5 text-xs font-normal">✗</span>}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right text-xs text-gray-400 whitespace-nowrap">
                      {formatDate(p.updated_at) ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      {isEditing ? (
                        <span className="flex gap-2 justify-end">
                          <button
                            onClick={() => saveEdit(p.id, p.key)}
                            disabled={isPending}
                            className="text-xs text-white bg-[#389fe0] hover:bg-[#1d65c5] px-3 py-1 rounded-lg transition-colors disabled:opacity-50"
                          >
                            Guardar
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1"
                          >
                            Cancelar
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => startEdit(p)}
                          className="text-xs text-[#389fe0] hover:text-[#1d65c5] font-medium transition-colors"
                        >
                          Editar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
