import { useEffect } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors, radius, spacing } from '@/constants/theme';

/**
 * Bloque gris que late mientras llegan los datos.
 *
 * Enseñar la forma de la pantalla en lugar de un spinner centrado evita
 * el salto de maquetacion al cargar y hace la espera mas corta de lo que
 * es, porque ya se intuye lo que va a aparecer.
 */
export function SkeletonBlock({
  width,
  height,
  radius: r = radius.sm,
  style,
}: {
  width?: number | `${number}%`;
  height: number;
  radius?: number;
  style?: ViewStyle;
}) {
  const opacidad = useSharedValue(0.35);

  useEffect(() => {
    opacidad.value = withRepeat(
      withTiming(0.75, { duration: 850, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(opacidad);
  }, [opacidad]);

  const animado = useAnimatedStyle(() => ({ opacity: opacidad.value }));

  return (
    <Animated.View
      style={[
        styles.bloque,
        { width, height, borderRadius: r },
        animado,
        style,
      ]}
    />
  );
}

/** Esqueleto de la ficha de un jugador: foto, nombre, chips, medias y tabla. */
export function PlayerDetailSkeleton() {
  return (
    <View style={styles.contenedor}>
      <View style={styles.centrado}>
        <SkeletonBlock width={120} height={120} radius={60} />
        <SkeletonBlock width={200} height={26} style={styles.nombre} />

        <View style={styles.fila}>
          <SkeletonBlock width={62} height={28} radius={radius.full} />
          <SkeletonBlock width={104} height={28} radius={radius.full} />
          <SkeletonBlock width={122} height={28} radius={radius.full} />
        </View>

        <SkeletonBlock width={136} height={40} radius={radius.full} style={styles.temporada} />
      </View>

      <SkeletonBlock width="100%" height={56} radius={radius.lg} style={styles.comparar} />
      <SkeletonBlock width="100%" height={112} radius={radius.lg} style={styles.medias} />

      <View style={styles.pestanas}>
        {[0, 1, 2, 3].map((i) => (
          <SkeletonBlock key={i} height={38} radius={radius.full} style={styles.pestana} />
        ))}
      </View>

      {/* Las filas de partidos, con su misma altura */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={styles.filaTabla}>
          <SkeletonBlock width={40} height={12} />
          <SkeletonBlock width={116} height={16} style={styles.crece} />
          <SkeletonBlock width={54} height={12} />
          <SkeletonBlock width={36} height={14} />
          <SkeletonBlock width={22} height={14} />
        </View>
      ))}
    </View>
  );
}

/** Esqueleto del detalle de un partido: marcador, MVP, equipos y box score. */
export function GameDetailSkeleton() {
  return (
    <View style={styles.contenedor}>
      {/* Marcador: fecha, estado y los dos equipos con el resultado */}
      <View style={styles.centrado}>
        <SkeletonBlock width={96} height={13} />
        <SkeletonBlock width={64} height={11} style={styles.estado} />

        <View style={styles.marcador}>
          <SkeletonBlock width={92} height={92} radius={radius.lg} />
          <SkeletonBlock width={78} height={34} style={styles.resultado} />
          <SkeletonBlock width={92} height={92} radius={radius.lg} />
        </View>

        <View style={styles.abreviaturas}>
          <SkeletonBlock width={44} height={14} />
          <SkeletonBlock width={44} height={14} />
        </View>
      </View>

      {/* Selector de equipo */}
      <View style={styles.selectorEquipo}>
        <SkeletonBlock height={40} radius={radius.full} style={styles.crece} />
        <SkeletonBlock height={40} radius={radius.full} style={styles.crece} />
      </View>

      {/* Cabecera del box score y sus jugadores */}
      <View style={styles.cabeceraBox}>
        <SkeletonBlock width={26} height={26} radius={13} />
        <SkeletonBlock width={150} height={16} />
      </View>

      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <View key={i} style={styles.filaJugador}>
          <SkeletonBlock width={32} height={32} radius={16} />
          <SkeletonBlock width={104} height={14} style={styles.crece} />
          <SkeletonBlock width={34} height={14} />
          <SkeletonBlock width={24} height={14} />
          <SkeletonBlock width={24} height={14} />
          <SkeletonBlock width={24} height={14} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bloque: {
    backgroundColor: colors.surfaceLight,
  },
  contenedor: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  centrado: {
    alignItems: 'center',
  },
  nombre: {
    marginTop: spacing.md,
  },
  fila: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  temporada: {
    marginTop: spacing.md,
  },
  comparar: {
    marginTop: spacing.lg,
  },
  medias: {
    marginTop: spacing.lg,
  },
  pestanas: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  pestana: {
    flex: 1,
  },
  filaTabla: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  crece: {
    flex: 1,
  },

  estado: {
    marginTop: spacing.sm,
  },
  marcador: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.lg,
    alignSelf: 'stretch',
  },
  resultado: {
    marginHorizontal: spacing.sm,
  },
  abreviaturas: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
  },
  selectorEquipo: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  cabeceraBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  filaJugador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
});
