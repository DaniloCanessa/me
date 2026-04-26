import {
  Document, Page, Text, View, StyleSheet, Image,
} from '@react-pdf/renderer';
import type { Quote, QuoteItem } from '@/lib/types';

// ─── Estilos ──────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1a1a1a',
    padding: '40 48',
    backgroundColor: '#ffffff',
  },
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  logo: { width: 200, marginTop: -8 },
  headerRight: { alignItems: 'flex-end' },
  quoteNumber: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#1d65c5', marginBottom: 3 },
  headerMeta: { fontSize: 8, color: '#888', marginTop: 2 },
  // Empresa
  companyBlock: { marginBottom: 20, paddingBottom: 16, borderBottom: '1 solid #e5e7eb' },
  companyName: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#111', marginBottom: 2 },
  companyLine: { fontSize: 8, color: '#666', marginBottom: 1 },
  // Dos columnas: empresa / cliente
  twoCol: { flexDirection: 'row', gap: 24, marginBottom: 20 },
  colBlock: { flex: 1 },
  colTitle: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#389fe0', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5 },
  colLine: { fontSize: 8.5, color: '#333', marginBottom: 2 },
  colSub: { fontSize: 7.5, color: '#888', marginBottom: 1 },
  // Validez badge
  validBadge: { backgroundColor: '#f0f9ff', border: '1 solid #bae6fd', borderRadius: 4, padding: '4 8', alignSelf: 'flex-start', marginBottom: 20 },
  validText: { fontSize: 8, color: '#0369a1' },
  // Tabla
  tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', borderTop: '1 solid #e2e8f0', borderBottom: '1 solid #e2e8f0', paddingVertical: 5 },
  tableRow: { flexDirection: 'row', borderBottom: '0.5 solid #f1f5f9', paddingVertical: 5 },
  tableRowAlt: { flexDirection: 'row', borderBottom: '0.5 solid #f1f5f9', paddingVertical: 5, backgroundColor: '#fafafa' },
  thDesc:    { flex: 4, paddingHorizontal: 6, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#64748b', textTransform: 'uppercase' },
  thQty:     { width: 36, textAlign: 'center', fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#64748b', textTransform: 'uppercase' },
  thDesc2:   { width: 12, textAlign: 'center', fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#64748b' },
  thPrice:   { width: 70, textAlign: 'right', paddingRight: 6, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#64748b', textTransform: 'uppercase' },
  thTotal:   { width: 74, textAlign: 'right', paddingRight: 6, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#64748b', textTransform: 'uppercase' },
  tdDesc:    { flex: 4, paddingHorizontal: 6, fontSize: 8.5, color: '#1e293b' },
  tdQty:     { width: 36, textAlign: 'center', fontSize: 8.5, color: '#475569' },
  tdDesc2:   { width: 12, textAlign: 'center', fontSize: 8, color: '#94a3b8' },
  tdPrice:   { width: 70, textAlign: 'right', paddingRight: 6, fontSize: 8.5, color: '#334155' },
  tdTotal:   { width: 74, textAlign: 'right', paddingRight: 6, fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  // Totales
  totalsWrap: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
  totalsBox:  { width: 200 },
  totalRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, borderBottom: '0.5 solid #f1f5f9' },
  totalRowFinal: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, marginTop: 2, backgroundColor: '#1d65c5', borderRadius: 4, paddingHorizontal: 8 },
  totalLabel: { fontSize: 8.5, color: '#475569' },
  totalValue: { fontSize: 8.5, color: '#334155', fontFamily: 'Helvetica-Bold' },
  totalLabelFinal: { fontSize: 10, color: '#ffffff', fontFamily: 'Helvetica-Bold' },
  totalValueFinal: { fontSize: 10, color: '#ffffff', fontFamily: 'Helvetica-Bold' },
  // Notas
  notesBox: { marginTop: 24, backgroundColor: '#f8fafc', borderRadius: 4, border: '1 solid #e2e8f0', padding: '10 12' },
  notesTitle: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 },
  notesText: { fontSize: 8.5, color: '#475569', lineHeight: 1.5 },
  // Footer
  footer: { position: 'absolute', bottom: 24, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerLine: { borderTop: '0.5 solid #e2e8f0', paddingTop: 6 },
  footerText: { fontSize: 7, color: '#94a3b8' },
  // Divisor
  divider: { borderBottom: '0.5 solid #e5e7eb', marginBottom: 16 },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clp(n: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: 'CLP', maximumFractionDigits: 0,
  }).format(n);
}

function dateStr(d: string) {
  return new Date(d).toLocaleDateString('es-CL', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function validUntilDate(createdAt: string, days: number) {
  const d = new Date(createdAt);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ─── Fila de ítem ─────────────────────────────────────────────────────────────

function ItemRow({ item, index }: { item: QuoteItem; index: number }) {
  const precioConIva = item.unit_price_clp * 1.19;
  const precioDesc   = precioConIva * (1 - item.discount_percent / 100);
  const rowStyle     = index % 2 === 0 ? S.tableRow : S.tableRowAlt;

  return (
    <View style={rowStyle}>
      <Text style={S.tdDesc}>{item.description}</Text>
      <Text style={S.tdQty}>{item.quantity}</Text>
      <Text style={S.tdDesc2}>{item.discount_percent > 0 ? `${item.discount_percent}%` : ''}</Text>
      <Text style={S.tdPrice}>{clp(Math.round(precioDesc))}</Text>
      <Text style={S.tdTotal}>{clp(item.total_clp)}</Text>
    </View>
  );
}

// ─── Documento ────────────────────────────────────────────────────────────────

export function QuotePDF({ quote, logoSrc }: { quote: Quote; logoSrc?: string }) {
  const items = quote.items ?? [];

  const subtotalNeto = items.reduce((acc, item) => {
    return acc + item.unit_price_clp * item.quantity * (1 - item.discount_percent / 100);
  }, 0);
  const iva   = Math.round(subtotalNeto * 0.19);
  const total = Math.round(subtotalNeto + iva);

  return (
    <Document
      title={`Cotización ${quote.quote_number}`}
      author="Mercado Energy"
      subject={`Cotización para ${quote.client_name}`}
    >
      <Page size="A4" style={S.page}>
        {/* ── Header ── */}
        <View style={S.header}>
          {logoSrc && <Image src={logoSrc} style={S.logo} />}
          <View style={S.headerRight}>
            <Text style={S.quoteNumber}>{quote.quote_number}</Text>
            <Text style={S.headerMeta}>Fecha de emisión: {dateStr(quote.created_at)}</Text>
            <Text style={S.headerMeta}>
              Válida hasta: {validUntilDate(quote.created_at, quote.validity_days)}
            </Text>
          </View>
        </View>

        {/* ── Datos cliente ── */}
        <View style={S.twoCol}>
          <View style={S.colBlock}>
            <Text style={S.colTitle}>Cotización para</Text>
            <Text style={S.colLine}>{quote.client_name}</Text>
            {quote.client_email && <Text style={S.colSub}>{quote.client_email}</Text>}
            {quote.client_phone && <Text style={S.colSub}>{quote.client_phone}</Text>}
          </View>
          <View style={S.colBlock}>
            <Text style={S.colTitle}>Condiciones</Text>
            <Text style={S.colLine}>Validez: {quote.validity_days} días</Text>
            <Text style={S.colSub}>Precios incluyen IVA 19%</Text>
            <Text style={S.colSub}>Pago según acuerdo comercial</Text>
          </View>
        </View>

        {/* ── Tabla de ítems ── */}
        <View style={S.tableHeader}>
          <Text style={S.thDesc}>Descripción</Text>
          <Text style={S.thQty}>Cant.</Text>
          <Text style={S.thDesc2}>Desc</Text>
          <Text style={S.thPrice}>P. unit c/IVA</Text>
          <Text style={S.thTotal}>Subtotal</Text>
        </View>

        {items.map((item, i) => (
          <ItemRow key={item.id} item={item} index={i} />
        ))}

        {/* ── Totales ── */}
        <View style={S.totalsWrap}>
          <View style={S.totalsBox}>
            <View style={S.totalRow}>
              <Text style={S.totalLabel}>Subtotal neto</Text>
              <Text style={S.totalValue}>{clp(Math.round(subtotalNeto))}</Text>
            </View>
            <View style={S.totalRow}>
              <Text style={S.totalLabel}>IVA 19%</Text>
              <Text style={S.totalValue}>{clp(iva)}</Text>
            </View>
            <View style={S.totalRowFinal}>
              <Text style={S.totalLabelFinal}>Total</Text>
              <Text style={S.totalValueFinal}>{clp(total)}</Text>
            </View>
          </View>
        </View>

        {/* ── Notas ── */}
        {quote.client_notes && (
          <View style={S.notesBox}>
            <Text style={S.notesTitle}>Condiciones y notas</Text>
            <Text style={S.notesText}>{quote.client_notes}</Text>
          </View>
        )}

        {/* ── Footer ── */}
        <View style={S.footer} fixed>
          <View style={[S.footerLine, { flex: 1 }]}>
            <Text style={S.footerText}>Mercado Energy SpA · www.mercadoenergy.cl</Text>
          </View>
          <Text style={[S.footerText, { marginLeft: 12 }]}>
            {quote.quote_number}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
