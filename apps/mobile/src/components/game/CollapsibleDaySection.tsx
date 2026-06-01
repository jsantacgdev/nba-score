import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { GameCard } from '@/components/game/GameCard';
import { formatShortDate } from '@/lib/format';
import type { Game } from '@/types/domain';
import { colors, fontSize, fontWeight, radius, spacing } from '@/constants/theme';

type Props = {
  date: Date;
  games: Game[];
  defaultExpanded?: boolean;
};

export function CollapsibleDaySection({ date, games, defaultExpanded = false }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <Animated.View style={styles.container} layout={LinearTransition.duration(250)}>
      <Pressable
        onPress={() => setExpanded(!expanded)}
        style={({ pressed }) => [styles.header, pressed && styles.headerPressed]}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.dateLabel}>{formatShortDate(date)}</Text>
          <Text style={styles.gameCount}>
            {games.length} {games.length === 1 ? 'partido' : 'partidos'}
          </Text>
        </View>
        <Animated.View
          style={{
            transform: [{ rotate: expanded ? '180deg' : '0deg' }],
          }}
        >
          <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
        </Animated.View>
      </Pressable>

      {expanded && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={styles.gamesList}
        >
          {games.map((g, i) => (
            <GameCard key={g.id} game={g} index={i} />
          ))}
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerPressed: {
    opacity: 0.7,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  dateLabel: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    textTransform: 'capitalize',
  },
  gameCount: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  gamesList: {
    marginTop: spacing.sm,
  },
});
