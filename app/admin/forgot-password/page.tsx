'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/forgot-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      });
      if (res.ok) {
        setSent(true);
      } else {
        const data = await res.json() as { error?: string };
        setError(data.error ?? 'Error al enviar el correo');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f8fb] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">
        <div className="mb-6">
          <Image src="/images/logotipo.png" alt="Mercado Energy" width={140} height={40} className="h-9 w-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-1">Recuperar contraseña</h1>
          <p className="text-sm text-gray-500">Te enviaremos un enlace para restablecer tu contraseña</p>
        </div>

        {sent ? (
          <div className="text-center py-2">
            <div className="text-4xl mb-3">📧</div>
            <p className="text-sm text-gray-700 font-medium mb-1">Correo enviado</p>
            <p className="text-xs text-gray-400 mb-5">
              Si el correo existe en el sistema, recibirás un enlace en tu bandeja de entrada. El enlace expira en 1 hora.
            </p>
            <Link href="/admin/login" className="text-sm text-[#389fe0] hover:text-[#1d65c5] font-medium transition-colors">
              Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#389fe0]"
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading || !email}
              className="rounded-xl bg-[#389fe0] hover:bg-[#1d65c5] text-white font-semibold py-2.5 text-sm transition-colors disabled:opacity-50"
            >
              {loading ? 'Enviando…' : 'Enviar enlace'}
            </button>
            <Link href="/admin/login" className="text-center text-xs text-gray-400 hover:text-gray-600 transition-colors mt-1">
              Volver al inicio de sesión
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
