'use client';

import { useState } from 'react';

export type SortDir = 'asc' | 'desc';
export type SortState<K extends string> = { key: K; dir: SortDir } | null;

type SortValue = string | number | null | undefined;

/** Compara valores para ordenar: números como números, textos en español con
 *  orden "natural" (COT-2 antes que COT-10). Vacíos siempre al final. */
function compare(a: SortValue, b: SortValue, dir: SortDir) {
  const emptyA = a === null || a === undefined || a === '';
  const emptyB = b === null || b === undefined || b === '';
  if (emptyA && emptyB) return 0;
  if (emptyA) return 1;
  if (emptyB) return -1;
  const r = typeof a === 'number' && typeof b === 'number'
    ? a - b
    : String(a).localeCompare(String(b), 'es', { numeric: true, sensitivity: 'base' });
  return dir === 'asc' ? r : -r;
}

/**
 * Orden por columna. Cada clic en el encabezado alterna:
 * ascendente → descendente → orden original.
 */
export function useSort<T, K extends string>(
  rows: T[],
  getters: Record<K, (row: T) => SortValue>,
) {
  const [sort, setSort] = useState<SortState<K>>(null);

  function toggle(key: K) {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  }

  const sorted = sort
    ? [...rows].sort((x, y) => compare(getters[sort.key](x), getters[sort.key](y), sort.dir))
    : rows;

  return { sorted, sort, toggle };
}

export default function SortableHeader<K extends string>({
  label,
  sortKey,
  sort,
  onSort,
  className = '',
  align = 'left',
}: {
  label: string;
  sortKey: K;
  sort: SortState<K>;
  onSort: (key: K) => void;
  className?: string;
  align?: 'left' | 'right' | 'center';
}) {
  const active = sort?.key === sortKey;
  const arrow  = !active ? '↕' : sort!.dir === 'asc' ? '↑' : '↓';
  const justify = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';

  return (
    <th
      className={className}
      aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 w-full ${justify} uppercase tracking-wide hover:text-gray-800 transition-colors ${
          active ? 'text-gray-800' : ''
        }`}
      >
        {label}
        <span className={`text-[10px] ${active ? 'text-[#389fe0]' : 'text-gray-300'}`}>{arrow}</span>
      </button>
    </th>
  );
}
