import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { ImageStyle, StyleProp } from 'react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '@/constants/theme';
import type { AwardCode } from '@/types/domain';

export type TrophyCode = AwardCode | 'nba_cup';

const REDESIGN_SEASON = '2022-23';

type TrophyArt = {
  label: string;
  description: string;
  current: number;
  legacy?: number;
};

const TROPHIES: Record<TrophyCode, TrophyArt> = {
  champion: {
    label: 'Campeón NBA',
    description:
      'El equipo que gana las Finales, la serie al mejor de siete partidos que cierra la temporada.',
    current: require('../../../assets/images/nba_trophy.png'),
  },
  nba_cup: {
    label: 'NBA Cup',
    description:
      'Torneo que se disputa dentro de la temporada regular, desde 2023. Sus partidos cuentan también para la clasificación, salvo la final.',
    current: require('../../../assets/images/nba_cup.png'),
  },
  mvp: {
    label: 'MVP',
    description:
      'El jugador más valioso de la temporada regular. Lo eligen por votación periodistas de todo el mundo.',
    current: require('../../../assets/images/nba_mvp.png'),
  },
  finals_mvp: {
    label: 'MVP de las Finales',
    description: 'El mejor jugador de la serie final, votado al terminar esta.',
    current: require('../../../assets/images/nba_finals_mvp.png'),
  },
  roy: {
    label: 'Rookie del Año',
    description: 'El mejor jugador entre los que debutan en la liga esa temporada.',
    current: require('../../../assets/images/nba_roty_2021.png'),
    legacy: require('../../../assets/images/nba_roty.png'),
  },
  dpoy: {
    label: 'Mejor Defensor',
    description:
      'El jugador más determinante en defensa a lo largo de la temporada regular.',
    current: require('../../../assets/images/nba_dpoty_2021.png'),
    legacy: require('../../../assets/images/nba_dpoty.png'),
  },
  mip: {
    label: 'Jugador Más Mejorado',
    description:
      'Quien más ha progresado respecto a la temporada anterior. Premia el salto de nivel, no el nivel en sí.',
    current: require('../../../assets/images/nba_mipoty.png'),
  },
  clutch: {
    label: 'Clutch Player',
    description:
      'El mejor en los minutos decisivos: los últimos cinco, con menos de cinco puntos de diferencia. Se entrega desde 2023.',
    current: require('../../../assets/images/nba_clutch_poty.png'),
  },
  sixth_man: {
    label: 'Mejor Sexto Hombre',
    description:
      'El mejor jugador de los que empiezan en el banquillo en lugar de salir de titulares.',
    current: require('../../../assets/images/nba_sixth_man.png'),
  },
};

export function awardLabel(award: TrophyCode): string {
  return TROPHIES[award]?.label ?? award;
}

export function trophyArt(award: TrophyCode, season: string): number | null {
  const art = TROPHIES[award];
  if (!art) return null;
  if (art.legacy && season < REDESIGN_SEASON) return art.legacy;
  return art.current;
}

export function Trophy({
  award,
  season,
  seasons,
  size = 40,
  style,
  interactive = true,
}: {
  award: TrophyCode;
  season: string;
  seasons?: string[];
  size?: number;
  style?: StyleProp<ImageStyle>;
  interactive?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const art = TROPHIES[award];
  const source = trophyArt(award, season);
  if (!source || !art) return null;

  const imagen = (
    <Image
      source={source}
      style={[{ width: size, height: size }, style]}
      contentFit="contain"
      transition={150}
    />
  );

  if (!interactive) return imagen;

  return (
    <View>
      {/* Los trofeos viven dentro de filas pulsables. Este Pressable captura
          el toque, así que tocar el trofeo explica el premio y tocar el resto
          de la fila sigue navegando como siempre. */}
      <Pressable onPress={() => setOpen(true)} hitSlop={8}>
        {imagen}
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            <Image
              source={source}
              style={styles.cardArt}
              contentFit="contain"
              transition={150}
            />
            <Text style={styles.cardTitle}>{art.label}</Text>

            {seasons && seasons.length > 0 ? (
              <>
                {seasons.length > 1 && (
                  <Text style={styles.cardCount}>{seasons.length} veces</Text>
                )}
                <Text style={styles.cardSeason}>{seasons.join('  ·  ')}</Text>
              </>
            ) : (
              season.length > 0 && <Text style={styles.cardSeason}>{season}</Text>
            )}
            <Text style={styles.cardText}>{art.description}</Text>
            <Text style={styles.cardHint}>Toca fuera para cerrar</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.xl,
  },
  cardArt: {
    width: 96,
    height: 96,
    marginBottom: spacing.md,
  },
  cardTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontFamily: fontFamily.displayBold,
    textAlign: 'center',
  },
  cardCount: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semibold,
    marginTop: spacing.xs,
  },
  cardSeason: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.displaySemibold,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  cardText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: spacing.md,
  },
  cardHint: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    marginTop: spacing.lg,
  },
});
