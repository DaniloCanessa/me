import type {
  WizardState,
  KitScenarios,
  PersonContact,
  BusinessContact,
  MonthlyBill,
  SimulatorResult,
} from '@/lib/types';
import { SOLAR_DEFAULTS, MONTH_NAMES } from '@/lib/constants';
import { runTariffAnalysis } from '@/lib/tariffAnalysis';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  state: WizardState;
  scenarios?: KitScenarios;
  recommendedScenario?: 'A' | 'B' | 'C';
  businessResult?: SimulatorResult;
}

// ─── Paleta ───────────────────────────────────────────────────────────────────

const C = {
  green:      '#16a34a',
  greenLight: '#dcfce7',
  greenMid:   '#bbf7d0',
  emerald:    '#059669',
  emeraldBg:  '#ecfdf5',
  emeraldBdr: '#6ee7b7',
  dark:       '#111827',
  gray:       '#6b7280',
  grayLight:  '#f9fafb',
  border:     '#e5e7eb',
  blue:       '#2563eb',
  amber:      '#d97706',
  amberBg:    '#fffbeb',
  amberBdr:   '#fde68a',
  white:      '#ffffff',
};

// ─── Helpers de formato ───────────────────────────────────────────────────────

function clp(n: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: 'CLP', maximumFractionDigits: 0,
  }).format(n);
}
function pct(n: number) { return `${Math.round(n)}%`; }
function payback(y: number) {
  return y >= 100 ? '> 25 años' : `${y % 1 === 0 ? y : y.toFixed(1)} años`;
}

// ─── Gráfico de consumo mensual (barras) ─────────────────────────────────────

function ConsumptionChart({ bills }: { bills: MonthlyBill[] }) {
  const slots = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const bill = bills.find((b) => b.month === month);
    return { month, kwh: bill?.consumptionKWh ?? 0, source: bill?.source ?? 'none' };
  });

  const maxKwh = Math.max(...slots.map((s) => s.kwh), 1);
  const W = 714;
  const H = 120;
  const chartH = 76;
  const yTop = 16;
  const slotW = W / 12;
  const barW = slotW * 0.6;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
      {slots.map((slot, i) => {
        const barH = slot.kwh > 0 ? Math.max((slot.kwh / maxKwh) * chartH, 3) : 3;
        const x = i * slotW + (slotW - barW) / 2;
        const y = yTop + chartH - barH;
        const color = slot.source === 'interpolated' ? '#d1d5db' : C.green;
        return (
          <g key={slot.month}>
            <rect x={x} y={y} width={barW} height={barH} fill={color} rx={2} />
            {slot.kwh > 0 && (
              <text
                x={x + barW / 2} y={y - 4}
                textAnchor="middle" fontSize={7.5} fill="#4b5563"
              >
                {slot.kwh}
              </text>
            )}
            <text
              x={i * slotW + slotW / 2} y={H - 2}
              textAnchor="middle" fontSize={8} fill="#9ca3af"
            >
              {MONTH_NAMES[slot.month].slice(0, 3)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Gráfico de generación mensual (línea) ────────────────────────────────────

function GenerationChart({ result }: { result: SimulatorResult }) {
  const { monthly } = result.energyBalance;
  const W = 714;
  const H = 120;
  const PAD = { top: 16, right: 8, bottom: 22, left: 36 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;
  const maxVal = Math.max(...monthly.map((m) => m.productionKWh), 1);

  const xAt = (i: number) => PAD.left + (i / (monthly.length - 1)) * cW;
  const yAt = (v: number) => PAD.top + cH - (v / maxVal) * cH;

  const pathD = monthly
    .map((m, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)},${yAt(m.productionKWh).toFixed(1)}`)
    .join(' ');

  const yTicks = [0, 0.5, 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
      {yTicks.map((t) => {
        const yy = (PAD.top + cH * (1 - t)).toFixed(1);
        return (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={yy} y2={yy} stroke="#f3f4f6" strokeWidth={1} />
            <text x={PAD.left - 4} y={+yy + 3} textAnchor="end" fontSize={7.5} fill="#9ca3af">
              {Math.round(maxVal * t)}
            </text>
          </g>
        );
      })}
      {monthly.map((m, i) => (
        <text
          key={m.month}
          x={xAt(i).toFixed(1)} y={H - 4}
          textAnchor="middle" fontSize={8} fill="#9ca3af"
        >
          {m.monthName.slice(0, 3)}
        </text>
      ))}
      <path d={pathD} fill="none" stroke={C.amber} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {monthly.map((m, i) => (
        <circle key={m.month} cx={xAt(i)} cy={yAt(m.productionKWh)} r={2.5} fill={C.amber} />
      ))}
    </svg>
  );
}

// ─── Sección: separador visual ────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ borderLeft: `4px solid ${C.green}`, paddingLeft: 12, marginBottom: 14 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>{title}</div>
      {subtitle && <div style={{ fontSize: 10, color: C.gray, marginTop: 2 }}>{subtitle}</div>}
    </div>
  );
}

// ─── Fila clave / valor ───────────────────────────────────────────────────────

function KVRow({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
      <span style={{ color: C.gray, fontSize: 11 }}>{label}</span>
      <span style={{ fontWeight: 600, fontSize: 11, color: green ? C.green : C.dark }}>{value}</span>
    </div>
  );
}

// ─── Documento principal ──────────────────────────────────────────────────────

export default function SimulationReportHtml({
  state,
  scenarios,
  recommendedScenario,
  businessResult,
}: Props) {
  const contact = state.contact!;
  const supply  = state.supply!;
  const profile = state.consumptionProfile!;
  const isBusiness = state.customerCategory === 'business';

  const name         = 'name' in contact
    ? (contact as PersonContact).name
    : (contact as BusinessContact).companyName;
  const contactPerson = isBusiness ? (contact as BusinessContact).contactName : undefined;
  const email        = contact.email;
  const phone        = contact.phone;
  const address      = contact.address;
  const city         = contact.city;
  const commune      = contact.commune;

  const recommended = businessResult ?? scenarios![recommendedScenario!]!;
  const { kit, batteryCapacityKWh, energyBalance, financial, environmental, region } = recommended;

  const tariffAnalysis = runTariffAnalysis({
    tarifa:               supply.tarifa,
    avgMonthlyKWh:        profile.averageMonthlyKWh,
    potenciaContratadaKW: supply.potenciaContratadaKW,
    avgPowerChargeCLP:    profile.avgPowerChargeCLP,
    avgTotalBillCLP:      profile.avgTotalBillCLP,
    kWhPriceCLP:          recommended.input.energyPrice.kWhPriceCLP,
    isResidential:        !isBusiness,
    operatingHours:       supply.operatingHours,
    flexibleEquipment:    state.futureConsumption?.flexibleEquipment,
  });

  const date = new Date().toLocaleDateString('es-CL', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const explanatoryText = [
    `Con una PFV de ${kit.sizekWp} kW instalada en ${region.name},`,
    ` cubrirás el ${Math.round(energyBalance.coveragePercent)}% de tu consumo eléctrico mensual`,
    ` (promedio ${profile.averageMonthlyKWh} kWh/mes).`,
    ` Recuperarás la inversión en aproximadamente ${payback(financial.paybackYears)}`,
    ` y ahorrarás ${clp(financial.annualBenefitCLP)} al año durante los`,
    ` ${SOLAR_DEFAULTS.systemLifeYears} años de vida útil del sistema.`,
  ].join('');

  const scenarioLabels: Record<string, string> = {
    A: 'PFV máxima (sin batería)',
    B: 'PFV económica (sin batería)',
    C: 'PFV máxima con batería',
  };

  const comparisonRows: Array<{ key: 'A' | 'B' | 'C'; result: SimulatorResult | null }> = scenarios
    ? [
        { key: 'A', result: scenarios.A },
        { key: 'B', result: scenarios.B },
        { key: 'C', result: scenarios.C },
      ]
    : [];

  return (
    <div
      style={{
        fontFamily: 'Helvetica, Arial, sans-serif',
        fontSize: 12,
        color: C.dark,
        backgroundColor: C.white,
        width: 794,
        padding: '36px 40px 48px',
      }}
    >

      {/* ── Cabecera de marca ─────────────────────────────────────────────── */}
      <div style={{ backgroundColor: C.green, borderRadius: 8, padding: '18px 22px', marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ color: C.greenMid, fontSize: 10, marginBottom: 3 }}>
              Mercado Energy · Simulador Solar Chile
            </div>
            <div style={{ color: C.white, fontSize: 22, fontWeight: 700 }}>
              Propuesta de sistema solar fotovoltaico
            </div>
            <div style={{ color: C.greenLight, fontSize: 10, marginTop: 6 }}>
              Generado el {date}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: C.greenLight, fontSize: 10 }}>
              {isBusiness ? 'Sistema dimensionado' : 'Escenario recomendado'}
            </div>
            <div style={{ color: C.white, fontSize: 18, fontWeight: 700, marginTop: 2 }}>
              {isBusiness ? `PFV ${kit.sizekWp} kW` : scenarioLabels[recommendedScenario!]}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SECCIÓN 1 — Datos del cliente                                      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      <div style={{ marginBottom: 28 }}>
        <SectionHeader
          title="Datos del cliente"
          subtitle="Información de identificación, contacto y ubicación"
        />

        <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>

          {/* Identificación y contacto */}
          <div style={{ flex: 1, border: `1px solid ${C.border}`, borderRadius: 6, padding: 12 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>
              Identificación y contacto
            </div>
            <KVRow label="Nombre / Razón social" value={name} />
            {contactPerson && <KVRow label="Persona de contacto" value={contactPerson} />}
            <KVRow
              label="Tipo de cliente"
              value={isBusiness ? 'Empresa' : 'Residencial'}
            />
            <KVRow label="Teléfono" value={phone} />
            <KVRow label="Email" value={email} />
          </div>

          {/* Ubicación */}
          <div style={{ flex: 1, border: `1px solid ${C.border}`, borderRadius: 6, padding: 12 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>
              Ubicación
            </div>
            <KVRow label="Dirección" value={address} />
            <KVRow label="Comuna" value={commune} />
            <KVRow label="Ciudad" value={city} />
            <KVRow label="Región" value={region.name} />
          </div>

        </div>

        {/* Información eléctrica */}
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>
            Información eléctrica
          </div>
          <div style={{ display: 'flex', gap: 32 }}>
            <div style={{ flex: 1 }}>
              <KVRow label="Distribuidora" value={supply.distribuidora ?? 'No especificada'} />
              <KVRow label="Tarifa" value={supply.tarifa === 'unknown' ? 'BT1 (referencia)' : supply.tarifa} />
            </div>
            <div style={{ flex: 1 }}>
              <KVRow label="Consumo promedio mensual" value={`${profile.averageMonthlyKWh} kWh/mes`} />
              <KVRow label="Consumo anual estimado" value={`${profile.averageMonthlyKWh * 12} kWh/año`} />
            </div>
          </div>
        </div>

        {/* Gráfico de consumo mensual */}
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: 12 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 }}>
            Consumo mensual (kWh)
          </div>
          <ConsumptionChart bills={profile.bills} />
          <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 12, height: 8, backgroundColor: C.green, borderRadius: 2 }} />
              <span style={{ fontSize: 8, color: C.gray }}>Dato real</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 12, height: 8, backgroundColor: '#d1d5db', borderRadius: 2 }} />
              <span style={{ fontSize: 8, color: C.gray }}>Interpolado</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SECCIÓN 2 — Solución recomendada                                   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      <div style={{ marginBottom: 28 }}>
        <SectionHeader
          title="Solución recomendada para tu caso"
          subtitle={isBusiness ? `PFV ${kit.sizekWp} kW · empresa` : scenarioLabels[recommendedScenario!]}
        />

        {/* Kit + KPIs */}
        <div style={{ border: `2px solid ${C.green}`, borderRadius: 8, padding: 16, marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <div
                style={{
                  display: 'inline-block', backgroundColor: '#f0fdf4',
                  borderRadius: 4, padding: '2px 8px',
                  color: C.green, fontSize: 9, fontWeight: 700, marginBottom: 6,
                }}
              >
                Recomendado
              </div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>PFV {kit.sizekWp} kW</div>
              <div style={{ color: C.gray, fontSize: 10, marginTop: 2 }}>
                {kit.panelCount} paneles · {kit.estimatedAreaM2} m² de techo
                {batteryCapacityKWh > 0 ? ` · Batería ${batteryCapacityKWh} kWh` : ''}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{clp(financial.systemCostCLP)}</div>
              <div style={{ fontSize: 9, color: C.gray }}>precio referencial</div>
            </div>
          </div>

          {/* KPIs en 4 columnas */}
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { label: 'Cobertura solar',    value: pct(energyBalance.coveragePercent),      sub: 'de tu consumo cubierto' },
              { label: 'Ahorro mensual',      value: clp(financial.monthlyBenefitCLP),        sub: 'autoconsumo + inyección' },
              { label: 'Ahorro anual',        value: clp(financial.annualBenefitCLP),         sub: '' },
              { label: 'Período de retorno', value: payback(financial.paybackYears),          sub: 'payback simple' },
            ].map((kpi) => (
              <div key={kpi.label} style={{ flex: 1, backgroundColor: C.grayLight, borderRadius: 6, padding: 9 }}>
                <div style={{ fontSize: 8, color: C.gray, marginBottom: 3 }}>{kpi.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.green }}>{kpi.value}</div>
                {kpi.sub && <div style={{ fontSize: 7.5, color: C.gray, marginTop: 1 }}>{kpi.sub}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Texto explicativo */}
        <div
          style={{
            backgroundColor: C.emeraldBg, border: `1px solid ${C.emeraldBdr}`,
            borderRadius: 6, padding: '10px 14px', marginBottom: 14,
            fontSize: 11, color: '#065f46', lineHeight: 1.6,
          }}
        >
          {explanatoryText}
        </div>

        {/* Gráfico de generación mensual */}
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 }}>
            Generación solar mensual proyectada (kWh)
          </div>
          <GenerationChart result={recommended} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
            <div style={{ width: 20, height: 2, backgroundColor: C.amber }} />
            <span style={{ fontSize: 8, color: C.gray }}>Producción estimada</span>
          </div>
        </div>

        {/* Desglose financiero */}
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: 12 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>
            Desglose financiero
          </div>
          <KVRow label="Ahorro por autoconsumo (anual)" value={clp(energyBalance.totalSelfConsumptionSavingsCLP)} green />
          <KVRow label="Ingreso por inyección a la red (anual)" value={clp(energyBalance.totalInjectionIncomeCLP)} green />
          <KVRow label="Precio de inyección" value={`${financial.injectionValuePerKWhCLP} CLP/kWh`} />
          <div style={{ borderTop: `1px solid ${C.border}`, margin: '6px 0' }} />
          <KVRow label="Beneficio total anual" value={clp(financial.annualBenefitCLP)} green />
          <KVRow label={`ROI a ${SOLAR_DEFAULTS.systemLifeYears} años`} value={`${financial.roi25YearsPercent}%`} />
          <KVRow
            label={`Ahorro total vida útil (${SOLAR_DEFAULTS.systemLifeYears} años)`}
            value={clp(financial.annualBenefitCLP * SOLAR_DEFAULTS.systemLifeYears)}
            green
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SECCIÓN 3 — Comparación de alternativas (solo residencial)         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      {!isBusiness && comparisonRows.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SectionHeader
            title="Comparación de alternativas"
            subtitle="Todos los escenarios evaluados para tu caso"
          />

          <div style={{ display: 'flex', gap: 10 }}>
            {comparisonRows
              .filter((row) => row.result !== null)
              .map(({ key, result: r }) => {
                const isRec = key === recommendedScenario;
                const border = isRec ? `2px solid ${C.green}` : `1px solid ${C.border}`;
                return (
                  <div
                    key={key}
                    style={{
                      flex: 1, border, borderRadius: 8,
                      padding: 12, position: 'relative',
                      backgroundColor: isRec ? '#f0fdf4' : C.white,
                    }}
                  >
                    {isRec && (
                      <div
                        style={{
                          position: 'absolute', top: -10, left: '50%',
                          transform: 'translateX(-50%)',
                          backgroundColor: C.green, color: C.white,
                          fontSize: 8, fontWeight: 700, padding: '2px 10px', borderRadius: 10,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Recomendado
                      </div>
                    )}

                    <div style={{ fontSize: 10, fontWeight: 700, color: C.gray, marginBottom: 6, textAlign: 'center' }}>
                      Escenario {key}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, textAlign: 'center', marginBottom: 2 }}>
                      PFV {r!.kit.sizekWp} kW
                    </div>
                    <div style={{ fontSize: 9, color: C.gray, textAlign: 'center', marginBottom: 10 }}>
                      {r!.batteryCapacityKWh > 0
                        ? `Con batería ${r!.batteryCapacityKWh} kWh`
                        : 'Sin batería'}
                    </div>

                    <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
                      {[
                        { label: 'Cobertura',      value: pct(r!.energyBalance.coveragePercent) },
                        { label: 'Ahorro mensual',  value: clp(r!.financial.monthlyBenefitCLP) },
                        { label: 'Ahorro anual',    value: clp(r!.financial.annualBenefitCLP) },
                        { label: 'Payback',         value: payback(r!.financial.paybackYears) },
                        { label: 'Precio ref.',     value: clp(r!.financial.systemCostCLP) },
                      ].map((row) => (
                        <div key={row.label} style={{ marginBottom: 4 }}>
                          <div style={{ fontSize: 8, color: C.gray }}>{row.label}</div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: isRec ? C.green : C.dark }}>
                            {row.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SECCIÓN — Análisis y recomendaciones                               */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      {(tariffAnalysis.tariffStatus !== 'optimal' || tariffAnalysis.hasPeakCharges || tariffAnalysis.hasFlexibleEquipment || supply.tarifa === 'unknown') && (
        <div style={{ marginBottom: 28 }}>
          <SectionHeader
            title="Análisis y recomendaciones"
            subtitle="Estimación basada en tarifas CNE referenciales — verificar con distribuidora"
          />

          {/* Optimización tarifaria */}
          {supply.tarifa !== 'unknown' && (
            <div
              style={{
                border: `1px solid ${tariffAnalysis.tariffStatus === 'consider-change' ? '#fde68a' : '#d1fae5'}`,
                borderRadius: 6, padding: 12, marginBottom: 10,
                backgroundColor: tariffAnalysis.tariffStatus === 'consider-change' ? '#fffbeb' : '#f0fdf4',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, color: tariffAnalysis.tariffStatus === 'consider-change' ? '#92400e' : '#065f46' }}>
                {tariffAnalysis.tariffStatus === 'consider-change' ? '💡 Optimización tarifaria' : '✅ Tarifa adecuada'}
              </div>
              <div style={{ fontSize: 10, color: tariffAnalysis.tariffStatus === 'consider-change' ? '#78350f' : '#047857', lineHeight: 1.5 }}>
                {tariffAnalysis.tariffMessage}
              </div>
              {tariffAnalysis.bestAlternative && tariffAnalysis.tariffStatus === 'consider-change' && (
                <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #fde68a', display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                  <span style={{ color: '#92400e' }}>Alternativa: Tarifa {tariffAnalysis.bestAlternative.tarifa} — {tariffAnalysis.bestAlternative.typicalUse}</span>
                  <span style={{ fontWeight: 700, color: '#92400e' }}>
                    {clp(tariffAnalysis.bestAlternative.monthlySavingsCLP)}/mes
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Gestión de horas de punta */}
          {tariffAnalysis.hasPeakCharges && (
            <div style={{ border: `1px solid #e9d5ff`, borderRadius: 6, padding: 12, marginBottom: 10, backgroundColor: '#faf5ff' }}>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, color: '#6b21a8' }}>🔋 Gestión de horas de punta</div>
              <div style={{ fontSize: 10, color: '#7e22ce', lineHeight: 1.5 }}>{tariffAnalysis.peakManagementMessage}</div>
            </div>
          )}

          {/* Desplazamiento de cargas */}
          {tariffAnalysis.hasFlexibleEquipment && (
            <div style={{ border: `1px solid #bfdbfe`, borderRadius: 6, padding: 12, backgroundColor: '#eff6ff' }}>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, color: '#1e40af' }}>⚙️ Desplazamiento de cargas</div>
              <div style={{ fontSize: 10, color: '#1d4ed8', lineHeight: 1.5 }}>{tariffAnalysis.loadShiftingMessage}</div>
            </div>
          )}
        </div>
      )}

      {/* ── Impacto ambiental ─────────────────────────────────────────────── */}
      <div
        style={{
          backgroundColor: C.emeraldBg, border: `1px solid ${C.emeraldBdr}`,
          borderRadius: 6, padding: 12, marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 10, fontWeight: 700, color: '#065f46', marginBottom: 8 }}>
          Impacto ambiental estimado
        </div>
        <div style={{ display: 'flex', gap: 32 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.emerald }}>
              {environmental.annualCO2AvoidedKg.toLocaleString('es-CL')} kg
            </div>
            <div style={{ fontSize: 9, color: '#047857' }}>CO₂ evitado al año</div>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.emerald }}>
              {environmental.equivalentTrees}
            </div>
            <div style={{ fontSize: 9, color: '#047857' }}>árboles equivalentes</div>
          </div>
        </div>
      </div>

      {/* ── Nota metodológica ─────────────────────────────────────────────── */}
      <div style={{ fontSize: 8, color: '#9ca3af', lineHeight: 1.7 }}>
        * Simulación estimativa basada en irradiación histórica de {region.name}.
        Precio de inyección = {SOLAR_DEFAULTS.injectionValueFactor * 100}% del kWh de compra (net billing, Ley 20.936).
        Perfil de consumo: {SOLAR_DEFAULTS.dayConsumptionRatio * 100}% diurno / {SOLAR_DEFAULTS.nightConsumptionRatio * 100}% nocturno.
        Los valores reales dependen de la instalación específica, orientación del techo, sombreado y tarifa vigente.
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex', justifyContent: 'space-between',
          marginTop: 20, borderTop: `1px solid ${C.border}`, paddingTop: 8,
        }}
      >
        <span style={{ fontSize: 9, color: '#d1d5db' }}>Mercado Energy — Simulador Solar Chile</span>
        <span style={{ fontSize: 9, color: '#d1d5db' }}>{name} · {date}</span>
      </div>

    </div>
  );
}
