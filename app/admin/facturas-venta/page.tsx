import { getSalesInvoices, getSalesInvoiceDocSignedUrl } from '@/lib/db/sales';
import { getProjects } from '@/lib/db/projects';
import SalesInvoicesManager from '@/components/admin/SalesInvoicesManager';

export const metadata = { title: 'Facturas de venta' };

export default async function FacturasVentaPage() {
  const [invoices, projects] = await Promise.all([getSalesInvoices(), getProjects()]);

  // URL firmada para el documento del SII (bucket privado).
  const withUrls = await Promise.all(
    invoices.map(async (inv) => ({
      ...inv,
      signedUrl: inv.image_path ? await getSalesInvoiceDocSignedUrl(inv.image_path) : null,
    })),
  );

  const projectOpts = projects
    .filter((p) => p.estado !== 'cancelado')
    .map((p) => ({ id: p.id, nombre: p.nombre, client_name: p.client_name }));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4">
        <h1 className="text-lg font-bold text-gray-900">Facturas de venta</h1>
        <p className="text-xs text-gray-400 mt-0.5">
          Documentos de venta emitidos (IVA débito del F29). Registra a mano o sube el PDF del SII.
        </p>
      </div>
      <div className="px-4 sm:px-6 py-6">
        <SalesInvoicesManager invoices={withUrls} projects={projectOpts} />
      </div>
    </div>
  );
}
