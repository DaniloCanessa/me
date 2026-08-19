import Link from 'next/link';
import { getExpenseCaptures, getReceiptSignedUrl } from '@/lib/db/expenses';
import { getPurchaseAccounts } from '@/lib/db/accounts';
import GastosManager from '@/components/admin/GastosManager';

export const metadata = { title: 'Capturar boleta' };

export default async function GastosPage() {
  const [captures, accounts] = await Promise.all([getExpenseCaptures(), getPurchaseAccounts()]);

  // URL firmada para la miniatura de cada boleta (bucket privado).
  const withUrls = await Promise.all(
    // Los gastos generales cargados a mano pueden no tener imagen.
    captures.map(async (c) => ({
      ...c,
      signedUrl: c.image_path ? await getReceiptSignedUrl(c.image_path) : null,
    }))
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Capturar boleta</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Boletas fotografiadas desde el celular, por revisar y clasificar. Las facturas con XML entran directo en Facturas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/facturas"
            className="rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 text-sm font-medium transition-colors">
            Ir a Facturas
          </Link>
          <Link href="/admin/gastos/capturar"
            className="bg-[#389fe0] hover:bg-[#1d65c5] text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
            + Capturar boleta
          </Link>
        </div>
      </div>
      <div className="px-4 sm:px-6 py-6">
        <GastosManager captures={withUrls} accounts={accounts} />
      </div>
    </div>
  );
}
