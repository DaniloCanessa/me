'use client';

import { useState } from 'react';
import type { SimulatorInput, EnergyPriceData, KWhPriceSource } from '@/lib/types';
import { REGIONS } from '@/lib/regions';
import { DISTRIBUTORS, CHILE_BT1, SOLAR_DEFAULTS } from '@/lib/constants';
import { calcKWhPriceFromBill } from '@/lib/calculations';

interface SimulatorFormProps {
  onSubmit: (input: SimulatorInput) => void;
  isLoading: boolean;
}

export default function SimulatorForm({ onSubmit, isLoading }: SimulatorFormProps) {
  const [regionId, setRegionId] = useState('metropolitana');
  const [distribuidora, setDistribuidora] = useState('');
  const [monthlyConsumption, setMonthlyConsumption] = useState('');
  const [priceSource, setPriceSource] = useState<KWhPriceSource>('reference');
  const [directPrice, setDirectPrice] = useState('');
  const [variableAmount, setVariableAmount] = useState('');
  const [measuredKWh, setMeasuredKWh] = useState('');
  const [fixedCharge, setFixedCharge] = useState('');
  const [includeBattery, setIncludeBattery] = useState(false);

  const referencePrice = CHILE_BT1.referenceKWhPriceCLP;

  const calculatedPrice =
    priceSource === 'bill_calculated' && variableAmount && measuredKWh
      ? calcKWhPriceFromBill(Number(variableAmount), Number(measuredKWh))
      : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    let kWhPriceCLP: number;
    if (priceSource === 'bill_direct') {
      kWhPriceCLP = Number(directPrice);
    } else if (priceSource === 'bill_calculated') {
      kWhPriceCLP = calcKWhPriceFromBill(Number(variableAmount), Number(measuredKWh));
    } else {
      kWhPriceCLP = referencePrice;
    }

    const energyPrice: EnergyPriceData = {
      source: priceSource,
      kWhPriceCLP,
      variableAmountCLP: priceSource === 'bill_calculated' ? Number(variableAmount) : undefined,
      measuredKWh: priceSource === 'bill_calculated' ? Number(measuredKWh) : undefined,
      referenceKWhPriceCLP: referencePrice,
    };

    const input: SimulatorInput = {
      regionId,
      distribuidora: distribuidora || undefined,
      tarifa: 'BT1',
      monthlyConsumptionKWh: Number(monthlyConsumption),
      energyPrice,
      fixedChargeCLP: fixedCharge ? Number(fixedCharge) : undefined,
      customerType: 'residential',
      includeBattery,
    };

    onSubmit(input);
  }

  const zonas = Array.from(new Set(REGIONS.map((r) => r.zone)));

  return (
    <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-base font-semibold text-gray-800">Datos de tu suministro</h2>

      {/* Región */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Región</label>
        <select
          value={regionId}
          onChange={(e) => setRegionId(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          {zonas.map((zona) => (
            <optgroup key={zona} label={`Zona ${zona}`}>
              {REGIONS.filter((r) => r.zone === zona).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Distribuidora */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Distribuidora <span className="text-gray-400 font-normal">(opcional)</span>
        </label>
        <select
          value={distribuidora}
          onChange={(e) => setDistribuidora(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">Selecciona tu distribuidora</option>
          {DISTRIBUTORS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* Consumo mensual */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Consumo mensual <span className="text-gray-400 font-normal">(kWh/mes)</span>
        </label>
        <input
          type="number"
          min="1"
          max="10000"
          value={monthlyConsumption}
          onChange={(e) => setMonthlyConsumption(e.target.value)}
          placeholder="Ej: 300"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          required
        />
        <p className="text-xs text-gray-400 mt-1">
          Puedes encontrar este dato en tu última boleta de electricidad.
        </p>
      </div>

      {/* Precio del kWh */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Precio del kWh</label>
        <div className="space-y-2">
          {[
            { value: 'reference', label: `Usar valor referencial (${referencePrice} CLP/kWh)` },
            { value: 'bill_direct', label: 'Ingresarlo directamente desde mi boleta' },
            { value: 'bill_calculated', label: 'Calcularlo desde mi boleta' },
          ].map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="priceSource"
                value={opt.value}
                checked={priceSource === opt.value}
                onChange={() => setPriceSource(opt.value as KWhPriceSource)}
                className="accent-green-600"
              />
              <span className="text-sm text-gray-700">{opt.label}</span>
            </label>
          ))}
        </div>

        {priceSource === 'bill_direct' && (
          <div className="mt-3">
            <input
              type="number"
              min="1"
              value={directPrice}
              onChange={(e) => setDirectPrice(e.target.value)}
              placeholder="Ej: 220"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              Busca &quot;cargo por energía&quot; o &quot;precio unitario&quot; en tu boleta.
            </p>
          </div>
        )}

        {priceSource === 'bill_calculated' && (
          <div className="mt-3 space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Monto variable (CLP)</label>
                <input
                  type="number"
                  min="1"
                  value={variableAmount}
                  onChange={(e) => setVariableAmount(e.target.value)}
                  placeholder="Ej: 66000"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">kWh facturados</label>
                <input
                  type="number"
                  min="1"
                  value={measuredKWh}
                  onChange={(e) => setMeasuredKWh(e.target.value)}
                  placeholder="Ej: 300"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
            </div>
            {calculatedPrice && (
              <p className="text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-lg">
                Precio calculado: <strong>{calculatedPrice} CLP/kWh</strong>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Cargo fijo */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Cargo fijo mensual <span className="text-gray-400 font-normal">(CLP, opcional)</span>
        </label>
        <input
          type="number"
          min="0"
          value={fixedCharge}
          onChange={(e) => setFixedCharge(e.target.value)}
          placeholder="Ej: 1200"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* Batería */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
        <input
          type="checkbox"
          id="includeBattery"
          checked={includeBattery}
          onChange={(e) => setIncludeBattery(e.target.checked)}
          className="mt-0.5 accent-amber-500 w-4 h-4 shrink-0"
        />
        <label htmlFor="includeBattery" className="text-sm text-amber-800 cursor-pointer leading-snug">
          Incluir opción con batería de almacenamiento ({SOLAR_DEFAULTS.defaultBatteryCapacityKWh} kWh)
        </label>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 px-6 rounded-xl transition-colors text-sm"
      >
        {isLoading ? 'Calculando...' : 'Simular mi ahorro solar →'}
      </button>
    </form>
  );
}
