import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { usePlayer, usePlayerGameLog, usePlayerSeasonStats } from '@/hooks/usePlayerDetail';
import { getPositionName } from '@/constants/positions';
import { colors, fontSize, fontWeight, radius, spacing } from '@/constants/theme';
import type { PlayerGameLogEntry } from '@/types/domain';
import { Image } from 'expo-image';
import { formatDateDMY } from '@/lib/format';

export default function PlayerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: player, isLoading } = usePlayer(id);
  const { data: seasonStats } = usePlayerSeasonStats(id);
  const { data: gameLog } = usePlayerGameLog(id);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!player) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Jugador no encontrado</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={gameLog ?? []}
      keyExtractor={(item) => item.gameId}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        <View>
          {/* Cabecera */}
          <View style={styles.header}>
            <PlayerAvatar
              photoUrl={player.photoUrl}
              initials={`${player.firstName[0] ?? ''}${player.lastName[0] ?? ''}`}
              size={120}
            />
            <Text style={styles.playerName}>
              {player.firstName} {player.lastName}
            </Text>
            <View style={styles.headerMeta}>
              {player.jerseyNumber && (
                <View style={styles.metaBadge}>
                  <Text style={styles.metaBadgeText}>#{player.jerseyNumber}</Text>
                </View>
              )}
              <View style={styles.metaBadge}>
                <Text style={styles.metaBadgeText}>{getPositionName(player.position)}</Text>
              </View>
            </View>
          </View>

          {/* Medias de temporada */}
          {seasonStats && seasonStats.gamesPlayed > 0 && (
            <View style={styles.seasonCard}>
              <Text style={styles.seasonTitle}>
                Resumen de la temporada ({seasonStats.gamesPlayed} partidos)
              </Text>
              <View style={styles.seasonStatsRow}>
                <SeasonStat label="PTS" value={seasonStats.points} />
                <SeasonStat label="REB" value={seasonStats.rebounds} />
                <SeasonStat label="AST" value={seasonStats.assists} />
                <SeasonStat label="ROB" value={seasonStats.steals} />
                <SeasonStat label="TAP" value={seasonStats.blocks} />
              </View>
            </View>
          )}

          {/* Título historial */}
          <Text style={styles.sectionTitle}>Historial de partidos</Text>
          {(!gameLog || gameLog.length === 0) && (
            <Text style={styles.emptyText}>
              No hay partidos cargados para este jugador todavía.
            </Text>
          )}
        </View>
      }
      renderItem={({ item }) => <GameLogRow entry={item} />}
    />
  );
}

function SeasonStat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.seasonStat}>
      <Text style={styles.seasonStatValue}>{value.toFixed(1)}</Text>
      <Text style={styles.seasonStatLabel}>{label}</Text>
    </View>
  );
}

function GameLogRow({ entry }: { entry: PlayerGameLogEntry }) {
  const game = entry.game;

  return (
    <View style={styles.gameCard}>
      {/* Fila superior: fecha y resultado */}
      <View style={styles.gameCardHeader}>
        <Text style={styles.gameDate}>{formatDateDMY(entry.gameDate)}</Text>
        {entry.winLoss && (
          <View
            style={[styles.resultBadge, entry.winLoss === 'W' ? styles.winBadge : styles.lossBadge]}
          >
            <Text style={styles.resultBadgeText}>
              {entry.winLoss === 'W' ? 'VICTORIA' : 'DERROTA'}
            </Text>
          </View>
        )}
      </View>

      {/* Fila del marcador con logos */}
      {game ? (
        <View style={styles.scoreboardRow}>
          <View style={[styles.scoreTeam, styles.scoreTeamHome]}>
            {game.homeTeamLogo && (
              <Image
                source={{ uri: game.homeTeamLogo }}
                style={styles.scoreLogo}
                contentFit="contain"
                transition={150}
              />
            )}
            <Text style={styles.scoreAbbr}>{game.homeTeamAbbr}</Text>
          </View>

          <View style={styles.scoreCenter}>
            <Text style={styles.scoreText}>
              {game.scoreHome} - {game.scoreAway}
            </Text>
          </View>

          <View style={[styles.scoreTeam, styles.scoreTeamAway]}>
            <Text style={styles.scoreAbbr}>{game.awayTeamAbbr}</Text>
            {game.awayTeamLogo && (
              <Image
                source={{ uri: game.awayTeamLogo }}
                style={styles.scoreLogo}
                contentFit="contain"
                transition={150}
              />
            )}
          </View>
        </View>
      ) : (
        <Text style={styles.gameMatchupFallback}>
          {entry.isHome ? 'vs' : '@'} {entry.opponentAbbreviation ?? '???'}
        </Text>
      )}

      {/* Fila inferior: stats del jugador */}
      <View style={styles.playerStatsRow}>
        <StatPill label="MIN" value={entry.minutes.toFixed(0)} />
        <StatPill label="PTS" value={String(entry.points)} highlight />
        <StatPill label="REB" value={String(entry.rebounds)} />
        <StatPill label="AST" value={String(entry.assists)} />
        <StatPill label="ROB" value={String(entry.steals)} />
        <StatPill label="TAP" value={String(entry.blocks)} />
      </View>
    </View>
  );
}

function StatPill({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.statPill}>
      <Text style={[styles.statPillValue, highlight && styles.statPillHighlight]}>{value}</Text>
      <Text style={styles.statPillLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  errorText: { color: colors.danger, fontSize: fontSize.md },
  listContent: { padding: spacing.md },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  playerName: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.heavy,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  headerMeta: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  metaBadge: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  metaBadgeText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  seasonCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  seasonTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  seasonStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  seasonStat: { alignItems: 'center', flex: 1 },
  seasonStatValue: {
    color: colors.primary,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.heavy,
  },
  seasonStatLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontStyle: 'italic',
  },
  gameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gameRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  gameDate: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  gameMatchup: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  gameResult: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  win: { color: colors.success },
  loss: { color: colors.danger },
  gameStats: { alignItems: 'flex-end' },
  gameStatMain: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  gameStatSub: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  gameCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gameCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  resultBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  winBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  lossBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  resultBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.5,
    color: colors.text,
  },
  scoreboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  scoreTeam: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  scoreLogo: {
    width: 32,
    height: 32,
  },
  scoreAbbr: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  scoreCenter: {
    paddingHorizontal: spacing.md,
    minWidth: 80,
    alignItems: 'center',
  },
  scoreText: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.heavy,
  },
  gameMatchupFallback: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    paddingVertical: spacing.sm,
  },
  playerStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statPill: {
    alignItems: 'center',
    flex: 1,
  },
  statPillValue: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  statPillHighlight: {
    color: colors.primary,
  },
  statPillLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  scoreTeamHome: {
    justifyContent: 'flex-start',
  },
  scoreTeamAway: {
    justifyContent: 'flex-end',
  },
});
