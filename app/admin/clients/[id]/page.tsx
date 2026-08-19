import { notFound } from 'next/navigation';
import { getClient, getClientActivities } from '@/lib/db/clients';
import { getQuotesByClient } from '@/lib/db/quotes';
import { getProjectsByClient } from '@/lib/db/projects';
import { getClientSimulations } from '@/lib/db/simulations';
import { getBillSignedUrl } from '@/lib/db/bills';
import ClientDetail from '@/components/admin/ClientDetail';

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [client, activities, quotes, projects, simulations] = await Promise.all([
    getClient(id),
    getClientActivities(id),
    getQuotesByClient(id),
    getProjectsByClient(id),
    getClientSimulations(id),
  ]);

  if (!client) notFound();

  // URLs firmadas de las boletas archivadas (bucket privado), indexadas por id.
  const billUrls: Record<string, string> = {};
  await Promise.all(
    simulations.flatMap((s) => s.bills ?? []).map(async (b) => {
      const url = await getBillSignedUrl(b.file_path);
      if (url) billUrls[b.id] = url;
    }),
  );

  return (
    <ClientDetail
      client={client}
      activities={activities}
      quotes={quotes}
      projects={projects}
      simulations={simulations}
      billUrls={billUrls}
    />
  );
}
