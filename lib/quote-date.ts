// Fecha de emisión de una cotización.
//
// `fecha_emision` es la fecha que se fija a mano en el editor (columna `date`,
// sin hora). Si no se fijó, vale la fecha en que se creó la cotización. Todo se
// maneja como 'YYYY-MM-DD' en hora de Chile: `created_at` viene en UTC y una
// cotización hecha a las 22:00 no debe salir con la fecha del día siguiente.

type ConFecha = { fecha_emision?: string | null; created_at: string };

const TZ = 'America/Santiago';

/** 'YYYY-MM-DD' de un timestamp, en hora de Chile. */
function isoChile(ts: string | Date): string {
  return new Date(ts).toLocaleDateString('en-CA', { timeZone: TZ });
}

/** Fecha de emisión como 'YYYY-MM-DD' (valor para un `<input type="date">`). */
export function fechaEmisionISO(q: ConFecha): string {
  return q.fecha_emision ? q.fecha_emision.slice(0, 10) : isoChile(q.created_at);
}

/** Hoy en Chile, como 'YYYY-MM-DD'. */
export function hoyISO(): string {
  return isoChile(new Date());
}

// Un 'YYYY-MM-DD' se ancla a mediodía UTC y se formatea en UTC: así ninguna
// zona horaria lo corre al día anterior.
function desdeISO(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`);
}

export function formatFecha(iso: string, month: 'long' | 'short' = 'long'): string {
  return desdeISO(iso).toLocaleDateString('es-CL', {
    day: 'numeric', month, year: 'numeric', timeZone: 'UTC',
  });
}

/** Fecha de emisión + `dias`, como 'YYYY-MM-DD'. */
export function sumarDiasISO(iso: string, dias: number): string {
  const d = desdeISO(iso);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}
