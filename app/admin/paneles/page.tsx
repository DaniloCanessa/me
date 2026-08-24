import { getPanels, getKitsForMatrix } from '@/lib/db/panels';
import PanelesManager from '@/components/admin/PanelesManager';

export const metadata = { title: 'Paneles' };

// Catálogo de paneles y su asignación a los kits.
//
// Existe porque la potencia de los paneles cambia rápido y los kWp de cada kit
// se escribían a mano, lo que permitía que un kit declarara una potencia que sus
// propios componentes no daban. Acá el panel se define una vez y el kit apunta
// a uno; la potencia real y la superficie se derivan.

export default async function PanelesPage() {
  const [panels, kits] = await Promise.all([getPanels(), getKitsForMatrix()]);

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Paneles</h1>
        <p className="text-sm text-gray-500 mt-1">
          El simulador toma de aquí la potencia y las medidas para calcular los kW reales y los
          m² de superficie de cada kit. El nombre comercial del kit no cambia: cuando la potencia
          real difiere, el informe muestra las dos — por ejemplo <em>PFV 8,8 kW (8,4 kW)</em>.
        </p>
      </header>

      <PanelesManager panels={panels} kits={kits} />
    </div>
  );
}
