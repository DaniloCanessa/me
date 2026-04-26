import Link from 'next/link';
import ProductImporter from '@/components/admin/ProductImporter';

export default function ImportProductsPage() {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/products"
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
          ← Catálogo
        </Link>
        <span className="text-gray-200">/</span>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Importar productos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Sube un archivo Excel o CSV para agregar o actualizar productos en masa.
          </p>
        </div>
      </div>
      <ProductImporter />
    </div>
  );
}
