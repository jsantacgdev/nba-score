import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { Game } from '@/types/domain';
import { colors, fontSize, fontWeight, radius, spacing } from '@/constants/theme';

type Props = {
  game: Game;
};

export function GameCard({ game }: Props) {
  const isLive = game.status === 'live';
  const isFinal = game.status === 'final';
  const isScheduled = game.status === 'scheduled';
  
  const homeWinning = game.scoreHome > game.scoreAway;
  const awayWinning = game.scoreAway > game.scoreHome;

  const handlePress = () => {
    router.push(`/game/${game.id}`);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.header}>
        {isLive && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
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
        <View style={styles.teamRow}>
          <View style={styles.teamInfo}>
            <View style={styles.teamLogoPlaceholder}>
              <Text style={styles.teamLogoText}>{game.awayTeam.abbreviation}</Text>
            </View>
            <View>
              <Text style={styles.teamCity}>{game.awayTeam.city}</Text>
              <Text style={styles.teamName}>{game.awayTeam.name}</Text>
            </View>
          </View>
          {!isScheduled && (
            <Text
              style={[
                styles.score,
                awayWinning && styles.scoreWinning,
              ]}
            >
              {game.scoreAway}
            </Text>
          )}
        </View>

        <View style={styles.teamRow}>
          <View style={styles.teamInfo}>
            <View style={styles.teamLogoPlaceholder}>
              <Text style={styles.teamLogoText}>{game.homeTeam.abbreviation}</Text>
            </View>
            <View>
              <Text style={styles.teamCity}>{game.homeTeam.city}</Text>
              <Text style={styles.teamName}>{game.homeTeam.name}</Text>
            </View>
          </View>
          {!isScheduled && (
            <Text
              style={[
                styles.score,
                homeWinning && styles.scoreWinning,
              ]}
            >
              {game.scoreHome}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
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