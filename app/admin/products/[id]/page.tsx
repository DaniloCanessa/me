import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase';
import ProductEditForm from './ProductEditForm';

export default async function ProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getSupabaseAdmin();
  const { data: product } = await db.from('products').select('*').eq('id', id).single();
  if (!product) notFound();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-xl mx-auto">
        <div className="mb-5">
          <a href="/admin/products" className="text-xs text-gray-400 hover:text-gray-600">← Catálogo</a>
          <h1 className="text-lg font-bold text-gray-900 mt-1">{product.name}</h1>
          <p className="text-xs font-mono text-gray-400 mt-0.5">{product.sku}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <ProductEditForm product={product} />
        </div>
      </div>
    </div>
  );
}
