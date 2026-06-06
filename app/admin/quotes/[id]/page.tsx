import { notFound } from 'next/navigation';
import { getQuote } from '@/lib/db/quotes';
import { getSupabaseAdmin } from '@/lib/supabase';
import QuoteEditor from '@/components/admin/QuoteEditor';

async function getProducts() {
  const db = getSupabaseAdmin();
  // Supabase devuelve máximo 1000 filas por request: paginamos para que el
  // dropdown del cotizador incluya el catálogo completo (>1000 productos).
  const PAGE_SIZE = 1000;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const all: any[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data: page } = await db
      .from('products')
      .select('id, name, sku, category, costo_proveedor_clp, margen_pct, base_price_clp')
      .eq('is_active', true)
      .order('name')
      .order('id', { ascending: true }) // desempate estable para paginar sin duplicados
      .range(from, from + PAGE_SIZE - 1);
    if (!page?.length) break;
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return all;
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
