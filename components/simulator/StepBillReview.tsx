'use client';

import type { ConsumptionProfile } from '@/lib/types';
import { MONTH_NAMES } from '@/lib/constants';

// ─── Props ────────────────────────────────────────────────────────────────────

interface StepBillReviewProps {
  profile: ConsumptionProfile;
  onConfirm: () => void;
}

// ─── Gráfico de barras CSS ────────────────────────────────────────────────────

function ConsumptionChart({ profile }: { profile: ConsumptionProfile }) {
  if (profile.bills.length === 0) return null;

  // Todos los meses ordenados cronológicamente
  const sorted = [...profile.bills].sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.month - b.month,
  );

  const allValues = sorted.map((b) => b.consumptionKWh);
  const peak = allValues.length > 0 ? Math.max(...allValues) : 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-1 h-32 w-full">
        {sorted.map((bill) => {
          const isInterpolated = bill.source === 'interpolated';
          const heightPct = peak > 0 ? (bill.consumptionKWh / peak) * 100 : 0;
          const isMax = !isInterpolated && bill.consumptionKWh === profile.peakMonthKWh;
          return (
            <div
              key={`${bill.year}-${bill.month}`}
              className="flex flex-col items-center flex-1 gap-1 h-full justify-end"
            >
              <div className="relative flex flex-col items-center justify-end w-full h-full">
                <div
                  style={{ height: `${Math.max(heightPct, 4)}%` }}
                  className={[
                    'w-full rounded-t-sm transition-all relative',
                    isInterpolated
                      ? 'bg-gray-200'
                      : isMax ? 'bg-[#389fe0]' : 'bg-green-300',
                  ].join(' ')}
                >
                  <span className={[
                    'absolute -top-4 left-0 right-0 text-center text-[9px] whitespace-nowrap',
                    isInterpolated ? 'text-gray-400' : isMax ? 'font-semibold text-[#1d65c5]' : 'text-gray-500',
                  ].join(' ')}>
                    {bill.consumptionKWh}
                  </span>
                </div>
              </div>
              <span className="text-[9px] text-gray-400 w-full text-center truncate">
                {MONTH_NAMES[bill.month].slice(0, 3)}
              </span>
            </div>
          );
        })}
      </div>
      {sorted.some((b) => b.source === 'interpolated') && (
        <p className="text-[10px] text-gray-400 flex items-center gap-1.5">
          <span className="inline-block w-3 h-2 rounded-sm bg-gray-200" />
          Meses estimados por interpolación estacional
        </p>
      )}
    </div>
  );
}

// ─── Tarjeta de estadística ───────────────────────────────────────────────────

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 p-4 bg-gray-50 rounded-xl">
      <span className="text-lg font-bold text-gray-900 tabular-nums">{value}</span>
      <span className="text-xs text-gray-500">{label}</span>
      {sub && <span className="text-[10px] text-gray-400">{sub}</span>}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function StepBillReview({ profile, onConfirm }: StepBillReviewProps) {
  const sorted = [...profile.bills].sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.month - b.month,
  );

  // Precio promedio por kWh si hay meses con monto informado
  const billsWithPrice = profile.bills.filter((b) => b.kWhPriceCLP != null);
  const avgKWhPrice =
    billsWithPrice.length > 0
      ? Math.round(
          billsWithPrice.reduce((s, b) => s + b.kWhPriceCLP!, 0) / billsWithPrice.length,
        )
      : null;

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Revisa tu consumo</h1>
        <p className="text-gray-500 mt-2 text-sm">
          Confirma que los datos ingresados son correctos antes de continuar.
        </p>
      </div>

      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        className="flex flex-col gap-5 select-none"
        onCopy={(e) => e.preventDefault()}
      >

        {/* Estadísticas */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat
              label="Promedio mensual"
              value={`${profile.averageMonthlyKWh} kWh`}
            />
            <Stat
              label="Mes más alto"
              value={`${profile.peakMonthKWh} kWh`}
            />
            <Stat
              label="Mes más bajo"
              value={`${profile.minMonthKWh} kWh`}
            />
            <Stat
              label="Meses ingresados"
              value={`${profile.bills.length}/12`}
              sub={profile.isComplete ? 'Completo' : 'Simulación aproximada'}
            />
          </div>

          {avgKWhPrice !== null && (
            <div className="flex items-center gap-2 bg-blue-50 rounded-xl px-4 py-2.5">
              <span className="text-blue-500 text-sm">ℹ</span>
              <p className="text-xs text-blue-700">
                Precio promedio calculado desde tus boletas:{' '}
                <span className="font-semibold">${avgKWhPrice.toLocaleString('es-CL')} / kWh</span>
                {' '}({billsWithPrice.length} mes{billsWithPrice.length > 1 ? 'es' : ''} con monto)
              </p>
            </div>
          )}

          {!profile.isComplete && (
            <div className="flex items-center gap-2 bg-amber-50 rounded-xl px-4 py-2.5">
              <span className="text-amber-500 text-sm">⚠</span>
              <p className="text-xs text-amber-700">
                Tienes {12 - profile.bills.length} mes{12 - profile.bills.length > 1 ? 'es' : ''} sin datos.
                La simulación usará el promedio de {profile.averageMonthlyKWh} kWh para esos meses.
              </p>
            </div>
          )}
        </div>

        {/* Gráfico */}
        {profile.bills.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-5">Consumo por mes</h2>
            <ConsumptionChart profile={profile} />
          </div>
        )}

        {/* Tabla detalle */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-[1fr_80px_80px_80px] gap-2 px-5 py-2.5 bg-gray-50 border-b border-gray-100">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mes</span>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">kWh</span>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Monto</span>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">$/kWh</span>
          </div>
          {sorted.map((bill, idx) => (
            <div
              key={`${bill.year}-${bill.month}`}
              className={[
                'grid grid-cols-[1fr_80px_80px_80px] gap-2 items-center px-5 py-2.5 text-sm',
                idx < sorted.length - 1 ? 'border-b border-gray-50' : '',
              ].join(' ')}
            >
              <span className="text-gray-700">
                {MONTH_NAMES[bill.month]} {bill.year}
              </span>
              <span className="text-right font-medium text-gray-900 tabular-nums">
                {bill.consumptionKWh}
              </span>
              <span className="text-right text-gray-500 tabular-nums">
                {bill.variableAmountCLP != null
                  ? `$${bill.variableAmountCLP.toLocaleString('es-CL')}`
                  : '—'}
              </span>
              <span className="text-right text-gray-500 tabular-nums">
                {bill.kWhPriceCLP != null
                  ? `$${bill.kWhPriceCLP.toLocaleString('es-CL')}`
                  : '—'}
              </span>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onConfirm}
          className="w-full rounded-xl bg-[#389fe0] hover:bg-[#1d65c5] text-white font-semibold py-3 text-sm transition-colors"
        >
          Confirmar y continuar →
        </button>
      </div>
    </div>
  );
}
