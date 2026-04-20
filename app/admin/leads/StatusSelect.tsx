'use client';

import type { LeadStatus } from './page';

const STATUS_LABELS: Record<LeadStatus, string> = {
  new:       'Nuevo',
  contacted: 'Contactado',
  quoted:    'Cotizado',
  won:       'Ganado',
  lost:      'Perdido',
};

const STATUS_COLORS: Record<LeadStatus, string> = {
  new:       'bg-blue-100 text-blue-700',
  contacted: 'bg-amber-100 text-amber-700',
  quoted:    'bg-purple-100 text-purple-700',
  won:       'bg-green-100 text-green-700',
  lost:      'bg-gray-100 text-gray-500',
};

export default function StatusSelect({ id, status, action }: {
  id: string;
  status: LeadStatus;
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={action} className="flex justify-center">
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        defaultValue={status}
        onChange={(e) => {
          const form = e.currentTarget.closest('form') as HTMLFormElement;
          form.requestSubmit();
        }}
        className={`rounded-lg border-0 text-xs font-medium px-2 py-1 cursor-pointer focus:ring-2 focus:ring-green-400 ${STATUS_COLORS[status]}`}
      >
        {Object.entries(STATUS_LABELS).map(([val, label]) => (
          <option key={val} value={val}>{label}</option>
        ))}
      </select>
    </form>
  );
}
