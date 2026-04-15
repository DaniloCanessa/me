'use client';

import { useState } from 'react';
import Link from 'next/link';
import SimulatorForm from '@/components/SimulatorForm';
import SimulatorResults from '@/components/SimulatorResults';
import type { SimulatorInput, SimulatorResult } from '@/lib/types';
import { runSimulation } from '@/lib/calculations';

export default function SimulatorPage() {
  const [result, setResult] = useState<SimulatorResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSimulate(input: SimulatorInput) {
    setIsLoading(true);
    setError(null);
    try {
      const simulation = runSimulation(input);
      setResult(simulation);
      // Scroll suave a los resultados en móvil
      setTimeout(() => {
        document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      setError('Error al calcular la simulación. Por favor intenta nuevamente.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Barra de navegación */}
      <nav className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Link href="/" className="text-green-600 hover:text-green-700 text-sm font-medium">
            ← Inicio
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-500">Simulador Solar</span>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Simulador de ahorro solar</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Ingresa los datos de tu suministro y calcula cuánto puedes ahorrar con energía fotovoltaica.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Formulario */}
          <div className="lg:col-span-2">
            <SimulatorForm onSubmit={handleSimulate} isLoading={isLoading} />
          </div>

          {/* Resultados */}
          <div id="results" className="lg:col-span-3">
            {error && (
              <div className="bg-red-50 text-red-700 border border-red-200 p-4 rounded-xl text-sm">
                {error}
              </div>
            )}
            {result && <SimulatorResults result={result} />}
            {!result && !error && (
              <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-gray-100 shadow-sm text-center px-6">
                <div className="text-4xl mb-3">☀️</div>
                <p className="text-gray-500 text-sm">
                  Completa el formulario y presiona <strong>Simular</strong> para ver tu ahorro estimado.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
