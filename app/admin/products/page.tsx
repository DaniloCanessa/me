import Link from 'next/link';
import { getSupabaseAdmin } from '@/lib/supabase';
import ProductsManager from '@/components/admin/ProductsManager';

export default async function ProductsPage() {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from('products')
    .select('*')
    .order('category')
    .order('sort_order', { ascending: true });

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Catálogo de productos</h1>
          <p className="text-sm text-gray-500 mt-1">
            Kits fotovoltaicos y componentes. Los precios y specs se usan en el simulador.
          </p>
        </div>
        <Link href="/admin/products/import"
          className="flex items-center gap-2 border border-gray-200 hover:border-[#389fe0] text-gray-600 hover:text-[#1d65c5] px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap">
          ↑ Importar desde Excel
        </Link>
      </div>
      <ProductsManager products={data ?? []} />
    </div>
  );
}
