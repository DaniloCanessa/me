import { notFound } from 'next/navigation';
import { getProject, getProjectItems, getProjectCosts, getProjectPayments } from '@/lib/db/projects';
import { getSupabaseAdmin } from '@/lib/supabase';
import ProjectDetail from './ProjectDetail';

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getSupabaseAdmin();

  const [project, items, costs, payments] = await Promise.all([
    getProject(id),
    getProjectItems(id),
    getProjectCosts(id),
    getProjectPayments(id),
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

  return (
    <ProjectDetail
      project={project}
      items={items}
      costs={costs}
      payments={payments}
      quoteItems={quoteItems}
    />
  );
}
