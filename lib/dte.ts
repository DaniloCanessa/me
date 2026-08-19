import { XMLParser } from 'fast-xml-parser';

// ─── Lectura del XML del DTE (Documento Tributario Electrónico del SII) ──────
//
// Cada factura electrónica que recibes llega con su XML adjunto. Ese archivo es
// la fuente EXACTA del documento: RUT, folio, fecha, neto, IVA, total y el
// detalle de líneas. Leerlo evita el OCR por completo (cero errores, cero costo
// de IA) y deja el respaldo tributario guardado.
//
// Se aceptan los dos envoltorios que usa el SII:
//   <DTE>…</DTE>                          → un documento suelto
//   <EnvioDTE><SetDTE><DTE>…</DTE>…</SetDTE></EnvioDTE> → varios de una vez
//
// El campo relevante es siempre Documento > Encabezado (+ Detalle, repetible).

export type DteLine = {
  nombre: string;
  cantidad: number | null;
  precioUnitario: number | null;
  monto: number;
};

export type DteDoc = {
  tipoDte: string;          // '33' factura afecta, '34' exenta, '61' NC, '56' ND…
  tipo: string;             // mapeado al vocabulario de la app: 'factura' | …
  folio: string;
  fechaEmision: string | null;   // YYYY-MM-DD
  rutEmisor: string;
  razonSocialEmisor: string;
  rutReceptor: string;
  razonSocialReceptor: string;
  montoExento: number;
  montoNeto: number;
  iva: number;
  montoTotal: number;
  detalle: DteLine[];
};

export type DteParseResult = {
  docs: DteDoc[];
  error?: string;
};

// Tipos de DTE que representan una compra/venta con crédito o débito de IVA.
// El resto (guías de despacho, liquidaciones) no se ingresa como factura.
const TIPO_APP: Record<string, string> = {
  '33': 'factura',        // Factura electrónica afecta
  '34': 'factura',        // Factura no afecta o exenta
  '39': 'boleta',         // Boleta electrónica
  '41': 'boleta',         // Boleta exenta
  '43': 'factura',        // Liquidación factura
  '46': 'factura',        // Factura de compra
  '56': 'nota_debito',
  '61': 'nota_credito',
};

export const DTE_TIPO_LABEL: Record<string, string> = {
  '33': 'Factura electrónica',
  '34': 'Factura exenta',
  '39': 'Boleta electrónica',
  '41': 'Boleta exenta',
  '43': 'Liquidación factura',
  '46': 'Factura de compra',
  '52': 'Guía de despacho',
  '56': 'Nota de débito',
  '61': 'Nota de crédito',
};

const parser = new XMLParser({
  ignoreAttributes: true,
  // Los folios y RUT deben quedar como texto: sin esto "0012345" se vuelve 12345
  // y un RUT como "76123456-7" se podría interpretar como resta.
  parseTagValue: false,
  trimValues: true,
});

const str = (v: unknown): string => (v == null ? '' : String(v).trim());

const num = (v: unknown): number => {
  if (v == null) return 0;
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''));
  return isNaN(n) ? 0 : Math.round(n);
};

// El SII entrega la fecha ya en formato ISO (AAAA-MM-DD) dentro del DTE.
function parseFecha(v: unknown): string | null {
  const s = str(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}

// Un nodo repetible del XML puede venir como objeto (1 vez) o array (N veces).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asArray = (v: any): any[] => (v == null ? [] : Array.isArray(v) ? v : [v]);

// RUT como lo escribe el SII: sin puntos, con guion, K mayúscula.
export const formatRut = (s: string): string => {
  const clean = str(s).replace(/[.\s]/g, '').toUpperCase();
  return clean;
};

// El XML trae el folio con ceros a la izquierda ("0004521") pero el RCV del SII
// lo informa sin ellos ("4521"). Se guarda normalizado para que la conciliación
// cruce sin fallar.
const normFolio = (s: string): string => {
  const clean = str(s).replace(/\s/g, '');
  const stripped = clean.replace(/^0+/, '');
  return stripped === '' ? clean : stripped;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readDocumento(documento: any): DteDoc | null {
  const enc = documento?.Encabezado;
  if (!enc) return null;

  const idDoc = enc.IdDoc ?? {};
  const emisor = enc.Emisor ?? {};
  const receptor = enc.Receptor ?? {};
  const totales = enc.Totales ?? {};

  const tipoDte = str(idDoc.TipoDTE);
  if (!tipoDte) return null;

  const detalle: DteLine[] = asArray(documento.Detalle).map((d) => ({
    nombre: str(d?.NmbItem) || str(d?.DscItem) || 'Ítem',
    cantidad: d?.QtyItem != null ? num(d.QtyItem) : null,
    precioUnitario: d?.PrcItem != null ? num(d.PrcItem) : null,
    monto: num(d?.MontoItem),
  }));

  // En documentos exentos no viene MntNeto; el total es todo exento.
  const montoExento = num(totales.MntExe);
  const montoNeto = num(totales.MntNeto);
  const iva = num(totales.IVA);
  const montoTotal = num(totales.MntTotal);

  return {
    tipoDte,
    tipo: TIPO_APP[tipoDte] ?? 'factura',
    folio: normFolio(str(idDoc.Folio)),
    fechaEmision: parseFecha(idDoc.FchEmis),
    rutEmisor: formatRut(str(emisor.RUTEmisor)),
    razonSocialEmisor: str(emisor.RznSoc) || str(emisor.RznSocEmisor),
    rutReceptor: formatRut(str(receptor.RUTRecep)),
    razonSocialReceptor: str(receptor.RznSocRecep),
    montoExento,
    montoNeto,
    iva,
    montoTotal,
    detalle,
  };
}

// Lee un archivo XML y devuelve todos los DTE que contenga.
export function parseDteXml(xml: string): DteParseResult {
  let tree: unknown;
  try {
    tree = parser.parse(xml);
  } catch (e) {
    return { docs: [], error: 'El archivo no es un XML válido: ' + (e instanceof Error ? e.message : '') };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const root = tree as any;
  if (!root || typeof root !== 'object') {
    return { docs: [], error: 'El XML está vacío' };
  }

  // Sobre con varios documentos (EnvioDTE / EnvioBOLETA) o un DTE suelto.
  const setDte = root.EnvioDTE?.SetDTE ?? root.EnvioBOLETA?.SetDTE;
  const dtes = setDte ? asArray(setDte.DTE) : asArray(root.DTE);

  if (dtes.length === 0) {
    return { docs: [], error: 'No se encontró ningún DTE en el archivo (¿es el XML de la factura?)' };
  }

  const docs: DteDoc[] = [];
  for (const dte of dtes) {
    // Un DTE puede envolver Documento (afecto), Exportaciones o Liquidacion.
    const documento = dte?.Documento ?? dte?.Exportaciones ?? dte?.Liquidacion;
    for (const d of asArray(documento)) {
      const doc = readDocumento(d);
      if (doc) docs.push(doc);
    }
  }

  if (docs.length === 0) {
    return { docs: [], error: 'El XML no trae el encabezado del documento (Encabezado/IdDoc)' };
  }

  return { docs };
}

// Etiqueta legible del tipo de documento, para la UI.
export const dteTipoLabel = (tipoDte: string): string =>
  DTE_TIPO_LABEL[tipoDte] ?? `Documento tipo ${tipoDte}`;
