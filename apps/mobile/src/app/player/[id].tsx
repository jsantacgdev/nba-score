import { useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { TeamLogo } from '@/components/ui/TeamLogo';
import { Trophy, awardLabel } from '@/components/ui/Trophy';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  usePlayer,
  usePlayerAwards,
  usePlayerCareer,
  usePlayerGameLog,
  usePlayerSeasonStats,
} from '@/hooks/usePlayerDetail';
import { getPositionName } from '@/constants/positions';
import { formatDateDMY } from '@/lib/format';
import { colors, fontFamily, fontSize, radius, spacing } from '@/constants/theme';
import type { PlayerAward, PlayerCareerEntry, PlayerGameLogEntry } from '@/types/domain';

type TabKey = 'games' | 'career';

/** La lista es una sola FlatList y cambia de contenido segun la pestaña. */
type ListRow =
  | { kind: 'game'; game: PlayerGameLogEntry }
  | { kind: 'career'; career: PlayerCareerEntry };

/** Los nulos son reales: temporada con plantilla cargada pero sin jugar. */
function stat(value: number | null, decimals = 1): string {
  return value === null ? '—' : value.toFixed(decimals);
}

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

  // Los históricos no tienen box scores: ni se consulta
  const isRetired = player?.isActive === false;

  const {
    data: gameLog,
    refetch: refetchGameLog,
    isRefetching: refetchingGameLog,
  } = usePlayerGameLog(playerId, !isRetired);

  const {
    data: career,
    refetch: refetchCareer,
    isRefetching: refetchingCareer,
  } = usePlayerCareer(playerId);

  const { data: awards, refetch: refetchAwards } = usePlayerAwards(playerId);

  const [selectedTab, setSelectedTab] = useState<TabKey>('games');
  // Un retirado solo tiene carrera, asi que no hay eleccion que ofrecer
  const tab: TabKey = isRetired ? 'career' : selectedTab;

  const isRefetching =
    refetchingPlayer || refetchingStats || refetchingGameLog || refetchingCareer;

  const handleRefresh = () => {
    refetchPlayer();
    refetchStats();
    refetchGameLog();
    refetchCareer();
    refetchAwards();
  };

  const rows: ListRow[] =
    tab === 'games'
      ? (gameLog ?? []).map((game) => ({ kind: 'game', game }) as ListRow)
      : (career ?? []).map((entry) => ({ kind: 'career', career: entry }) as ListRow);

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
        data={rows}
        keyExtractor={(item) =>
          item.kind === 'game'
            ? item.game.gameId
            : `${item.career.season}-${item.career.teamId}`
        }
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
                {isRetired && (
                  <View style={[styles.metaBadge, styles.metaBadgeRetired]}>
                    <Text style={styles.metaBadgeText}>Retirado</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Botón Comparar. Vale también para retirados: la comparativa
                usa medias de carrera, que sí tenemos de los históricos. */}
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

            {/* Palmarés */}
            {awards && awards.length > 0 && <Palmares awards={awards} />}

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

            {/* Pestañas. Un retirado va directo a Carrera. */}
            {isRetired ? (
              <Text style={styles.sectionTitle}>Carrera</Text>
            ) : (
              <View style={styles.detailTabs}>
                <DetailTab
                  label="Partidos"
                  active={tab === 'games'}
                  onPress={() => setSelectedTab('games')}
                />
                <DetailTab
                  label="Carrera"
                  active={tab === 'career'}
                  onPress={() => setSelectedTab('career')}
                />
              </View>
            )}

            {tab === 'games' ? (
              (!gameLog || gameLog.length === 0) && (
                <EmptyState
                  icon="calendar-outline"
                  title="Sin partidos cargados"
                  message="Este jugador aún no tiene partidos registrados en la base de datos."
                  compact
                />
              )
            ) : (
              <>
                {career && career.length > 0 && <CareerHeaderRow />}
                {(!career || career.length === 0) && (
                  <EmptyState
                    icon="time-outline"
                    title="Sin histórico"
                    message="Este jugador no tiene temporadas registradas todavía."
                    compact
                  />
                )}
              </>
            )}
          </View>
        }
        renderItem={({ item }) =>
          item.kind === 'game' ? (
            <GameLogRow entry={item.game} />
          ) : (
            <CareerRow entry={item.career} />
          )
        }
      />
    </>
  );
}

/**
 * Los premios se agrupan por tipo: interesa "5 MVP" de un vistazo, no cinco
 * trofeos repetidos. El trofeo que se dibuja es el del año más reciente en
 * que lo gano, porque es el diseño que la gente asocia al jugador.
 */
function Palmares({ awards }: { awards: PlayerAward[] }) {
  const grupos = new Map<string, PlayerAward[]>();
  for (const a of awards) {
    if (!grupos.has(a.award)) grupos.set(a.award, []);
    grupos.get(a.award)!.push(a);
  }

  const orden = ['champion', 'mvp', 'finals_mvp', 'dpoy', 'roy', 'mip', 'sixth_man', 'clutch'];
  const entradas = Array.from(grupos.entries()).sort(
    ([a], [b]) => orden.indexOf(a) - orden.indexOf(b),
  );

  return (
    <View style={styles.palmaresCard}>
      <Text style={styles.palmaresTitle}>Palmarés</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.palmaresRow}>
          {entradas.map(([award, lista]) => {
            const primero = lista[0];
            if (!primero) return null;
            const temporadas = lista.map((a) => a.season).sort().reverse();
            const ultima = temporadas[0] ?? primero.season;
            return (
              <View key={award} style={styles.palmaresItem}>
                <View style={styles.palmaresArt}>
                  <Trophy award={primero.award} season={ultima} size={52} />
                  {lista.length > 1 && (
                    <View style={styles.palmaresBadge}>
                      <Text style={styles.palmaresBadgeText}>{lista.length}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.palmaresLabel} numberOfLines={2}>
                  {awardLabel(primero.award)}
                </Text>
                <Text style={styles.palmaresSeasons} numberOfLines={2}>
                  {temporadas.join(', ')}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function DetailTab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.detailTab, active && styles.detailTabActive]}>
      <Text style={[styles.detailTabText, active && styles.detailTabTextActive]}>{label}</Text>
    </Pressable>
  );
}

function CareerHeaderRow() {
  return (
    <View style={styles.careerHeader}>
      <Text style={[styles.careerHeaderText, styles.colSeason]}>TEMP.</Text>
      <Text style={[styles.careerHeaderText, styles.colCareerTeam]}>EQUIPO</Text>
      <Text style={[styles.careerHeaderText, styles.colCareerStat]}>PTS</Text>
      <Text style={[styles.careerHeaderText, styles.colCareerStat]}>REB</Text>
      <Text style={[styles.careerHeaderText, styles.colCareerStat]}>AST</Text>
      <Text style={[styles.careerHeaderText, styles.colCareerStat]}>ROB</Text>
      <Text style={[styles.careerHeaderText, styles.colCareerStat]}>TAP</Text>
    </View>
  );
}

function CareerRow({ entry }: { entry: PlayerCareerEntry }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/team/[id]', params: { id: entry.teamId } })}
      style={({ pressed }) => [styles.careerRow, pressed && styles.careerRowPressed]}
    >
      <Text style={[styles.careerSeason, styles.colSeason]}>{entry.season}</Text>

      <View style={[styles.colCareerTeam, styles.careerTeamCell]}>
        <TeamLogo logoUrl={entry.teamLogoUrl} abbreviation={entry.teamAbbreviation} size={20} />
        <Text style={styles.careerTeamText} numberOfLines={1}>
          {entry.teamAbbreviation}
        </Text>
        {entry.wonChampionship && (
          <Trophy award="champion" season={entry.season} size={16} />
        )}
      </View>

      <Text style={[styles.careerStat, styles.colCareerStat]}>{stat(entry.points)}</Text>
      <Text style={[styles.careerStat, styles.colCareerStat]}>{stat(entry.rebounds)}</Text>
      <Text style={[styles.careerStat, styles.colCareerStat]}>{stat(entry.assists)}</Text>
      <Text style={[styles.careerStat, styles.colCareerStat]}>{stat(entry.steals)}</Text>
      <Text style={[styles.careerStat, styles.colCareerStat]}>{stat(entry.blocks)}</Text>
    </Pressable>
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
    <Pressable
      onPress={() => router.push({ pathname: '/game/[id]', params: { id: entry.gameId } })}
      style={({ pressed }) => [styles.gameCard, pressed && styles.gameCardPressed]}
    >
      <View style={styles.gameCard}>
        <View style={styles.gameCardHeader}>
          {entry.gameDate && <Text style={styles.gameDate}>{formatDateDMY(entry.gameDate)}</Text>}
          {entry.winLoss && (
            <View
              style={[
                styles.resultBadge,
                entry.winLoss === 'W' ? styles.winBadge : styles.lossBadge,
              ]}
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
    </Pressable>
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
  gameCardPressed: {
    opacity: 0.7,
  },
  metaBadgeRetired: {
    borderColor: colors.borderStrong,
  },

  // Palmarés
  palmaresCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  palmaresTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontFamily: fontFamily.displayBold,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  palmaresRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  palmaresItem: {
    width: 96,
    alignItems: 'center',
  },
  palmaresArt: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  palmaresBadge: {
    position: 'absolute',
    right: -6,
    bottom: -2,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  palmaresBadgeText: {
    color: colors.background,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.displayBold,
  },
  palmaresLabel: {
    color: colors.text,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semibold,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  palmaresSeasons: {
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: fontFamily.regular,
    textAlign: 'center',
    marginTop: 2,
  },

  // Pestañas Partidos / Carrera
  detailTabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  detailTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  detailTabText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.displaySemibold,
  },
  detailTabTextActive: {
    color: colors.text,
  },

  // Tabla de carrera
  careerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  careerHeaderText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.displayBold,
    letterSpacing: 0.5,
  },
  careerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  careerRowPressed: {
    backgroundColor: colors.surface,
  },
  colSeason: {
    width: 58,
  },
  colCareerTeam: {
    flex: 1,
  },
  colCareerStat: {
    width: 38,
    textAlign: 'center',
  },
  careerSeason: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semibold,
  },
  careerTeamCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  careerTeamText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.displaySemibold,
  },
  careerStat: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.displaySemibold,
  },
});
