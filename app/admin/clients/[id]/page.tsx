import { notFound } from 'next/navigation';
import { getClient, getClientActivities } from '@/lib/db/clients';
import { getQuotesByClient } from '@/lib/db/quotes';
import { getProjectsByClient } from '@/lib/db/projects';
import ClientDetail from '@/components/admin/ClientDetail';

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [client, activities, quotes, projects] = await Promise.all([
    getClient(id),
    getClientActivities(id),
    getQuotesByClient(id),
    getProjectsByClient(id),
  ]);

  if (!client) notFound();

  return <ClientDetail client={client} activities={activities} quotes={quotes} projects={projects} />;
}
