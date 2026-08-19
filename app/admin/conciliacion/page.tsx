import { redirect } from 'next/navigation';

// La conciliación pasó a ser una pestaña del módulo unificado de Facturas
// (sesión 32). La ruta se conserva para no romper enlaces guardados.
export default async function ConciliacionPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const sp = await searchParams;
  const mes = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? `&mes=${sp.mes}` : '';
  redirect(`/admin/facturas?tab=conciliacion${mes}`);
}
