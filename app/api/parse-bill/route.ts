// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ExtractedPeriod {
  month: number;                     // 1–12
  year: number;
  consumptionKWh: number;            // consumo neto (puede ser negativo si inyecta más de lo que consume)
  variableAmountCLP?: number;        // monto variable en CLP
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

function buildPrompt(): string {
  return `Eres un asistente especializado en leer boletas eléctricas chilenas (Enel, CGE, Chilquinta, Frontel, Saesa, etc.).

Analiza la imagen o PDF adjunto y extrae TODA la información disponible en el siguiente formato JSON estricto:

{
  "distribuidora": "nombre de la empresa distribuidora o null",
  "tarifa": "código de tarifa (BT1, BT2, BT3, BT4.1, BT4.2, BT4.3, AT2, AT3, AT4.1, etc.) o null",
  "direccionSuministro": "dirección del punto de suministro/medidor o null",

  "potenciaConectadaKW": número en kW (ej: 8.8) o null — busca 'Potencia conectada', 'Potencia contratada', 'Cap. instalada',
  "amperajeA": número en amperes (ej: 40) o null — busca 'Amperaje', 'Amp', 'A' junto al empalme,

  "fechaLimiteCambioTarifa": "fecha como aparece en la boleta o null",
  "fechaTerminoTarifa": "fecha como aparece en la boleta o null",

  "periods": [
    {
      "month": número 1-12 — si el período cruza dos meses (ej: 17 jul → 18 ago), usa el mes de TÉRMINO (agosto = 8),
      "year": año con 4 dígitos,
      "consumptionKWh": consumo neto en kWh — si el cliente inyecta más de lo que consume puede ser negativo,
      "variableAmountCLP": monto variable en pesos CLP como entero o null,
      "kWhPriceCLP": precio promedio por kWh como entero o null,

      "tarifaPuntaCLPPerKWh": precio en horas punta como entero o null — solo en BT4.x/AT,
      "tarifaDiaCLPPerKWh": precio en horas día como entero o null — solo en BT4.x/AT,
      "tarifaNocheCLPPerKWh": precio en horas noche como entero o null — solo en BT4.x/AT,

      "energiaInyectadaKWh": kWh inyectados a la red como positivo (ej: 120) o null — busca 'Energía inyectada', 'Inyección', 'Excedentes',
      "valorInyeccionCLPPerKWh": precio que paga la distribuidora por kWh inyectado o null,

      "isCurrent": true solo para el período principal de la boleta, false para meses históricos
    }
  ],

  "confidence": "high" si los datos son claros y completos, "medium" si hay ambigüedad o datos parciales, "low" si la imagen es ilegible o no es una boleta eléctrica,
  "notes": "observación breve si hay algo relevante (ej: 'cliente ya inyecta energía', 'tarifa horaria detectada') o null"
}

Reglas importantes:
- Incluye TODOS los meses visibles: el período actual Y el historial (tablas, gráficos de barras, columnas de consumo anteriores).
- Si ves amperaje (ej: 40A) pero no potencia, calcula: potenciaConectadaKW = amperajeA × 220 / 1000.
- Los montos deben estar en CLP sin puntos de miles (ej: 45000, no 45.000).
- Para la energía inyectada: conserva el signo tal como aparece en la boleta; no lo conviertas.
- Períodos de medición que cruzan meses (ej: 17 jul → 18 ago): asigna al mes de TÉRMINO (agosto). Esto es lo estándar en boletas chilenas.
- Si la imagen es ilegible o no es una boleta eléctrica: confidence "low" y periods [].
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

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
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

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    return Response.json({ ok: false, reason: 'error', message: 'Formato no soportado. Usa JPG, PNG o PDF.' }, { status: 400 });
  }

  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 1800));
    return Response.json({ ok: true, data: mockExtraction(), mock: true });
  }

  try {
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const isPdf = file.type === 'application/pdf';

    const contentBlock = isPdf
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
      : { type: 'image', source: { type: 'base64', media_type: file.type as string, data: base64 } };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    };
    if (isPdf) headers['anthropic-beta'] = 'pdfs-2024-09-25';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            contentBlock,
            { type: 'text', text: buildPrompt() },
          ],
        }],
      }),
    });

    if (!response.ok) {
      console.error('[parse-bill] Anthropic error:', response.status, await response.text());
      return Response.json({ ok: false, reason: 'error', message: 'Error al contactar el servicio de análisis' }, { status: 502 });
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

    if (extracted.confidence === 'low' || extracted.periods.length === 0) {
      return Response.json({ ok: false, reason: 'unreadable', message: 'No se pudo leer la boleta con suficiente claridad' });
    }

    return Response.json({ ok: true, data: extracted });

  } catch (err) {
    console.error('[parse-bill] Unexpected error:', err);
    return Response.json({ ok: false, reason: 'error', message: 'Error inesperado al procesar la boleta' }, { status: 500 });
  }
}
