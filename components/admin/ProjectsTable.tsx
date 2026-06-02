'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ProjectRow } from '@/lib/db/projects';
import { deleteProject, deleteMultipleProjects } from '@/app/admin/projects/actions';

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

function dateShort(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: '2-digit' });
}

interface ProjectsTableProps {
  projects: ProjectRow[];
}

export function ProjectsTable({ projects }: ProjectsTableProps) {
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [isDeleting, startDelete] = useTransition();
  const [deletingSingle, setDeletingSingle] = useState<string | null>(null);

  const toggleSelection = (projectId: string) => {
    const newSelection = new Set(selectedProjects);
    if (newSelection.has(projectId)) {
      newSelection.delete(projectId);
    } else {
      newSelection.add(projectId);
    }
    setSelectedProjects(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedProjects.size === projects.length) {
      setSelectedProjects(new Set());
    } else {
      setSelectedProjects(new Set(projects.map(p => p.id)));
    }
  };

  const handleDeleteMultiple = () => {
    if (selectedProjects.size === 0) return;

    if (window.confirm(`¿Estás seguro de eliminar ${selectedProjects.size} proyecto(s)?`)) {
      startDelete(async () => {
        await deleteMultipleProjects(Array.from(selectedProjects));
        setSelectedProjects(new Set());
      });
    }
  };

  const handleDeleteSingle = (projectId: string, projectName: string) => {
    if (window.confirm(`¿Estás seguro de eliminar el proyecto "${projectName}"?`)) {
      setDeletingSingle(projectId);
      startDelete(async () => {
        await deleteProject(projectId);
        setDeletingSingle(null);
      });
    }
  };

  const isSelectAllChecked = selectedProjects.size === projects.length && projects.length > 0;
  const isSelectAllIndeterminate = selectedProjects.size > 0 && selectedProjects.size < projects.length;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {selectedProjects.size > 0 && (
        <div className="bg-blue-50 border-b border-blue-100 px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-blue-700 font-medium">
            {selectedProjects.size} proyecto(s) seleccionado(s)
          </span>
          <button
            onClick={handleDeleteMultiple}
            disabled={isDeleting}
            className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? 'Eliminando...' : '🗑️ Eliminar seleccionados'}
          </button>
        </div>
      )}

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
                <th className="text-left px-4 py-3 w-12">
                  <input
                    type="checkbox"
                    checked={isSelectAllChecked}
                    ref={(input) => {
                      if (input) input.indeterminate = isSelectAllIndeterminate;
                    }}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Proyecto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cotización</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Inicio</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Término</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(p => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedProjects.has(p.id)}
                      onChange={() => toggleSelection(p.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
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
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleDeleteSingle(p.id, p.nombre)}
                      disabled={isDeleting || deletingSingle === p.id}
                      className="px-2 py-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={`Eliminar proyecto: ${p.nombre}`}
                    >
                      {deletingSingle === p.id ? '...' : '🗑️'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}