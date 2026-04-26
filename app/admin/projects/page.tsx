import { getProjects } from '@/lib/db/projects';
import Link from 'next/link';

const ESTADO_COLORS: Record<string, string> = {
  pendiente:    'bg-amber-100 text-amber-700',
  en_ejecucion: 'bg-blue-100 text-blue-700',
  completado:   'bg-green-100 text-green-700',
  cancelado:    'bg-gray-100 text-gray-500',
};

const ESTADO_LABELS: Record<string, string> = {
  pendiente:    'Pendiente',
  en_ejecucion: 'En ejecución',
  completado:   'Completado',
  cancelado:    'Cancelado',
};

function clp(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
}

function dateShort(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: '2-digit' });
}

export default async function ProjectsPage() {
  const projects = await getProjects();

  const counts = {
    pendiente:    projects.filter(p => p.estado === 'pendiente').length,
    en_ejecucion: projects.filter(p => p.estado === 'en_ejecucion').length,
    completado:   projects.filter(p => p.estado === 'completado').length,
    cancelado:    projects.filter(p => p.estado === 'cancelado').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <h1 className="text-lg font-bold text-gray-900">Proyectos</h1>
        <p className="text-xs text-gray-400 mt-0.5">Seguimiento de instalaciones en ejecución</p>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {Object.entries(ESTADO_LABELS).map(([key, label]) => (
            <div key={key} className="bg-white rounded-xl border border-gray-100 px-4 py-3 text-center">
              <p className="text-2xl font-bold text-gray-900">{counts[key as keyof typeof counts]}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {projects.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-sm text-gray-400">No hay proyectos aún.</p>
              <p className="text-xs text-gray-400 mt-1">Los proyectos se crean desde una cotización aceptada.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Proyecto</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cotización</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Inicio</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Término</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map(p => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/admin/projects/${p.id}`} className="font-medium text-gray-900 hover:text-[#389fe0] transition-colors">
                          {p.nombre}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{p.client_name}</td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-400">{p.quote_number ?? '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${ESTADO_COLORS[p.estado] ?? 'bg-gray-100 text-gray-500'}`}>
                          {ESTADO_LABELS[p.estado] ?? p.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-gray-400">{dateShort(p.fecha_inicio)}</td>
                      <td className="px-4 py-3 text-right text-xs text-gray-400">{dateShort(p.fecha_termino)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
