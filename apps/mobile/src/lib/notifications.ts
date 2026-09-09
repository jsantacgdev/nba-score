import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { fetchGamesByTeams } from '@/lib/api/games';
import { formatTime } from '@/lib/format';
import type { Game } from '@/types/domain';

const CLAVE_ACTIVAS = 'notifications:enabled';
const CANAL = 'partidos';

/** Cuanto antes del salto inicial avisamos. */
export const MINUTOS_ANTES = 30;

/**
 * Tope de avisos programados a la vez.
 *
 * Android limita las alarmas por aplicacion, y una temporada entera de
 * varios equipos favoritos se iria a varios cientos. Con 40 se cubren mas
 * de dos semanas siguiendo a tres equipos, y se reprograma cada vez que se
 * abre la pantalla.
 */
const MAX_AVISOS = 40;

/** Dias hacia adelante que se miran al programar. */
const DIAS_VISTA = 30;

export async function notificacionesActivadas(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(CLAVE_ACTIVAS)) === '1';
  } catch {
    return false;
  }
}

export async function guardarActivadas(activas: boolean): Promise<void> {
  await AsyncStorage.setItem(CLAVE_ACTIVAS, activas ? '1' : '0');
}

/**
 * Pide permiso al sistema. Devuelve si quedo concedido.
 *
 * En Android 13 y posteriores el permiso se pide en caliente; en versiones
 * anteriores viene concedido de fabrica.
 */
export async function pedirPermiso(): Promise<boolean> {
  const actual = await Notifications.getPermissionsAsync();
  if (actual.granted) return true;
  if (!actual.canAskAgain) return false;

  const pedido = await Notifications.requestPermissionsAsync();
  return pedido.granted;
}

/** Android exige un canal para que la notificacion suene y vibre. */
export async function prepararCanal(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(CANAL, {
    name: 'Partidos',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#E89154',
  });
}

function textoAviso(game: Game): { titulo: string; cuerpo: string } {
  return {
    titulo: `${game.awayTeam.name} · ${game.homeTeam.name}`,
    cuerpo: `Empieza a las ${formatTime(game.startsAt)}`,
  };
}

/**
 * Reprograma todos los avisos de los equipos favoritos.
 *
 * Se cancela y se vuelve a crear en bloque en lugar de ir sincronizando
 * uno a uno: los partidos se aplazan y se reprograman, y llevar la cuenta
 * de que aviso corresponde a que partido daria mas problemas que rehacerlo
 * entero, que cuesta milisegundos.
 */
export async function reprogramarAvisos(teamIds: string[]): Promise<number> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (teamIds.length === 0) return 0;
  if (!(await notificacionesActivadas())) return 0;

  await prepararCanal();

  const partidos = await fetchGamesByTeams(teamIds, 0, DIAS_VISTA);

  // Solo lo que aun no ha empezado y da tiempo a avisar
  const ahora = Date.now();
  const proximos = partidos
    .filter((g) => g.status === 'scheduled')
    .map((g) => ({ game: g, cuando: g.startsAt.getTime() - MINUTOS_ANTES * 60_000 }))
    .filter((x) => x.cuando > ahora)
    .sort((a, b) => a.cuando - b.cuando)
    .slice(0, MAX_AVISOS);

  for (const { game, cuando } of proximos) {
    const { titulo, cuerpo } = textoAviso(game);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: titulo,
        body: cuerpo,
        data: { gameId: game.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(cuando),
        channelId: CANAL,
      },
    });
  }

  return proximos.length;
}

/** Cuantos avisos hay puestos ahora mismo. */
export async function avisosProgramados(): Promise<number> {
  const puestos = await Notifications.getAllScheduledNotificationsAsync();
  return puestos.length;
}

export async function cancelarTodos(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
