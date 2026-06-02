import { getProjects } from '@/lib/db/projects';
import { ProjectsTable } from '@/components/admin/ProjectsTable';

const ESTADO_LABELS: Record<string, string> = {
  pendiente:    'Pendiente',
  en_ejecucion: 'En ejecución',
  completado:   'Completado',
  cancelado:    'Cancelado',
};

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
        <ProjectsTable projects={projects} />
      </div>
    </div>
  );
}
