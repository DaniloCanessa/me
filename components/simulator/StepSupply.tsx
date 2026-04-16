'use client';

import { useState } from 'react';
import type { CustomerCategory, PropertyType, SupplyData, TarifaType } from '@/lib/types';
import { DISTRIBUTORS } from '@/lib/constants';

// ─── Props ────────────────────────────────────────────────────────────────────

interface StepSupplyProps {
  category: CustomerCategory;
  initialData: SupplyData | null;
  onSubmit: (data: SupplyData) => void;
}

// ─── Opciones de tipo de propiedad ────────────────────────────────────────────

const PROPERTY_OPTIONS: {
  value: PropertyType;
  label: string;
  icon: string;
  for: CustomerCategory[];
}[] = [
  { value: 'casa',         label: 'Casa',          icon: '🏠', for: ['natural'] },
  { value: 'departamento', label: 'Departamento',   icon: '🏢', for: ['natural'] },
  { value: 'oficina',      label: 'Oficina',        icon: '🏛️', for: ['business'] },
  { value: 'colegio',      label: 'Colegio',        icon: '🏫', for: ['business'] },
  { value: 'otro',         label: 'Otro',           icon: '📍', for: ['natural', 'business'] },
];

// ─── Opciones de tarifa ───────────────────────────────────────────────────────

interface TarifaOption {
  value: TarifaType;
  label: string;
  description: string;
}

interface TarifaGroup {
  group: string;
  options: TarifaOption[];
}

const TARIFA_GROUPS: TarifaGroup[] = [
  {
    group: 'No lo sé',
    options: [
      { value: 'unknown', label: 'No sé / No tengo claro', description: 'Usaremos BT1 como referencia. Puedes actualizarlo después.' },
    ],
  },
  {
    group: 'Baja Tensión (BT)',
    options: [
      { value: 'BT1',   label: 'BT1',   description: 'Potencia conectada < 10 kW — residencial y pequeño comercio' },
      { value: 'BT2',   label: 'BT2',   description: 'Energía + potencia contratada — comercial y alumbrado público' },
      { value: 'BT3',   label: 'BT3',   description: 'Energía + demanda máxima medida' },
      { value: 'BT4.1', label: 'BT4.1', description: 'Demanda de punta contratada + demanda máxima contratada' },
      { value: 'BT4.2', label: 'BT4.2', description: 'Demanda de punta medida + demanda máxima contratada' },
      { value: 'BT4.3', label: 'BT4.3', description: 'Demanda de punta medida + demanda máxima medida' },
    ],
  },
  {
    group: 'Alta Tensión (AT)',
    options: [
      { value: 'AT2',   label: 'AT2',   description: 'Equivalente a BT2 en alta tensión' },
      { value: 'AT3',   label: 'AT3',   description: 'Equivalente a BT3 en alta tensión' },
      { value: 'AT4.1', label: 'AT4.1', description: 'Equivalente a BT4.1 en alta tensión' },
      { value: 'AT4.2', label: 'AT4.2', description: 'Equivalente a BT4.2 en alta tensión' },
      { value: 'AT4.3', label: 'AT4.3', description: 'Equivalente a BT4.3 en alta tensión' },
    ],
  },
];

// Descripción de la tarifa seleccionada para mostrar debajo del select
const TARIFA_DESC: Partial<Record<TarifaType, string>> = Object.fromEntries(
  TARIFA_GROUPS.flatMap((g) => g.options.map((o) => [o.value, o.description])),
);

// ─── Componente principal ─────────────────────────────────────────────────────

export default function StepSupply({ category, initialData, onSubmit }: StepSupplyProps) {
  const [propertyType, setPropertyType] = useState<PropertyType | ''>(
    initialData?.propertyType ?? '',
  );
  const [distribuidora, setDistribuidora] = useState(initialData?.distribuidora ?? '');
  const [tarifa, setTarifa] = useState<TarifaType>(initialData?.tarifa ?? 'BT1');
  const [hasExistingSolar, setHasExistingSolar] = useState(
    initialData?.hasExistingSolar ?? false,
  );
  const [existingSystemKWp, setExistingSystemKWp] = useState(
    initialData?.existingSystemKWp?.toString() ?? '',
  );
  const [includeBattery, setIncludeBattery] = useState(initialData?.includeBattery ?? false);

  const visibleProperties = PROPERTY_OPTIONS.filter((o) => o.for.includes(category));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!propertyType || !distribuidora) return;

    onSubmit({
      propertyType: propertyType as PropertyType,
      distribuidora,
      tarifa,
      hasExistingSolar,
      existingSystemKWp: hasExistingSolar && existingSystemKWp
        ? parseFloat(existingSystemKWp)
        : undefined,
      includeBattery,
    });
  }

  const canSubmit = !!propertyType && !!distribuidora;

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
                    'flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-sm font-medium transition-all',
                    'hover:border-green-400',
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

        {/* Distribuidora y tarifa */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-5">
          <h2 className="text-sm font-semibold text-gray-700">Datos de la boleta</h2>

          {/* Distribuidora */}
          <div className="flex flex-col gap-1">
            <label htmlFor="distribuidora" className="text-sm font-medium text-gray-700">
              Empresa distribuidora<span className="text-red-400 ml-0.5">*</span>
            </label>
            <select
              id="distribuidora"
              value={distribuidora}
              onChange={(e) => setDistribuidora(e.target.value)}
              required
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition bg-white"
            >
              <option value="">Selecciona tu distribuidora</option>
              {DISTRIBUTORS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Tarifa */}
          <div className="flex flex-col gap-2">
            <label htmlFor="tarifa" className="text-sm font-medium text-gray-700">
              Tarifa eléctrica
            </label>
            <select
              id="tarifa"
              value={tarifa}
              onChange={(e) => setTarifa(e.target.value as TarifaType)}
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition bg-white"
            >
              {TARIFA_GROUPS.map((group) => (
                <optgroup key={group.group} label={group.group}>
                  {group.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {tarifa && TARIFA_DESC[tarifa] && (
              <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                {TARIFA_DESC[tarifa]}
              </p>
            )}
            <p className="text-xs text-gray-400">
              La tarifa nos permite analizar si conviene cambiar de plan, ampliar el empalme o instalar batería para usar energía en horas de menor costo.
            </p>
          </div>
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
              <span
                className={[
                  'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform',
                  hasExistingSolar ? 'translate-x-5' : 'translate-x-0',
                ].join(' ')}
              />
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

          {/* ¿Incluir batería? */}
          <div className="flex items-start gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={includeBattery}
              onClick={() => setIncludeBattery((v) => !v)}
              className={[
                'relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-green-400 mt-0.5',
                includeBattery ? 'bg-green-500' : 'bg-gray-200',
              ].join(' ')}
            >
              <span
                className={[
                  'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform',
                  includeBattery ? 'translate-x-5' : 'translate-x-0',
                ].join(' ')}
              />
            </button>
            <div>
              <p className="text-sm font-medium text-gray-700">Quiero incluir batería</p>
              <p className="text-xs text-gray-400">
                Permite usar energía solar en la noche y durante cortes de luz.
              </p>
            </div>
          </div>
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
