import { getUsers } from '@/lib/db/users';
import UsersManager from '@/components/admin/UsersManager';

export default async function UsersPage() {
  const users = await getUsers();
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Usuarios</h1>
        <p className="text-sm text-gray-500 mt-1">Gestiona el acceso al back-office</p>
      </div>
      <UsersManager users={users} />
    </div>
  );
}
