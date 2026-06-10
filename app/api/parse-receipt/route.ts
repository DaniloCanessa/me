import { isAdminAuthenticated } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ExtractedReceipt {
  proveedor?: string | null;      // razón social del emisor
  rut?: string | null;            // RUT del emisor (12.345.678-9)
  tipo?: string | null;           // factura | boleta | nota_credito | otro
  folio?: string | null;          // número del documento
  fecha?: string | null;          // YYYY-MM-DD
  neto?: number | null;
  iva?: number | null;
  total?: number | null;
  incluyeIva?: boolean;           // si 'total' ya incluye IVA
  moneda?: string;                // CLP por defecto
  confidence: 'high' | 'medium' | 'low';
  notes?: string | null;
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

function buildPrompt(): string {
  return `Eres un asistente especializado en leer boletas y facturas de compra chilenas (documentos tributarios del SII).

ANTES DE EXTRAER, considera:
- La imagen puede ser una FOTO tomada con celular: rotada, con poca luz, arrugada o con sombras. Oriéntate y lee con cuidado.
- Distingue al EMISOR (el proveedor que vende) del RECEPTOR (el cliente). Nos interesa el EMISOR: su razón social y su RUT.
- Identifica el tipo de documento: "factura electrónica", "boleta", "nota de crédito", etc.
- Montos: en Chile las FACTURAS separan Neto + IVA (19%) + Total. Las BOLETAS suelen mostrar solo el Total (IVA incluido). Si solo ves el total, deja neto/iva en null.

REGLA CRÍTICA — NO INVENTES VALORES: si un dato no se lee con claridad, déjalo en null en vez de adivinar. Baja "confidence" a "medium" si hubo ambigüedad.

Extrae la información en el siguiente formato JSON estricto:

{
  "proveedor": "razón social del EMISOR o null",
  "rut": "RUT del emisor en formato 12.345.678-9 o null",
  "tipo": "factura | boleta | nota_credito | otro",
  "folio": "número del documento (folio / N°) o null",
  "fecha": "fecha de emisión en formato YYYY-MM-DD o null",
  "neto": monto neto en CLP como entero (sin puntos de miles) o null,
  "iva": monto del IVA en CLP como entero o null,
  "total": monto total en CLP como entero o null,
  "incluyeIva": true si el campo "total" ya incluye IVA (caso normal), false si "total" es un neto sin IVA,
  "moneda": "CLP",
  "confidence": "high" si los datos son claros, "medium" si hay ambigüedad, "low" si es ilegible o no es una boleta/factura,
  "notes": "observación breve o null"
}

Reglas:
- Los montos en CLP sin puntos de miles (ej: 45000, no 45.000). Convierte si vienen con separadores.
- Si neto e iva están presentes, total debería ser neto + iva. Verifica la coherencia.
- Devuelve SOLO el JSON, sin texto adicional ni bloques de código.`;
}

// ─── Mock ─────────────────────────────────────────────────────────────────────

function mockExtraction(): ExtractedReceipt {
  return {
    proveedor: 'Comercial Solar SpA',
    rut: '76.123.456-7',
    tipo: 'factura',
    folio: '4521',
    fecha: new Date().toISOString().slice(0, 10),
    neto: 168067,
    iva: 31933,
    total: 200000,
    incluyeIva: true,
    moneda: 'CLP',
    confidence: 'high',
    notes: 'Extracción de prueba (sin ANTHROPIC_API_KEY).',
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mediaTypeFromName(name: string): string {
  const ext = name.toLowerCase().split('.').pop() ?? '';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'pdf') return 'application/pdf';
  return 'image/jpeg';
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  // OCR solo para usuarios internos: evita que terceros consuman crédito Anthropic.
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

  // Dos modos: archivo directo (captura) o ruta en Storage (revisión).
  const file = formData.get('file') as File | null;
  const path = (formData.get('path') as string) || null;

  let bytes: ArrayBuffer;
  let mediaType: string;

  try {
    if (file) {
      bytes = await file.arrayBuffer();
      mediaType = file.type || mediaTypeFromName(file.name);
    } else if (path) {
      const db = getSupabaseAdmin();
      const { data, error } = await db.storage.from('receipts').download(path);
      if (error || !data) {
        return Response.json({ ok: false, reason: 'error', message: 'No se pudo leer la imagen del storage' }, { status: 404 });
      }
      bytes = await data.arrayBuffer();
      mediaType = data.type || mediaTypeFromName(path);
    } else {
      return Response.json({ ok: false, reason: 'error', message: 'Falta el archivo o la ruta' }, { status: 400 });
    }
  } catch {
    return Response.json({ ok: false, reason: 'error', message: 'No se pudo obtener la imagen' }, { status: 500 });
  }

  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (!allowed.includes(mediaType)) mediaType = 'image/jpeg'; // fallback razonable para fotos

  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 1200));
    return Response.json({ ok: true, data: mockExtraction(), mock: true });
  }

  try {
    const base64 = Buffer.from(bytes).toString('base64');
    const isPdf = mediaType === 'application/pdf';
    const contentBlock = isPdf
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
      : { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } };

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
        model: process.env.OCR_MODEL ?? 'claude-opus-4-8',
        max_tokens: 1024,
        messages: [{ role: 'user', content: [contentBlock, { type: 'text', text: buildPrompt() }] }],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('[parse-receipt] Anthropic error:', response.status, errBody);
      return Response.json({ ok: false, reason: 'error', message: `Error Anthropic ${response.status}` }, { status: 502 });
    }

    const result = (await response.json()) as { content: Array<{ type: string; text: string }> };
    const text = result.content.find((c) => c.type === 'text')?.text ?? '';

    let extracted: ExtractedReceipt;
    try {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start === -1 || end === -1) throw new Error('No JSON found');
      extracted = JSON.parse(text.slice(start, end + 1)) as ExtractedReceipt;
    } catch {
      console.error('[parse-receipt] JSON parse failed. Raw:', text);
      return Response.json({ ok: false, reason: 'unreadable', message: 'No se pudo interpretar la respuesta del análisis' }, { status: 422 });
    }

    return Response.json({ ok: true, data: extracted });
  } catch (err) {
    console.error('[parse-receipt] Unexpected error:', err);
    return Response.json({ ok: false, reason: 'error', message: 'Error inesperado al procesar la boleta' }, { status: 500 });
  }
}
