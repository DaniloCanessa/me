import { notFound } from 'next/navigation';
import { getProject, getProjectItems, getProjectCosts, getProjectPayments, getProjectPurchases } from '@/lib/db/projects';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getReceiptSignedUrl } from '@/lib/db/expenses';
import ProjectDetail from './ProjectDetail';

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getSupabaseAdmin();

  const [project, items, costs, payments, purchases] = await Promise.all([
    getProject(id),
    getProjectItems(id),
    getProjectCosts(id),
    getProjectPayments(id),
    getProjectPurchases(id),
  ]);

  if (!project) notFound();

  // Ítems originales de la cotización (para tab "Cotización original")
  let quoteItems: Array<{ id: string; description: string; quantity: number; unit_price_clp: number; costo_proveedor_clp: number; total_clp: number }> = [];
  if (project.quote_id) {
    const { data } = await db
      .from('quote_items')
      .select('id, description, quantity, unit_price_clp, costo_proveedor_clp, total_clp, sort_order')
      .eq('quote_id', project.quote_id)
      .order('sort_order');
    quoteItems = data ?? [];
  }

  // Boletas (imágenes) de gastos aprobados con este proyecto, indexadas por compra.
  const receiptUrls: Record<string, string> = {};
  if (purchases.length) {
    const { data: receipts } = await db
      .from('expense_captures')
      .select('purchase_id, image_path')
      .eq('project_id', id)
      .not('purchase_id', 'is', null);
    await Promise.all((receipts ?? []).map(async (r) => {
      const pid = r.purchase_id as string | null;
      const path = r.image_path as string | null;
      if (!pid || !path) return;
      const url = await getReceiptSignedUrl(path);
      if (url) receiptUrls[pid] = url;
    }));
  }

  return (
    <ProjectDetail
      project={project}
      items={items}
      costs={costs}
      payments={payments}
      purchases={purchases}
      quoteItems={quoteItems}
      receiptUrls={receiptUrls}
    />
  );
}
