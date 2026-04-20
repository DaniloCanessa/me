'use client';

import { useState } from 'react';
import { updateLeadDetails } from './actions';
import type { Lead } from './page';

const MONTH_NAMES: Record<number, string> = {
  1:'Ene',2:'Feb',3:'Mar',4:'Abr',5:'May',6:'Jun',
  7:'Jul',8:'Ago',9:'Sep',10:'Oct',11:'Nov',12:'Dic',
};

function clp(n: number | null | undefined) {
  if (n == null) return '—';
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
}

export default function LeadDetail({ lead }: { lead: Lead }) {
  const [open, setOpen]   = useState(false);
  const [saved, setSaved] = useState(false);

  const profile   = lead.consumption_profile as { bills: Array<{ month: number; year: number; consumptionKWh: number; variableAmountCLP?: number }> } | null;
  const scenarios = lead.scenarios_json as Record<string, { kitSizeKWp: number; kitPriceCLP: number; monthlyBenefitCLP: number; paybackYears: number; coveragePercent: number; panelCount: number; areaM2: number; batteryKWh?: number } | null> | null;
  const future    = lead.future_consumption as { totalAdditionalMonthlyKWh: number; evCharger?: { carCount: number; estimatedMonthlyKWh: number }; airConditioners?: Array<{ count: number; btu: number; estimatedMonthlyKWh: number }>; waterHeater?: { occupants: number; estimatedMonthlyKWh: number } } | null;
  const supply    = lead.supply_details as { tarifa: string; distribuidora: string; amperajeA?: number; potenciaContratadaKW?: number; tensionSuministro?: 'BT' | 'AT'; hasExistingSolar: boolean; existingSystemKWp?: number; propertyType: string } | null;

  async function handleSave(formData: FormData) {
    await updateLeadDetails(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-green-600 hover:underline whitespace-nowrap"
      >
        Ver detalle
      </button>

      {open && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'flex-end' }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div style={{ width: '100%', maxWidth: 600, backgroundColor: '#fff', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 10 }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>{lead.name ?? lead.email}</p>
                <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>{lead.email} · {lead.region_name}</p>
              </div>
              <button onClick={() => setOpen(false)} style={{ fontSize: 20, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>

              {/* Consumo mensual */}
              {profile?.bills && profile.bills.length > 0 && (
                <section>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Consumo mensual</p>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-200">
                        <th className="text-left pb-1 font-medium">Mes</th>
                        <th className="text-right pb-1 font-medium">kWh</th>
                        <th className="text-right pb-1 font-medium">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profile.bills.map((b) => (
                        <tr key={`${b.year}-${b.month}`} className="border-b border-gray-100">
                          <td className="py-1.5 text-gray-700">{MONTH_NAMES[b.month]} {b.year}</td>
                          <td className="py-1.5 text-right font-medium text-gray-800">{b.consumptionKWh}</td>
                          <td className="py-1.5 text-right text-gray-500">{b.variableAmountCLP ? clp(b.variableAmountCLP) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )}

              {/* Escenarios */}
              {scenarios && (
                <section>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Escenarios mostrados al cliente</p>
                  <div className="flex flex-col gap-2">
                    {(['A', 'B', 'C'] as const).map((s) => {
                      const sc = scenarios[s];
                      if (!sc) return null;
                      return (
                        <div key={s} className="bg-gray-50 rounded-xl border border-gray-100 px-4 py-3 text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-gray-800">
                              Escenario {s} — {sc.kitSizeKWp} kWp
                              {sc.batteryKWh ? ` + ${sc.batteryKWh} kWh batería` : ''}
                            </span>
                            <span className="text-green-700 font-semibold">{clp(sc.monthlyBenefitCLP)}/mes</span>
                          </div>
                          <div className="flex gap-4 text-xs text-gray-500 flex-wrap">
                            <span>Precio ref: {clp(sc.kitPriceCLP)}</span>
                            <span>Payback: {sc.paybackYears % 1 === 0 ? sc.paybackYears : sc.paybackYears.toFixed(1)} años</span>
                            <span>Cobertura: {Math.round(sc.coveragePercent)}%</span>
                            <span>{sc.panelCount} paneles · {sc.areaM2} m²</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Suministro técnico */}
              {supply && (
                <section>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Suministro técnico</p>
                  <div className="bg-gray-50 rounded-xl border border-gray-100 px-4 py-3 text-sm flex flex-col gap-1.5">
                    <div className="flex justify-between"><span className="text-gray-400">Tarifa</span><span className="font-medium">{supply.tarifa === 'unknown' ? 'No sabe (BT1 ref.)' : supply.tarifa}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Distribuidora</span><span>{supply.distribuidora ?? '—'}</span></div>
                    {supply.amperajeA && <div className="flex justify-between"><span className="text-gray-400">Empalme</span><span>{supply.amperajeA} A · {Math.round(supply.amperajeA * 220 / 1000 * 10) / 10} kW máx</span></div>}
                    {supply.potenciaContratadaKW && <div className="flex justify-between"><span className="text-gray-400">Potencia contratada</span><span>{supply.potenciaContratadaKW} kW{supply.tensionSuministro ? ` · ${supply.tensionSuministro}` : ''}</span></div>}
                    <div className="flex justify-between"><span className="text-gray-400">Tipo propiedad</span><span className="capitalize">{supply.propertyType}</span></div>
                    {supply.hasExistingSolar && <div className="flex justify-between"><span className="text-gray-400">Solar existente</span><span>{supply.existingSystemKWp} kWp</span></div>}
                  </div>
                </section>
              )}

              {/* Equipos futuros */}
              {future && future.totalAdditionalMonthlyKWh > 0 && (
                <section>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Consumos futuros planificados</p>
                  <div className="bg-gray-50 rounded-xl border border-gray-100 px-4 py-3 text-sm flex flex-col gap-1.5">
                    {future.evCharger && <div className="flex justify-between"><span className="text-gray-400">Auto eléctrico</span><span>{future.evCharger.carCount} auto{future.evCharger.carCount > 1 ? 's' : ''} · +{future.evCharger.estimatedMonthlyKWh} kWh/mes</span></div>}
                    {future.airConditioners?.map((ac, i) => (
                      <div key={i} className="flex justify-between"><span className="text-gray-400">Aire acondicionado</span><span>{ac.count} unid. {ac.btu} BTU · +{ac.estimatedMonthlyKWh} kWh/mes</span></div>
                    ))}
                    {future.waterHeater && <div className="flex justify-between"><span className="text-gray-400">Calefón eléctrico</span><span>{future.waterHeater.occupants} personas · +{future.waterHeater.estimatedMonthlyKWh} kWh/mes</span></div>}
                    <div className="flex justify-between border-t border-gray-200 pt-1.5 font-semibold text-gray-700"><span>Total adicional</span><span>+{future.totalAdditionalMonthlyKWh} kWh/mes</span></div>
                  </div>
                </section>
              )}

              {/* Gestión comercial */}
              <section>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Gestión comercial</p>
                <form action={handleSave} className="flex flex-col gap-3">
                  <input type="hidden" name="id" value={lead.id} />
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Precio cotizado (CLP)</label>
                    <input
                      type="number"
                      name="quoted_price_clp"
                      defaultValue={lead.quoted_price_clp ?? ''}
                      placeholder="ej: 4500000"
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Fecha de visita técnica</label>
                    <input
                      type="date"
                      name="visit_date"
                      defaultValue={lead.visit_date ?? ''}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Notas</label>
                    <textarea
                      name="notes"
                      defaultValue={lead.notes ?? ''}
                      rows={4}
                      placeholder="Observaciones, acuerdos, próximos pasos..."
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2.5 transition-colors"
                  >
                    {saved ? '✓ Guardado' : 'Guardar cambios'}
                  </button>
                </form>
              </section>

            </div>
          </div>
        </div>
      )}
    </>
  );
}
