'use client';

import type { SimulatorResult } from '@/lib/types';
import { formatCLP, formatKWh, formatPayback, formatPercent } from '@/lib/format';

interface SimulatorResultsProps {
  result: SimulatorResult;
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent ?? 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function SimulatorResults({ result }: SimulatorResultsProps) {
  const { region, kit, batteryCapacityKWh, energyBalance, financial, environmental } = result;

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="bg-green-600 text-white rounded-2xl p-5">
        <p className="text-sm opacity-80 mb-1">{region.name} · Tarifa {result.input.tarifa}</p>
        <h2 className="text-xl font-bold">Resumen de tu simulación solar</h2>
        <p className="text-sm opacity-80 mt-1">
          Consumo: {formatKWh(result.input.monthlyConsumptionKWh)}/mes ·{' '}
          Precio kWh: {result.input.energyPrice.kWhPriceCLP} CLP
        </p>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Ahorro mensual estimado"
          value={formatCLP(financial.monthlyBenefitCLP)}
          sub="autoconsumo + inyección"
          accent="text-green-600"
        />
        <StatCard
          label="Ahorro anual estimado"
          value={formatCLP(financial.annualBenefitCLP)}
          accent="text-green-600"
        />
        <StatCard
          label="Período de retorno"
          value={formatPayback(financial.paybackYears)}
          sub="payback simple"
        />
        <StatCard
          label="Cobertura del consumo"
          value={formatPercent(energyBalance.coveragePercent)}
          sub="consumo cubierto por solar"
        />
      </div>

      {/* Kit recomendado */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Sistema recomendado</h3>
        <div className="bg-white rounded-xl border-2 border-green-500 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                Recomendado
              </span>
              <p className="font-semibold text-gray-900 mt-1">Kit {kit.sizekWp} kWp</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {kit.panelCount} paneles · {kit.estimatedAreaM2} m²
                {batteryCapacityKWh > 0 && <> · {batteryCapacityKWh} kWh batería</>}
              </p>
              {kit.installationNotes && (
                <p className="text-xs text-gray-400 mt-1">{kit.installationNotes}</p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-lg font-bold text-gray-900">{formatCLP(financial.systemCostCLP)}</p>
              <p className="text-xs text-gray-400">precio referencial</p>
            </div>
          </div>
        </div>
      </div>

      {/* Desglose financiero */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Desglose financiero anual</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Ahorro por autoconsumo</span>
            <span className="font-medium text-green-700">
              {formatCLP(energyBalance.totalSelfConsumptionSavingsCLP)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">
              Ingreso por inyección ({financial.injectionValuePerKWhCLP} CLP/kWh)
            </span>
            <span className="font-medium text-green-700">
              {formatCLP(energyBalance.totalInjectionIncomeCLP)}
            </span>
          </div>
          <div className="border-t border-gray-100 pt-2 flex justify-between font-semibold">
            <span className="text-gray-700">Beneficio total anual</span>
            <span className="text-green-600">{formatCLP(financial.annualBenefitCLP)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>ROI a 25 años</span>
            <span>{financial.roi25YearsPercent}%</span>
          </div>
        </div>
      </div>

      {/* Balance energético mensual */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 overflow-x-auto">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Balance energético mensual</h3>
        <table className="w-full text-xs min-w-[580px]">
          <thead>
            <tr className="text-gray-400 border-b border-gray-100">
              <th className="text-left pb-2 font-medium">Mes</th>
              <th className="text-right pb-2 font-medium">Producción</th>
              <th className="text-right pb-2 font-medium">Autoconsumo</th>
              <th className="text-right pb-2 font-medium">Inyección</th>
              <th className="text-right pb-2 font-medium">Red</th>
              <th className="text-right pb-2 font-medium">Beneficio</th>
            </tr>
          </thead>
          <tbody>
            {energyBalance.monthly.map((m) => (
              <tr key={m.month} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-1.5 text-gray-700">{m.monthName}</td>
                <td className="py-1.5 text-right text-gray-600">{m.productionKWh}</td>
                <td className="py-1.5 text-right text-green-600">{m.selfConsumptionKWh}</td>
                <td className="py-1.5 text-right text-blue-600">{m.injectedToGridKWh}</td>
                <td className="py-1.5 text-right text-gray-500">{m.consumedFromGridKWh}</td>
                <td className="py-1.5 text-right font-medium text-green-700">
                  {formatCLP(m.totalMonthlyBenefitCLP)}
                </td>
              </tr>
            ))}
            <tr className="font-semibold text-gray-700 bg-gray-50">
              <td className="py-2">Total anual</td>
              <td className="py-2 text-right">{energyBalance.totalProductionKWh}</td>
              <td className="py-2 text-right text-green-600">{energyBalance.totalSelfConsumptionKWh}</td>
              <td className="py-2 text-right text-blue-600">{energyBalance.totalInjectedKWh}</td>
              <td className="py-2 text-right">{energyBalance.totalConsumedFromGridKWh}</td>
              <td className="py-2 text-right text-green-600">
                {formatCLP(financial.annualBenefitCLP)}
              </td>
            </tr>
          </tbody>
        </table>
        <p className="text-xs text-gray-400 mt-2">Valores en kWh · Red = consumo restante desde la red eléctrica</p>
      </div>

      {/* Impacto ambiental */}
      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-emerald-800 mb-2">Impacto ambiental estimado</h3>
        <div className="flex gap-6 text-sm">
          <div>
            <p className="text-2xl font-bold text-emerald-700">
              {environmental.annualCO2AvoidedKg.toLocaleString('es-CL')} kg
            </p>
            <p className="text-xs text-emerald-600">CO₂ evitado al año</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-700">{environmental.equivalentTrees}</p>
            <p className="text-xs text-emerald-600">árboles equivalentes</p>
          </div>
        </div>
      </div>

      {/* Nota metodológica */}
      <p className="text-xs text-gray-400 leading-relaxed">
        * Simulación estimativa. Los valores asumen un precio de inyección equivalente al 50% del kWh de compra
        (net billing) y un perfil de consumo 70% diurno / 30% nocturno. Producción basada en irradiación
        histórica de {region.name}.
      </p>
    </div>
  );
}
