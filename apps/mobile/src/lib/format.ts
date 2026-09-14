
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const MESES_CORTOS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function ultimoDomingo(year: number, monthIndex: number): number {
  const finDeMes = new Date(Date.UTC(year, monthIndex + 1, 0));
  return finDeMes.getUTCDate() - finDeMes.getUTCDay();
}

export function offsetEspana(date: Date): number {
  const year = date.getUTCFullYear();
  const inicioVerano = Date.UTC(year, 2, ultimoDomingo(year, 2), 1);
  const finVerano = Date.UTC(year, 9, ultimoDomingo(year, 9), 1);
  const t = date.getTime();
  return t >= inicioVerano && t < finVerano ? 120 : 60;
}

function enEspana(date: Date): Date {
  return new Date(date.getTime() + offsetEspana(date) * 60000);
}

export function claveDia(date: Date): string {
  const e = enEspana(date);
  return (
    `${e.getUTCFullYear()}-` +
    `${String(e.getUTCMonth() + 1).padStart(2, '0')}-` +
    `${String(e.getUTCDate()).padStart(2, '0')}`
  );
}

export function formatTime(date: Date): string {
  const e = enEspana(date);
  return `${String(e.getUTCHours()).padStart(2, '0')}:${String(e.getUTCMinutes()).padStart(2, '0')}`;
}

export function formatDayMonth(date: Date): string {
  const e = enEspana(date);
  return (
    `${String(e.getUTCDate()).padStart(2, '0')}/` +
    `${String(e.getUTCMonth() + 1).padStart(2, '0')}`
  );
}

export function formatDateDMY(date: Date): string {
  const e = enEspana(date);
  const day = String(e.getUTCDate()).padStart(2, '0');
  const month = String(e.getUTCMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${e.getUTCFullYear()}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return claveDia(a) === claveDia(b);
}

export function startOfDay(date: Date): Date {
  const e = enEspana(date);
  const medianocheFicticia = Date.UTC(
    e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate(), 0, 0, 0, 0,
  );
  const aproximado = new Date(medianocheFicticia - offsetEspana(date) * 60000);
  return new Date(medianocheFicticia - offsetEspana(aproximado) * 60000);
}

export function addDays(date: Date, days: number): Date {
  const e = enEspana(date);
  const movido = Date.UTC(
    e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate() + days,
    e.getUTCHours(), e.getUTCMinutes(), e.getUTCSeconds(), e.getUTCMilliseconds(),
  );
  const aproximado = new Date(movido - offsetEspana(date) * 60000);
  return new Date(movido - offsetEspana(aproximado) * 60000);
}

const WEEKDAY_LABELS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

export function getWeekdayLabel(date: Date): string {
  return WEEKDAY_LABELS[enEspana(date).getUTCDay()] ?? '';
}

export function formatLongDate(date: Date): string {
  const hoy = claveDia(new Date());
  const objetivo = claveDia(date);
  if (objetivo === hoy) return 'Hoy';
  if (objetivo === claveDia(addDays(new Date(), -1))) return 'Ayer';
  if (objetivo === claveDia(addDays(new Date(), 1))) return 'Mañana';

  const e = enEspana(date);
  return `${DIAS[e.getUTCDay()]}, ${e.getUTCDate()} de ${MESES[e.getUTCMonth()]}`;
}

export function formatShortDate(date: Date): string {
  const e = enEspana(date);
  return `${DIAS[e.getUTCDay()]}, ${e.getUTCDate()} ${MESES_CORTOS[e.getUTCMonth()]}`;
}

export function formatMinutes(minutes: number): string {
  const total = Math.round(minutes * 60);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * "hace 20 min", "hace 3 h", "ayer" o la fecha.
 *
 * Solo lo usa el hilo de novedades, donde lo que importa es si algo acaba
 * de pasar. El corte a dia se hace con el calendario español, no con las
 * 24 horas: una noticia de ayer a las 23:00 es de ayer aunque hayan pasado
 * dos horas.
 */
export function formatRelative(date: Date): string {
  const ahora = new Date();
  const minutos = Math.round((ahora.getTime() - date.getTime()) / 60000);

  // Una fecha futura no deberia darse, pero el feed trae horas con margen
  if (minutos < 1) return 'ahora';
  if (minutos < 60) return `hace ${minutos} min`;

  const hoy = claveDia(ahora);
  const dia = claveDia(date);
  if (dia === hoy) return `hace ${Math.floor(minutos / 60)} h`;
  if (dia === claveDia(addDays(ahora, -1))) return 'ayer';

  return formatDateDMY(date);
}
