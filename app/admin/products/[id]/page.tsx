import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase';
import ProductEditForm from './ProductEditForm';
import type { SolarPanel } from '@/lib/types';

export default async function ProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getSupabaseAdmin();
  const { data: product } = await db.from('products').select('*').eq('id', id).single();
  if (!product) notFound();

  // El panel se lee aparte para que el formulario pueda calcular kWp y m² en
  // vivo mientras se edita la cantidad de paneles. Va en su propia consulta y
  // no en un join: así un kit sin panel —o la tabla aún sin migrar— no impide
  // abrir la ficha del producto.
  let panel: SolarPanel | null = null;
  if (product.category === 'solar_kit' && product.panel_id) {
    const { data: p } = await db
      .from('solar_panels')
      .select('id, nombre, potencia_w, peso_kg, ancho_mm, largo_mm, espesor_mm')
      .eq('id', product.panel_id)
      .maybeSingle();
    if (p) {
      panel = {
        id: p.id, nombre: p.nombre, potenciaW: p.potencia_w,
        pesoKg: p.peso_kg == null ? null : Number(p.peso_kg),
        anchoMm: p.ancho_mm, largoMm: p.largo_mm,
        espesorMm: p.espesor_mm,
      };
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-xl mx-auto">
        <div className="mb-5">
          <a href="/admin/products" className="text-xs text-gray-400 hover:text-gray-600">← Catálogo</a>
          <h1 className="text-lg font-bold text-gray-900 mt-1">{product.name}</h1>
          <p className="text-xs font-mono text-gray-400 mt-0.5">{product.sku}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <ProductEditForm product={product} panel={panel} />
        </div>
      </div>
    </div>
  );
}
