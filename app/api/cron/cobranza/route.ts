import { runCobranza } from '@/lib/cobranza';
import { isAdminAuthenticated } from '@/lib/auth';

// Cobranza diaria de facturas de venta.
// La dispara Vercel Cron (ver vercel.json) con `Authorization: Bearer
// ${CRON_SECRET}`, y tiene respaldo en GitHub Actions porque el cron de Vercel
// en plan Hobby es best-effort. También acepta sesión de admin para pruebas.
//
// `?test=1` simula la corrida (dice a quién avisaría) sin enviar ni marcar.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  const isCron = !!cronSecret && auth === `Bearer ${cronSecret}`;

  if (!isCron && !(await isAdminAuthenticated())) {
    return Response.json({ ok: false, message: 'No autorizado' }, { status: 401 });
  }

  const dryRun = new URL(request.url).searchParams.get('test') !== null;

  try {
    const result = await runCobranza({ dryRun });
    console.log('[cron/cobranza]', JSON.stringify(result));
    return Response.json(result);
  } catch (err) {
    console.error('[cron/cobranza] Error:', err);
    return Response.json({ ok: false, message: 'Error en la cobranza' }, { status: 500 });
  }
}
