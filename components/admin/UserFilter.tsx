'use client';

import { useRouter, useSearchParams } from 'next/navigation';

interface User { id: string; name: string; }

export default function UserFilter({ users }: { users: User[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get('user') ?? '';

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    const url = val ? `/admin?user=${val}` : '/admin';
    router.push(url);
  }

  return (
    <select
      value={current}
      onChange={handleChange}
      className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:border-[#389fe0] cursor-pointer"
    >
      <option value="">Todos los usuarios</option>
      {users.map(u => (
        <option key={u.id} value={u.id}>{u.name}</option>
      ))}
    </select>
  );
}
