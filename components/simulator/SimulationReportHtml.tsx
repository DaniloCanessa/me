import type {
  WizardState,
  KitScenarios,
  PersonContact,
  BusinessContact,
  MonthlyBill,
  SimulatorResult,
} from '@/lib/types';
import { SOLAR_DEFAULTS, MONTH_NAMES, requiredSurfaceM2 } from '@/lib/constants';
import { runTariffAnalysis } from '@/lib/tariffAnalysis';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  state: WizardState;
  scenarios?: KitScenarios;
  recommendedScenario?: 'A' | 'B' | 'C';
  businessResult?: SimulatorResult;
}

// ─── Paleta (identidad de marca: azules + negro) ─────────────────────────────

const C = {
  brand:      '#1d65c5',   // azul oscuro de marca — números y énfasis
  accent:     '#389fe0',   // azul claro de marca — acentos y gráficos
  accentSoft: '#eaf4fb',   // fondo azul muy suave
  accentBdr:  '#b0cedd',   // borde azulado suave
  cyan:       '#70caca',   // cian de marca — detalles sobre fondo oscuro
  black:      '#010101',   // negro de marca — cabecera
  dark:       '#111827',
  gray:       '#6b7280',
  grayLight:  '#f9fafb',
  border:     '#e5e7eb',
  emerald:    '#059669',   // reservado solo para impacto ambiental
  emeraldBg:  '#ecfdf5',
  emeraldBdr: '#a7f3d0',
  white:      '#ffffff',
};

// ─── Helpers de formato ───────────────────────────────────────────────────────

function clp(n: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: 'CLP', maximumFractionDigits: 0,
  }).format(n);
}
function pct(n: number) { return `${Math.round(n)}%`; }
function payback(y: number, lifeYears = SOLAR_DEFAULTS.systemLifeYears) {
  return y >= 100 ? `> ${lifeYears} años` : `${y % 1 === 0 ? y : y.toFixed(1)} años`;
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
        const color = slot.source === 'interpolated' ? '#d1d5db' : C.brand;
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

// ─── Generación (columnas) vs consumo (línea) ─────────────────────────────────
// Refleja el consumo real por mes (boletas). En los meses con generación por encima
// del consumo, el excedente se inyecta a la red.

function GenVsConsumptionChart({ result }: { result: SimulatorResult }) {
  const { monthly } = result.energyBalance;
  const W = 714, H = 150;
  const PAD = { top: 16, right: 10, bottom: 22, left: 40 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;
  const maxVal = Math.max(...monthly.map((m) => Math.max(m.productionKWh, m.consumptionKWh)), 1);
  const n = monthly.length;
  const slot = cW / n;
  const barW = Math.min(slot * 0.58, 26);
  const baseY = PAD.top + cH;
  const yOf = (v: number) => baseY - (v / maxVal) * cH;
  const consPath = monthly
    .map((m, i) => `${i === 0 ? 'M' : 'L'}${(PAD.left + slot * i + slot / 2).toFixed(1)},${yOf(m.consumptionKWh).toFixed(1)}`)
    .join(' ');
  const yTicks = [0, 0.5, 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
      {yTicks.map((t) => {
        const yy = (PAD.top + cH * (1 - t)).toFixed(1);
        return (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={yy} y2={yy} stroke="#f3f4f6" strokeWidth={1} />
            <text x={PAD.left - 5} y={+yy + 3} textAnchor="end" fontSize={7.5} fill="#9ca3af">{Math.round(maxVal * t)}</text>
          </g>
        );
      })}
      {monthly.map((m, i) => {
        const x = PAD.left + slot * i + (slot - barW) / 2;
        const barH = (m.productionKWh / maxVal) * cH;
        return (
          <g key={m.month}>
            <rect x={x} y={baseY - barH} width={barW} height={Math.max(barH, 0)} fill="#f59e0b" opacity={0.85} rx={1.5} />
            <text x={x + barW / 2} y={H - 5} textAnchor="middle" fontSize={8} fill="#9ca3af">{m.monthName.slice(0, 3)}</text>
          </g>
        );
      })}
      <path d={consPath} fill="none" stroke={C.brand} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {monthly.map((m, i) => (
        <circle key={m.month} cx={PAD.left + slot * i + slot / 2} cy={yOf(m.consumptionKWh)} r={2.5} fill={C.brand} />
      ))}
    </svg>
  );
}


// Franjas horizontales para rayar una barra (la inyección). Se dibujan como
// rects en vez de usar <pattern> porque el informe se rasteriza con
// html2canvas, donde los patrones SVG no renderizan de forma confiable.
function franjas(y0: number, alto: number, paso = 4, grosor = 1.6): number[] {
  const out: number[] = [];
  for (let y = y0 + 1; y < y0 + alto - grosor; y += paso) out.push(y);
  return out;
}

// ─── Balance energético mensual (barras apiladas) ─────────────────────────────
// Sobre el eje, TU CONSUMO del mes partido en dos: lo que cubres con los
// paneles (autoconsumo) y lo que sigues comprando (red). Bajo el eje, el
// excedente que se inyecta. Así cada barra suma una magnitud real — antes la
// barra era producción (autoconsumo + inyección) y la red iba como línea, lo
// que obligaba a leer dos escalas distintas en el mismo gráfico.

function BalanceChart({ result }: { result: SimulatorResult }) {
  const { monthly } = result.energyBalance;
  const W = 714, H = 172;
  const PAD = { top: 14, right: 10, bottom: 26, left: 40 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  const maxArriba = Math.max(...monthly.map((m) => m.selfConsumptionKWh + m.consumedFromGridKWh), 1);
  const maxAbajo  = Math.max(...monthly.map((m) => m.injectedToGridKWh), 1);
  // El eje cero se reparte según cuánto pesa cada lado, con un mínimo de 25%
  // abajo para que la inyección siempre se vea.
  const fracAbajo = Math.min(0.5, Math.max(0.25, maxAbajo / (maxArriba + maxAbajo)));
  const altoAbajo = cH * fracAbajo;
  const altoArriba = cH - altoAbajo;
  const zeroY = PAD.top + altoArriba;

  const n = monthly.length;
  const slot = cW / n;
  const barW = Math.min(slot * 0.6, 26);
  const hUp = (v: number) => (v / maxArriba) * altoArriba;
  const hDn = (v: number) => (v / maxAbajo) * altoAbajo;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
      {/* Guías: mitad y tope del consumo */}
      {[0.5, 1].map((t) => {
        const yy = (zeroY - altoArriba * t).toFixed(1);
        return (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={yy} y2={yy} stroke="#f3f4f6" strokeWidth={1} />
            <text x={PAD.left - 5} y={+yy + 3} textAnchor="end" fontSize={7.5} fill="#9ca3af">{Math.round(maxArriba * t)}</text>
          </g>
        );
      })}
      {/* Tope de la inyección */}
      <text x={PAD.left - 5} y={zeroY + altoAbajo + 3} textAnchor="end" fontSize={7.5} fill="#9ca3af">
        {Math.round(maxAbajo)}
      </text>

      {monthly.map((m, i) => {
        const x = PAD.left + slot * i + (slot - barW) / 2;
        const selfH = hUp(m.selfConsumptionKWh);
        const gridH = hUp(m.consumedFromGridKWh);
        const injH  = hDn(m.injectedToGridKWh);
        return (
          <g key={m.month}>
            {/* Consumo: autoconsumo abajo, red encima */}
            <rect x={x} y={zeroY - selfH} width={barW} height={Math.max(selfH, 0)} fill="#16a34a" opacity={0.85} />
            <rect x={x} y={zeroY - selfH - gridH} width={barW} height={Math.max(gridH, 0)} fill="#9ca3af" opacity={0.75} rx={1.5} />
            {/* Inyección: mantiene su celeste, rayado para distinguirla del
                consumo sin cambiarle el color */}
            <rect x={x} y={zeroY} width={barW} height={Math.max(injH, 0)} fill="#2563eb" opacity={0.18} rx={1.5} />
            {franjas(zeroY, Math.max(injH, 0)).map((fy, k) => (
              <rect key={k} x={x} y={fy} width={barW} height={1.6} fill="#2563eb" opacity={0.8} />
            ))}
            <text x={x + barW / 2} y={H - 6} textAnchor="middle" fontSize={8} fill="#9ca3af">{m.monthName.slice(0, 3)}</text>
          </g>
        );
      })}

      {/* Eje cero */}
      <line x1={PAD.left} x2={W - PAD.right} y1={zeroY} y2={zeroY} stroke="#d1d5db" strokeWidth={1} />
    </svg>
  );
}

// Chip de leyenda reutilizable para los gráficos del informe.
function LegendItem({ color, label, line, dashed, hatched }: { color: string; label: string; line?: boolean; dashed?: boolean; hatched?: boolean }) {
  // El recuadro rayado replica el tratamiento de la inyección en el gráfico.
  if (hatched) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <svg width={12} height={8} style={{ display: 'block' }}>
          <rect width={12} height={8} fill={color} opacity={0.18} rx={2} />
          {[1, 4, 7].map((y) => <rect key={y} y={y} width={12} height={1.6} fill={color} opacity={0.75} />)}
        </svg>
        <span style={{ fontSize: 8, color: C.gray }}>{label}</span>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{
        width: line ? 18 : 12,
        height: line ? 0 : 8,
        borderTop: line ? `2px ${dashed ? 'dashed' : 'solid'} ${color}` : undefined,
        backgroundColor: line ? undefined : color,
        borderRadius: line ? 0 : 2,
      }} />
      <span style={{ fontSize: 8, color: C.gray }}>{label}</span>
    </div>
  );
}

// ─── Sección: separador visual ────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ borderLeft: `4px solid ${C.accent}`, paddingLeft: 12, marginBottom: 14 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.black }}>{title}</div>
      {subtitle && <div style={{ fontSize: 10, color: C.gray, marginTop: 2 }}>{subtitle}</div>}
    </div>
  );
}

// ─── Fila clave / valor ───────────────────────────────────────────────────────

function KVRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
      <span style={{ color: C.gray, fontSize: 11 }}>{label}</span>
      <span style={{ fontWeight: 600, fontSize: 11, color: accent ? C.brand : C.dark }}>{value}</span>
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
  // Fracción diurna realmente usada en el cálculo; el respaldo depende del tipo
  // de cliente porque una empresa consume mucho más de día que una casa.
  const perfilDiurno = recommended.input.dayConsumptionRatio
    ?? (businessResult ? SOLAR_DEFAULTS.businessDayConsumptionRatio : SOLAR_DEFAULTS.dayConsumptionRatio);
  const { kit, batteryCapacityKWh, energyBalance, financial, environmental, region } = recommended;

  // Parámetros vivos de la simulación (config de BD con fallback a constants)
  const lifeYears    = recommended.input.systemLifeYears ?? SOLAR_DEFAULTS.systemLifeYears;
  const injectionPct = Math.round((recommended.input.injectionValueFactor ?? SOLAR_DEFAULTS.injectionValueFactor) * 100);
  const hasBattery   = batteryCapacityKWh > 0;

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
    ` dejarás de pagar cerca del ${Math.round(financial.billSavingsPercent)}% de tu cuenta de luz`,
    ` (hoy gastas unos ${clp(financial.annualBillCLP)} al año, con un consumo promedio de ${profile.averageMonthlyKWh} kWh/mes).`,
    ` Recuperarás la inversión en aproximadamente ${payback(financial.paybackYears, lifeYears)}`,
    ` y ahorrarás ${clp(financial.annualBenefitCLP)} al año durante los`,
    ` ${lifeYears} años de vida útil del sistema.`,
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
      <div style={{ backgroundImage: 'linear-gradient(120deg, #0c2c54, #1a5aa8)', borderRadius: 10, padding: '26px 28px 22px', marginBottom: 28 }}>
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/mercadoenergy-blanco.png"
            alt="Mercado Energy"
            width={258}
            height={78}
            style={{ display: 'block', height: 78, width: 258, marginBottom: 20 }}
          />
          <div style={{ color: C.white, fontSize: 22, fontWeight: 700, letterSpacing: -0.3 }}>
            Propuesta de sistema solar fotovoltaico
          </div>
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, marginTop: 6 }}>
            Generado el {date}
          </div>
        </div>
        {/* Línea de acento de marca */}
        <div style={{ height: 3, borderRadius: 2, marginTop: 16, backgroundImage: `linear-gradient(90deg, ${C.accent}, ${C.cyan})` }} />
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
              {isBusiness && supply.potenciaContratadaKW != null && (
                <KVRow label="Potencia contratada" value={`${supply.potenciaContratadaKW} kW`} />
              )}
              {isBusiness && (
                <KVRow label="Tensión de suministro" value={supply.tensionSuministro ?? 'No especificada'} />
              )}
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
              <div style={{ width: 12, height: 8, backgroundColor: C.brand, borderRadius: 2 }} />
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
        <div style={{ border: `2px solid ${C.accent}`, borderRadius: 10, padding: 16, marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <div
                style={{
                  display: 'inline-block', backgroundColor: C.accentSoft,
                  borderRadius: 4, padding: '2px 8px',
                  color: C.brand, fontSize: 9, fontWeight: 700, marginBottom: 6,
                }}
              >
                Recomendado
              </div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>PFV {kit.sizekWp} kW</div>
              <div style={{ color: C.gray, fontSize: 10, marginTop: 2 }}>
                {kit.panelCount} paneles · {requiredSurfaceM2(kit.panelCount)} m² de superficie
                {batteryCapacityKWh > 0 ? ` · Batería ${batteryCapacityKWh} kWh` : ''}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{clp(financial.systemCostCLP)}</div>
              <div style={{ fontSize: 9, color: C.gray }}>precio referencial + IVA</div>
            </div>
          </div>

          {/* KPIs en 4 columnas */}
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { label: 'Dejas de pagar',     value: pct(financial.billSavingsPercent),        sub: 'de tu cuenta de luz anual' },
              { label: 'Ahorro anual',        value: clp(financial.annualBenefitCLP),          sub: hasBattery ? 'autoconsumo + inyección + batería' : 'autoconsumo + inyección' },
              { label: 'Gasto actual',        value: clp(financial.annualBillCLP),             sub: 'lo que pagas hoy al año' },
              { label: 'Período de retorno', value: payback(financial.paybackYears, lifeYears), sub: 'payback simple' },
            ].map((kpi) => (
              <div key={kpi.label} style={{ flex: 1, backgroundColor: C.accentSoft, borderRadius: 8, padding: 9 }}>
                <div style={{ fontSize: 8, color: C.gray, marginBottom: 3 }}>{kpi.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.brand }}>{kpi.value}</div>
                {kpi.sub && <div style={{ fontSize: 7.5, color: C.gray, marginTop: 1 }}>{kpi.sub}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Texto explicativo */}
        <div
          style={{
            backgroundColor: C.accentSoft, border: `1px solid ${C.accentBdr}`,
            borderRadius: 8, padding: '10px 14px', marginBottom: 14,
            fontSize: 11, color: '#14467e', lineHeight: 1.6,
          }}
        >
          {explanatoryText}
        </div>

        {/* Gráfico: generación vs consumo mensual (con el tamaño de la PFV) */}
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 }}>
            Generación vs consumo mensual · PFV {kit.sizekWp} kW (kWh)
          </div>
          <GenVsConsumptionChart result={recommended} />
          <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
            <LegendItem color="#f59e0b" label="Generación (columnas)" />
            <LegendItem color={C.brand} label="Consumo (línea)" line />
          </div>
        </div>

        {/* Gráfico: balance energético mensual (apilado) */}
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 }}>
            Balance energético mensual · PFV {kit.sizekWp} kW (kWh)
          </div>
          <BalanceChart result={recommended} />
          <div style={{ display: 'flex', gap: 16, marginTop: 4, flexWrap: 'wrap' }}>
            <LegendItem color="#16a34a" label="Autoconsumo (arriba)" />
            <LegendItem color="#9ca3af" label="Consumo desde la red (arriba)" />
            <LegendItem color="#2563eb" label="Inyección a la red (bajo el eje)" hatched />
          </div>
          <div style={{ fontSize: 8, color: C.gray, marginTop: 5, lineHeight: 1.5 }}>
            Sobre el eje, tu consumo del mes: la parte verde la cubren los paneles y la gris se
            sigue comprando a la distribuidora. Bajo el eje, el excedente que se inyecta a la red.
          </div>
        </div>

        {/* Desglose financiero */}
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: 12 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>
            Desglose financiero
          </div>
          <KVRow label="Ahorro por autoconsumo (anual)" value={clp(energyBalance.totalSelfConsumptionSavingsCLP)} accent />
          <KVRow label="Ingreso por inyección a la red (anual)" value={clp(energyBalance.totalInjectionIncomeCLP)} accent />
          {hasBattery && (
            <KVRow label="Ahorro nocturno por batería (anual)" value={clp(energyBalance.totalBatteryDischargeSavingsCLP)} accent />
          )}
          <KVRow label="Precio de inyección" value={`${financial.injectionValuePerKWhCLP} CLP/kWh`} />
          <div style={{ borderTop: `1px solid ${C.border}`, margin: '6px 0' }} />
          <KVRow label="Beneficio total anual" value={clp(financial.annualBenefitCLP)} accent />
          <KVRow label={`ROI a ${lifeYears} años`} value={`${financial.roi25YearsPercent}%`} />
          <KVRow
            label={`Ahorro total vida útil (${lifeYears} años)`}
            value={clp(financial.annualBenefitCLP * lifeYears)}
            accent
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
                const border = isRec ? `2px solid ${C.accent}` : `1px solid ${C.border}`;
                return (
                  <div
                    key={key}
                    style={{
                      flex: 1, border, borderRadius: 10,
                      padding: 12, position: 'relative',
                      backgroundColor: isRec ? C.accentSoft : C.white,
                    }}
                  >
                    {isRec && (
                      <div
                        style={{
                          position: 'absolute', top: -10, left: '50%',
                          transform: 'translateX(-50%)',
                          backgroundColor: C.brand, color: C.white,
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
                        { label: 'Dejas de pagar',  value: pct(r!.financial.billSavingsPercent) },
                        { label: 'Ahorro anual',    value: clp(r!.financial.annualBenefitCLP) },
                        { label: 'Payback',         value: payback(r!.financial.paybackYears, lifeYears) },
                        { label: 'Precio ref. + IVA', value: clp(r!.financial.systemCostCLP) },
                      ].map((row) => (
                        <div key={row.label} style={{ marginBottom: 4 }}>
                          <div style={{ fontSize: 8, color: C.gray }}>{row.label}</div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: isRec ? C.brand : C.dark }}>
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
                {tariffAnalysis.tariffStatus === 'consider-change' ? 'Optimización tarifaria' : 'Tarifa adecuada'}
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
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, color: '#6b21a8' }}>Gestión de horas de punta</div>
              <div style={{ fontSize: 10, color: '#7e22ce', lineHeight: 1.5 }}>{tariffAnalysis.peakManagementMessage}</div>
            </div>
          )}

          {/* Desplazamiento de cargas */}
          {tariffAnalysis.hasFlexibleEquipment && (
            <div style={{ border: `1px solid #bfdbfe`, borderRadius: 6, padding: 12, backgroundColor: '#eff6ff' }}>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, color: '#1e40af' }}>Desplazamiento de cargas</div>
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
        Los precios indicados son netos y no incluyen IVA.
        Precio de inyección = {injectionPct}% del kWh de compra (net billing, Art. 149 bis DFL 4 — Ley 21.118).
        Perfil de consumo {isBusiness ? 'empresa' : 'residencial'}: {Math.round(perfilDiurno * 100)}% diurno / {Math.round((1 - perfilDiurno) * 100)}% nocturno.
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
