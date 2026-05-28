import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { usePlayer, usePlayerGameLog, usePlayerSeasonStats } from '@/hooks/usePlayerDetail';
import { getPositionName } from '@/constants/positions';
import { colors, fontSize, fontWeight, radius, spacing } from '@/constants/theme';
import type { PlayerGameLogEntry } from '@/types/domain';

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
                Medias temporada ({seasonStats.gamesPlayed} partidos)
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
  const dateStr = entry.gameDate.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
  });

  return (
    <View style={styles.gameRow}>
      <View style={styles.gameRowLeft}>
        <Text style={styles.gameDate}>{dateStr}</Text>
        <Text style={styles.gameMatchup}>
          {entry.isHome ? 'vs' : '@'} {entry.opponentAbbreviation ?? '???'}
        </Text>
        {entry.winLoss && (
          <Text style={[styles.gameResult, entry.winLoss === 'W' ? styles.win : styles.loss]}>
            {entry.winLoss === 'W' ? 'V' : 'D'}
          </Text>
        )}
      </View>
      <View style={styles.gameStats}>
        <Text style={styles.gameStatMain}>{entry.points} pts</Text>
        <Text style={styles.gameStatSub}>
          {entry.rebounds} reb · {entry.assists} ast · {entry.minutes.toFixed(0)}'
        </Text>
      </View>
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
    width: 50,
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
});
