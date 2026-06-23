import { getBalanceAnual, getHonorarios } from '@/lib/db/balance';
import BalanceView from '@/components/admin/BalanceView';

export const metadata = { title: 'Balance anual' };

export default async function BalancePage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const anio = sp.anio && /^\d{4}$/.test(sp.anio) ? Number(sp.anio) : now.getFullYear();

  const [balance, honorarios] = await Promise.all([getBalanceAnual(anio), getHonorarios(anio)]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4">
        <h1 className="text-lg font-bold text-gray-900">Balance anual</h1>
        <p className="text-xs text-gray-400 mt-0.5">
          Pre-balance del ejercicio (RCV + F29 + honorarios). Disponible en cualquier momento; cuadra al cierre del año.
        </p>
      </div>
      <div className="px-4 sm:px-6 py-6">
        <BalanceView balance={balance} honorarios={honorarios} anio={anio} />
      </div>
    </div>
  );
}
