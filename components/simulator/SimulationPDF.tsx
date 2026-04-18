'use client';

import {
  Document, Page, Text, View, StyleSheet,
} from '@react-pdf/renderer';
import type { SimulatorResult } from '@/lib/types';
import { SOLAR_DEFAULTS } from '@/lib/constants';

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
  white:      '#ffffff',
};

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: C.dark,
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 40,
    backgroundColor: C.white,
  },

  // Header
  header: { backgroundColor: C.green, borderRadius: 8, padding: 18, marginBottom: 14 },
  headerSub: { color: C.greenMid, fontSize: 8, marginBottom: 3 },
  headerTitle: { color: C.white, fontSize: 18, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  headerMeta: { color: C.greenLight, fontSize: 7.5, marginTop: 6 },

  // KPIs
  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  kpiCard: { flex: 1, backgroundColor: C.grayLight, borderRadius: 6, padding: 9 },
  kpiLabel: { fontSize: 7, color: C.gray, marginBottom: 3 },
  kpiValue: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: C.green },
  kpiSub: { fontSize: 6.5, color: C.gray, marginTop: 1 },

  // Sección genérica
  section: { borderRadius: 6, border: `1pt solid ${C.border}`, padding: 12, marginBottom: 10 },
  sectionTitle: {
    fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.gray,
    textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8,
  },

  // Filas clave/valor
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  rowLabel: { color: C.gray },
  rowValue: { fontFamily: 'Helvetica-Bold' },
  rowGreen: { fontFamily: 'Helvetica-Bold', color: C.green },
  divider: { borderTop: `0.75pt solid ${C.border}`, marginVertical: 5 },

  // Kit badge
  kitBadge: {
    backgroundColor: '#f0fdf4', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
    color: C.green, fontSize: 7, fontFamily: 'Helvetica-Bold',
    alignSelf: 'flex-start', marginBottom: 5,
  },
  kitRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  kitName: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  kitMeta: { color: C.gray, fontSize: 7.5 },
  kitPrice: { fontSize: 13, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  kitPriceSub: { fontSize: 7, color: C.gray, textAlign: 'right' },

  // Tabla balance
  tableWrap: { borderRadius: 6, border: `1pt solid ${C.border}`, overflow: 'hidden', marginBottom: 10 },
  tableHead: { flexDirection: 'row', backgroundColor: C.grayLight, padding: '5pt 8pt', borderBottom: `0.75pt solid ${C.border}` },
  tableRow: { flexDirection: 'row', padding: '3.5pt 8pt', borderBottom: `0.5pt solid #f3f4f6` },
  tableRowTotal: { flexDirection: 'row', padding: '5pt 8pt', backgroundColor: C.grayLight },
  th: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.gray },
  td: { fontSize: 7.5 },
  tdGreen: { fontSize: 7.5, color: C.green, fontFamily: 'Helvetica-Bold' },
  tdBlue: { fontSize: 7.5, color: C.blue },
  tdGray: { fontSize: 7.5, color: C.gray },

  // Columnas tabla (proporcional a 515pt - 16pt padding)
  colMes:   { width: 62 },
  colProd:  { flex: 1, textAlign: 'right' },
  colSelf:  { flex: 1, textAlign: 'right' },
  colInj:   { flex: 1, textAlign: 'right' },
  colGrid:  { flex: 1, textAlign: 'right' },
  colBen:   { flex: 1, textAlign: 'right' },

  // Impacto ambiental
  envWrap: { backgroundColor: C.emeraldBg, border: `1pt solid ${C.emeraldBdr}`, borderRadius: 6, padding: 12, marginBottom: 10 },
  envTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#065f46', marginBottom: 8 },
  envRow: { flexDirection: 'row', gap: 24 },
  envValue: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: C.emerald },
  envLabel: { fontSize: 7, color: '#047857' },

  // Footer / nota
  note: { fontSize: 6.5, color: '#9ca3af', lineHeight: 1.6 },
  footer: { position: 'absolute', bottom: 20, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 7, color: '#d1d5db' },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clp(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
}
function pct(n: number) { return `${Math.round(n)}%`; }
function payback(y: number) { return y >= 100 ? '> 25 años' : `${y % 1 === 0 ? y : y.toFixed(1)} años`; }

// ─── Documento ────────────────────────────────────────────────────────────────

interface SimulationPDFProps {
  result: SimulatorResult;
  clientName: string;
  scenario?: string;
  generatedAt?: string;
}

export default function SimulationPDFDocument({
  result,
  clientName,
  scenario,
  generatedAt,
}: SimulationPDFProps) {
  const { kit, batteryCapacityKWh, energyBalance, financial, environmental, region, input } = result;
  const date = generatedAt ?? new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <Document
      title={`Simulación Solar — ${clientName}`}
      author="Mercado Energy"
      subject="Informe de simulación solar fotovoltaica"
    >
      <Page size="A4" style={s.page}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={s.header}>
          <Text style={s.headerSub}>Mercado Energy · Simulador Solar Chile</Text>
          <Text style={s.headerTitle}>{clientName}</Text>
          <Text style={s.headerMeta}>
            {region.name} · Tarifa {input.tarifa}
            {input.distribuidora ? ` · ${input.distribuidora}` : ''}
            {' · '}{input.energyPrice.kWhPriceCLP} CLP/kWh
            {scenario ? ` · Escenario ${scenario}` : ''}
          </Text>
          <Text style={[s.headerMeta, { marginTop: 4 }]}>Generado el {date}</Text>
        </View>

        {/* ── KPIs ───────────────────────────────────────────────────────── */}
        <View style={s.kpiRow}>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Ahorro mensual estimado</Text>
            <Text style={s.kpiValue}>{clp(financial.monthlyBenefitCLP)}</Text>
            <Text style={s.kpiSub}>autoconsumo + inyección</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Ahorro anual estimado</Text>
            <Text style={s.kpiValue}>{clp(financial.annualBenefitCLP)}</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Período de retorno</Text>
            <Text style={s.kpiValue}>{payback(financial.paybackYears)}</Text>
            <Text style={s.kpiSub}>payback simple</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Cobertura solar</Text>
            <Text style={s.kpiValue}>{pct(energyBalance.coveragePercent)}</Text>
            <Text style={s.kpiSub}>de tu consumo cubierto</Text>
          </View>
        </View>

        {/* ── Kit recomendado ─────────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Sistema recomendado</Text>
          <Text style={s.kitBadge}>
            {batteryCapacityKWh > 0 ? `Con batería ${batteryCapacityKWh} kWh` : 'Sin batería'}
          </Text>
          <View style={s.kitRow}>
            <View>
              <Text style={s.kitName}>Kit {kit.sizekWp} kWp</Text>
              <Text style={s.kitMeta}>
                {kit.panelCount} paneles · {kit.estimatedAreaM2} m² de techo
                {batteryCapacityKWh > 0 ? ` · ${batteryCapacityKWh} kWh batería` : ''}
              </Text>
              {kit.installationNotes ? <Text style={[s.kitMeta, { marginTop: 3 }]}>{kit.installationNotes}</Text> : null}
            </View>
            <View>
              <Text style={s.kitPrice}>{clp(financial.systemCostCLP)}</Text>
              <Text style={s.kitPriceSub}>precio referencial</Text>
            </View>
          </View>
        </View>

        {/* ── Desglose financiero ─────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Desglose financiero</Text>
          <View style={s.row}>
            <Text style={s.rowLabel}>Ahorro por autoconsumo (anual)</Text>
            <Text style={s.rowGreen}>{clp(energyBalance.totalSelfConsumptionSavingsCLP)}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.rowLabel}>Ingreso por inyección a la red (anual)</Text>
            <Text style={s.rowGreen}>{clp(energyBalance.totalInjectionIncomeCLP)}</Text>
          </View>
          <View style={[s.row, { marginTop: 2 }]}>
            <Text style={s.rowLabel}>  Precio de inyección</Text>
            <Text style={s.rowLabel}>{financial.injectionValuePerKWhCLP} CLP/kWh</Text>
          </View>
          <View style={s.divider} />
          <View style={s.row}>
            <Text style={s.rowValue}>Beneficio total anual</Text>
            <Text style={s.rowGreen}>{clp(financial.annualBenefitCLP)}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.rowLabel}>ROI a {SOLAR_DEFAULTS.systemLifeYears} años</Text>
            <Text style={s.rowValue}>{financial.roi25YearsPercent}%</Text>
          </View>
          <View style={s.row}>
            <Text style={s.rowLabel}>Ahorro total vida útil ({SOLAR_DEFAULTS.systemLifeYears} años)</Text>
            <Text style={s.rowGreen}>{clp(financial.annualBenefitCLP * SOLAR_DEFAULTS.systemLifeYears)}</Text>
          </View>
        </View>

        {/* ── Balance energético mensual ──────────────────────────────────── */}
        <View style={s.tableWrap}>
          <View style={s.tableHead}>
            <Text style={[s.th, s.colMes]}>Mes</Text>
            <Text style={[s.th, s.colProd]}>Producción</Text>
            <Text style={[s.th, s.colSelf]}>Autoconsumo</Text>
            <Text style={[s.th, s.colInj]}>Inyección</Text>
            <Text style={[s.th, s.colGrid]}>Red</Text>
            <Text style={[s.th, s.colBen]}>Beneficio</Text>
          </View>
          {energyBalance.monthly.map((m) => (
            <View key={m.month} style={s.tableRow}>
              <Text style={[s.td, s.colMes]}>{m.monthName}</Text>
              <Text style={[s.td, s.colProd, { textAlign: 'right' }]}>{m.productionKWh}</Text>
              <Text style={[s.tdGreen, s.colSelf]}>{m.selfConsumptionKWh}</Text>
              <Text style={[s.tdBlue, s.colInj]}>{m.injectedToGridKWh}</Text>
              <Text style={[s.tdGray, s.colGrid]}>{m.consumedFromGridKWh}</Text>
              <Text style={[s.tdGreen, s.colBen]}>{clp(m.totalMonthlyBenefitCLP)}</Text>
            </View>
          ))}
          <View style={s.tableRowTotal}>
            <Text style={[s.th, s.colMes]}>Total anual</Text>
            <Text style={[s.th, s.colProd, { textAlign: 'right' }]}>{energyBalance.totalProductionKWh}</Text>
            <Text style={[s.th, s.colSelf, { color: C.green }]}>{energyBalance.totalSelfConsumptionKWh}</Text>
            <Text style={[s.th, s.colInj, { color: C.blue }]}>{energyBalance.totalInjectedKWh}</Text>
            <Text style={[s.th, s.colGrid]}>{energyBalance.totalConsumedFromGridKWh}</Text>
            <Text style={[s.th, s.colBen, { color: C.green }]}>{clp(financial.annualBenefitCLP)}</Text>
          </View>
        </View>
        <Text style={[s.note, { marginBottom: 10, marginTop: -6 }]}>Valores en kWh · Red = consumo restante cubierto por la red eléctrica</Text>

        {/* ── Impacto ambiental ───────────────────────────────────────────── */}
        <View style={s.envWrap}>
          <Text style={s.envTitle}>Impacto ambiental estimado</Text>
          <View style={s.envRow}>
            <View>
              <Text style={s.envValue}>{environmental.annualCO2AvoidedKg.toLocaleString('es-CL')} kg</Text>
              <Text style={s.envLabel}>CO₂ evitado al año</Text>
            </View>
            <View>
              <Text style={s.envValue}>{environmental.equivalentTrees}</Text>
              <Text style={s.envLabel}>árboles equivalentes</Text>
            </View>
          </View>
        </View>

        {/* ── Nota metodológica ───────────────────────────────────────────── */}
        <Text style={s.note}>
          * Simulación estimativa basada en irradiación histórica de {region.name}.
          Precio de inyección = {SOLAR_DEFAULTS.injectionValueFactor * 100}% del kWh de compra (net billing).
          Perfil de consumo: {SOLAR_DEFAULTS.dayConsumptionRatio * 100}% diurno / {SOLAR_DEFAULTS.nightConsumptionRatio * 100}% nocturno.
          Los valores reales dependen de la instalación específica, orientación del techo, sombreado y tarifa vigente.
        </Text>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Mercado Energy — Simulador Solar Chile</Text>
          <Text style={s.footerText}>{clientName} · {date}</Text>
        </View>

      </Page>
    </Document>
  );
}
