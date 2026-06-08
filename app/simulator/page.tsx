import { getSimConfig } from '@/lib/db/config';
import { getResidentialCatalog } from '@/lib/db/catalog';
import { isAdminAuthenticated } from '@/lib/auth';
import SimulatorClient from './SimulatorClient';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Simulador solar',
  description:
    'Simula gratis el ahorro de tu sistema solar fotovoltaico según tu consumo y región en Chile. Resultados en minutos, sin registro.',
  path: '/simulator',
});

export default async function SimulatorPage() {
  const [config, catalog, ocrEnabled] = await Promise.all([
    getSimConfig(),
    getResidentialCatalog(),
    // El OCR de boletas (Opus 4.8) es solo para usuarios internos con sesión de admin
    isAdminAuthenticated(),
  ]);
  return <SimulatorClient config={config} catalog={catalog} ocrEnabled={ocrEnabled} />;
}
