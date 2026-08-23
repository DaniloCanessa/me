import { getSimConfig } from '@/lib/db/config';
import { getResidentialCatalog } from '@/lib/db/catalog';
import { getClientsForSimulator } from '@/lib/db/clients';
import { getSimulation } from '@/lib/db/simulations';
import SimulatorClient from '@/app/simulator/SimulatorClient';
import type { WizardState } from '@/lib/types';

// Simulador dentro del backoffice: misma lógica que /simulator, pero renderizado
// junto al sidebar (layout admin) y con OCR habilitado. La ruta /admin/* ya está
// protegida por proxy.ts, por lo que solo usuarios con sesión llegan aquí.
//
// Con `?simulacion=<id>` se REABRE una simulación guardada: se carga el estado
// completo del wizard tal como quedó, para corregir un consumo mal leído o
// cambiar el kit. Guardar después no la sobrescribe: crea una versión nueva.
export default async function AdminSimulatorPage({
  searchParams,
}: {
  searchParams: Promise<{ simulacion?: string }>;
}) {
  const sp = await searchParams;

  const [config, catalog, clients, simulacion] = await Promise.all([
    getSimConfig(),
    getResidentialCatalog(),
    getClientsForSimulator(),
    sp.simulacion ? getSimulation(sp.simulacion) : Promise.resolve(null),
  ]);

  // El estado guardado se usa tal cual, pero forzando el paso de resultados:
  // al reabrir se quiere ver el resultado y desde ahí retroceder si hace falta.
  const reabrir = simulacion?.input_json
    ? {
        state: { ...(simulacion.input_json as WizardState), step: 'results' as const },
        simulationId: simulacion.id,
        clientId: simulacion.client_id,
        installationId: simulacion.installation_id,
        clienteNombre: simulacion.client_nombre ?? '',
        instalacionNombre: simulacion.installation_nombre ?? null,
        fechaSimulacion: simulacion.fecha_simulacion,
        fechaBoleta: simulacion.fecha_boleta,
        numeroBoleta: simulacion.numero_boleta,
      }
    : null;

  return (
    <SimulatorClient
      config={config}
      catalog={catalog}
      clients={clients}
      reabrir={reabrir}
      ocrEnabled
      embedded
    />
  );
}
