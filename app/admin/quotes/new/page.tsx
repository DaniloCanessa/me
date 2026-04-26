import { redirect } from 'next/navigation';
import { createQuote } from '../actions';

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ client_id?: string; installation_id?: string }>;
}) {
  const { client_id, installation_id } = await searchParams;

  if (!client_id) redirect('/admin/clients');

  await createQuote(client_id, installation_id);
}
