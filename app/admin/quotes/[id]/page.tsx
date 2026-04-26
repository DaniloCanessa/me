import { notFound } from 'next/navigation';
import { getQuote } from '@/lib/db/quotes';
import { getSupabaseAdmin } from '@/lib/supabase';
import QuoteEditor from '@/components/admin/QuoteEditor';

async function getProducts() {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from('products')
    .select('id, name, sku, category, costo_proveedor_clp, margen_pct, base_price_clp')
    .eq('is_active', true)
    .order('name');
  return data ?? [];
}

async function getInstallations(clientId: string | null) {
  if (!clientId) return [];
  const db = getSupabaseAdmin();
  const { data } = await db
    .from('installations')
    .select('id, nombre_instalacion')
    .eq('client_id', clientId)
    .eq('is_active', true);
  return data ?? [];
}

async function getProjectForQuote(quoteId: string): Promise<string | null> {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from('projects')
    .select('id')
    .eq('quote_id', quoteId)
    .maybeSingle();
  return data?.id ?? null;
}

export default async function QuoteEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quote = await getQuote(id);
  if (!quote) notFound();

  const [products, installations, existingProjectId] = await Promise.all([
    getProducts(),
    getInstallations(quote.client_id),
    getProjectForQuote(id),
  ]);

  return (
    <QuoteEditor
      quote={quote}
      products={products}
      installations={installations}
      existingProjectId={existingProjectId}
    />
  );
}
