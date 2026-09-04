import { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TeamLogo } from '@/components/ui/TeamLogo';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { FavoriteTeamButton } from '@/components/ui/FavoriteButton';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { GameCard } from '@/components/game/GameCard';
import { useTeam, useTeamSeasonRoster, useTeamSeasons } from '@/hooks/useTeamRoster';
import { useTeamGames } from '@/hooks/useTeamGames';
import { getPositionName } from '@/constants/positions';
import { colors, fontFamily, fontSize, radius, spacing } from '@/constants/theme';
import type { Game, Team, TeamSeason, TeamSeasonPlayer } from '@/types/domain';

type Tab = 'roster' | 'games';

export default function TeamDetailScreen() {
  const { id, season } = useLocalSearchParams<{ id: string; season?: string }>();
  const teamId = id ?? '';
  const [activeTab, setActiveTab] = useState<Tab>('roster');
  const [pickedSeason, setPickedSeason] = useState<string | null>(null);
  const [seasonPickerOpen, setSeasonPickerOpen] = useState(false);

  const { data: team, refetch: refetchTeam } = useTeam(teamId);
  const { data: teamSeasons } = useTeamSeasons(teamId);

  // Prioridad: lo que elijas aqui > la temporada con la que llegaste desde
  // la clasificacion > la mas reciente con plantilla registrada.
  const activeSeason =
    pickedSeason ?? (season && season.length > 0 ? season : teamSeasons?.[0]?.season);

  const {
    data: seasonRoster,
    isLoading: rosterLoading,
    error: rosterError,
    refetch: refetchRoster,
    isRefetching: refetchingRoster,
  } = useTeamSeasonRoster(teamId, activeSeason);
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
    refetchGames();
  };

  if (rosterLoading) {
    return <LoadingState message="Cargando plantilla..." />;
  }

  if (rosterError) {
    return <ErrorState title="No se puede cargar la plantilla" onRetry={refetchRoster} />;
  }

  const rosterRows: TeamSeasonPlayer[] = seasonRoster ?? [];

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
          title: team?.fullName ?? 'Equipo',
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
              <TeamHeader
                team={team}
                season={activeSeason}
                seasons={teamSeasons}
                onOpenPicker={() => setSeasonPickerOpen(true)}
              />
              <TabSwitcher activeTab={activeTab} onChange={setActiveTab} />
              <Text style={styles.sectionTitle}>Plantilla {activeSeason ?? ''}</Text>
              {rosterRows.length === 0 && (
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
              <TeamHeader
                team={team}
                season={activeSeason}
                seasons={teamSeasons}
                onOpenPicker={() => setSeasonPickerOpen(true)}
              />
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

      <SeasonPicker
        visible={seasonPickerOpen}
        seasons={teamSeasons ?? []}
        selected={activeSeason}
        onSelect={(s) => {
          setPickedSeason(s);
          setSeasonPickerOpen(false);
        }}
        onClose={() => setSeasonPickerOpen(false)}
      />
    </>
  );
}

function TeamHeader({
  team,
  season,
  seasons,
  onOpenPicker,
}: {
  team: Team | null | undefined;
  season?: string;
  seasons?: TeamSeason[];
  onOpenPicker: () => void;
}) {
  if (!team) return null;

  const actual = seasons?.find((s) => s.season === season);

  return (
    <View style={styles.header}>
      <TeamLogo logoUrl={team.logoUrl} abbreviation={team.abbreviation} size={100} />
      <Text style={styles.teamCity}>{team.city}</Text>
      <Text style={styles.teamName}>{team.name}</Text>

      {season && (
        <Pressable onPress={onOpenPicker} style={styles.seasonSelector}>
          <Text style={styles.seasonSelectorText}>{season}</Text>
          {actual?.wonChampionship && (
            <Ionicons name="trophy" size={14} color={colors.warning} />
          )}
          <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
        </Pressable>
      )}

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

function SeasonPicker({
  visible,
  seasons,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  seasons: TeamSeason[];
  selected?: string;
  onSelect: (season: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Temporada</Text>
          <FlatList
            data={seasons}
            keyExtractor={(s) => s.season}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onSelect(item.season)}
                style={[
                  styles.modalRow,
                  item.season === selected && styles.modalRowActive,
                ]}
              >
                <Text
                  style={[
                    styles.modalRowText,
                    item.season === selected && styles.modalRowTextActive,
                  ]}
                >
                  {item.season}
                </Text>
                {item.wonChampionship && (
                  <Ionicons name="trophy" size={16} color={colors.warning} />
                )}
                {item.season === selected && (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                )}
              </Pressable>
            )}
          />
        </Pressable>
      </Pressable>
    </Modal>
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
    // Poco aire arriba: el logo sube y cabe mas contenido sin scroll
    paddingTop: spacing.xs,
    paddingBottom: spacing.lg,
  },
  seasonSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    minHeight: 42,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  seasonSelectorText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontFamily: fontFamily.displaySemibold,
  },

  // Selector de temporada
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '70%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.borderStrong,
    marginBottom: spacing.md,
  },
  modalTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontFamily: fontFamily.displayBold,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalRowActive: {
    backgroundColor: colors.surfaceLight,
  },
  modalRowText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontFamily: fontFamily.displaySemibold,
  },
  modalRowTextActive: {
    color: colors.text,
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
