import { getFinanzas } from '@/lib/db/finanzas';
import FinanzasView from '@/components/admin/FinanzasView';

export const metadata = { title: 'Finanzas' };

export default async function FinanzasPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const mes = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes)
    ? sp.mes
    : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [y, m] = mes.split('-').map(Number);
  const desde = `${mes}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const hasta = `${mes}-${String(lastDay).padStart(2, '0')}`;
  const label = new Date(y, m - 1, 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });

  const resumen = await getFinanzas(desde, hasta);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4">
        <h1 className="text-lg font-bold text-gray-900">Finanzas</h1>
        <p className="text-xs text-gray-400 mt-0.5">
          Estado de resultados (base caja): ventas cobradas − gastos de proyectos − gastos generales.
        </p>
      </div>
      <div className="px-4 sm:px-6 py-6">
        <FinanzasView resumen={resumen} mes={mes} label={label} />
      </div>
    </div>
  );
}
