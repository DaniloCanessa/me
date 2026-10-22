import { getTenders, getTenderKeywords, getTenderRecipients, getTenderSearches } from '@/lib/db/tenders';
import TendersManager from '@/components/admin/TendersManager';

// Licitaciones de Mercado Público que calzan con los servicios de Mercado Energy.
// La sincronización corre a diario por cron (/api/cron/tenders) y también
// manualmente desde el botón "Sincronizar ahora".
export default async function LicitacionesPage() {
  const [tenders, keywords, recipients, searches] = await Promise.all([
    getTenders(),
    getTenderKeywords(),
    getTenderRecipients(),
    getTenderSearches(),
  ]);

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Licitaciones — Mercado Público</h1>
        <p className="text-sm text-gray-500 mt-1">
          Licitaciones del Estado que calzan con nuestros servicios. Se sincroniza a diario;
          cada búsqueda tiene sus palabras clave y sus correos, configurables abajo.
        </p>
      </div>
      <TendersManager tenders={tenders} searches={searches} keywords={keywords} recipients={recipients} />
    </div>
  );
}
