import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  // Páginas públicas con su prioridad relativa. /admin, /lab y /api quedan fuera.
  const routes: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }> = [
    { path: '/', priority: 1.0, changeFrequency: 'weekly' },
    { path: '/simulator', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/soluciones', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/proyectos', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/nosotros', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/contacto', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/net-billing', priority: 0.6, changeFrequency: 'yearly' },
    { path: '/terminos', priority: 0.3, changeFrequency: 'yearly' },
    { path: '/privacidad', priority: 0.3, changeFrequency: 'yearly' },
    { path: '/devoluciones', priority: 0.3, changeFrequency: 'yearly' },
  ];

  return routes.map((r) => ({
    url: `${SITE_URL}${r.path === '/' ? '' : r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
