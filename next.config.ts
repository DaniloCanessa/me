import type { NextConfig } from "next";
import path from "path";

/**
 * Redirecciones 301 del sitio antiguo (tienda e-commerce mercadoenergy.cl)
 * al sitio nuevo. El sitio viejo tenía ~154 URLs, en su mayoría fichas de
 * producto que ya no existen como tienda. Estrategia (sesión 23):
 *  - Páginas institucionales → su equivalente 1:1.
 *  - Fichas de producto (solar, climatización, calefont/termos, piscinas,
 *    accesorios) → catch-all por categoría a /soluciones.
 * Se usa `statusCode: 301` (no `permanent`, que en Next.js emite 308) para
 * el 301 permanente clásico que traspasa el ranking a la URL nueva.
 */
async function redirects() {
  const r301 = (source: string, destination: string) => ({
    source,
    destination,
    statusCode: 301 as const,
  });

  // Institucionales: mapeo 1:1
  const oneToOne: Array<[string, string]> = [
    ["/nosostros", "/nosotros"], // (typo del sitio viejo, así está indexado)
    ["/contact", "/contacto"],
    ["/servicios", "/soluciones"],
    ["/terminos-y-condiciones", "/terminos"],
    ["/politica-de-privacidad", "/privacidad"],
    ["/politica-de-reembolso", "/devoluciones"],
    ["/forma-de-pago", "/net-billing"],
    ["/blog", "/"],
    ["/entrada-del-blog", "/"],
  ];

  // Fichas y categorías de producto → /soluciones
  const toSoluciones: string[] = [
    // Energía solar
    "/energia-solar",
    "/energia-solar/:path*",
    "/kit-fotovoltaico-:slug",
    // Climatización / aire acondicionado
    "/climatizacion",
    "/climatizacion/:path*",
    "/aire-acondicionado-:slug",
    "/ac-split-:slug",
    "/black-mirror-:slug",
    "/split-muro-:slug",
    "/instalacion-de-aire-acondicionado",
    "/mantencion-de-aire-acondicionado",
    "/mantencion-de-aire-acondicionado-:slug",
    "/servicio-de-instalacion-:slug",
    // Calefont y termos
    "/calefont-y-termos",
    "/calefont-y-termos/:path*",
    "/calefont-:slug",
    "/kit-ducto-:slug",
    "/termo-:slug",
    "/termos-:slug",
    // Calentadores de piscina
    "/calentador-de-piscina",
    "/calentador-de-piscina/:path*",
    "/calentador-de-piscina-:slug",
    "/bomba-de-calor-:slug",
    "/bomba-presurizadora-:slug",
    // Accesorios
    "/accesorios",
    "/accesorios/:path*",
  ];

  // Consolidación SEO (sesión 24): la URL de producción .vercel.app redirige
  // (301) al dominio canónico www.mercadoenergy.cl. Solo matchea ese host
  // exacto — no afecta a los previews ni al propio dominio nuevo.
  const vercelToDomain = {
    source: "/:path*",
    has: [{ type: "host" as const, value: "mercado-energy.vercel.app" }],
    destination: "https://www.mercadoenergy.cl/:path*",
    statusCode: 301 as const,
  };

  return [
    vercelToDomain,
    ...oneToOne.map(([source, destination]) => r301(source, destination)),
    ...toSoluciones.map((source) => r301(source, "/soluciones")),
  ];
}

// El service worker no debe cachearse, para que los clientes reciban siempre
// la última versión. Se sirve con el content-type correcto.
async function headers() {
  return [
    {
      source: "/sw.js",
      headers: [
        { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
      ],
    },
  ];
}

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      tailwindcss: path.resolve(__dirname, "node_modules/tailwindcss"),
    },
  },
  redirects,
  headers,
};

export default nextConfig;
