import * as XLSX from 'xlsx';
import { isAdminAuthenticated } from '@/lib/auth';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ExtractedPeriod {
  month: number;                     // 1–12
  year: number;
  consumptionKWh: number;            // consumo neto (puede ser negativo si inyecta más de lo que consume)
  variableAmountCLP?: number;        // monto variable en CLP
  totalAmountCLP?: number;           // monto total a pagar (todos los cargos + IVA)
  powerChargeCLP?: number;           // cargo por potencia/demanda en CLP
  kWhPriceCLP?: number;              // precio promedio $/kWh

  // Tarifas por bloque horario (BT4.x / AT)
  tarifaPuntaCLPPerKWh?: number;
  tarifaDiaCLPPerKWh?: number;
  tarifaNocheCLPPerKWh?: number;

  // Inyección (clientes con solar existente)
  energiaInyectadaKWh?: number;      // kWh inyectados a la red (positivo = inyectó)
  valorInyeccionCLPPerKWh?: number;  // precio que la distribuidora paga por kWh inyectado

  isCurrent: boolean;                // true = período principal de la boleta
}

export interface ExtractedBill {
  // Identificación del suministro
  distribuidora?: string;
  tarifa?: string;
  direccionSuministro?: string;

  // Capacidad del empalme — crítico para dimensionar la planta
  potenciaConectadaKW?: number;      // en kW (ej: 8.8)
  amperajeA?: number;                // en amperes (ej: 40)

  // Vigencia de la tarifa
  fechaLimiteCambioTarifa?: string;  // formato "MM/YYYY" o fecha legible
  fechaTerminoTarifa?: string;

  periods: ExtractedPeriod[];
  confidence: 'high' | 'medium' | 'low';
  notes?: string;
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

function buildPrompt(source: 'visual' | 'excel' = 'visual'): string {
  const intro = source === 'excel'
    ? `Eres un asistente especializado en interpretar datos de consumo eléctrico chileno exportados desde portales de distribuidoras (Enel, CGE, Chilquinta, Frontel, Saesa, etc.) en formato Excel/CSV.

El texto adjunto proviene de un archivo Excel convertido a CSV. Las columnas pueden tener nombres variados según la distribuidora. Identifica los datos de consumo mensual y extrae TODA la información disponible en el siguiente formato JSON estricto:`
    : `Eres un asistente especializado en leer boletas eléctricas chilenas (Enel, CGE, Chilquinta, Frontel, Saesa, etc.).

ANTES DE EXTRAER, considera:
- La boleta puede ser una FOTO ROTADA 90° o 180° (texto de lado o invertido), arrugada o con poca luz. Oriéntate mentalmente y lee con cuidado.
- Las boletas chilenas suelen tener 2 páginas. La página 2 casi siempre incluye un GRÁFICO DE BARRAS titulado "¿Cuál fue mi consumo en los últimos 13 meses?" (Enel) o similar. Cada barra tiene su valor en kWh impreso ENCIMA. Este gráfico es LA FUENTE PRINCIPAL del historial mensual — extrae TODAS las barras legibles, no solo el mes actual.
- Para asignar mes a cada barra: debajo de CADA barra hay una etiqueta de mes en el eje X (ENE FEB MAR ABR MAY JUN JUL AGO SEP OCT NOV DIC). Empareja cada valor con la etiqueta que tiene DIRECTAMENTE debajo — NO cuentes posiciones de memoria, lee la etiqueta de cada barra. Método recomendado: primero transcribe la secuencia completa de pares etiqueta→valor tal como aparece de izquierda a derecha (ej: MAY→800, JUN→702, JUL→690, ...), y recién después conviértela a month/year.
- Para asignar el año: la ÚLTIMA barra ("mes actual") corresponde al período de facturación — usa el "Periodo de lectura" o "Fecha de emisión" de la página 1 para fijar su año, y cuenta hacia atrás (cruzando el cambio de año si corresponde). VERIFICA la coherencia: el gráfico cubre 13 meses, por lo que la PRIMERA y la ÚLTIMA barra deben ser el MISMO mes (con un año de diferencia). Si tu secuencia no cumple esto, releíste mal alguna etiqueta — corrígela antes de responder.
- VERIFICACIÓN CRUZADA del mes actual: el consumo del período aparece repetido en varios lugares ("Consumo total del periodo", "Electricidad Consumida (X kWh)", lecturas del medidor, última barra del gráfico). Deben coincidir.
- Los meses históricos del gráfico solo tienen kWh — NO inventes montos en CLP para ellos. Solo el período actual tiene montos (total a pagar, detalle de cargos).

REGLA CRÍTICA — NO INVENTES VALORES: si no puedes leer con claridad el número de una barra o un dato, OMITE ese mes/campo en lugar de adivinar. Es mucho peor entregar un valor inventado que entregar menos meses. Si tuviste que omitir barras ilegibles, indícalo en "notes" y baja "confidence" a "medium".

Analiza la imagen o PDF adjunto y extrae TODA la información disponible en el siguiente formato JSON estricto:`;

  return `${intro}

{
  "distribuidora": "nombre de la empresa distribuidora o null",
  "tarifa": "código de tarifa (BT1, BT2, BT3, BT4.1, BT4.2, BT4.3, AT2, AT3, AT4.1, etc.) o null",
  "direccionSuministro": "dirección del punto de suministro/medidor o null",

  "potenciaConectadaKW": número en kW (ej: 8.8) o null — busca 'Potencia conectada', 'Potencia contratada', 'Cap. instalada',
  "amperajeA": número en amperes (ej: 40) o null — busca 'Amperaje', 'Amp', 'A' junto al empalme,

  "fechaLimiteCambioTarifa": "fecha como aparece o null",
  "fechaTerminoTarifa": "fecha como aparece o null",

  "periods": [
    {
      "month": número 1-12,
      "year": año con 4 dígitos,
      "consumptionKWh": consumo neto en kWh — número positivo normalmente; negativo si inyecta más de lo que consume,
      "variableAmountCLP": monto variable en pesos CLP como entero o null,
      "totalAmountCLP": monto total a pagar en CLP (incluye todos los cargos + IVA) como entero o null — busca 'Total a pagar', 'Monto a pagar', 'Total facturado', 'Total',
      "powerChargeCLP": cargo por potencia o demanda en CLP como entero o null — busca 'Cargo por potencia', 'Cargo por demanda máxima', 'Cargo por demanda', 'Cargo por potencia contratada',
      "kWhPriceCLP": precio promedio por kWh como entero o null,

      "tarifaPuntaCLPPerKWh": precio en horas punta como entero o null — solo en BT4.x/AT,
      "tarifaDiaCLPPerKWh": precio en horas día como entero o null — solo en BT4.x/AT,
      "tarifaNocheCLPPerKWh": precio en horas noche como entero o null — solo en BT4.x/AT,

      "energiaInyectadaKWh": kWh inyectados a la red como positivo o null,
      "valorInyeccionCLPPerKWh": precio que paga la distribuidora por kWh inyectado o null,

      "isCurrent": true solo para el período más reciente, false para el resto
    }
  ],

  "confidence": "high" si los datos son claros, "medium" si hay ambigüedad o datos parciales, "low" solo si es imposible extraer períodos de consumo,
  "notes": "observación breve o null"
}

Reglas importantes:
- Incluye TODOS los períodos/meses visibles en los datos${source === 'excel' ? '' : ', incluyendo cada barra legible del gráfico de consumo histórico de 13 meses'}.
- Los montos deben estar en CLP sin puntos de miles (ej: 45000, no 45.000). Si vienen con puntos de miles o comas decimales, conviértelos a entero.
- Si ves fechas en formato "ene-24", "01/2024", "2024-01" u otros, interprétalas correctamente como month/year.
- Si la columna de consumo tiene valores como "450 kWh" o "450,00", extrae solo el número.
- ${source === 'excel' ? 'Si el Excel no contiene datos de consumo eléctrico: confidence "low" y periods [].' : 'Si la imagen es ilegible o no es una boleta eléctrica: confidence "low" y periods [].'}
- Devuelve SOLO el JSON, sin texto adicional ni bloques de código.`;
}

// ─── Mock ─────────────────────────────────────────────────────────────────────

function mockExtraction(): ExtractedBill {
  const now = new Date();
  const periods: ExtractedPeriod[] = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    // Patrón estacional: más consumo en invierno (jun-ago en Chile)
    const winterPeak = Math.sin(((month - 6) / 12) * 2 * Math.PI) * 60;
    const kWh = Math.round(280 - winterPeak + (Math.random() - 0.5) * 20);
    const clp = kWh * 218 + 1200;
    periods.push({
      month, year,
      consumptionKWh: kWh,
      variableAmountCLP: clp,
      kWhPriceCLP: 218,
      isCurrent: i === 0,
    });
  }

  return {
    distribuidora: 'Enel Distribución',
    tarifa: 'BT1',
    direccionSuministro: 'Av. Providencia 1234, Santiago',
    potenciaConectadaKW: 8.8,
    amperajeA: 40,
    fechaLimiteCambioTarifa: '06/2026',
    fechaTerminoTarifa: '12/2027',
    periods,
    confidence: 'high',
    notes: 'Se detectaron 12 meses de historial. Empalme de 40A (8.8 kW) — planta máxima recomendable: 8 kWp.',
  };
}

// ─── Excel → texto plano ─────────────────────────────────────────────────────

function excelToText(buffer: ArrayBuffer): string {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const parts: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
    if (csv.trim()) parts.push(`=== Hoja: ${sheetName} ===\n${csv}`);
  }
  return parts.join('\n\n');
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  // OCR solo para usuarios internos: evita que terceros consuman crédito Anthropic
  if (!(await isAdminAuthenticated())) {
    return Response.json({ ok: false, reason: 'error', message: 'No autorizado' }, { status: 401 });
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  const USE_MOCK = !ANTHROPIC_API_KEY;
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ ok: false, reason: 'error', message: 'Formato de request inválido' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return Response.json({ ok: false, reason: 'error', message: 'No se recibió ningún archivo' }, { status: 400 });
  }

  const EXCEL_TYPES = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel',                                           // .xls
  ];
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', ...EXCEL_TYPES];
  const isExcel = EXCEL_TYPES.includes(file.type) || file.name.match(/\.xlsx?$/i) != null;

  if (!allowedTypes.includes(file.type) && !isExcel) {
    return Response.json({ ok: false, reason: 'error', message: 'Formato no soportado. Usa JPG, PNG, PDF o Excel.' }, { status: 400 });
  }

  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 1800));
    return Response.json({ ok: true, data: mockExtraction(), mock: true });
  }

  try {
    const bytes = await file.arrayBuffer();

    // ── Excel: convertir a texto y enviar como mensaje de texto ──────────────
    let messages: object[];
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    };

    if (isExcel) {
      const excelText = excelToText(bytes);
      if (!excelText.trim()) {
        return Response.json({ ok: false, reason: 'unreadable', message: 'El archivo Excel está vacío o no se pudo leer' });
      }
      console.log('[parse-bill] Excel text preview:', excelText.slice(0, 500));
      messages = [{
        role: 'user',
        content: `${buildPrompt('excel')}\n\nDatos del archivo Excel:\n\n${excelText}`,
      }];
    } else {
      const base64 = Buffer.from(bytes).toString('base64');
      const isPdf = file.type === 'application/pdf';
      const contentBlock = isPdf
        ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
        : { type: 'image', source: { type: 'base64', media_type: file.type as string, data: base64 } };
      if (isPdf) headers['anthropic-beta'] = 'pdfs-2024-09-25';
      messages = [{ role: 'user', content: [contentBlock, { type: 'text', text: buildPrompt('visual') }] }];
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        // Opus 4.8: máxima precisión en visión (gráficos de barras, fotos rotadas).
        // Solo lo usan usuarios internos, así que el costo queda acotado.
        // Override opcional vía OCR_MODEL (ej: 'claude-haiku-4-5' para pruebas baratas).
        model: process.env.OCR_MODEL ?? 'claude-opus-4-8',
        max_tokens: 4096,
        messages,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('[parse-bill] Anthropic error:', response.status, errBody);
      return Response.json({
        ok: false,
        reason: 'error',
        message: `Error Anthropic ${response.status}: ${errBody.slice(0, 200)}`,
      }, { status: 502 });
    }

    const result = await response.json() as { content: Array<{ type: string; text: string }> };
    const text = result.content.find((c) => c.type === 'text')?.text ?? '';

    let extracted: ExtractedBill;
    try {
      // Extraemos el JSON buscando la primera { y última } — robusto ante cualquier wrapping
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start === -1 || end === -1) throw new Error('No JSON found');
      extracted = JSON.parse(text.slice(start, end + 1)) as ExtractedBill;
    } catch {
      console.error('[parse-bill] JSON parse failed. Raw text:', text);
      return Response.json({ ok: false, reason: 'unreadable', message: 'No se pudo interpretar la respuesta del análisis' }, { status: 422 });
    }

    console.log('[parse-bill] confidence:', extracted.confidence, 'periods:', extracted.periods.length);
    if (extracted.confidence === 'low' || extracted.periods.length === 0) {
      console.log('[parse-bill] rejected — confidence or empty periods. notes:', extracted.notes);
      return Response.json({ ok: false, reason: 'unreadable', message: 'No se pudo leer la boleta con suficiente claridad' });
    }

    return Response.json({ ok: true, data: extracted });

  } catch (err) {
    console.error('[parse-bill] Unexpected error:', err);
    return Response.json({ ok: false, reason: 'error', message: 'Error inesperado al procesar la boleta' }, { status: 500 });
  }
}
