'use client';

import { useState } from 'react';
import type { FinanzasResumen } from '@/lib/db/finanzas';
import type { F29Result } from '@/lib/db/f29';
import FinanzasView from './FinanzasView';
import F29View from './F29View';

export default function FinanzasTabs({
  resumen, f29, mes, label,
}: {
  resumen: FinanzasResumen;
  f29: F29Result;
  mes: string;
  label: string;
}) {
  const [tab, setTab] = useState<'caja' | 'f29'>('caja');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm w-fit">
        {([['caja', 'Caja'], ['f29', 'F29 (IVA)']] as const).map(([k, lbl]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 font-medium transition-colors ${tab === k ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
            {lbl}
          </button>
        ))}
      </div>

      {tab === 'caja'
        ? <FinanzasView resumen={resumen} mes={mes} label={label} />
        : <F29View f29={f29} mes={mes} label={label} />}
    </div>
  );
}
