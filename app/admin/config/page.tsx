import { getSupabaseAdmin } from '@/lib/supabase';
import ConfigTable from '@/components/admin/ConfigTable';

export default async function ConfigPage() {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from('config_parameters')
    .select('*')
    .order('category')
    .order('key');

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Configuración del modelo</h1>
        <p className="text-sm text-gray-500 mt-1">
          Parámetros del simulador solar. Los cambios se aplican de inmediato al simulador.
        </p>
      </div>
      <ConfigTable params={data ?? []} />
    </div>
  );
}
