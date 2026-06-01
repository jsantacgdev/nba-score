import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import type { Game } from '@/types/domain';
import { colors, fontSize, fontWeight, radius, spacing } from '@/constants/theme';

type Props = {
  game: Game;
  index?: number;
};

export function GameCard({ game, index = 0 }: Props) {
  const isLive = game.status === 'live';
  const isFinal = game.status === 'final';
  const isScheduled = game.status === 'scheduled';

  const homeWinning = game.scoreHome > game.scoreAway;
  const awayWinning = game.scoreAway > game.scoreHome;

  const handlePress = () => {
    router.push({ pathname: '/game/[id]', params: { id: game.id } });
  };

  function PulsingDot() {
    const opacity = useSharedValue(1);

    useEffect(() => {
      opacity.value = withRepeat(
        withTiming(0.3, {
          duration: 700,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true,
      );
    }, [opacity]);

    const animatedStyle = useAnimatedStyle(() => ({
      opacity: opacity.value,
    }));

    return <Animated.View style={[styles.liveDot, animatedStyle]} />;
  }

  return (
    <Animated.View entering={FadeInDown.duration(300).delay(index * 50)}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        <View style={styles.header}>
          {isLive && (
            <View style={styles.liveBadge}>
              <PulsingDot />
              <Text style={styles.liveText}>EN VIVO</Text>
            </View>
          )}
          {isFinal && <Text style={styles.statusText}>FINAL</Text>}
          {isScheduled && (
            <Text style={styles.statusText}>
              {game.startsAt.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          )}
          {isLive && game.timeRemaining && (
            <Text style={styles.periodText}>
              Q{game.period} · {game.timeRemaining}
            </Text>
          )}
        </View>

        <View style={styles.teamsContainer}>
          <TeamRow
            team={game.awayTeam}
            score={game.scoreAway}
            isWinning={awayWinning}
            showScore={!isScheduled}
          />
          <TeamRow
            team={game.homeTeam}
            score={game.scoreHome}
            isWinning={homeWinning}
            showScore={!isScheduled}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
}

function TeamRow({
  team,
  score,
  isWinning,
  showScore,
}: {
  team: Game['homeTeam'];
  score: number;
  isWinning: boolean;
  showScore: boolean;
}) {
  return (
    <View style={styles.teamRow}>
      <View style={styles.teamInfo}>
        {team.logoUrl ? (
          <Image
            source={{ uri: team.logoUrl }}
            style={styles.teamLogo}
            contentFit="contain"
            transition={150}
          />
        ) : (
          <View style={styles.teamLogoPlaceholder}>
            <Text style={styles.teamLogoText}>{team.abbreviation}</Text>
          </View>
        )}
        <View>
          <Text style={styles.teamCity}>{team.city}</Text>
          <Text style={styles.teamName}>{team.name}</Text>
        </View>
      </View>
      {showScore && <Text style={[styles.score, isWinning && styles.scoreWinning]}>{score}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.text,
  },
  liveText: {
    color: colors.text,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.5,
  },
  statusText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.5,
  },
  periodText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  teamsContainer: {
    gap: spacing.sm,
  },
  teamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  teamLogo: {
    width: 40,
    height: 40,
  },
  teamLogoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamLogoText: {
    color: colors.text,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  teamCity: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  teamName: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  score: {
    color: colors.textSecondary,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    minWidth: 50,
    textAlign: 'right',
  },
  scoreWinning: {
    color: colors.text,
  },
});
