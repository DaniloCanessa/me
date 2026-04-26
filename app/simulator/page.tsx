import { getSimConfig } from '@/lib/db/config';
import { getResidentialCatalog } from '@/lib/db/catalog';
import SimulatorClient from './SimulatorClient';

export default async function SimulatorPage() {
  const [config, catalog] = await Promise.all([
    getSimConfig(),
    getResidentialCatalog(),
  ]);
  return <SimulatorClient config={config} catalog={catalog} />;
}
