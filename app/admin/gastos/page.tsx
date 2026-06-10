import Link from 'next/link';
import { getExpenseCaptures, getReceiptSignedUrl } from '@/lib/db/expenses';
import { getProjects } from '@/lib/db/projects';
import GastosManager from '@/components/admin/GastosManager';

export const metadata = { title: 'Gastos' };

export default async function GastosPage() {
  const [captures, projects] = await Promise.all([getExpenseCaptures(), getProjects()]);

  // URL firmada para la miniatura de cada boleta (bucket privado).
  const withUrls = await Promise.all(
    captures.map(async (c) => ({ ...c, signedUrl: await getReceiptSignedUrl(c.image_path) }))
  );

  const opts = projects
    .filter((p) => p.estado === 'pendiente' || p.estado === 'en_ejecucion')
    .map((p) => ({ id: p.id, nombre: p.nombre }));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Gastos</h1>
          <p className="text-xs text-gray-400 mt-0.5">Bandeja de boletas y facturas por revisar y aprobar.</p>
        </div>
        <Link href="/admin/gastos/capturar"
          className="bg-[#389fe0] hover:bg-[#1d65c5] text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
          + Capturar gasto
        </Link>
      </div>
      <div className="px-4 sm:px-6 py-6">
        <GastosManager captures={withUrls} projects={opts} />
      </div>
    </div>
  );
}
