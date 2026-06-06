import { getSimConfig } from '@/lib/db/config';
import { getResidentialCatalog } from '@/lib/db/catalog';
import SimulatorClient from '@/app/simulator/SimulatorClient';

// Simulador dentro del backoffice: misma lógica que /simulator, pero renderizado
// junto al sidebar (layout admin) y con OCR habilitado. La ruta /admin/* ya está
// protegida por proxy.ts, por lo que solo usuarios con sesión llegan aquí.
export default async function AdminSimulatorPage() {
  const [config, catalog] = await Promise.all([
    getSimConfig(),
    getResidentialCatalog(),
  ]);
  return <SimulatorClient config={config} catalog={catalog} ocrEnabled embedded />;
}
