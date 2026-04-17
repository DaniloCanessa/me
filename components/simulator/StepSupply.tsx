'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { CustomerCategory, PropertyType, SupplyData } from '@/lib/types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface StepSupplyProps {
  category: CustomerCategory;
  initialData: SupplyData | null;
  onSubmit: (data: SupplyData) => void;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const PROPERTY_OPTIONS: {
  value: PropertyType;
  label: string;
  icon: string;
  for: CustomerCategory[];
}[] = [
  { value: 'casa',         label: 'Casa',         icon: '🏠', for: ['natural'] },
  { value: 'departamento', label: 'Departamento',  icon: '🏢', for: ['natural'] },
  { value: 'oficina',      label: 'Oficina',       icon: '🏛️', for: ['business'] },
  { value: 'colegio',      label: 'Colegio',       icon: '🏫', for: ['business'] },
  { value: 'otro',         label: 'Otro',          icon: '📍', for: ['natural', 'business'] },
];

const AMPERAJE_OPTIONS = [10, 15, 20, 25, 32, 40, 50, 63];

// ─── Componente principal ─────────────────────────────────────────────────────

export default function StepSupply({ category, initialData, onSubmit }: StepSupplyProps) {
  const [propertyType, setPropertyType] = useState<PropertyType | ''>(
    initialData?.propertyType ?? '',
  );
  const [amperajeA, setAmperajeA] = useState<number | ''>(initialData?.amperajeA ?? '');
  const [hasExistingSolar, setHasExistingSolar] = useState(
    initialData?.hasExistingSolar ?? false,
  );
  const [existingSystemKWp, setExistingSystemKWp] = useState(
    initialData?.existingSystemKWp?.toString() ?? '',
  );

  const visibleProperties = PROPERTY_OPTIONS.filter((o) => o.for.includes(category));
  const canSubmit = !!propertyType && amperajeA !== '';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      propertyType: propertyType as PropertyType,
      distribuidora: initialData?.distribuidora,
      tarifa: initialData?.tarifa ?? 'unknown',
      amperajeA: amperajeA as number,
      hasExistingSolar,
      existingSystemKWp: hasExistingSolar && existingSystemKWp
        ? parseFloat(existingSystemKWp)
        : undefined,
      includeBattery: false, // derivado de batteryCount en FutureConsumption
    });
  }

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Tu suministro eléctrico</h1>
        <p className="text-gray-500 mt-2 text-sm">
          Cuéntanos sobre el lugar donde instalarías los paneles.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">

        {/* Tipo de propiedad */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            ¿Qué tipo de propiedad es?<span className="text-red-400 ml-0.5">*</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {visibleProperties.map((opt) => {
              const isSelected = propertyType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPropertyType(opt.value)}
                  className={[
                    'flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-sm font-medium transition-all hover:border-green-400',
                    isSelected
                      ? 'border-green-500 bg-green-50 text-green-800'
                      : 'border-gray-200 text-gray-600 bg-white',
                  ].join(' ')}
                >
                  <span className="text-2xl">{opt.icon}</span>
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Amperaje del empalme */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">
              Amperaje del empalme<span className="text-red-400 ml-0.5">*</span>
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Define el tamaño máximo de la planta solar que puedes instalar.
            </p>
          </div>

          <div className="rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
            <Image
              src="/images/breaker-reference.svg"
              alt="Dónde encontrar el amperaje en el breaker principal"
              width={380}
              height={220}
              className="w-full h-auto"
            />
          </div>
          <p className="text-xs text-gray-500">
            Busca el número en el breaker principal de tu tablero eléctrico (como se muestra arriba).
          </p>

          <div className="flex flex-wrap gap-2">
            {AMPERAJE_OPTIONS.map((amp) => (
              <button
                key={amp}
                type="button"
                onClick={() => setAmperajeA(amperajeA === amp ? '' : amp)}
                className={[
                  'px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all',
                  amperajeA === amp
                    ? 'border-green-500 bg-green-50 text-green-800'
                    : 'border-gray-200 text-gray-600 hover:border-green-300',
                ].join(' ')}
              >
                {amp} A
              </button>
            ))}
          </div>

          {amperajeA !== '' && (
            <p className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
              Empalme de <strong>{amperajeA} A</strong> →{' '}
              potencia máxima: <strong>{((amperajeA as number) * 220 / 1000).toFixed(1)} kW</strong>.
              La planta solar no superará este límite.
            </p>
          )}
        </div>

        {/* Opciones solares */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-5">
          <h2 className="text-sm font-semibold text-gray-700">Opciones de instalación</h2>

          {/* ¿Tiene solar existente? */}
          <div className="flex items-start gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={hasExistingSolar}
              onClick={() => {
                setHasExistingSolar((v) => !v);
                if (hasExistingSolar) setExistingSystemKWp('');
              }}
              className={[
                'relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-green-400 mt-0.5',
                hasExistingSolar ? 'bg-green-500' : 'bg-gray-200',
              ].join(' ')}
            >
              <span className={[
                'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform',
                hasExistingSolar ? 'translate-x-5' : 'translate-x-0',
              ].join(' ')} />
            </button>
            <div>
              <p className="text-sm font-medium text-gray-700">Ya tengo paneles solares</p>
              <p className="text-xs text-gray-400">Indicaremos el tamaño del sistema existente.</p>
            </div>
          </div>

          {hasExistingSolar && (
            <div className="flex flex-col gap-1 pl-14">
              <label htmlFor="existingKWp" className="text-sm font-medium text-gray-700">
                Tamaño del sistema existente (kWp)
              </label>
              <input
                id="existingKWp"
                type="number"
                min="0.5"
                max="500"
                step="0.5"
                value={existingSystemKWp}
                onChange={(e) => setExistingSystemKWp(e.target.value)}
                placeholder="Ej: 3"
                className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition max-w-xs"
              />
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className={[
            'w-full rounded-xl font-semibold py-3 text-sm transition-colors',
            canSubmit
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed',
          ].join(' ')}
        >
          Continuar →
        </button>
      </form>
    </div>
  );
}
