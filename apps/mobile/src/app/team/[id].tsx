import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TeamLogo } from '@/components/ui/TeamLogo';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { FavoriteTeamButton } from '@/components/ui/FavoriteButton';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { GameCard } from '@/components/game/GameCard';
import {
  useTeam,
  useTeamRoster,
  useTeamSeasonRoster,
  useTeamSeasonStats,
} from '@/hooks/useTeamRoster';
import { useTeamGames } from '@/hooks/useTeamGames';
import { getPositionName } from '@/constants/positions';
import { colors, fontFamily, fontSize, radius, spacing } from '@/constants/theme';
import type { Game, PlayerSeasonStats, Team, TeamSeasonPlayer } from '@/types/domain';

type Tab = 'roster' | 'games';

export default function TeamDetailScreen() {
  const { id, season } = useLocalSearchParams<{ id: string; season?: string }>();
  const teamId = id ?? '';
  // Llegamos desde la clasificacion de una temporada pasada
  const historicSeason = season && season.length > 0 ? season : undefined;
  const [activeTab, setActiveTab] = useState<Tab>('roster');

  const { data: team, refetch: refetchTeam } = useTeam(teamId);
  const {
    data: roster,
    isLoading: rosterLoading,
    error: rosterError,
    refetch: refetchRoster,
    isRefetching: refetchingRoster,
  } = useTeamRoster(teamId);
  const { data: seasonStats, refetch: refetchStats } = useTeamSeasonStats(teamId);
  const { data: seasonRoster, isLoading: seasonRosterLoading } = useTeamSeasonRoster(
    teamId,
    historicSeason,
  );
  const {
    data: games,
    isLoading: gamesLoading,
    refetch: refetchGames,
    isRefetching: refetchingGames,
  } = useTeamGames(teamId);

  const isRefetching = refetchingRoster || refetchingGames;

  const handleRefresh = () => {
    refetchTeam();
    refetchRoster();
    refetchStats();
    refetchGames();
  };

  if (historicSeason ? seasonRosterLoading : rosterLoading) {
    return <LoadingState message="Cargando plantilla..." />;
  }

  if (!historicSeason && rosterError) {
    return <ErrorState title="No se puede cargar la plantilla" onRetry={refetchRoster} />;
  }

  // Indexar stats por jugador
  const statsByPlayer = seasonStats ?? new Map<string, PlayerSeasonStats>();

  // Las dos plantillas se normalizan a la misma forma para pintarlas igual
  const rosterRows: TeamSeasonPlayer[] = historicSeason
    ? (seasonRoster ?? [])
    : (roster ?? []).map((p) => {
        const st = statsByPlayer.get(p.id);
        return {
          playerId: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          photoUrl: p.photoUrl,
          jerseyNumber: p.jerseyNumber,
          position: p.position,
          gamesPlayed: st?.gamesPlayed ?? null,
          minutes: st?.minutes ?? null,
          points: st?.points ?? null,
          rebounds: st?.rebounds ?? null,
          assists: st?.assists ?? null,
          steals: st?.steals ?? null,
          blocks: st?.blocks ?? null,
          wonChampionship: false,
        };
      });

  // Separar partidos en futuros y pasados
  const now = new Date();
  const upcomingGames = (games ?? [])
    .filter((g) => g.startsAt >= now || g.status === 'live')
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const pastGames = (games ?? [])
    .filter((g) => g.startsAt < now && g.status !== 'live')
    .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());

  return (
    <>
      <Stack.Screen
        options={{
          title: historicSeason
            ? `${team?.fullName ?? 'Equipo'} · ${historicSeason}`
            : (team?.fullName ?? 'Equipo'),
        }}
      />

      {activeTab === 'roster' ? (
        <FlatList
          style={styles.container}
          data={rosterRows}
          keyExtractor={(p) => p.playerId}
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
              <TeamHeader team={team} />
              <TabSwitcher activeTab={activeTab} onChange={setActiveTab} />
              <Text style={styles.sectionTitle}>
                {historicSeason ? `Plantilla ${historicSeason}` : 'Plantilla'}
              </Text>
              {historicSeason && rosterRows.length === 0 && (
                <Text style={styles.emptyText}>
                  No hay plantilla registrada para esta temporada.
                </Text>
              )}
            </View>
          }
          renderItem={({ item }) => <RosterRow entry={item} />}
        />
      ) : (
        <FlatList
          style={styles.container}
          data={[]}
          renderItem={null}
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
              <TeamHeader team={team} />
              <TabSwitcher activeTab={activeTab} onChange={setActiveTab} />

              {gamesLoading && <LoadingState message="Cargando partidos..." compact />}

              {!gamesLoading && upcomingGames.length === 0 && pastGames.length === 0 && (
                <Text style={styles.emptyText}>No hay partidos cargados.</Text>
              )}

              {upcomingGames.length > 0 && (
                <View style={styles.gamesSection}>
                  <Text style={styles.sectionTitle}>Próximos partidos</Text>
                  {upcomingGames.map((g, i) => (
                    <GameCard key={g.id} game={g} index={i} showDate />
                  ))}
                </View>
              )}

              {pastGames.length > 0 && (
                <View style={styles.gamesSection}>
                  <Text style={styles.sectionTitle}>Partidos anteriores</Text>
                  {pastGames.map((g, i) => (
                    <GameCard key={g.id} game={g} index={i} showDate />
                  ))}
                </View>
              )}
            </View>
          }
        />
      )}
    </>
  );
}

function TeamHeader({ team }: { team: Team | null | undefined }) {
  if (!team) return null;

  return (
    <View style={styles.header}>
      <TeamLogo logoUrl={team.logoUrl} abbreviation={team.abbreviation} size={100} />
      <Text style={styles.teamCity}>{team.city}</Text>
      <Text style={styles.teamName}>{team.name}</Text>
      <View style={styles.headerMeta}>
        <View style={styles.conferenceBadge}>
          <Text style={styles.conferenceBadgeText}>
            {team.conference === 'East' ? 'Conferencia Este' : 'Conferencia Oeste'}
          </Text>
        </View>
        <FavoriteTeamButton teamId={team.id} size={28} />
      </View>
    </View>
  );
}

function TabSwitcher({ activeTab, onChange }: { activeTab: Tab; onChange: (t: Tab) => void }) {
  return (
    <View style={styles.tabSwitcher}>
      <Pressable
        onPress={() => onChange('roster')}
        style={[styles.tabButton, activeTab === 'roster' && styles.tabButtonActive]}
      >
        <Text style={[styles.tabButtonText, activeTab === 'roster' && styles.tabButtonTextActive]}>
          Plantilla
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onChange('games')}
        style={[styles.tabButton, activeTab === 'games' && styles.tabButtonActive]}
      >
        <Text style={[styles.tabButtonText, activeTab === 'games' && styles.tabButtonTextActive]}>
          Partidos
        </Text>
      </Pressable>
    </View>
  );
}

function RosterRow({ entry }: { entry: TeamSeasonPlayer }) {
  const hasStats = (entry.gamesPlayed ?? 0) > 0;

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/player/[id]',
          params: { id: entry.playerId },
        })
      }
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <PlayerAvatar
        photoUrl={entry.photoUrl}
        initials={`${entry.firstName[0] ?? ''}${entry.lastName[0] ?? ''}`}
        size={48}
      />
      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>
          {entry.firstName} {entry.lastName}
        </Text>
        <View style={styles.rowMeta}>
          {entry.jerseyNumber && <Text style={styles.rowMetaText}>#{entry.jerseyNumber}</Text>}
          {entry.jerseyNumber && entry.position && <Text style={styles.rowDivider}>·</Text>}
          {entry.position && (
            <Text style={styles.rowMetaText}>{getPositionName(entry.position)}</Text>
          )}
          {entry.wonChampionship && (
            <Ionicons name="trophy" size={12} color={colors.warning} />
          )}
        </View>
        {hasStats && (
          <View style={styles.statsInline}>
            <Text style={styles.statInlineValue}>{(entry.points ?? 0).toFixed(1)}</Text>
            <Text style={styles.statInlineLabel}>PTS</Text>
            <Text style={styles.statInlineValue}>{(entry.rebounds ?? 0).toFixed(1)}</Text>
            <Text style={styles.statInlineLabel}>REB</Text>
            <Text style={styles.statInlineValue}>{(entry.assists ?? 0).toFixed(1)}</Text>
            <Text style={styles.statInlineLabel}>AST</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: spacing.md },

  // Cabecera
  header: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  teamCity: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontFamily: fontFamily.medium,
    marginTop: spacing.md,
  },
  teamName: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontFamily: fontFamily.displayBold,
    marginTop: spacing.xs,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  conferenceBadge: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  conferenceBadgeText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
  },

  // Tab switcher
  tabSwitcher: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.full,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
  },
  tabButtonText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
  },
  tabButtonTextActive: {
    color: colors.text,
  },

  // Sección de partidos
  gamesSection: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    marginBottom: spacing.md,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },

  // Fila de jugador
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    color: colors.text,
    fontSize: fontSize.md,
    fontFamily: fontFamily.semibold,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  rowMetaText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
  },
  rowDivider: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  statsInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  statInlineValue: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.displaySemibold,
  },
  statInlineLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.medium,
    marginRight: spacing.xs,
  },
});
