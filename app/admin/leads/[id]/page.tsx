import { getSupabaseAdmin } from '@/lib/supabase';
import { redirect } from 'next/navigation';
import { getUsers } from '@/lib/db/users';
import LeadCRM from './LeadCRM';
import type { Lead } from '../page';

export type LeadNote = {
  id: string;
  lead_id: string;
  tipo: string;
  contenido: string;
  created_at: string;
};

export type LeadStatusHistory = {
  id: string;
  lead_id: string;
  from_status: string | null;
  to_status: string;
  created_at: string;
};

export type QuoteSummaryForLead = {
  id: string;
  quote_number: string;
  status: string;
  total_clp: number;
  created_at: string;
};

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = getSupabaseAdmin();

  const [leadRes, notesRes, historyRes, quotesRes, users] = await Promise.all([
    db.from('leads').select('*').eq('id', id).single(),
    db.from('lead_notes').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
    db.from('lead_status_history').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
    db.from('quotes')
      .select('id, quote_number, status, total_clp, created_at')
      .eq('lead_id', id)
      .order('created_at', { ascending: false }),
    getUsers(),
  ]);

  if (!leadRes.data) redirect('/admin/leads');

  return (
    <LeadCRM
      lead={leadRes.data as Lead}
      notes={(notesRes.data ?? []) as LeadNote[]}
      history={(historyRes.data ?? []) as LeadStatusHistory[]}
      quotes={(quotesRes.data ?? []) as QuoteSummaryForLead[]}
      users={users}
    />
  );
}
