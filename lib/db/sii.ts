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
// Una fila por documento emitido (solo cuando el CSV descargado es el detalle).
export type RcvVentaDetalleRow = {
  tipo_doc: string; rut_cliente: string; razon_social: string; folio: string;
  fecha_docto: string | null;
  monto_exento: number; monto_neto: number; monto_iva: number; monto_total: number;
};

export type RcvParsed = {
  kind: RcvKind;
  compras: RcvCompraRow[];
  ventas: RcvVentaRow[];
  ventasDetalle: RcvVentaDetalleRow[];
};

// El folio se compara sin ceros a la izquierda (el XML del DTE los trae y el
// RCV no) para que el cruce no falle por un detalle de formato.
export const normFolio = (s: string | null | undefined): string => {
  const clean = (s ?? '').trim().replace(/\s/g, '');
  const stripped = clean.replace(/^0+/, '');
  return stripped === '' ? clean : stripped;
};

// Detecta el tipo de CSV por su encabezado y parsea las filas.
export function parseRcvCsv(text: string): RcvParsed {
  const empty: RcvParsed = { kind: 'desconocido', compras: [], ventas: [], ventasDetalle: [] };
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length === 0) return empty;
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
    return { kind: 'compras', compras, ventas: [], ventasDetalle: [] };
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
    return { kind: 'ventas', compras: [], ventas, ventasDetalle: [] };
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
    const ventasDetalle: RcvVentaDetalleRow[] = [];
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

      // Además del resumen (que alimenta el F29) se guarda el documento suelto,
      // que es lo que permite decir CUÁL factura falta y no solo que no cuadra.
      ventasDetalle.push({
        tipo_doc: tipo,
        rut_cliente: (c[3] ?? '').trim(),
        razon_social: (c[4] ?? '').trim(),
        folio: normFolio(c[5]),
        fecha_docto: parseFecha(c[6]),
        monto_exento: sign * num(c[10]), monto_neto: sign * num(c[11]),
        monto_iva: sign * num(c[12]), monto_total: sign * num(c[13]),
      });
    }
    return { kind: 'ventas', compras: [], ventas: [...agg.values()], ventasDetalle };
  }

  return empty;
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

    // Si el CSV era el DETALLE, se guarda además documento por documento para
    // poder conciliar por folio. Con el CSV resumen esto viene vacío y la
    // conciliación de ventas se queda en la comparación de totales.
    if (parsed.ventasDetalle.length > 0) {
      const det = parsed.ventasDetalle.map((r) => ({ periodo, ...r }));
      const { error: errDet } = await db.from('sii_rcv_ventas_detalle')
        .upsert(det, { onConflict: 'periodo,tipo_doc,rut_cliente,folio' });
      if (errDet) return { kind: 'ventas', count: rows.length, error: 'Resumen importado, pero falló el detalle: ' + errDet.message };
      return { kind: 'ventas', count: parsed.ventasDetalle.length };
    }
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

// Mismo semáforo para las ventas, documento por documento.
export type ConciliacionVenta = {
  estado: ConciliacionEstado;
  sii?: { tipo_doc: string; rut_cliente: string; razon_social: string; folio: string; fecha_docto: string | null; monto_neto: number; monto_iva: number; monto_total: number };
  app?: { id: string; client_nombre: string | null; client_rut: string | null; folio: string | null; fecha: string; iva: number; total: number };
};

// Veredicto del mes: lo que responde "¿está todo cuadrado para declarar?"
export type Veredicto = {
  cuadra: boolean;
  comprasOk: number; comprasTotal: number;
  ventasOk: number;  ventasTotal: number;
  problemas: string[];
};

export type ConciliacionResult = {
  compras: ConciliacionCompra[];
  resumen: { calza: number; faltaEnApp: number; faltaEnSii: number; montoDistinto: number };
  creditoSii: number;       // IVA total compras SII
  creditoApp: number;       // IVA total facturas de gasto en la app (período)
  ventas: { debitoSii: number; debitoApp: number; docsSii: number; calza: boolean };
  ventasDocs: ConciliacionVenta[];
  resumenVentas: { calza: number; faltaEnApp: number; faltaEnSii: number; montoDistinto: number };
  tieneRcvCompras: boolean;
  tieneRcvVentas: boolean;
  tieneDetalleVentas: boolean;   // false = el CSV subido era el resumen
  veredicto: Veredicto;
};

function monthRange(periodo: string) {
  const [y, m] = periodo.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return { desde: `${periodo}-01`, hasta: `${periodo}-${String(last).padStart(2, '0')}` };
}

// IVA de una factura de la app. Se usa el IVA DECLARADO en el documento cuando
// existe: derivarlo del total (÷1,19) inventaría crédito en las facturas
// exentas, donde el IVA es cero aunque el total no lo sea. Solo se deriva
// cuando el dato no viene (boletas antiguas cargadas sin desglose).
// Las notas de crédito recibidas RESTAN al crédito fiscal, igual que en el RCV
// del SII (donde vienen en negativo).
const ivaFromCapture = (
  total: number | null, conIva: boolean, tipo?: string | null, ivaDeclarado?: number | null,
): number => {
  const iva = ivaDeclarado != null
    ? Math.round(Number(ivaDeclarado))
    : (() => {
        const t = total ?? 0;
        return conIva ? Math.round(t - t / 1.19) : Math.round(t * 0.19);
      })();
  return tipo === 'nota_credito' ? -Math.abs(iva) : iva;
};

export async function getConciliacion(periodo: string): Promise<ConciliacionResult> {
  const db = getSupabaseAdmin();
  const { desde, hasta } = monthRange(periodo);

  const [comprasSii, ventasSii, gastos, ventasApp, ventasSiiDet] = await Promise.all([
    db.from('sii_rcv_compras').select('*').eq('periodo', periodo),
    db.from('sii_rcv_ventas').select('monto_iva, total_documentos').eq('periodo', periodo),
    // Facturas de compra registradas en la app. Se consideran TODAS las
    // aprobadas con folio (antes solo las de tipo 'factura', y eso dejaba fuera
    // las notas de crédito y las que quedaron con otro tipo).
    db.from('expense_captures').select('id, proveedor, rut, folio, fecha, total, con_iva, tipo, iva')
      .eq('status', 'aprobado').gte('fecha', desde).lte('fecha', hasta),
    db.from('sales_invoices').select('id, client_nombre, client_rut, folio, fecha_emision, iva_clp, total_clp')
      .eq('estado', 'emitida').gte('fecha_emision', desde).lte('fecha_emision', hasta),
    db.from('sii_rcv_ventas_detalle').select('*').eq('periodo', periodo),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sii = (comprasSii.data ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const app = (gastos.data ?? []) as any[];

  // Índice de facturas de la app por rut+folio
  const appByKey = new Map<string, (typeof app)[number]>();
  for (const a of app) appByKey.set(`${normRut(a.rut)}|${normFolio(a.folio)}`, a);
  const appMatched = new Set<string>();

  const compras: ConciliacionCompra[] = [];
  for (const s of sii) {
    const key = `${normRut(s.rut_proveedor)}|${normFolio(s.folio)}`;
    const a = appByKey.get(key);
    const siiData = { rut_proveedor: s.rut_proveedor, razon_social: s.razon_social, folio: s.folio, fecha_docto: s.fecha_docto, monto_neto: Number(s.monto_neto) || 0, monto_iva: Number(s.monto_iva) || 0, monto_total: Number(s.monto_total) || 0 };
    if (a) {
      appMatched.add(a.id);
      const appIva = ivaFromCapture(a.total, !!a.con_iva, a.tipo, a.iva);
      const estado: ConciliacionEstado = Math.abs(appIva - siiData.monto_iva) <= 2 ? 'calza' : 'monto_distinto';
      compras.push({ estado, sii: siiData, app: { id: a.id, proveedor: a.proveedor, rut: a.rut, folio: a.folio, fecha: a.fecha, iva: appIva, total: a.total } });
    } else {
      compras.push({ estado: 'falta_en_app', sii: siiData });
    }
  }
  // Facturas en la app que NO están en el RCV del SII (crédito que el SII podría haber omitido)
  for (const a of app) {
    if (appMatched.has(a.id)) continue;
    compras.push({ estado: 'falta_en_sii', app: { id: a.id, proveedor: a.proveedor, rut: a.rut, folio: a.folio, fecha: a.fecha, iva: ivaFromCapture(a.total, !!a.con_iva, a.tipo, a.iva), total: a.total } });
  }

  const resumen = {
    calza: compras.filter((c) => c.estado === 'calza').length,
    faltaEnApp: compras.filter((c) => c.estado === 'falta_en_app').length,
    faltaEnSii: compras.filter((c) => c.estado === 'falta_en_sii').length,
    montoDistinto: compras.filter((c) => c.estado === 'monto_distinto').length,
  };

  const creditoSii = sii.reduce((s, r) => s + (Number(r.monto_iva) || 0), 0);
  const creditoApp = app.reduce((s, a) => s + ivaFromCapture(a.total, !!a.con_iva, a.tipo, a.iva), 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const debitoSii = ((ventasSii.data ?? []) as any[]).reduce((s, r) => s + (Number(r.monto_iva) || 0), 0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docsSii = ((ventasSii.data ?? []) as any[]).reduce((s, r) => s + (Number(r.total_documentos) || 0), 0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ventasAppRows = (ventasApp.data ?? []) as any[];
  const debitoApp = ventasAppRows.reduce((s, r) => s + (Number(r.iva_clp) || 0), 0);

  // ─── Ventas documento por documento ────────────────────────────────────────
  // Solo es posible si el CSV subido fue el DETALLE de ventas. Con el resumen
  // se cae de vuelta a comparar totales (lo que hacía antes).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const siiVentasDet = (ventasSiiDet.data ?? []) as any[];

  const ventasAppByKey = new Map<string, (typeof ventasAppRows)[number]>();
  for (const v of ventasAppRows) ventasAppByKey.set(normFolio(v.folio), v);
  const ventasMatched = new Set<string>();

  const ventasDocs: ConciliacionVenta[] = [];
  for (const s of siiVentasDet) {
    const folio = normFolio(s.folio);
    const a = ventasAppByKey.get(folio);
    const siiData = {
      tipo_doc: s.tipo_doc, rut_cliente: s.rut_cliente, razon_social: s.razon_social,
      folio: s.folio, fecha_docto: s.fecha_docto,
      monto_neto: Number(s.monto_neto) || 0, monto_iva: Number(s.monto_iva) || 0,
      monto_total: Number(s.monto_total) || 0,
    };
    if (a) {
      ventasMatched.add(a.id);
      const appIva = Number(a.iva_clp) || 0;
      const estado: ConciliacionEstado = Math.abs(appIva - siiData.monto_iva) <= 2 ? 'calza' : 'monto_distinto';
      ventasDocs.push({
        estado, sii: siiData,
        app: { id: a.id, client_nombre: a.client_nombre, client_rut: a.client_rut, folio: a.folio, fecha: a.fecha_emision, iva: appIva, total: Number(a.total_clp) || 0 },
      });
    } else {
      ventasDocs.push({ estado: 'falta_en_app', sii: siiData });
    }
  }
  // Emitidas en la app que el SII no informa (típicamente un folio anulado mal
  // marcado, o una factura emitida en otro período).
  for (const a of ventasAppRows) {
    if (ventasMatched.has(a.id)) continue;
    if (siiVentasDet.length === 0) break;   // sin detalle no hay con qué comparar
    ventasDocs.push({
      estado: 'falta_en_sii',
      app: { id: a.id, client_nombre: a.client_nombre, client_rut: a.client_rut, folio: a.folio, fecha: a.fecha_emision, iva: Number(a.iva_clp) || 0, total: Number(a.total_clp) || 0 },
    });
  }

  const resumenVentas = {
    calza: ventasDocs.filter((v) => v.estado === 'calza').length,
    faltaEnApp: ventasDocs.filter((v) => v.estado === 'falta_en_app').length,
    faltaEnSii: ventasDocs.filter((v) => v.estado === 'falta_en_sii').length,
    montoDistinto: ventasDocs.filter((v) => v.estado === 'monto_distinto').length,
  };

  // ─── Veredicto del mes ─────────────────────────────────────────────────────
  const problemas: string[] = [];
  if (sii.length === 0) problemas.push('Falta subir el RCV de compras del SII');
  if ((ventasSii.data ?? []).length === 0) problemas.push('Falta subir el RCV de ventas del SII');
  if (resumen.faltaEnApp > 0) problemas.push(`${resumen.faltaEnApp} factura(s) de compra están en el SII pero no en la app`);
  if (resumen.faltaEnSii > 0) problemas.push(`${resumen.faltaEnSii} factura(s) de compra están en la app pero el SII no las informa`);
  if (resumen.montoDistinto > 0) problemas.push(`${resumen.montoDistinto} factura(s) de compra con monto distinto al del SII`);
  if (resumenVentas.faltaEnApp > 0) problemas.push(`${resumenVentas.faltaEnApp} factura(s) de venta están en el SII pero no en la app`);
  if (resumenVentas.faltaEnSii > 0) problemas.push(`${resumenVentas.faltaEnSii} factura(s) de venta están en la app pero no en el SII`);
  if (resumenVentas.montoDistinto > 0) problemas.push(`${resumenVentas.montoDistinto} factura(s) de venta con monto distinto al del SII`);
  if (siiVentasDet.length === 0 && (ventasSii.data ?? []).length > 0 && Math.abs(debitoSii - debitoApp) > 2) {
    problemas.push(`El IVA débito no cuadra: SII ${debitoSii} vs app ${debitoApp}`);
  }

  const veredicto: Veredicto = {
    cuadra: problemas.length === 0,
    comprasOk: resumen.calza, comprasTotal: compras.length,
    ventasOk: resumenVentas.calza,
    ventasTotal: ventasDocs.length || docsSii,
    problemas,
  };

  return {
    compras: compras.sort((a, b) => (a.sii?.fecha_docto ?? a.app?.fecha ?? '').localeCompare(b.sii?.fecha_docto ?? b.app?.fecha ?? '')),
    resumen, creditoSii, creditoApp,
    ventas: { debitoSii, debitoApp, docsSii, calza: Math.abs(debitoSii - debitoApp) <= 2 },
    ventasDocs: ventasDocs.sort((a, b) => (a.sii?.fecha_docto ?? a.app?.fecha ?? '').localeCompare(b.sii?.fecha_docto ?? b.app?.fecha ?? '')),
    resumenVentas,
    tieneRcvCompras: sii.length > 0,
    tieneRcvVentas: (ventasSii.data ?? []).length > 0,
    tieneDetalleVentas: siiVentasDet.length > 0,
    veredicto,
  };
}
