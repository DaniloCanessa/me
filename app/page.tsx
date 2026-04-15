import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          ☀️ Mercado Energy — Simulador Solar Chile
        </div>

        <h1 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
          ¿Cuánto puedes ahorrar<br className="hidden sm:block" /> con energía solar?
        </h1>

        <p className="text-lg text-gray-500 mb-8 max-w-xl mx-auto">
          Ingresa tu consumo mensual y descubre cuánto podrías ahorrar con un sistema
          fotovoltaico adaptado a tu región en Chile.
        </p>

        <Link
          href="/simulator"
          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-xl text-lg transition-colors"
        >
          Simular mi ahorro →
        </Link>

        <div className="mt-16 grid grid-cols-3 gap-8 text-center">
          {[
            { value: '16', label: 'regiones de Chile' },
            { value: '70/30', label: 'perfil día/noche' },
            { value: '25 años', label: 'proyección de retorno' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl font-bold text-green-600">{stat.value}</div>
              <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
