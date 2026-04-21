'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { CustomerCategory, PropertyType, SupplyData, TarifaType } from '@/lib/types';

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
  { value: 'industria',    label: 'Industria',     icon: '🏭', for: ['business'] },
  { value: 'condominio',   label: 'Condominio',    icon: '🏘️', for: ['business'] },
  { value: 'otro',         label: 'Otro',          icon: '📍', for: ['natural', 'business'] },
];

const AMPERAJE_OPTIONS = [10, 15, 20, 25, 32, 40, 50, 63];
const POTENCIA_PRESETS = [10, 20, 30, 50, 75, 100, 150, 200, 300];

const TARIFA_BT: { value: TarifaType; label: string }[] = [
  { value: 'BT1',   label: 'BT1 — Energía y potencia conectada (residencial, < 10 kW)' },
  { value: 'BT2',   label: 'BT2 — Energía + potencia contratada' },
  { value: 'BT3',   label: 'BT3 — Energía + demanda máxima medida' },
  { value: 'BT4.1', label: 'BT4.1 — Demanda punta contratada + máxima contratada' },
  { value: 'BT4.2', label: 'BT4.2 — Demanda punta medida + máxima contratada' },
  { value: 'BT4.3', label: 'BT4.3 — Demanda punta medida + máxima medida' },
];

const TARIFA_AT: { value: TarifaType; label: string }[] = [
  { value: 'AT2',   label: 'AT2 — Alta tensión: energía + potencia contratada' },
  { value: 'AT3',   label: 'AT3 — Alta tensión: demanda máxima medida' },
  { value: 'AT4.1', label: 'AT4.1 — Alta tensión: demanda punta contratada' },
  { value: 'AT4.2', label: 'AT4.2 — Alta tensión: demanda punta medida + máx. contratada' },
  { value: 'AT4.3', label: 'AT4.3 — Alta tensión: demanda punta medida + máx. medida' },
];

// ─── Componente principal ─────────────────────────────────────────────────────

export default function StepSupply({ category, initialData, onSubmit }: StepSupplyProps) {
  const [propertyType, setPropertyType] = useState<PropertyType | ''>(
    initialData?.propertyType ?? '',
  );

  // Residencial
  const [amperajeA, setAmperajeA] = useState<number | ''>(initialData?.amperajeA ?? '');

  // Empresa
  const [potenciaContratadaKW, setPotenciaContratadaKW] = useState<number | ''>(
    initialData?.potenciaContratadaKW ?? '',
  );
  const [potenciaCustom, setPotenciaCustom] = useState('');

  // Tarifa (ambos tipos de cliente)
  const [tarifa, setTarifa] = useState<TarifaType>(() => {
    if (initialData?.tarifa && initialData.tarifa !== 'unknown') return initialData.tarifa;
    return category === 'natural' ? 'BT1' : 'unknown';
  });

  // Horario de operación (solo cuando tarifa BT4.x o AT4.x)
  const [operatingHours, setOperatingHours] = useState<'peak' | 'offpeak' | 'mixed' | ''>(
    initialData?.operatingHours ?? '',
  );

  const hasPeakTariff = tarifa.startsWith('BT4') || tarifa.startsWith('AT4');

  const [hasExistingSolar, setHasExistingSolar] = useState(
    initialData?.hasExistingSolar ?? false,
  );
  const [existingSystemKWp, setExistingSystemKWp] = useState(
    initialData?.existingSystemKWp?.toString() ?? '',
  );

  const visibleProperties = PROPERTY_OPTIONS.filter((o) => o.for.includes(category));
  const isResidential = category === 'natural';

  const canSubmit = isResidential
    ? !!propertyType && amperajeA !== ''
    : !!propertyType && potenciaContratadaKW !== '' && tarifa !== 'unknown';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      propertyType: propertyType as PropertyType,
      distribuidora: initialData?.distribuidora,
      tarifa,
      amperajeA: isResidential ? amperajeA as number : undefined,
      potenciaContratadaKW: !isResidential ? potenciaContratadaKW as number : undefined,
      tensionSuministro: !isResidential ? (tarifa.startsWith('AT') ? 'AT' : 'BT') : undefined,
      operatingHours: hasPeakTariff && operatingHours ? operatingHours as 'peak' | 'offpeak' | 'mixed' : undefined,
      hasExistingSolar,
      existingSystemKWp: hasExistingSolar && existingSystemKWp
        ? parseFloat(existingSystemKWp)
        : undefined,
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
                    'flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-sm font-medium transition-all hover:border-[#389fe0]',
                    isSelected
                      ? 'border-[#389fe0] bg-[#dde3e9]/50 text-green-800'
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

        {/* ── Amperaje del empalme (solo residencial) ── */}
        {isResidential && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-700">
                Amperaje del empalme<span className="text-red-400 ml-0.5">*</span>
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Define el tamaño máximo de la PFV que puedes instalar.
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
                      ? 'border-[#389fe0] bg-[#dde3e9]/50 text-green-800'
                      : 'border-gray-200 text-gray-600 hover:border-[#b0cedd]',
                  ].join(' ')}
                >
                  {amp} A
                </button>
              ))}
            </div>

            {amperajeA !== '' && (
              <p className="text-xs text-[#1d65c5] bg-[#dde3e9]/50 rounded-lg px-3 py-2">
                Empalme de <strong>{amperajeA} A</strong> →{' '}
                potencia máxima: <strong>{((amperajeA as number) * 220 / 1000).toFixed(1)} kW</strong>.
                La PFV no superará este límite.
              </p>
            )}
          </div>
        )}

        {/* ── Potencia contratada (solo empresa) ── */}
        {!isResidential && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-700">
                Potencia contratada<span className="text-red-400 ml-0.5">*</span>
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Revisa tu contrato de suministro o boleta eléctrica. Define el tamaño máximo de la PFV (Art. 149 bis DFL 4: máx. 300 kW para net billing).
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {POTENCIA_PRESETS.map((kw) => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => {
                    setPotenciaContratadaKW(potenciaContratadaKW === kw ? '' : kw);
                    setPotenciaCustom('');
                  }}
                  className={[
                    'px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all',
                    potenciaContratadaKW === kw
                      ? 'border-[#389fe0] bg-[#dde3e9]/50 text-green-800'
                      : 'border-gray-200 text-gray-600 hover:border-[#b0cedd]',
                  ].join(' ')}
                >
                  {kw} kW
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 shrink-0">Otro valor:</span>
              <input
                type="number"
                min="1"
                max="300"
                step="1"
                value={potenciaCustom}
                onChange={(e) => {
                  setPotenciaCustom(e.target.value);
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v) && v > 0) setPotenciaContratadaKW(v);
                  else if (e.target.value === '') setPotenciaContratadaKW('');
                }}
                placeholder="kW"
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#389fe0]/50 focus:border-transparent transition w-28"
              />
            </div>

            {potenciaContratadaKW !== '' && (
              <p className="text-xs text-[#1d65c5] bg-[#dde3e9]/50 rounded-lg px-3 py-2">
                Potencia contratada: <strong>{potenciaContratadaKW} kW</strong>.
                {(potenciaContratadaKW as number) >= 300 && (
                  <> Sistema limitado a 300 kW por net billing.</>
                )}
              </p>
            )}
          </div>
        )}

        {/* ── Tarifa eléctrica (empresa) ── */}
        {!isResidential && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-700">
                Tarifa eléctrica<span className="text-red-400 ml-0.5">*</span>
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Encuéntrala en tu boleta eléctrica. Determina los cargos regulados aplicables según el DFL 4.
              </p>
            </div>

            <select
              value={tarifa}
              onChange={(e) => setTarifa(e.target.value as TarifaType)}
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#389fe0]/50 focus:border-transparent transition"
            >
              <option value="unknown" disabled>Selecciona la tarifa de tu boleta…</option>
              <optgroup label="Baja Tensión (BT) — menor a 1 kV">
                {TARIFA_BT.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </optgroup>
              <optgroup label="Alta Tensión (AT) — 1 kV o más (transformador propio)">
                {TARIFA_AT.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </optgroup>
            </select>

            {tarifa !== 'unknown' && (
              <p className="text-xs text-[#1d65c5] bg-[#dde3e9]/50 rounded-lg px-3 py-2">
                Tarifa seleccionada: <strong>{tarifa}</strong>
                {tarifa.startsWith('AT') && ' — Alta Tensión (≥ 1 kV, requiere transformador propio)'}
                {tarifa.startsWith('BT') && ' — Baja Tensión (< 1 kV)'}
                {(tarifa === 'BT4.1' || tarifa === 'BT4.2' || tarifa === 'BT4.3' || tarifa === 'AT4.1' || tarifa === 'AT4.2' || tarifa === 'AT4.3') && (
                  <> · Tarifa con cargo de punta — considera el Escenario C con baterías</>
                )}
              </p>
            )}
          </div>
        )}

        {/* ── Horario de operación (BT4.x / AT4.x) ── */}
        {hasPeakTariff && (
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6 flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-semibold text-purple-800">
                Horario de operación de equipos
              </h2>
              <p className="text-xs text-purple-600 mt-1">
                Tu tarifa tiene cargo diferenciado por horas de punta (06:00–23:00). Esto nos permite
                calcular el impacto real de la batería en tu costo eléctrico.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {([
                { value: 'peak'    as const, label: 'Principalmente en horas de punta', sub: '06:00–23:00 · horario laboral o comercial' },
                { value: 'offpeak' as const, label: 'Principalmente fuera de punta',    sub: '23:00–06:00 · operación nocturna' },
                { value: 'mixed'   as const, label: 'Horario mixto / no lo sé',          sub: 'Se usará distribución estándar (60/40)' },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setOperatingHours(opt.value)}
                  className={[
                    'text-left p-3 rounded-xl border-2 transition-all',
                    operatingHours === opt.value
                      ? 'border-purple-500 bg-white'
                      : 'border-purple-100 bg-white hover:border-purple-300',
                  ].join(' ')}
                >
                  <p className={`text-sm font-semibold ${operatingHours === opt.value ? 'text-purple-800' : 'text-gray-700'}`}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{opt.sub}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Tarifa eléctrica (residencial) ── */}
        {isResidential && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-700">Tarifa eléctrica</h2>
              <p className="text-xs text-gray-400 mt-1">
                Aparece en tu boleta. La mayoría de los hogares están en BT1.
              </p>
            </div>

            <select
              value={tarifa}
              onChange={(e) => setTarifa(e.target.value as TarifaType)}
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#389fe0]/50 focus:border-transparent transition"
            >
              {TARIFA_BT.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Opciones solares */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-5">
          <h2 className="text-sm font-semibold text-gray-700">Opciones de instalación</h2>

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
                'relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-[#389fe0]/50 mt-0.5',
                hasExistingSolar ? 'bg-[#389fe0]' : 'bg-gray-200',
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
                className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#389fe0]/50 focus:border-transparent transition max-w-xs"
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
              ? 'bg-[#389fe0] hover:bg-[#1d65c5] text-white'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed',
          ].join(' ')}
        >
          Continuar →
        </button>
      </form>
    </div>
  );
}
