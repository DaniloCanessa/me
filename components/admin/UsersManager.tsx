'use client';

import { useState, useTransition } from 'react';
import type { AdminUser } from '@/lib/types';
import {
  createUser, updateUser, resetPassword,
  toggleUserActive, deleteUser,
} from '@/app/admin/users/actions';

function UserModal({
  user,
  onClose,
  isPending,
}: {
  user: AdminUser | null;
  onClose: () => void;
  isPending: boolean;
}) {
  const [mode, setMode] = useState<'info' | 'password'>('info');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {user ? 'Editar usuario' : 'Nuevo usuario'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        {user && (
          <div className="flex border-b border-gray-100">
            {(['info', 'password'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  mode === m ? 'text-[#1d65c5] border-b-2 border-[#389fe0]' : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                {m === 'info' ? 'Información' : 'Contraseña'}
              </button>
            ))}
          </div>
        )}

        {(!user || mode === 'info') && (
          <form
            action={(fd) => {
              if (user) {
                updateUser(user.id, fd).then((r) => { if (!r?.error) onClose(); });
              } else {
                createUser(fd).then((r) => { if (!r?.error) onClose(); });
              }
            }}
            className="px-6 py-5 flex flex-col gap-4"
          >
            <label className="block">
              <span className="text-xs text-gray-500 mb-1 block">Nombre *</span>
              <input name="name" type="text" required defaultValue={user?.name ?? ''}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]" />
            </label>
            {!user && (
              <label className="block">
                <span className="text-xs text-gray-500 mb-1 block">Email *</span>
                <input name="email" type="email" required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]" />
              </label>
            )}
            <label className="block">
              <span className="text-xs text-gray-500 mb-1 block">Rol</span>
              <select name="role" defaultValue={user?.role ?? 'user'}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]">
                <option value="user">Usuario</option>
                <option value="admin">Administrador</option>
              </select>
            </label>
            {!user && (
              <label className="block">
                <span className="text-xs text-gray-500 mb-1 block">Contraseña *</span>
                <input name="password" type="password" required minLength={8}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]" />
              </label>
            )}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button type="submit" disabled={isPending}
                className="flex-1 bg-[#389fe0] hover:bg-[#1d65c5] text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50">
                {isPending ? 'Guardando…' : user ? 'Guardar' : 'Crear usuario'}
              </button>
            </div>
          </form>
        )}

        {user && mode === 'password' && (
          <form
            action={(fd) => {
              resetPassword(user.id, fd).then((r) => { if (!r?.error) onClose(); });
            }}
            className="px-6 py-5 flex flex-col gap-4"
          >
            <label className="block">
              <span className="text-xs text-gray-500 mb-1 block">Nueva contraseña *</span>
              <input name="password" type="password" required minLength={8}
                placeholder="Mínimo 8 caracteres"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#389fe0]" />
            </label>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button type="submit" disabled={isPending}
                className="flex-1 bg-[#389fe0] hover:bg-[#1d65c5] text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50">
                {isPending ? 'Guardando…' : 'Cambiar contraseña'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function UsersManager({ users }: { users: AdminUser[] }) {
  const [showModal, setShowModal]     = useState(false);
  const [editUser, setEditUser]       = useState<AdminUser | null>(null);
  const [isPending, startTransition]  = useTransition();

  function openNew() { setEditUser(null); setShowModal(true); }
  function openEdit(u: AdminUser) { setEditUser(u); setShowModal(true); }

  function handleToggle(u: AdminUser) {
    startTransition(async () => { await toggleUserActive(u.id, !u.is_active); });
  }

  function handleDelete(u: AdminUser) {
    if (!confirm(`¿Eliminar a ${u.name}? Esta acción no se puede deshacer.`)) return;
    startTransition(async () => { await deleteUser(u.id); });
  }

  return (
    <>
      {showModal && (
        <UserModal
          user={editUser}
          onClose={() => setShowModal(false)}
          isPending={isPending}
        />
      )}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm text-gray-500">{users.length} usuario{users.length !== 1 ? 's' : ''}</p>
          <button onClick={openNew}
            className="bg-[#389fe0] hover:bg-[#1d65c5] text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
            + Nuevo usuario
          </button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-left">
              <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Usuario</th>
              <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rol</th>
              <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Estado</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/40">
                <td className="px-5 py-3.5">
                  <p className="font-medium text-gray-900">{u.name}</p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    u.role === 'admin'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {u.role === 'admin' ? 'Admin' : 'Usuario'}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <button
                    onClick={() => handleToggle(u)}
                    disabled={isPending}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      u.is_active
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {u.is_active ? 'Activo' : 'Inactivo'}
                  </button>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex gap-3 justify-end">
                    <button onClick={() => openEdit(u)}
                      className="text-xs text-[#389fe0] hover:text-[#1d65c5] font-medium">
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(u)}
                      disabled={isPending}
                      className="text-xs text-red-400 hover:text-red-600 font-medium disabled:opacity-40">
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
