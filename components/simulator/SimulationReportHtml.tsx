import type {
  WizardState,
  KitScenarios,
  PersonContact,
  BusinessContact,
  SimulatorResult,
} from '@/lib/types';
import { SOLAR_DEFAULTS, CHILE_BT1, requiredSurfaceM2, kitNombreKW, mostrarPotenciaReal } from '@/lib/constants';
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
  // Dos grises: el de texto secundario tiene que aguantar la impresión, así que
  // es más oscuro que el típico #6b7280. El claro queda solo para pies de nota.
  gray:       '#4b5563',
  grayFaint:  '#6b7280',
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

function GenVsConsumptionChart({ result, mostrarValores }: { result: SimulatorResult; mostrarValores?: boolean }) {
  const { monthly } = result.energyBalance;
  const W = 714, H = 160;
  const PAD = { top: 26, right: 10, bottom: 24, left: 46 };
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
            <text x={PAD.left - 5} y={+yy + 3} textAnchor="end" fontSize={9} fill="#6b7280">{Math.round(maxVal * t)}</text>
          </g>
        );
      })}
      {monthly.map((m, i) => {
        const x = PAD.left + slot * i + (slot - barW) / 2;
        const barH = (m.productionKWh / maxVal) * cH;
        return (
          <g key={m.month}>
            <rect x={x} y={baseY - barH} width={barW} height={Math.max(barH, 0)} fill="#f59e0b" opacity={0.85} rx={1.5} />
            {/* Los kWh de cada mes sobre la columna: el gráfico deja de ser solo
                una forma y pasa a entregar el dato, como el que reemplazó. */}
            {mostrarValores && (
              <text x={x + barW / 2} y={baseY - barH - 4} textAnchor="middle" fontSize={9} fill="#92400e" fontWeight={700}>
                {Math.round(m.productionKWh)}
              </text>
            )}
            <text x={x + barW / 2} y={H - 7} textAnchor="middle" fontSize={9.5} fill="#6b7280">{m.monthName.slice(0, 3)}</text>
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

// Etiqueta arriba y valor abajo. Se usa en la ficha del cliente, donde las
// columnas son angostas y un correo largo rompería el renglón.
function KVStack({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ fontSize: 8.5, color: C.gray, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: C.dark, lineHeight: 1.3, wordBreak: 'break-word' }}>{value}</div>
    </div>
  );
}

function KVRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
      <span style={{ color: C.gray, fontSize: 11, fontWeight: 500 }}>{label}</span>
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

  // Equipos futuros: si el cliente proyectó aires, termo o auto eléctrico, el
  // consumo simulado ya los incluye. Para que el ahorro no se lea al revés hay
  // que mostrar también cuánto sube la cuenta por esos equipos.
  const kWhExtraPorEquipos = state.futureConsumption?.totalAdditionalMonthlyKWh ?? 0;
  const tieneEquiposFuturos = kWhExtraPorEquipos > 0;
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

  // Potencia comercial vs real. El nombre de los kits se mantiene aunque la
  // tecnología del panel cambie (12 × 700 W = 8,4 kW se sigue llamando "8,8"),
  // así que se muestran las dos cuando no coinciden. `kit.sizekWp` es SIEMPRE
  // la real: es la que alimenta la generación y el payback.
  const potenciaComercial   = kitNombreKW(kit);
  const potenciaRealDifiere = mostrarPotenciaReal(kit);
  const etiquetaKW          = `${potenciaComercial} kW`;
  const potenciaPanelW      = kit.panel?.potenciaW ?? SOLAR_DEFAULTS.panelWattage;

  // Lo que paga hoy: la cuenta simulada menos lo que aportan los equipos que
  // todavía no tiene, al mismo precio por kWh que usa el resto del informe.
  const precioKWh = recommended.input.energyPrice?.kWhPriceCLP ?? CHILE_BT1.referenceKWhPriceCLP;
  const cuentaHoyCLP = Math.max(0, financial.annualBillCLP - kWhExtraPorEquipos * 12 * precioKWh);

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

  // A4 a 96 dpi: 794 × 1123 px. Cada página se captura por separado en el PDF
  // (ver PDFDownloadButton), por eso lleva alto fijo y recorte: lo que no cabe
  // se ve cortado en la vista previa y se corrige, en vez de partirse solo.
  const paginaStyle: React.CSSProperties = {
    fontFamily: 'Helvetica, Arial, sans-serif',
    fontSize: 12,
    color: C.dark,
    backgroundColor: C.white,
    width: 794,
    height: 1123,
    padding: '30px 40px 56px',
    overflow: 'hidden',
    position: 'relative',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: 794 }}>

    {/* ═══ PÁGINA 1 ═══════════════════════════════════════════════════════ */}
    <div data-page="1" style={paginaStyle}>

      {/* ── Cabecera de marca ─────────────────────────────────────────────── */}
      {/* La foto va a la derecha y se difumina hacia la izquierda con capas de
          degradado sólido, no con mask-image: html2canvas no renderiza las
          máscaras de forma confiable y el informe se rasteriza con él. */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        backgroundImage: 'linear-gradient(120deg, #0c2c54, #1a5aa8)',
        borderRadius: 10, padding: '20px 26px 16px', marginBottom: 20,
      }}>
        {/* Foto de fondo, anclada a la derecha */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/informe-cabecera-paneles.jpg"
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute', top: 0, right: 0, height: '100%', width: '62%',
            objectFit: 'cover', objectPosition: 'center 65%', opacity: 0.75,
          }}
        />
        {/* Tinte azul: la foto queda en el mismo tono que el resto de la marca */}
        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(12,44,84,0.38)' }} />
        {/* Difuminado hacia la izquierda, para que el texto siempre se lea */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(90deg, #0c2c54 0%, rgba(12,44,84,0.92) 26%, rgba(20,70,130,0.45) 55%, rgba(26,90,168,0.10) 100%)',
        }} />

        <div style={{ position: 'relative' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/mercadoenergy-blanco.png"
            alt="Mercado Energy"
            width={258}
            height={78}
            style={{ display: 'block', height: 62, width: 205, marginBottom: 14 }}
          />
          <div style={{ color: C.white, fontSize: 20, fontWeight: 700, letterSpacing: -0.3 }}>
            Propuesta de sistema solar fotovoltaico
          </div>
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, marginTop: 6 }}>
            Generado el {date}
          </div>
        </div>
        {/* Línea de acento de marca */}
        <div style={{ position: 'relative', height: 3, borderRadius: 2, marginTop: 12, backgroundImage: `linear-gradient(90deg, ${C.accent}, ${C.cyan})` }} />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SECCIÓN 1 — Datos del cliente                                      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      <div style={{ marginBottom: 14 }}>
        <SectionHeader
          title="Datos del cliente"
          subtitle="Información de identificación, contacto y ubicación"
        />

        <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: 14, display: 'flex', gap: 20 }}>

          {/* Identificación y contacto */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: C.brand, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>
              Identificación
            </div>
            <KVStack label="Nombre / Razón social" value={name} />
            {contactPerson && <KVStack label="Persona de contacto" value={contactPerson} />}
            <KVStack label="Tipo de cliente" value={isBusiness ? 'Empresa' : 'Residencial'} />
            <KVStack label="Teléfono" value={phone} />
            <KVStack label="Email" value={email} />
          </div>

          {/* Ubicación */}
          <div style={{ flex: 1, borderLeft: `1px solid ${C.border}`, paddingLeft: 20 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: C.brand, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>
              Ubicación
            </div>
            <KVStack label="Dirección" value={address} />
            <KVStack label="Comuna" value={commune} />
            <KVStack label="Ciudad" value={city} />
            <KVStack label="Región" value={region.name} />
          </div>

          {/* Suministro y consumo */}
          <div style={{ flex: 1, borderLeft: `1px solid ${C.border}`, paddingLeft: 20 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: C.brand, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>
              Suministro y consumo
            </div>
            <KVStack label="Distribuidora" value={supply.distribuidora ?? 'No especificada'} />
            <KVStack label="Tarifa" value={supply.tarifa === 'unknown' ? 'BT1 (referencia)' : supply.tarifa} />
            {isBusiness && supply.potenciaContratadaKW != null && (
              <KVStack label="Potencia contratada" value={`${supply.potenciaContratadaKW} kW`} />
            )}
            {isBusiness && (
              <KVStack label="Tensión de suministro" value={supply.tensionSuministro ?? 'No especificada'} />
            )}
            <KVStack label="Consumo promedio" value={`${profile.averageMonthlyKWh} kWh/mes`} />
            <KVStack label="Consumo anual estimado" value={`${profile.averageMonthlyKWh * 12} kWh/año`} />
          </div>

        </div>

      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SECCIÓN 2 — Tu energía mes a mes                                   */}
      {/* Reemplaza al gráfico de consumo suelto: entrega el mismo consumo    */}
      {/* pero contra la generación de la planta, que es lo que explica por   */}
      {/* qué sobra en verano y falta en invierno.                            */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      <div style={{ marginBottom: 14 }}>
        <SectionHeader
          title="Tu energía mes a mes"
          subtitle={`Consumo real contra lo que generaría una PFV de ${kit.sizekWp} kW`}
        />
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: 12 }}>
          <GenVsConsumptionChart result={recommended} mostrarValores />
          <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
            <LegendItem color="#f59e0b" label="Generación de la planta (columnas, en kWh)" />
            <LegendItem color={C.brand} label="Tu consumo (línea)" line />
          </div>
          <div style={{ fontSize: 8, color: C.gray, marginTop: 4 }}>
            Donde la columna supera la línea, el excedente se inyecta a la red.
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SECCIÓN 3 — Solución recomendada                                   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      <div style={{ marginBottom: 0 }}>
        <SectionHeader
          title="Solución recomendada para tu caso"
          subtitle={isBusiness ? `PFV ${kit.sizekWp} kW · empresa` : scenarioLabels[recommendedScenario!]}
        />

        {/* Un tercio para qué se instala; dos tercios para el gráfico, que
            necesita el ancho para que se lean los doce meses. */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'stretch' }}>

          {/* ── Izquierda: qué se instala ── */}
          <div style={{
            width: '33%', border: `2px solid ${C.accent}`, borderRadius: 10, padding: 14,
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
          }}>
            <div
              style={{
                display: 'inline-block', alignSelf: 'flex-start', backgroundColor: C.accentSoft,
                borderRadius: 4, padding: '2px 8px',
                color: C.brand, fontSize: 9, fontWeight: 700, marginBottom: 8,
              }}
            >
              Recomendado
            </div>
            {/* El nombre comercial se conserva y la potencia real va entre
                paréntesis cuando difiere: el kit "8,8 kW" son 12 paneles de
                700 W = 8,4 kWp, y el cliente que multiplica lo que lee más
                abajo tiene que llegar al mismo número. */}
            <div style={{ fontSize: 24, fontWeight: 700, color: C.brand, lineHeight: 1.1 }}>
              PFV {etiquetaKW}
              {potenciaRealDifiere && (
                <span style={{ fontSize: 15, fontWeight: 600, color: C.gray }}> ({kit.sizekWp} kW)</span>
              )}
            </div>
            <div style={{ marginTop: 10, borderTop: `1px solid ${C.border}`, paddingTop: 9 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.dark }}>{kit.panelCount} paneles</div>
              <div style={{ fontSize: 9, color: C.gray, marginTop: 1 }}>
                de {potenciaPanelW} W cada uno{kit.panel ? ` · ${kit.panel.nombre}` : ''}
              </div>
            </div>
            {/* Superficie y batería comparten fila: apiladas, el escenario con
                batería crecía lo suficiente para empujar el precio fuera de la
                página. Así el recuadro mide igual con o sin batería. */}
            <div style={{ marginTop: 10, display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.dark }}>{requiredSurfaceM2(kit.panelCount, kit.panel)} m²</div>
                <div style={{ fontSize: 9, color: C.gray, marginTop: 1 }}>de superficie</div>
              </div>
              {batteryCapacityKWh > 0 && (
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.dark }}>{batteryCapacityKWh} kWh</div>
                  <div style={{ fontSize: 9, color: C.gray, marginTop: 1 }}>de batería</div>
                </div>
              )}
            </div>
            {/* El precio cierra el recuadro: es lo que el cliente busca primero. */}
            <div style={{ marginTop: 10, borderTop: `1px solid ${C.border}`, paddingTop: 9 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.brand }}>{clp(financial.systemCostCLP)}</div>
              <div style={{ fontSize: 9, color: C.gray, marginTop: 1 }}>precio referencial + IVA</div>
            </div>
          </div>

          {/* ── Derecha: balance energético mensual ── */}
          <div style={{ width: '67%', border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: C.brand, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>
              Balance energético mensual (kWh)
            </div>
            <BalanceChart result={recommended} />
            <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
              <LegendItem color="#16a34a" label="Autoconsumo" />
              <LegendItem color="#9ca3af" label="Desde la red" />
              <LegendItem color="#2563eb" label="Inyección (bajo el eje)" hatched />
            </div>
            <div style={{ fontSize: 8, color: C.gray, marginTop: 4 }}>
              Sobre el eje, tu consumo; bajo el eje, el excedente inyectado.
            </div>
          </div>
        </div>

      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── Pie de la página 1 ────────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute', left: 40, right: 40, bottom: 20,
          display: 'flex', justifyContent: 'space-between',
          borderTop: `1px solid ${C.border}`, paddingTop: 8,
        }}
      >
        <span style={{ fontSize: 9, color: C.grayFaint }}>Mercado Energy — Simulador Solar Chile</span>
        <span style={{ fontSize: 9, color: C.grayFaint }}>{name} · {date} · página 1 de 2</span>
      </div>

    </div>

    {/* ═══ PÁGINA 2 ═══════════════════════════════════════════════════════ */}
    <div data-page="2" style={paginaStyle}>

      {/* ── Las cuatro cifras que resumen el negocio, a ancho completo ───── */}
      <div style={{
        border: `2px solid ${C.brand}`, backgroundColor: C.accentSoft,
        borderRadius: 10, padding: 11, marginBottom: 14,
      }}>
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { label: 'Dejas de pagar',     value: pct(financial.billSavingsPercent),          sub: 'de tu cuenta de luz anual' },
            { label: 'Ahorro anual',        value: clp(financial.annualBenefitCLP),            sub: hasBattery ? 'autoconsumo + inyección + batería' : 'autoconsumo + inyección' },
            { label: 'Gasto anual',         value: clp(financial.annualBillCLP),               sub: 'lo que pagas hoy sin planta' },
            { label: 'Período de retorno', value: payback(financial.paybackYears, lifeYears), sub: 'payback simple' },
          ].map((kpi) => (
            <div key={kpi.label} style={{ flex: 1, backgroundColor: C.white, borderRadius: 8, padding: 9, border: `1px solid ${C.accentBdr}` }}>
              <div style={{ fontSize: 8.5, color: C.gray, marginBottom: 3 }}>{kpi.label}</div>
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

        {/* Desglose financiero */}
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: 12 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: C.brand, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>
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

      {/* ── Efecto de los equipos nuevos sobre la cuenta ──────────────────── */}
      {/* El "ahorro anual" mide el beneficio de la PLANTA, no lo que termina
          pagando el cliente: al sumar equipos el ahorro sube (la planta deja de
          regalar excedentes) pero la cuenta también. Sin las dos cifras juntas,
          el número se presta para leerse al revés. */}
      {tieneEquiposFuturos && (
        <div style={{ border: `1px solid ${C.accentBdr}`, backgroundColor: C.accentSoft, borderRadius: 8, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: C.brand, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 }}>
            Tu cuenta con los equipos nuevos
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { label: 'Hoy, sin los equipos', value: clp(cuentaHoyCLP), sub: 'lo que pagas al año', fuerte: false },
              { label: 'Con los equipos, sin planta', value: clp(financial.annualBillCLP), sub: 'subiría a', fuerte: false },
              { label: 'Con los equipos y con planta', value: clp(Math.max(0, financial.annualBillCLP - financial.annualBenefitCLP)), sub: 'terminarías pagando', fuerte: true },
            ].map((c) => (
              <div key={c.label} style={{
                flex: 1, backgroundColor: C.white, borderRadius: 8, padding: 10,
                border: c.fuerte ? `1.5px solid ${C.brand}` : `1px solid ${C.border}`,
              }}>
                <div style={{ fontSize: 8, color: C.gray, marginBottom: 3 }}>{c.label}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: c.fuerte ? C.brand : C.dark }}>{c.value}</div>
                <div style={{ fontSize: 8, color: C.gray, marginTop: 2 }}>{c.sub}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 8.5, color: C.gray, marginTop: 8, lineHeight: 1.5 }}>
            Los equipos nuevos suben tu consumo, y con él tu cuenta. La planta absorbe buena parte
            de ese aumento: la energía que antes se inyectaba a la red a mitad de precio pasa a
            consumirse directamente, que es lo que hace crecer el ahorro.
          </div>
        </div>
      )}

      {/* SECCIÓN 4 — Comparación de alternativas (solo residencial)         */}
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
                      PFV {kitNombreKW(r!.kit)} kW
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

      {/* El encabezado va fuera de las columnas: si vive dentro de la izquierda,
          el título ocupa media página, el subtítulo se parte en dos líneas y la
          tarjeta de la derecha queda descolgada hacia arriba. */}
      <SectionHeader
        title="Análisis y recomendaciones"
        subtitle="Estimación basada en tarifas CNE referenciales — verificar con distribuidora"
      />

      {/* `stretch` iguala el alto de las dos columnas: sin esto la de la
          derecha queda flotando y los bordes inferiores no calzan. */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'stretch', marginBottom: 14 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* Optimización tarifaria.
              Los tres estados del análisis se muestran distinto. Antes solo se
              distinguía 'consider-change' del resto, así que 'informative-only'
              —que significa "no alcanzo a comparar"— salía en verde y rotulado
              "Tarifa adecuada", afirmándole al cliente algo que el propio
              análisis decía no poder determinar. */}
          {(() => {
            // El verde está reservado para impacto ambiental (ver `C`). Cuando
            // la tarifa está bien iba también en verde, así que las dos
            // tarjetas de esta fila se leían como el mismo tema repetido: el
            // estado correcto usa el azul de marca.
            const estilos = {
              'consider-change': { titulo: 'Optimización tarifaria',  borde: '#fde68a',    fondo: '#fffbeb',     tituloColor: '#92400e', texto: '#78350f' },
              'optimal':         { titulo: 'Tarifa adecuada',         borde: C.accentBdr,  fondo: C.accentSoft,  tituloColor: C.brand,   texto: '#1f4e79' },
              'informative-only':{ titulo: 'Tarifa por confirmar',    borde: C.border,     fondo: C.grayLight,   tituloColor: C.dark,    texto: C.gray },
            }[tariffAnalysis.tariffStatus];
            return (
            <div
              style={{
                border: `1px solid ${estilos.borde}`,
                borderRadius: 6, padding: 12,
                backgroundColor: estilos.fondo,
                flex: 1,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 5, color: estilos.tituloColor }}>
                {estilos.titulo}
              </div>
              <div style={{ fontSize: 10, color: estilos.texto, lineHeight: 1.55 }}>
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
            );
          })()}

          {/* Gestión de horas de punta */}
          {tariffAnalysis.hasPeakCharges && (
            <div style={{ border: `1px solid #e9d5ff`, borderRadius: 6, padding: 12, backgroundColor: '#faf5ff' }}>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 5, color: '#6b21a8' }}>Gestión de horas de punta</div>
              <div style={{ fontSize: 10, color: '#7e22ce', lineHeight: 1.55 }}>{tariffAnalysis.peakManagementMessage}</div>
            </div>
          )}

          {/* Desplazamiento de cargas */}
          {tariffAnalysis.hasFlexibleEquipment && (
            <div style={{ border: `1px solid #bfdbfe`, borderRadius: 6, padding: 12, backgroundColor: '#eff6ff' }}>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 5, color: '#1e40af' }}>Desplazamiento de cargas</div>
              <div style={{ fontSize: 10, color: '#1d4ed8', lineHeight: 1.55 }}>{tariffAnalysis.loadShiftingMessage}</div>
            </div>
          )}
        </div>

        {/* ── Impacto ambiental, junto al análisis para no gastar una franja ── */}
        <div
          style={{
            flex: 1, backgroundColor: C.emeraldBg, border: `1px solid ${C.emeraldBdr}`,
            borderRadius: 6, padding: 12,
            display: 'flex', flexDirection: 'column',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: '#065f46', marginBottom: 5 }}>
            Impacto ambiental estimado
          </div>
          {/* Las dos cifras se reparten el ancho con un separador al medio: así
              la tarjeta no queda con las cifras apiñadas a la izquierda y un
              vacío a la derecha. `center` las alinea con el texto de la tarifa. */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.emerald, lineHeight: 1.15 }}>
                {environmental.annualCO2AvoidedKg.toLocaleString('es-CL')}
                <span style={{ fontSize: 12, fontWeight: 600 }}> kg</span>
              </div>
              <div style={{ fontSize: 9, color: '#047857', marginTop: 1 }}>CO₂ evitado al año</div>
            </div>
            <div style={{ width: 1, alignSelf: 'stretch', backgroundColor: C.emeraldBdr, margin: '0 10px' }} />
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.emerald, lineHeight: 1.15 }}>
                {environmental.equivalentTrees}
              </div>
              <div style={{ fontSize: 9, color: '#047857', marginTop: 1 }}>árboles equivalentes</div>
            </div>
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

      {/* ── Footer, anclado al pie de la página ───────────────────────────── */}
      <div
        style={{
          position: 'absolute', left: 40, right: 40, bottom: 20,
          display: 'flex', justifyContent: 'space-between',
          borderTop: `1px solid ${C.border}`, paddingTop: 8,
        }}
      >
        <span style={{ fontSize: 9, color: C.grayFaint }}>Mercado Energy — Simulador Solar Chile</span>
        <span style={{ fontSize: 9, color: C.grayFaint }}>{name} · {date} · página 2 de 2</span>
      </div>

    </div>
    </div>
  );
}
