import type { Metadata } from 'next';

// Dominio canónico definitivo (con www). Usado por metadataBase, sitemap, robots y JSON-LD.
export const SITE_URL = 'https://www.mercadoenergy.cl';
export const SITE_NAME = 'Mercado Energy';
export const OG_IMAGE = '/og-image.jpg';

// Genera la metadata de una página pública: <title> (con plantilla del layout),
// descripción, URL canónica y tarjetas Open Graph / Twitter con la imagen de marca.
export function pageMetadata({
  title,
  description,
  path,
}: {
  title: string; // título corto, sin sufijo de marca (la plantilla del layout añade " — Mercado Energy")
  description: string;
  path: string; // ruta relativa, ej. '/soluciones' o '/' para el home
}): Metadata {
  const fullTitle = `${title} — ${SITE_NAME}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: fullTitle,
      description,
      url: path,
      siteName: SITE_NAME,
      locale: 'es_CL',
      type: 'website',
      images: [OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [OG_IMAGE],
    },
  };
}
