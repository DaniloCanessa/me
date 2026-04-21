'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function NetBillingClient() {
  const [mode, setMode] = useState<'day' | 'night'>('day');

  return (
    <div className="min-h-screen bg-[#f4f8fb]">

      {/* Nav */}
      <nav className="bg-[#010101] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/">
            <Image src="/images/logotipo.png" alt="Mercado Energy" width={160} height={48} className="h-10 w-auto" />
          </Link>
          <Link href="/" className="text-sm text-white/60 hover:text-white transition-colors">
            ← Volver al inicio
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="bg-[#010101] pb-16 pt-12 px-6 text-center">
        <p className="text-sm font-semibold text-[#389fe0] uppercase tracking-widest mb-3">Ley 21.118 · DS 57</p>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">¿Qué es el Net Billing?</h1>
        <p className="text-white/60 text-lg max-w-2xl mx-auto leading-relaxed">
          El mecanismo legal que te permite inyectar tu energía solar sobrante a la red eléctrica
          y recibir un crédito en tu boleta a cambio.
        </p>
      </div>

      {/* Diagrama animado */}
      <div className="max-w-5xl mx-auto px-6 -mt-6">
        <div className="bg-white rounded-2xl border border-[#b0cedd]/30 shadow-sm p-8 md:p-12">

          {/* Toggle día/noche */}
          <div className="flex justify-center mb-10">
            <div className="flex rounded-xl overflow-hidden border border-[#b0cedd]/40">
              <button
                onClick={() => setMode('day')}
                className={`px-6 py-2.5 text-sm font-medium transition-colors ${mode === 'day' ? 'bg-[#389fe0] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              >
                ☀️ Durante el día
              </button>
              <button
                onClick={() => setMode('night')}
                className={`px-6 py-2.5 text-sm font-medium transition-colors ${mode === 'night' ? 'bg-[#1d65c5] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              >
                🌙 Durante la noche
              </button>
            </div>
          </div>

          {/* Diagrama SVG */}
          <div className="relative w-full overflow-x-auto">
            <svg viewBox="0 0 800 320" className="w-full max-w-3xl mx-auto block" style={{ minWidth: 340 }}>

              {/* ── Nodos ── */}
              {/* Sol */}
              <g>
                <circle cx="80" cy="80" r="42" fill={mode === 'day' ? '#fef08a' : '#e5e7eb'} stroke={mode === 'day' ? '#facc15' : '#d1d5db'} strokeWidth="2" />
                <text x="80" y="72" textAnchor="middle" fontSize="28">{mode === 'day' ? '☀️' : '🌙'}</text>
                <text x="80" y="100" textAnchor="middle" fontSize="11" fill={mode === 'day' ? '#92400e' : '#6b7280'} fontWeight="600">
                  {mode === 'day' ? 'Sol' : 'Sin sol'}
                </text>
              </g>

              {/* Paneles */}
              <g>
                <rect x="280" y="38" width="120" height="84" rx="14" fill={mode === 'day' ? '#dbeafe' : '#f3f4f6'} stroke={mode === 'day' ? '#389fe0' : '#d1d5db'} strokeWidth="2" />
                <text x="340" y="74" textAnchor="middle" fontSize="26">🟦</text>
                <text x="340" y="96" textAnchor="middle" fontSize="11" fill={mode === 'day' ? '#1d4ed8' : '#9ca3af'} fontWeight="600">Paneles</text>
                <text x="340" y="110" textAnchor="middle" fontSize="10" fill={mode === 'day' ? '#3b82f6' : '#9ca3af'}>solares</text>
              </g>

              {/* Hogar */}
              <g>
                <rect x="540" y="38" width="120" height="84" rx="14" fill="#f0fdf4" stroke="#389fe0" strokeWidth="2" />
                <text x="600" y="74" textAnchor="middle" fontSize="26">🏠</text>
                <text x="600" y="96" textAnchor="middle" fontSize="11" fill="#166534" fontWeight="600">Tu hogar</text>
                <text x="600" y="110" textAnchor="middle" fontSize="10" fill="#16a34a">autoconsumo</text>
              </g>

              {/* Red eléctrica */}
              <g>
                <rect x="540" y="198" width="120" height="84" rx="14" fill={mode === 'day' ? '#faf5ff' : '#eff6ff'} stroke={mode === 'day' ? '#a855f7' : '#389fe0'} strokeWidth="2" />
                <text x="600" y="234" textAnchor="middle" fontSize="26">🔌</text>
                <text x="600" y="256" textAnchor="middle" fontSize="11" fill={mode === 'day' ? '#6b21a8' : '#1d4ed8'} fontWeight="600">Red eléctrica</text>
                <text x="600" y="270" textAnchor="middle" fontSize="10" fill={mode === 'day' ? '#a855f7' : '#3b82f6'}>distribuidora</text>
              </g>

              {/* ── Líneas ── */}

              {/* Sol → Paneles */}
              <line x1="122" y1="80" x2="278" y2="80" stroke={mode === 'day' ? '#facc15' : '#e5e7eb'} strokeWidth="2.5" strokeDasharray="6 3" />

              {/* Paneles → Hogar */}
              <line x1="400" y1="80" x2="538" y2="80" stroke={mode === 'day' ? '#389fe0' : '#e5e7eb'} strokeWidth="2.5" strokeDasharray="6 3" />

              {/* Paneles → Red (excedente, solo día) */}
              {mode === 'day' && (
                <>
                  <line x1="340" y1="122" x2="340" y2="240" stroke="#a855f7" strokeWidth="2.5" strokeDasharray="6 3" />
                  <line x1="340" y1="240" x2="538" y2="240" stroke="#a855f7" strokeWidth="2.5" strokeDasharray="6 3" />
                </>
              )}

              {/* Red → Hogar (noche o complemento) */}
              {mode === 'night' && (
                <line x1="600" y1="198" x2="600" y2="122" stroke="#389fe0" strokeWidth="2.5" strokeDasharray="6 3" />
              )}

              {/* ── Etiquetas de flujo ── */}

              {/* Sol → Paneles label */}
              {mode === 'day' && (
                <text x="200" y="70" textAnchor="middle" fontSize="10" fill="#b45309" fontWeight="500">Irradiación solar</text>
              )}

              {/* Paneles → Hogar label */}
              {mode === 'day' && (
                <text x="469" y="70" textAnchor="middle" fontSize="10" fill="#1d65c5" fontWeight="500">Energía propia</text>
              )}

              {/* Excedente label */}
              {mode === 'day' && (
                <>
                  <text x="290" y="190" textAnchor="middle" fontSize="10" fill="#7e22ce" fontWeight="500">Excedente</text>
                  <text x="290" y="203" textAnchor="middle" fontSize="10" fill="#7e22ce">inyectado</text>
                  <text x="430" y="230" textAnchor="middle" fontSize="10" fill="#7e22ce" fontWeight="500">→ crédito en boleta</text>
                </>
              )}

              {/* Noche: Red → Hogar label */}
              {mode === 'night' && (
                <text x="648" y="168" textAnchor="middle" fontSize="10" fill="#1d65c5" fontWeight="500">Red pública</text>
              )}

              {/* ── Puntos animados ── */}

              {/* Sol → Paneles (amarillo) */}
              {mode === 'day' && (
                <circle r="6" fill="#facc15" opacity="0.9">
                  <animateMotion dur="1.8s" repeatCount="indefinite" path="M 122,80 L 278,80" />
                </circle>
              )}

              {/* Paneles → Hogar (azul) */}
              {mode === 'day' && (
                <circle r="6" fill="#389fe0" opacity="0.9">
                  <animateMotion dur="1.6s" repeatCount="indefinite" path="M 400,80 L 538,80" />
                </circle>
              )}

              {/* Excedente: Paneles → Red (morado) */}
              {mode === 'day' && (
                <circle r="6" fill="#a855f7" opacity="0.9">
                  <animateMotion dur="2.2s" repeatCount="indefinite" path="M 340,122 L 340,240 L 538,240" />
                </circle>
              )}

              {/* Noche: Sin sol → pantallas apagadas */}
              {mode === 'night' && (
                <circle r="6" fill="#389fe0" opacity="0.9">
                  <animateMotion dur="1.8s" repeatCount="indefinite" path="M 600,198 L 600,122" />
                </circle>
              )}

              {/* ── Crédito badge ── */}
              {mode === 'day' && (
                <g>
                  <rect x="540" y="290" width="120" height="24" rx="8" fill="#f0fdf4" stroke="#16a34a" strokeWidth="1.5" />
                  <text x="600" y="306" textAnchor="middle" fontSize="10" fill="#15803d" fontWeight="700">💰 Crédito en boleta</text>
                </g>
              )}
              {mode === 'night' && (
                <g>
                  <rect x="540" y="290" width="120" height="24" rx="8" fill="#eff6ff" stroke="#389fe0" strokeWidth="1.5" />
                  <text x="600" y="306" textAnchor="middle" fontSize="10" fill="#1d4ed8" fontWeight="700">⚡ Energía de la red</text>
                </g>
              )}

            </svg>
          </div>

          {/* Leyenda */}
          <div className="flex flex-wrap justify-center gap-5 mt-6 text-xs text-gray-500">
            {mode === 'day' ? (
              <>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" /> Irradiación solar</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#389fe0] inline-block" /> Autoconsumo directo</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-purple-400 inline-block" /> Excedente inyectado a la red</span>
              </>
            ) : (
              <>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#389fe0] inline-block" /> Energía consumida desde la red</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-300 inline-block" /> Sin generación solar</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Explicación */}
      <div className="max-w-5xl mx-auto px-6 py-16">

        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-[#389fe0] uppercase tracking-widest mb-3">Cómo funciona</p>
          <h2 className="text-2xl md:text-3xl font-bold text-[#010101]">Lo que necesitas saber</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: '⚡',
              title: 'Autoconsumo primero',
              body: 'La energía que producen tus paneles se usa directamente en tu hogar o empresa. Solo lo que sobra se inyecta a la red. Esto reduce tu cuenta mes a mes.',
              color: '#389fe0',
            },
            {
              icon: '💰',
              title: 'Crédito por excedentes',
              body: 'Lo que inyectas a la red se valora al precio de nudo vigente (fijado semestralmente por la CNE), que se descuenta de tu boleta del mes siguiente.',
              color: '#a855f7',
            },
            {
              icon: '🌙',
              title: 'La red como respaldo',
              body: 'De noche o en días nublados, sigues conectado a la red eléctrica. Pagas solo la diferencia entre lo que consumes y los créditos acumulados por tu excedente.',
              color: '#1d65c5',
            },
          ].map((card) => (
            <div key={card.title} className="bg-white rounded-2xl border border-[#b0cedd]/30 p-6">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl mb-4" style={{ background: card.color + '15' }}>
                {card.icon}
              </div>
              <h3 className="font-bold text-[#010101] mb-2">{card.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{card.body}</p>
            </div>
          ))}
        </div>

        {/* Info legal */}
        <div className="mt-8 bg-white rounded-2xl border border-[#b0cedd]/30 p-6">
          <h3 className="font-bold text-[#010101] mb-4 flex items-center gap-2">
            <span className="text-[#389fe0]">📋</span> Marco regulatorio
          </h3>
          <div className="grid sm:grid-cols-2 gap-4 text-sm text-gray-600">
            {[
              { label: 'Ley habilitante', value: 'Ley N° 20.936 (2016) — Transmisión Eléctrica' },
              { label: 'Reglamento', value: 'DS 57 — Pequeños Medios de Generación Distribuida' },
              { label: 'Actualización', value: 'Ley N° 21.118 amplió capacidad a 300 kW' },
              { label: 'Precio de excedentes', value: 'Precio de nudo, fijado por CNE semestralmente' },
              { label: 'Capacidad máxima', value: 'Hasta 300 kW para hogares y empresas' },
              { label: 'Obligación distribuidora', value: 'Debe aceptar la conexión y el medidor bidireccional' },
            ].map((item) => (
              <div key={item.label} className="flex gap-2">
                <span className="text-gray-400 shrink-0 w-36">{item.label}</span>
                <span className="font-medium text-[#010101]">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <p className="text-gray-500 mb-6 text-sm">¿Quieres saber cuánto puedes ahorrar con Net Billing en tu caso específico?</p>
          <Link
            href="/simulator"
            className="inline-flex items-center gap-2 bg-[#389fe0] hover:bg-[#1d65c5] text-white font-semibold py-4 px-10 rounded-xl text-base transition-colors"
          >
            Simular mi ahorro →
          </Link>
        </div>
      </div>

      <footer className="bg-[#010101] text-white/40 text-xs text-center py-6">
        © 2026 Mercado Energy · Biznexus Group SPA · RUT 77.958.683-9
      </footer>
    </div>
  );
}
