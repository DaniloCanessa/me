// Limitador de tasa en memoria por clave (ip + acción). Es una PRIMERA barrera
// anti-abuso: en Fluid Compute cada instancia tiene su propio contador, así que
// el límite efectivo es por-instancia. Para garantías fuertes multi-instancia
// conviene un store compartido (Upstash Redis o una tabla en Supabase).

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();

  // Limpieza oportunista para que el Map no crezca sin límite.
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) if (now > b.resetAt) buckets.delete(k);
  }

  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  if (b.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count++;
  return { ok: true, retryAfter: 0 };
}

// IP del cliente detrás del proxy de Vercel.
export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

export function tooMany(retryAfter: number): Response {
  return Response.json(
    { error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  );
}
