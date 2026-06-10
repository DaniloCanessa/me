import Link from 'next/link';
import { getProjects } from '@/lib/db/projects';
import CaptureExpenseForm from '@/components/admin/CaptureExpenseForm';

export const metadata = { title: 'Capturar gasto' };

export default async function CapturarGastoPage() {
  const projects = await getProjects();
  // Solo proyectos vigentes para el selector (los cancelados/completados estorban).
  const opts = projects
    .filter((p) => p.estado === 'pendiente' || p.estado === 'en_ejecucion')
    .map((p) => ({ id: p.id, nombre: p.nombre }));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4">
        <Link href="/admin/gastos" className="text-xs text-gray-400 hover:text-gray-600 mb-2 inline-block">← Bandeja de gastos</Link>
        <h1 className="text-lg font-bold text-gray-900">Capturar gasto</h1>
        <p className="text-xs text-gray-400 mt-0.5">Sube la foto de una boleta o factura. La revisas y apruebas después.</p>
      </div>
      <div className="px-4 sm:px-6 py-6">
        <CaptureExpenseForm projects={opts} />
      </div>
    </div>
  );
}
