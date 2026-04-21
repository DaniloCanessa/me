'use client';

import { useState } from 'react';

export default function ContactSection() {
  const [type, setType] = useState<'natural' | 'business'>('natural');
  const [form, setForm] = useState({ name: '', contactName: '', email: '', phone: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, type }),
      });
      if (!res.ok) throw new Error();
      setStatus('success');
      setForm({ name: '', contactName: '', email: '', phone: '', message: '' });
    } catch {
      setStatus('error');
    }
  }

  return (
    <section id="contacto-form" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 items-start">

          {/* Info izquierda */}
          <div>
            <p className="text-sm font-semibold text-[#389fe0] uppercase tracking-widest mb-3">Contacto</p>
            <h2 className="text-3xl md:text-4xl font-bold text-[#010101] leading-tight mb-6">
              Hablemos de tu<br />proyecto solar
            </h2>
            <p className="text-gray-500 leading-relaxed mb-10">
              Cuéntanos sobre tu consumo y te contactaremos con una propuesta a medida.
              Visita técnica gratuita, sin compromiso.
            </p>

            <div className="space-y-5">
              {[
                { icon: '📧', label: 'Email', value: 'contacto@mercadoenergy.cl', href: 'mailto:contacto@mercadoenergy.cl' },
                { icon: '📍', label: 'Oficina', value: 'Miguel León Prado 134, Santiago', href: null },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#389fe0]/10 flex items-center justify-center text-lg shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">{item.label}</p>
                    {item.href ? (
                      <a href={item.href} className="text-sm font-medium text-[#010101] hover:text-[#389fe0] transition-colors">
                        {item.value}
                      </a>
                    ) : (
                      <p className="text-sm font-medium text-[#010101]">{item.value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Formulario */}
          <div className="bg-[#f8fafc] rounded-2xl border border-[#b0cedd]/30 p-8">
            {status === 'success' ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">✅</div>
                <h3 className="text-xl font-bold text-[#010101] mb-2">¡Mensaje enviado!</h3>
                <p className="text-gray-500 text-sm">Te contactaremos en menos de 24 horas hábiles.</p>
                <button
                  onClick={() => setStatus('idle')}
                  className="mt-6 text-sm text-[#389fe0] hover:underline"
                >
                  Enviar otro mensaje
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Tipo */}
                <div className="flex rounded-xl overflow-hidden border border-[#b0cedd]/40">
                  {(['natural', 'business'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                        type === t
                          ? 'bg-[#389fe0] text-white'
                          : 'bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {t === 'natural' ? 'Persona natural' : 'Empresa'}
                    </button>
                  ))}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                      {type === 'natural' ? 'Nombre completo' : 'Empresa / Razón social'} *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full border border-[#b0cedd]/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#389fe0]/30 bg-white"
                      placeholder={type === 'natural' ? 'Juan Pérez' : 'Mi Empresa S.A.'}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                      {type === 'business' ? 'Nombre de contacto *' : 'Teléfono'}
                    </label>
                    {type === 'business' ? (
                      <input
                        type="text"
                        required
                        value={form.contactName}
                        onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                        className="w-full border border-[#b0cedd]/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#389fe0]/30 bg-white"
                        placeholder="Juan Pérez"
                      />
                    ) : (
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="w-full border border-[#b0cedd]/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#389fe0]/30 bg-white"
                        placeholder="+56 9 1234 5678"
                      />
                    )}
                  </div>
                </div>

                {type === 'business' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Teléfono</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full border border-[#b0cedd]/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#389fe0]/30 bg-white"
                      placeholder="+56 9 1234 5678"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Email *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full border border-[#b0cedd]/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#389fe0]/30 bg-white"
                    placeholder="correo@ejemplo.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Mensaje *</label>
                  <textarea
                    required
                    rows={4}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full border border-[#b0cedd]/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#389fe0]/30 bg-white resize-none"
                    placeholder="Cuéntanos sobre tu proyecto, consumo mensual estimado, región, etc."
                  />
                </div>

                {status === 'error' && (
                  <p className="text-red-500 text-xs">Hubo un error al enviar. Por favor intenta nuevamente.</p>
                )}

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full bg-[#389fe0] hover:bg-[#1d65c5] disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
                >
                  {status === 'loading' ? 'Enviando...' : 'Enviar mensaje →'}
                </button>

                <p className="text-center text-xs text-gray-400">Sin compromiso · Respuesta en menos de 24 horas</p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
