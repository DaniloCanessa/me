import { syncTenders } from '@/lib/mercadopublico';
import { isAdminAuthenticated } from '@/lib/auth';

export const maxDuration = 300; // la sincronización puede tardar (rate limit ~1 req/s)

// Sincronización diaria de licitaciones de Mercado Público.
// Invocada por Vercel Cron (ver vercel.json) — Vercel envía
// `Authorization: Bearer ${CRON_SECRET}` cuando la variable está definida.
// También acepta sesión de admin para pruebas manuales desde el navegador.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  const isCron = !!cronSecret && auth === `Bearer ${cronSecret}`;

  if (!isCron && !(await isAdminAuthenticated())) {
    return Response.json({ ok: false, message: 'No autorizado' }, { status: 401 });
  }

  try {
    const result = await syncTenders();
    console.log('[cron/tenders]', JSON.stringify(result));
    return Response.json({ ok: true, ...result });
  } catch (err) {
    console.error('[cron/tenders] Error:', err);
    return Response.json({ ok: false, message: 'Error en sincronización' }, { status: 500 });
  }
}
