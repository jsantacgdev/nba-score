import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { usePlayer, usePlayerGameLog, usePlayerSeasonStats } from '@/hooks/usePlayerDetail';
import { getPositionName } from '@/constants/positions';
import { formatDateDMY } from '@/lib/format';
import { colors, fontFamily, fontSize, radius, spacing } from '@/constants/theme';
import type { PlayerGameLogEntry } from '@/types/domain';

export default function PlayerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const playerId = id ?? '';

  const {
    data: player,
    isLoading,
    refetch: refetchPlayer,
    isRefetching: refetchingPlayer,
  } = usePlayer(playerId);

  const {
    data: seasonStats,
    refetch: refetchStats,
    isRefetching: refetchingStats,
  } = usePlayerSeasonStats(playerId);

  const {
    data: gameLog,
    refetch: refetchGameLog,
    isRefetching: refetchingGameLog,
  } = usePlayerGameLog(playerId);

  const isRefetching = refetchingPlayer || refetchingStats || refetchingGameLog;

  const handleRefresh = () => {
    refetchPlayer();
    refetchStats();
    refetchGameLog();
  };

  if (isLoading) {
    return <LoadingState message="Cargando jugador..." />;
  }

  if (!player) {
    return (
      <ErrorState
        icon="person-remove-outline"
        title="Jugador no encontrado"
        message="Es posible que este jugador haya sido retirado o que su ID no sea válido."
      />
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: `${player.firstName} ${player.lastName}`,
        }}
      />
      <FlatList
        style={styles.container}
        data={gameLog ?? []}
        keyExtractor={(item) => item.gameId}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
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

            {/* Botón Comparar */}
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/compare/select-opponent',
                  params: { playerId: player.id },
                })
              }
              style={({ pressed }) => [
                styles.compareButton,
                pressed && styles.compareButtonPressed,
              ]}
            >
              <View style={styles.vsIcon}>
                <Text style={styles.vsIconText}>VS</Text>
              </View>
              <Text style={styles.compareButtonText}>Comparar con otro jugador</Text>
            </Pressable>

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
              <EmptyState
                icon="calendar-outline"
                title="Sin partidos cargados"
                message="Este jugador aún no tiene partidos registrados en la base de datos."
                compact
              />
            )}
          </View>
        }
        renderItem={({ item }) => <GameLogRow entry={item} />}
      />
    </>
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
      <View style={styles.gameCardHeader}>
        {entry.gameDate && <Text style={styles.gameDate}>{formatDateDMY(entry.gameDate)}</Text>}
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
  listContent: { padding: spacing.md },

  // Cabecera del jugador
  header: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  playerName: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontFamily: fontFamily.displayBold,
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
    fontFamily: fontFamily.semibold,
  },

  // Botón Comparar
  compareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  compareButtonPressed: {
    opacity: 0.7,
  },
  compareButtonText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontFamily: fontFamily.semibold,
  },
  vsIcon: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsIconText: {
    color: colors.background,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.displayBold,
    letterSpacing: 0.5,
  },

  // Medias de temporada
  seasonCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  seasonTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
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
    fontFamily: fontFamily.displayBold,
  },
  seasonStatLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.medium,
    marginTop: 2,
  },

  // Historial
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },

  // Tarjeta de partido en el historial
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
  gameDate: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
  },
  resultBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  winBadge: {
    backgroundColor: 'rgba(93, 171, 133, 0.15)',
  },
  lossBadge: {
    backgroundColor: 'rgba(209, 100, 100, 0.15)',
  },
  resultBadgeText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
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
  scoreTeamHome: {
    justifyContent: 'flex-start',
  },
  scoreTeamAway: {
    justifyContent: 'flex-end',
  },
  scoreLogo: {
    width: 32,
    height: 32,
  },
  scoreAbbr: {
    color: colors.text,
    fontSize: fontSize.md,
    fontFamily: fontFamily.bold,
  },
  scoreCenter: {
    paddingHorizontal: spacing.md,
    minWidth: 80,
    alignItems: 'center',
  },
  scoreText: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontFamily: fontFamily.displayBold,
  },
  gameMatchupFallback: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontFamily: fontFamily.semibold,
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
    fontFamily: fontFamily.bold,
  },
  statPillHighlight: {
    color: colors.primary,
  },
  statPillLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.medium,
    marginTop: 2,
  },
});
