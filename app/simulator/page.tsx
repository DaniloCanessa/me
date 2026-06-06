import { getSimConfig } from '@/lib/db/config';
import { getResidentialCatalog } from '@/lib/db/catalog';
import { isAdminAuthenticated } from '@/lib/auth';
import SimulatorClient from './SimulatorClient';

export default async function SimulatorPage() {
  const [config, catalog, ocrEnabled] = await Promise.all([
    getSimConfig(),
    getResidentialCatalog(),
    // El OCR de boletas (Opus 4.8) es solo para usuarios internos con sesión de admin
    isAdminAuthenticated(),
  ]);
  return <SimulatorClient config={config} catalog={catalog} ocrEnabled={ocrEnabled} />;
}
