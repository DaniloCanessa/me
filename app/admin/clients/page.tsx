import { getClients } from '@/lib/db/clients';
import ClientsManager from '@/components/admin/ClientsManager';

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const clients   = await getClients();
  const fromQuotes = from === 'quotes';

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Clientes</h1>
        <p className="text-sm text-gray-500 mt-1">
          {clients.length} cliente{clients.length !== 1 ? 's' : ''}
        </p>
      </div>
      <ClientsManager clients={clients} fromQuotes={fromQuotes} />
    </div>
  );
}
