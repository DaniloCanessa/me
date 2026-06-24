import ExcelJS from 'exceljs';
import { isAdminAuthenticated } from '@/lib/auth';
import { getBalanceAnual, getHonorarios } from '@/lib/db/balance';

const clp = (n: number) => Math.round(n || 0);

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }
  const url = new URL(request.url);
  const anio = /^\d{4}$/.test(url.searchParams.get('anio') ?? '')
    ? Number(url.searchParams.get('anio'))
    : new Date().getFullYear();

  const [b, hon] = await Promise.all([getBalanceAnual(anio), getHonorarios(anio)]);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Mercado Energy';
  const ws = wb.addWorksheet(`Balance ${anio}`);
  ws.columns = [{ width: 42 }, { width: 18 }, { width: 18 }];

  const title = (t: string) => { const r = ws.addRow([t]); r.font = { bold: true, size: 13 }; };
  const head = (t: string) => { const r = ws.addRow([t]); r.font = { bold: true }; r.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF4FA' } }; }); };
  const money = (label: string, value: number, bold = false) => {
    const r = ws.addRow([label, clp(value)]);
    r.getCell(2).numFmt = '#,##0';
    if (bold) r.font = { bold: true };
  };

  title('BALANCE / PRE-BALANCE');
  ws.addRow(['BIZNEXUS GROUP SPA — RUT 77.958.683-9']);
  ws.addRow([`Ejercicio ${anio} — Régimen Pro PyME 14D N°3`]);
  ws.addRow([]);

  head('ESTADO DE RESULTADO');
  money('Ingresos por ventas del giro (4.1.01)', b.ingresos);
  money('Costo de ventas / compras del giro (5.1.01)', -b.costos);
  money('Gastos por honorarios (5.1.02)', -b.honorarios);
  money(`${b.resultadoEjercicio >= 0 ? 'Utilidad' : 'Pérdida'} del ejercicio`, b.resultadoEjercicio, true);
  ws.addRow([]);

  // Cuadratura
  const ivaCreditoRem = Math.max(0, b.ivaCredito - b.ivaDebito);
  const ivaDebitoPagar = Math.max(0, b.ivaDebito - b.ivaCredito);
  const pasivoPatr = ivaDebitoPagar + b.retencionHonorarios + b.patrimonioFinal;
  const otrosActivos = ivaCreditoRem + b.ppm + b.activoFijo;
  const caja = pasivoPatr - otrosActivos;

  head('ACTIVOS');
  money('Caja / banco (residual) (1.1.01)', caja);
  money('IVA crédito fiscal / remanente (1.1.02)', ivaCreditoRem);
  money('PPM por recuperar (1.1.03)', b.ppm);
  if (b.activoFijo > 0) money('Activo fijo (1.1.05)', b.activoFijo);
  money('Total activos', otrosActivos + caja, true);
  ws.addRow([]);

  head('PASIVOS + PATRIMONIO');
  if (ivaDebitoPagar > 0) money('IVA débito fiscal por pagar (2.1.01)', ivaDebitoPagar);
  money('Retención honorarios por pagar (2.1.02)', b.retencionHonorarios);
  money('Capital social (3.1.01)', b.config.capital_social);
  money('Aportes socio / cta cte (3.1.02)', b.config.aportes_socio);
  money('Pérdida acumulada anterior (3.1.03)', -b.config.perdida_acumulada_anterior);
  money(`Resultado del ejercicio ${anio}`, b.resultadoEjercicio);
  money('Total pasivo + patrimonio', pasivoPatr, true);
  ws.addRow([]);

  head('DETALLE POR MES');
  const hr = ws.addRow(['Mes', 'Ventas (neto)', 'Compras (neto)']); hr.font = { bold: true };
  for (const m of b.meses) {
    const r = ws.addRow([m.periodo, clp(m.ventasNeto), clp(m.comprasNeto)]);
    r.getCell(2).numFmt = '#,##0'; r.getCell(3).numFmt = '#,##0';
  }

  if (hon.length > 0) {
    ws.addRow([]); head('HONORARIOS (BHE)');
    const hh = ws.addRow(['Emisor', 'Bruto', 'Retención']); hh.font = { bold: true };
    for (const h of hon) { const r = ws.addRow([`${h.fecha} ${h.emisor ?? ''}`, clp(h.monto_bruto), clp(h.retencion)]); r.getCell(2).numFmt = '#,##0'; r.getCell(3).numFmt = '#,##0'; }
  }

  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Balance_BIZNEXUS_${anio}.xlsx"`,
    },
  });
}
