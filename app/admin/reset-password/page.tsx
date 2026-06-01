'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

function ResetPasswordForm() {
  const params = useSearchParams();
  const token  = params.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/reset-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, password }),
      });
      if (res.ok) {
        setDone(true);
      } else {
        const data = await res.json() as { error?: string };
        setError(data.error ?? 'Error al restablecer la contraseña');
      }
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="text-center py-2">
        <p className="text-sm text-red-500 mb-4">Enlace inválido o expirado.</p>
        <Link href="/admin/forgot-password" className="text-sm text-[#389fe0] hover:text-[#1d65c5] font-medium">
          Solicitar nuevo enlace
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center py-2">
        <div className="text-4xl mb-3">✅</div>
        <p className="text-sm text-gray-700 font-medium mb-1">Contraseña actualizada</p>
        <p className="text-xs text-gray-400 mb-5">Ya puedes ingresar con tu nueva contraseña.</p>
        <Link href="/admin/login" className="text-sm text-[#389fe0] hover:text-[#1d65c5] font-medium transition-colors">
          Ir al inicio de sesión
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        type="password"
        placeholder="Nueva contraseña (mín. 8 caracteres)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={8}
        autoFocus
        className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#389fe0]"
      />
      <input
        type="password"
        placeholder="Confirmar contraseña"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        required
        className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#389fe0]"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={loading || !password || !confirm}
        className="rounded-xl bg-[#389fe0] hover:bg-[#1d65c5] text-white font-semibold py-2.5 text-sm transition-colors disabled:opacity-50"
      >
        {loading ? 'Guardando…' : 'Establecer nueva contraseña'}
      </button>
      <Link href="/admin/login" className="text-center text-xs text-gray-400 hover:text-gray-600 transition-colors mt-1">
        Volver al inicio de sesión
      </Link>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#f4f8fb] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">
        <div className="mb-6">
          <Image src="/images/logotipo.png" alt="Mercado Energy" width={140} height={40} className="h-9 w-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-1">Nueva contraseña</h1>
          <p className="text-sm text-gray-500">Ingresa y confirma tu nueva contraseña</p>
        </div>
        <Suspense fallback={<p className="text-sm text-gray-400">Cargando…</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
