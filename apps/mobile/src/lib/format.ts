/**
 * Todo lo que se muestra va en hora de España.
 *
 * Los partidos se guardan en UTC y la NBA los juega de noche allí, asi que
 * un partido de las 22:00 en Nueva York cae de madrugada aqui, ya del dia
 * siguiente. Sin esto la app mostraba la hora del dispositivo, que en el
 * emulador es la de Estados Unidos.
 *
 * El desfase no es fijo: son dos horas sobre UTC en verano y una en
 * invierno. Se calcula con la regla europea (del ultimo domingo de marzo
 * al ultimo domingo de octubre, cambiando a la 01:00 UTC) en lugar de
 * pedirselo a Intl, porque el soporte de zonas horarias en Hermes no esta
 * garantizado en todos los dispositivos.
 */

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const MESES_CORTOS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** Dia del mes en que cae el ultimo domingo, en UTC. */
function ultimoDomingo(year: number, monthIndex: number): number {
  const finDeMes = new Date(Date.UTC(year, monthIndex + 1, 0));
  return finDeMes.getUTCDate() - finDeMes.getUTCDay();
}

/** Minutos que España va por delante de UTC en ese instante: 60 o 120. */
export function offsetEspana(date: Date): number {
  const year = date.getUTCFullYear();
  const inicioVerano = Date.UTC(year, 2, ultimoDomingo(year, 2), 1);
  const finVerano = Date.UTC(year, 9, ultimoDomingo(year, 9), 1);
  const t = date.getTime();
  return t >= inicioVerano && t < finVerano ? 120 : 60;
}

/**
 * Desplaza el instante para que los getters UTC devuelvan la hora de pared
 * española. Solo para leer partes; el valor resultante no es un instante
 * valido y no debe guardarse ni enviarse.
 */
function enEspana(date: Date): Date {
  return new Date(date.getTime() + offsetEspana(date) * 60000);
}

/** Clave YYYY-MM-DD del dia español al que pertenece el instante. */
export function claveDia(date: Date): string {
  const e = enEspana(date);
  return (
    `${e.getUTCFullYear()}-` +
    `${String(e.getUTCMonth() + 1).padStart(2, '0')}-` +
    `${String(e.getUTCDate()).padStart(2, '0')}`
  );
}

/** Hora del partido en España, en formato 24h. */
export function formatTime(date: Date): string {
  const e = enEspana(date);
  return `${String(e.getUTCHours()).padStart(2, '0')}:${String(e.getUTCMinutes()).padStart(2, '0')}`;
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

/**
 * Instante de la medianoche española del dia al que pertenece la fecha.
 *
 * Se calcula restando la hora de pared en lugar de sumar dias, para que un
 * cambio de horario no corra el resultado una hora.
 */
export function startOfDay(date: Date): Date {
  const e = enEspana(date);
  const medianocheFicticia = Date.UTC(
    e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate(), 0, 0, 0, 0,
  );
  const aproximado = new Date(medianocheFicticia - offsetEspana(date) * 60000);
  // El offset puede cambiar entre la fecha original y la medianoche
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

/**
 * Minutos decimales a MM:SS.
 *
 * La NBA los publica como "39:10" y los guardamos como 39.2, redondeando
 * al décimo de minuto. Un décimo son 6 segundos, así que al reconstruir
 * el reloj el error máximo es de 3 segundos.
 */
export function formatMinutes(minutes: number): string {
  const total = Math.round(minutes * 60);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
