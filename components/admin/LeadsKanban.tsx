'use client';

import { useState, useTransition } from 'react';
import { moveLeadToStatus } from '@/app/admin/leads/actions';
import type { Lead, LeadStatus } from '@/app/admin/leads/page';
import type { AdminUser } from '@/lib/types';

const COLUMNS: { status: LeadStatus; label: string; headerClass: string }[] = [
  { status: 'new',       label: 'Nuevo',      headerClass: 'border-gray-300 text-gray-700' },
  { status: 'contacted', label: 'Contactado', headerClass: 'border-blue-300 text-blue-700' },
  { status: 'quoted',    label: 'Cotizado',   headerClass: 'border-amber-300 text-amber-700' },
  { status: 'won',       label: 'Ganado',     headerClass: 'border-green-400 text-green-700' },
  { status: 'lost',      label: 'Perdido',    headerClass: 'border-red-300 text-red-600' },
];

function clp(n: number | null) {
  if (n == null) return null;
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
}

export default function LeadsKanban({ leads, users }: { leads: Lead[]; users: AdminUser[] }) {
  const [items, setItems] = useState(leads);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<LeadStatus | null>(null);
  const [, startTransition] = useTransition();

  const usersMap = Object.fromEntries(users.map(u => [u.id, u.name]));
  const today = new Date().toISOString().slice(0, 10);

  function handleDragStart(id: string) {
    setDragging(id);
  }

  function handleDrop(targetStatus: LeadStatus) {
    if (!dragging) return;
    const lead = items.find(l => l.id === dragging);
    setDragOver(null);
    if (!lead || lead.status === targetStatus) { setDragging(null); return; }

    setItems(prev => prev.map(l => l.id === dragging ? { ...l, status: targetStatus } : l));
    const movedId = dragging;
    setDragging(null);
    startTransition(async () => {
      await moveLeadToStatus(movedId, targetStatus);
    });
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {COLUMNS.map(col => {
        const colLeads = items.filter(l => l.status === col.status);
        const isOver = dragOver === col.status;

        return (
          <div
            key={col.status}
            onDragOver={e => { e.preventDefault(); setDragOver(col.status); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={() => handleDrop(col.status)}
            className={`flex-1 min-w-52 flex flex-col gap-2 rounded-2xl transition-colors ${isOver ? 'bg-blue-50/60' : ''}`}
          >
            {/* Column header */}
            <div className={`flex items-center justify-between px-3 py-2 rounded-xl border-2 bg-white ${col.headerClass}`}>
              <span className="text-xs font-semibold">{col.label}</span>
              <span className="text-xs font-medium opacity-60">{colLeads.length}</span>
            </div>

            {/* Drop zone hint */}
            {isOver && dragging && (
              <div className="rounded-xl border-2 border-dashed border-[#389fe0] py-3 text-center">
                <p className="text-xs text-[#389fe0]">Soltar aquí</p>
              </div>
            )}

            {/* Cards */}
            {colLeads.map(lead => {
              const isOverdue = lead.follow_up_date ? lead.follow_up_date < today : false;
              const hasFollowUp = !!lead.follow_up_date;

              return (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={e => { e.stopPropagation(); handleDragStart(lead.id); }}
                  onDragEnd={() => setDragging(null)}
                  className={`bg-white rounded-xl border border-gray-100 p-3 shadow-sm cursor-grab active:cursor-grabbing transition-all hover:border-[#389fe0] hover:shadow-md ${dragging === lead.id ? 'opacity-40' : ''}`}
                >
                  <a href={`/admin/leads/${lead.id}`} className="block" onClick={e => e.stopPropagation()}>
                    <p className="text-sm font-semibold text-gray-900 truncate hover:text-[#389fe0]">{lead.name ?? lead.email}</p>
                  </a>
                  <p className="text-xs text-gray-400 truncate">{lead.email}</p>

                  <div className="flex flex-col gap-1 mt-2">
                    {lead.kit_size_kwp && (
                      <p className="text-xs text-gray-500">{lead.kit_size_kwp} kWp{lead.monthly_benefit_clp ? ` · ${clp(lead.monthly_benefit_clp)}/mes` : ''}</p>
                    )}
                    {lead.region_name && (
                      <p className="text-xs text-gray-400">{lead.region_name}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {lead.assigned_to && usersMap[lead.assigned_to] && (
                      <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                        {usersMap[lead.assigned_to]}
                      </span>
                    )}
                    {hasFollowUp && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                        {isOverdue ? '⚠ ' : '📅 '}{lead.follow_up_date}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {colLeads.length === 0 && !isOver && (
              <div className="rounded-xl border-2 border-dashed border-gray-100 py-6 text-center">
                <p className="text-xs text-gray-300">Sin leads</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
