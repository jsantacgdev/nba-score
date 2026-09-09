import { Pressable, StyleSheet, Text, View, type DimensionValue } from 'react-native';
import { router } from 'expo-router';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { colors, fontFamily, fontSize, radius, spacing } from '@/constants/theme';
/**
 * Lo minimo para pintar a alguien en la pista.
 *
 * La pista ya no filtra: recibe los cinco ya elegidos, vengan del feed en
 * vivo (quien esta en pista) o de la base (quien fue titular).
 */
export type JugadorEnPista = {
  playerId: string;
  name: string;
  jerseyNumber?: string;
  photoUrl?: string;
  points?: number;
};

/**
 * Los cinco puestos alrededor del aro que defienden.
 *
 * El aro va abajo, que es el que defiende este equipo, y el quinteto se
 * despliega hacia arriba mirandolo: el pivot pegado a la zona, los aleros
 * abriendo a las bandas y los bases arriba del arco.
 *
 * El orden sigue al de la NBA, que lista el quinteto como F, F, C, G, G.
 * No es la asignacion defensiva real de cada jugador, que cambia en cada
 * posesion, pero da una forma reconocible y estable.
 */
const HUECOS: { left: DimensionValue; top: DimensionValue }[] = [
  { left: '4%', top: '44%' },  // alero
  { left: '72%', top: '44%' }, // alero
  { left: '38%', top: '62%' }, // pivot, el mas cerca del aro
  { left: '14%', top: '16%' }, // base
  { left: '62%', top: '16%' }, // base
];

/** Media pista con el aro abajo: el que defiende este equipo. */
function Pista() {
  return (
    <Svg style={StyleSheet.absoluteFill} viewBox="0 0 300 300" preserveAspectRatio="none">
      <Rect x="0" y="0" width="300" height="300" rx="12" fill={colors.surface} />

      {/* Zona */}
      <Rect
        x="105"
        y="185"
        width="90"
        height="115"
        fill="none"
        stroke={colors.border}
        strokeWidth="2"
      />
      {/* Circulo de tiros libres */}
      <Circle cx="150" cy="185" r="34" fill="none" stroke={colors.border} strokeWidth="2" />

      {/* Linea de tres: el arco abre hacia arriba */}
      <Path
        d="M 22 300 L 22 238 A 128 128 0 0 1 278 238 L 278 300"
        fill="none"
        stroke={colors.border}
        strokeWidth="2"
      />

      {/* Tablero y aro, abajo */}
      <Line x1="128" y1="286" x2="172" y2="286" stroke={colors.textMuted} strokeWidth="3" />
      <Circle cx="150" cy="276" r="9" fill="none" stroke={colors.primary} strokeWidth="2.5" />
    </Svg>
  );
}

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase();
}

/** Apellido solo: en un hueco de la pista no cabe el nombre entero. */
function apellido(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  return partes.length > 1 ? partes.slice(1).join(' ') : nombre;
}

export function CourtLineup({
  players,
  vacioTexto,
}: {
  /** Los cinco a pintar, ya resueltos por quien llama. */
  players: JugadorEnPista[];
  vacioTexto: string;
}) {
  const quinteto = players.slice(0, 5);

  // Si el feed no marca a nadie (partido antiguo sin datos en vivo) no se
  // pinta una pista vacia, que confundiria mas que ayudar
  if (quinteto.length === 0) {
    return (
      <View style={styles.vacio}>
        <Text style={styles.vacioTexto}>{vacioTexto}</Text>
      </View>
    );
  }

  return (
    <View style={styles.contenedor}>
      <Pista />

      {quinteto.map((jugador, i) => {
        const hueco = HUECOS[i] ?? HUECOS[0]!;
        return (
          <Animated.View
            // La clave es el jugador: al cambiar el quinteto, el que sale
            // se desvanece y el que entra aparece en su hueco
            key={jugador.playerId}
            entering={FadeIn.duration(400)}
            exiting={FadeOut.duration(300)}
            layout={Layout.duration(400)}
            style={[styles.hueco, hueco]}
          >
            <Pressable
              onPress={() =>
                router.push({ pathname: '/player/[id]', params: { id: jugador.playerId } })
              }
              style={({ pressed }) => [styles.tocable, pressed && styles.pulsado]}
            >
            <PlayerAvatar
              photoUrl={jugador.photoUrl}
              initials={iniciales(jugador.name)}
              size={42}
            />
            <View style={styles.etiqueta}>
              <Text style={styles.dorsal}>{jugador.jerseyNumber ?? '-'}</Text>
              <Text style={styles.nombre} numberOfLines={1}>
                {apellido(jugador.name)}
              </Text>
            </View>
            {jugador.points !== undefined && (
              <Text style={styles.puntos}>{jugador.points} pts</Text>
            )}
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    height: 300,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  tocable: { alignItems: 'center' },
  pulsado: { opacity: 0.6 },
  hueco: {
    position: 'absolute',
    width: '24%',
    alignItems: 'center',
  },
  etiqueta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },
  dorsal: {
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: fontFamily.semibold,
  },
  nombre: {
    color: colors.text,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.displaySemibold,
  },
  puntos: {
    color: colors.primary,
    fontSize: 10,
    fontFamily: fontFamily.semibold,
  },
  vacio: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  vacioTexto: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    textAlign: 'center',
  },
});
