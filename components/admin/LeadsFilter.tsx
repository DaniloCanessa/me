'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export default function LeadsFilter({ regions }: { regions: string[] }) {
  const router = useRouter();
  const params = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    router.push(`/admin/leads?${next.toString()}`);
  }

  const isFollowupActive = params.get('followup') === 'pending';

  function toggleFollowup() {
    const next = new URLSearchParams(params.toString());
    if (isFollowupActive) {
      next.delete('followup');
    } else {
      next.set('followup', 'pending');
    }
    router.push(`/admin/leads?${next.toString()}`);
  }

  const hasActiveFilters = !!(params.get('tipo') || params.get('region') || params.get('followup'));

  return (
    <div className="flex gap-2 flex-wrap">
      <button
        onClick={toggleFollowup}
        className={`border rounded-xl px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
          isFollowupActive
            ? 'bg-amber-500 border-amber-500 text-white'
            : 'border-gray-200 bg-white text-gray-700 hover:border-amber-400 hover:text-amber-600'
        }`}
      >
        ⚠ Seguimiento pendiente
      </button>

      <select
        value={params.get('tipo') ?? ''}
        onChange={(e) => update('tipo', e.target.value)}
        className="border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white text-gray-700 focus:outline-none focus:border-[#389fe0] cursor-pointer"
      >
        <option value="">Todos los tipos</option>
        <option value="natural">Residencial</option>
        <option value="business">Empresa</option>
      </select>

      <select
        value={params.get('region') ?? ''}
        onChange={(e) => update('region', e.target.value)}
        className="border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white text-gray-700 focus:outline-none focus:border-[#389fe0] cursor-pointer"
      >
        <option value="">Todas las regiones</option>
        {regions.map(r => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>

      {hasActiveFilters && (
        <button
          onClick={() => {
            const next = new URLSearchParams(params.toString());
            next.delete('tipo');
            next.delete('region');
            next.delete('followup');
            router.push(`/admin/leads?${next.toString()}`);
          }}
          className="text-xs text-gray-400 hover:text-gray-600 px-2"
        >
          × Limpiar filtros
        </button>
      )}
    </div>
  );
}
