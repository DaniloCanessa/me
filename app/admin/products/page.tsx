import Link from 'next/link';
import { getSupabaseAdmin } from '@/lib/supabase';
import ProductsManager from '@/components/admin/ProductsManager';

export default async function ProductsPage() {
  const db = getSupabaseAdmin();

  // Supabase devuelve máximo 1000 filas por request: paginamos para traer
  // el catálogo completo (los solar_kit son la última categoría alfabética
  // y quedaban fuera del corte cuando el catálogo superó las 1000 filas).
  const PAGE_SIZE = 1000;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data: page } = await db
      .from('products')
      .select('*')
      .order('category')
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true }) // desempate estable para paginar sin duplicados
      .range(from, from + PAGE_SIZE - 1);
    if (!page?.length) break;
    data.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

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
