import { SITE_URL } from './seo';

// Identidad de marca compartida por los correos transaccionales (Resend).
// Los clientes de correo no soportan CSS externo, clases ni rutas relativas:
// todo va inline, la maquetación es con tablas y el logo se sirve por URL
// absoluta del dominio de producción.

export const EMAIL = {
  brand:      '#1d65c5', // azul oscuro de marca — números y énfasis
  accent:     '#389fe0', // azul claro de marca — acentos
  accentSoft: '#eaf4fb', // fondo azul muy suave
  accentBdr:  '#b0cedd', // borde azulado suave
  cyan:       '#70caca', // cian de marca — detalles sobre fondo oscuro
  navy:       '#0c2c54', // extremo oscuro del degradado de cabecera
  navyMid:    '#1a5aa8', // extremo claro del degradado (y respaldo sólido)
  skyText:    '#ade1ed', // texto secundario sobre fondo oscuro
  dark:       '#111827',
  text:       '#374151',
  gray:       '#6b7280',
  grayLight:  '#f9fafb',
  border:     '#e5e7eb',
  page:       '#f4f4f5',
  white:      '#ffffff',
} as const;

export const EMAIL_LOGO_URL = `${SITE_URL}/images/mercadoenergy-blanco.png`;

// Cabecera azul con logo — misma identidad que el informe PDF
// (`SimulationReportHtml`). El `bgcolor` y el `background-color` son el
// respaldo sólido para los clientes que ignoran los degradados (Outlook).
export function emailHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}): string {
  return `
        <tr><td bgcolor="${EMAIL.navyMid}" style="background-color:${EMAIL.navyMid};background-image:linear-gradient(120deg,${EMAIL.navy},${EMAIL.navyMid});padding:28px 32px 22px">
          <img src="${EMAIL_LOGO_URL}" alt="Mercado Energy" width="190" height="57" style="display:block;border:0;outline:none;text-decoration:none;width:190px;height:57px;margin:0 0 18px" />
          ${eyebrow ? `<p style="margin:0 0 6px;color:${EMAIL.accentBdr};font-size:12px;letter-spacing:.03em">${eyebrow}</p>` : ''}
          <h1 style="margin:0;color:${EMAIL.white};font-size:22px;font-weight:700;line-height:1.3">${title}</h1>
          ${subtitle ? `<p style="margin:6px 0 0;color:${EMAIL.skyText};font-size:13px">${subtitle}</p>` : ''}
        </td></tr>

        <!-- Línea de acento de marca -->
        <tr><td bgcolor="${EMAIL.accent}" style="background-color:${EMAIL.accent};background-image:linear-gradient(90deg,${EMAIL.accent},${EMAIL.cyan});height:3px;font-size:0;line-height:0">&nbsp;</td></tr>`;
}

export function emailFooter(html: string): string {
  return `
        <tr><td bgcolor="${EMAIL.grayLight}" style="background-color:${EMAIL.grayLight};padding:18px 32px;border-top:1px solid ${EMAIL.border}">
          <p style="margin:0;font-size:11px;color:${EMAIL.gray};line-height:1.6">${html}</p>
        </td></tr>`;
}

// Envoltorio de 600 px centrado sobre el fondo gris de la página.
export function emailShell(rows: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:${EMAIL.page};font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${EMAIL.page};padding:32px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:${EMAIL.white};border-radius:12px;overflow:hidden;max-width:600px;width:100%">
${rows}
      </table>
    </td></tr>
  </table>
</body>
</html>
  `.trim();
}
