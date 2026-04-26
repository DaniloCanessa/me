'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail]     = useState('');
  const [pw, setPw]           = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password: pw }),
      });
      if (res.ok) {
        router.push('/admin/leads');
      } else {
        const data = await res.json() as { error?: string };
        setError(data.error ?? 'Credenciales incorrectas');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f8fb] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">
        <div className="mb-6">
          <Image
            src="/images/logotipo.png"
            alt="Mercado Energy"
            width={140} height={40}
            className="h-9 w-auto mb-4"
          />
          <h1 className="text-xl font-bold text-gray-900 mb-1">Back-office</h1>
          <p className="text-sm text-gray-500">Ingresa con tu cuenta</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            required
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#389fe0]"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            required
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#389fe0]"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading || !email || !pw}
            className="rounded-xl bg-[#389fe0] hover:bg-[#1d65c5] text-white font-semibold py-2.5 text-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
