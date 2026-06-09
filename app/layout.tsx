import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { SITE_URL, SITE_NAME, OG_IMAGE } from '@/lib/seo';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });

export const viewport: Viewport = {
  themeColor: '#1d65c5',
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Mercado Energy — Energía limpia y sustentable',
    template: '%s — Mercado Energy',
  },
  description:
    'Diseñamos e instalamos sistemas solares fotovoltaicos a medida para hogares y empresas en Chile. Simula tu ahorro y conoce tu retorno de inversión.',
  applicationName: SITE_NAME,
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'es_CL',
    url: SITE_URL,
    title: 'Mercado Energy — Energía limpia y sustentable',
    description:
      'Sistemas solares fotovoltaicos a medida para hogares y empresas en Chile. Simula tu ahorro en minutos.',
    images: [OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mercado Energy — Energía limpia y sustentable',
    description:
      'Sistemas solares fotovoltaicos a medida para hogares y empresas en Chile. Simula tu ahorro en minutos.',
    images: [OG_IMAGE],
  },
};

// Datos estructurados de la empresa para resultados enriquecidos de Google.
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: SITE_NAME,
  legalName: 'Biznexus Group SpA',
  description:
    'Soluciones energéticas integrales en Chile: energía solar fotovoltaica, eólica, climatización eficiente y consultoría energética.',
  url: SITE_URL,
  email: 'contacto@mercadoenergy.cl',
  telephone: '+56966546276',
  image: `${SITE_URL}${OG_IMAGE}`,
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Miguel León Prado 134',
    addressLocality: 'Santiago',
    addressCountry: 'CL',
  },
  areaServed: 'CL',
  knowsAbout: [
    'Energía solar fotovoltaica',
    'Net billing',
    'Energía eólica',
    'Climatización eficiente',
    'Eficiencia energética',
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
