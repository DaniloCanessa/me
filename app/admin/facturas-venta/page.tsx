import { redirect } from 'next/navigation';

// Las facturas de venta pasaron a ser una pestaña del módulo unificado de
// Facturas (sesión 32). La ruta se conserva para no romper enlaces guardados.
export default function FacturasVentaPage() {
  redirect('/admin/facturas?tab=ventas');
}
