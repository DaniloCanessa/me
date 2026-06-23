import { getConciliacion } from '@/lib/db/sii';
import ConciliacionView from '@/components/admin/ConciliacionView';

export const metadata = { title: 'Conciliación SII' };

export default async function ConciliacionPage({
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
  const label = new Date(y, m - 1, 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });

  const conciliacion = await getConciliacion(mes);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4">
        <h1 className="text-lg font-bold text-gray-900">Conciliación SII</h1>
        <p className="text-xs text-gray-400 mt-0.5">
          Cruza tus registros contra el RCV del SII (compras y ventas). Detecta facturas que faltan en un lado u otro.
        </p>
      </div>
      <div className="px-4 sm:px-6 py-6">
        <ConciliacionView conciliacion={conciliacion} mes={mes} label={label} />
      </div>
    </div>
  );
}
