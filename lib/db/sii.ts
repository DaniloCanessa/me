import { getSupabaseAdmin } from '@/lib/supabase';

// ─── Conciliación SII (RCV) ──────────────────────────────────────────────────
// Parser e importación de los CSV del Registro de Compras y Ventas del SII, y
// el cruce contra lo registrado en la app (bandeja de gastos / facturas de
// venta). El RCV es la fuente autoritativa del crédito/débito del F29.

const num = (s: string | undefined): number => {
  if (!s) return 0;
  const n = parseInt(String(s).replace(/[^\d-]/g, ''), 10);
  return isNaN(n) ? 0 : n;
};

// RUT normalizado para casar (sin puntos/espacios, guion, K mayúscula).
export const normRut = (s: string | null | undefined): string =>
  (s ?? '').replace(/[.\s]/g, '').toUpperCase().replace(/^0+/, '');

// Fecha DD-MM-YYYY o DD/MM/YYYY → YYYY-MM-DD
function parseFecha(s: string | undefined): string | null {
  if (!s) return null;
  const m = s.trim().match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

export type RcvKind = 'compras' | 'ventas' | 'desconocido';

export type RcvCompraRow = {
  tipo_doc: string; tipo_compra: string; rut_proveedor: string; razon_social: string;
  folio: string; fecha_docto: string | null;
  monto_exento: number; monto_neto: number; monto_iva: number; monto_total: number;
};
export type RcvVentaRow = {
  tipo_documento: string; total_documentos: number;
  monto_exento: number; monto_neto: number; monto_iva: number; monto_total: number;
};

// Detecta el tipo de CSV por su encabezado y parsea las filas.
export function parseRcvCsv(text: string): { kind: RcvKind; compras: RcvCompraRow[]; ventas: RcvVentaRow[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length === 0) return { kind: 'desconocido', compras: [], ventas: [] };
  const header = lines[0].toLowerCase();

  // Compras: "Nro;Tipo Doc;Tipo Compra;RUT Proveedor;Razon Social;Folio;Fecha Docto;..."
  if (header.includes('rut proveedor') && header.includes('iva recuperable')) {
    const compras: RcvCompraRow[] = [];
    for (const line of lines.slice(1)) {
      const c = line.split(';');
      if (c.length < 15) continue;
      const tipo = c[1]?.trim() ?? '';
      // Notas de crédito recibidas (tipo 61) restan al crédito fiscal.
      const sign = tipo === '61' ? -1 : 1;
      compras.push({
        tipo_doc: tipo, tipo_compra: c[2]?.trim() ?? '',
        rut_proveedor: c[3]?.trim() ?? '', razon_social: c[4]?.trim() ?? '',
        folio: c[5]?.trim() ?? '', fecha_docto: parseFecha(c[6]),
        monto_exento: sign * num(c[9]), monto_neto: sign * num(c[10]),
        monto_iva: sign * num(c[11]), monto_total: sign * num(c[14]),
      });
    }
    return { kind: 'compras', compras, ventas: [] };
  }

  // Ventas (resumen): "Tipo Documento;Total Documentos;Monto Exento;Monto Neto;Monto IVA;Monto Total"
  if (header.includes('tipo documento') && header.includes('total documentos')) {
    const ventas: RcvVentaRow[] = [];
    for (const line of lines.slice(1)) {
      const c = line.split(';');
      if (c.length < 6) continue;
      ventas.push({
        tipo_documento: c[0]?.trim() ?? '', total_documentos: num(c[1]),
        monto_exento: num(c[2]), monto_neto: num(c[3]),
        monto_iva: num(c[4]), monto_total: num(c[5]),
      });
    }
    return { kind: 'ventas', compras: [], ventas };
  }

  // Ventas (detalle, una fila por documento): "Nro;Tipo Doc;Tipo Venta;Rut cliente;…;Monto Neto;Monto IVA;Monto total"
  // Se agrega por tipo de documento para guardar en la tabla resumen.
  if (header.includes('rut cliente') || (header.includes('tipo venta') && header.includes('razon social'))) {
    const TIPO_LABEL: Record<string, string> = {
      '33': 'Facturas electrónicas (33)', '34': 'Facturas exentas (34)',
      '39': 'Boletas (39)', '41': 'Boletas exentas (41)',
      '46': 'Factura de compra (46)', '48': 'Comprobante Pago Electrónico (48)',
      '56': 'Notas de débito (56)', '61': 'Notas de crédito (61)',
    };
    const agg = new Map<string, RcvVentaRow>();
    for (const line of lines.slice(1)) {
      const c = line.split(';');
      if (c.length < 14) continue;
      const tipo = (c[1] ?? '').trim();
      const label = TIPO_LABEL[tipo] ?? `Tipo ${tipo}`;
      const cur = agg.get(label) ?? { tipo_documento: label, total_documentos: 0, monto_exento: 0, monto_neto: 0, monto_iva: 0, monto_total: 0 };
      // Notas de crédito (61) restan al débito
      const sign = tipo === '61' ? -1 : 1;
      cur.total_documentos += 1;
      cur.monto_exento += sign * num(c[10]);
      cur.monto_neto += sign * num(c[11]);
      cur.monto_iva += sign * num(c[12]);
      cur.monto_total += sign * num(c[13]);
      agg.set(label, cur);
    }
    return { kind: 'ventas', compras: [], ventas: [...agg.values()] };
  }

  return { kind: 'desconocido', compras: [], ventas: [] };
}

// Importa (upsert) un CSV del RCV para el período. Devuelve qué se cargó.
export async function importRcv(periodo: string, text: string): Promise<{ kind: RcvKind; count: number; error?: string }> {
  const db = getSupabaseAdmin();
  const parsed = parseRcvCsv(text);
  if (parsed.kind === 'compras') {
    const rows = parsed.compras.map((r) => ({ periodo, ...r }));
    if (rows.length === 0) return { kind: 'compras', count: 0, error: 'El CSV de compras no tiene filas' };
    const { error } = await db.from('sii_rcv_compras').upsert(rows, { onConflict: 'periodo,tipo_doc,rut_proveedor,folio' });
    if (error) return { kind: 'compras', count: 0, error: error.message };
    return { kind: 'compras', count: rows.length };
  }
  if (parsed.kind === 'ventas') {
    const rows = parsed.ventas.map((r) => ({ periodo, ...r }));
    if (rows.length === 0) return { kind: 'ventas', count: 0, error: 'El CSV de ventas no tiene filas' };
    const { error } = await db.from('sii_rcv_ventas').upsert(rows, { onConflict: 'periodo,tipo_documento' });
    if (error) return { kind: 'ventas', count: 0, error: error.message };
    return { kind: 'ventas', count: rows.length };
  }
  return { kind: 'desconocido', count: 0, error: 'No se reconoció el formato del CSV (¿es un RCV del SII?)' };
}

// ─── Totales del RCV para el F29 ──────────────────────────────────────────────

export async function getRcvCreditoIva(periodo: string): Promise<{ iva: number; docs: number }> {
  const db = getSupabaseAdmin();
  const { data } = await db.from('sii_rcv_compras').select('monto_iva').eq('periodo', periodo);
  const iva = (data ?? []).reduce((s, r) => s + (Number((r as { monto_iva: number }).monto_iva) || 0), 0);
  return { iva, docs: (data ?? []).length };
}

export async function getRcvDebitoIva(periodo: string): Promise<{ iva: number; docs: number }> {
  const db = getSupabaseAdmin();
  const { data } = await db.from('sii_rcv_ventas').select('monto_iva, total_documentos').eq('periodo', periodo);
  const iva = (data ?? []).reduce((s, r) => s + (Number((r as { monto_iva: number }).monto_iva) || 0), 0);
  const docs = (data ?? []).reduce((s, r) => s + (Number((r as { total_documentos: number }).total_documentos) || 0), 0);
  return { iva, docs };
}

// ─── Conciliación (gastos + ventas) ──────────────────────────────────────────

export type ConciliacionEstado = 'calza' | 'falta_en_app' | 'falta_en_sii' | 'monto_distinto';

export type ConciliacionCompra = {
  estado: ConciliacionEstado;
  // datos SII (si existe)
  sii?: { rut_proveedor: string; razon_social: string; folio: string; fecha_docto: string | null; monto_neto: number; monto_iva: number; monto_total: number };
  // datos app (si existe)
  app?: { id: string; proveedor: string | null; rut: string | null; folio: string | null; fecha: string | null; iva: number | null; total: number | null };
};

export type ConciliacionResult = {
  compras: ConciliacionCompra[];
  resumen: { calza: number; faltaEnApp: number; faltaEnSii: number; montoDistinto: number };
  creditoSii: number;       // IVA total compras SII
  creditoApp: number;       // IVA total facturas de gasto en la app (período)
  ventas: { debitoSii: number; debitoApp: number; docsSii: number; calza: boolean };
  tieneRcvCompras: boolean;
  tieneRcvVentas: boolean;
};

function monthRange(periodo: string) {
  const [y, m] = periodo.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return { desde: `${periodo}-01`, hasta: `${periodo}-${String(last).padStart(2, '0')}` };
}

const ivaFromCapture = (total: number | null, conIva: boolean): number => {
  const t = total ?? 0;
  return conIva ? Math.round(t - t / 1.19) : Math.round(t * 0.19);
};

export async function getConciliacion(periodo: string): Promise<ConciliacionResult> {
  const db = getSupabaseAdmin();
  const { desde, hasta } = monthRange(periodo);

  const [comprasSii, ventasSii, gastos, ventasApp] = await Promise.all([
    db.from('sii_rcv_compras').select('*').eq('periodo', periodo),
    db.from('sii_rcv_ventas').select('monto_iva, total_documentos').eq('periodo', periodo),
    // Facturas registradas en la app (bandeja de gastos, aprobadas, tipo factura)
    db.from('expense_captures').select('id, proveedor, rut, folio, fecha, total, con_iva')
      .eq('status', 'aprobado').eq('tipo', 'factura').gte('fecha', desde).lte('fecha', hasta),
    db.from('sales_invoices').select('iva_clp').eq('estado', 'emitida')
      .gte('fecha_emision', desde).lte('fecha_emision', hasta),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sii = (comprasSii.data ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const app = (gastos.data ?? []) as any[];

  // Índice de facturas de la app por rut+folio
  const appByKey = new Map<string, (typeof app)[number]>();
  for (const a of app) appByKey.set(`${normRut(a.rut)}|${(a.folio ?? '').trim()}`, a);
  const appMatched = new Set<string>();

  const compras: ConciliacionCompra[] = [];
  for (const s of sii) {
    const key = `${normRut(s.rut_proveedor)}|${(s.folio ?? '').trim()}`;
    const a = appByKey.get(key);
    const siiData = { rut_proveedor: s.rut_proveedor, razon_social: s.razon_social, folio: s.folio, fecha_docto: s.fecha_docto, monto_neto: Number(s.monto_neto) || 0, monto_iva: Number(s.monto_iva) || 0, monto_total: Number(s.monto_total) || 0 };
    if (a) {
      appMatched.add(a.id);
      const appIva = ivaFromCapture(a.total, !!a.con_iva);
      const estado: ConciliacionEstado = Math.abs(appIva - siiData.monto_iva) <= 2 ? 'calza' : 'monto_distinto';
      compras.push({ estado, sii: siiData, app: { id: a.id, proveedor: a.proveedor, rut: a.rut, folio: a.folio, fecha: a.fecha, iva: appIva, total: a.total } });
    } else {
      compras.push({ estado: 'falta_en_app', sii: siiData });
    }
  }
  // Facturas en la app que NO están en el RCV del SII (crédito que el SII podría haber omitido)
  for (const a of app) {
    if (appMatched.has(a.id)) continue;
    compras.push({ estado: 'falta_en_sii', app: { id: a.id, proveedor: a.proveedor, rut: a.rut, folio: a.folio, fecha: a.fecha, iva: ivaFromCapture(a.total, !!a.con_iva), total: a.total } });
  }

  const resumen = {
    calza: compras.filter((c) => c.estado === 'calza').length,
    faltaEnApp: compras.filter((c) => c.estado === 'falta_en_app').length,
    faltaEnSii: compras.filter((c) => c.estado === 'falta_en_sii').length,
    montoDistinto: compras.filter((c) => c.estado === 'monto_distinto').length,
  };

  const creditoSii = sii.reduce((s, r) => s + (Number(r.monto_iva) || 0), 0);
  const creditoApp = app.reduce((s, a) => s + ivaFromCapture(a.total, !!a.con_iva), 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const debitoSii = ((ventasSii.data ?? []) as any[]).reduce((s, r) => s + (Number(r.monto_iva) || 0), 0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docsSii = ((ventasSii.data ?? []) as any[]).reduce((s, r) => s + (Number(r.total_documentos) || 0), 0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const debitoApp = ((ventasApp.data ?? []) as any[]).reduce((s, r) => s + (Number(r.iva_clp) || 0), 0);

  return {
    compras: compras.sort((a, b) => (a.sii?.fecha_docto ?? a.app?.fecha ?? '').localeCompare(b.sii?.fecha_docto ?? b.app?.fecha ?? '')),
    resumen, creditoSii, creditoApp,
    ventas: { debitoSii, debitoApp, docsSii, calza: Math.abs(debitoSii - debitoApp) <= 2 },
    tieneRcvCompras: sii.length > 0,
    tieneRcvVentas: (ventasSii.data ?? []).length > 0,
  };
}
