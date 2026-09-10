import { useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { TeamLogo } from '@/components/ui/TeamLogo';
import { Trophy } from '@/components/ui/Trophy';
import { SeasonButton, SeasonPicker } from '@/components/ui/SeasonPicker';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { FavoriteTeamButton } from '@/components/ui/FavoriteButton';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { CompactGameRow } from '@/components/game/CompactGameRow';
import { useTeamMovements } from '@/hooks/useMovements';
import { Ionicons } from '@expo/vector-icons';
import { formatDateDMY } from '@/lib/format';
import type { TeamMovement } from '@/types/domain';
import {
  useTeam,
  useTeamPalmares,
  useTeamSeasonRoster,
  useTeamSeasons,
} from '@/hooks/useTeamRoster';
import { useTeamGames } from '@/hooks/useTeamGames';
import { getPositionName } from '@/constants/positions';
import { colors, fontFamily, fontSize, radius, spacing } from '@/constants/theme';
import type { Game, Team, TeamSeason, TeamSeasonPlayer, TeamTitle } from '@/types/domain';

type Tab = 'roster' | 'games' | 'movements';

export default function TeamDetailScreen() {
  const { id, season } = useLocalSearchParams<{ id: string; season?: string }>();
  const teamId = id ?? '';
  const [activeTab, setActiveTab] = useState<Tab>('roster');
  const { data: movimientos, isLoading: movimientosLoading } = useTeamMovements(teamId);
  const [pickedSeason, setPickedSeason] = useState<string | null>(null);
  const [seasonPickerOpen, setSeasonPickerOpen] = useState(false);

  const { data: team, refetch: refetchTeam } = useTeam(teamId);
  const { data: teamSeasons } = useTeamSeasons(teamId);
  const { data: palmares } = useTeamPalmares(teamId);

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
  } = useTeamGames(teamId, activeSeason);

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
              <TeamPalmares titles={palmares} />
              <TabSwitcher activeTab={activeTab} onChange={setActiveTab} />
              <Text style={styles.sectionTitle}>Plantilla {activeSeason ?? ''}</Text>
              {rosterRows.length === 0 && (
                <Text style={styles.emptyText}>
                  No hay plantilla registrada para esta temporada.
                </Text>
              )}
            </View>
          }
          renderItem={({ item }) => <RosterRow entry={item} season={activeSeason} />}
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
              <TeamPalmares titles={palmares} />
              <TabSwitcher activeTab={activeTab} onChange={setActiveTab} />

              {gamesLoading && <LoadingState message="Cargando partidos..." compact />}

              {!gamesLoading && upcomingGames.length === 0 && pastGames.length === 0 && (
                <Text style={styles.emptyText}>No hay partidos cargados.</Text>
              )}

              {upcomingGames.length > 0 && (
                <View style={styles.gamesSection}>
                  <Text style={styles.sectionTitle}>Próximos partidos</Text>
                  {upcomingGames.map((g) => (
                    <CompactGameRow key={g.id} game={g} />
                  ))}
                </View>
              )}

              {pastGames.length > 0 && (
                <View style={styles.gamesSection}>
                  <Text style={styles.sectionTitle}>Partidos anteriores</Text>
                  {pastGames.map((g) => (
                    <CompactGameRow key={g.id} game={g} />
                  ))}
                </View>
              )}
            </View>
          }
        />
      )}

      {activeTab === 'movements' && (
        <FlatList
          style={styles.container}
          data={movimientos ?? []}
          keyExtractor={(m) => m.id}
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
              <TeamPalmares titles={palmares} />
              <TabSwitcher activeTab={activeTab} onChange={setActiveTab} />

              {movimientosLoading && <LoadingState message="Cargando movimientos..." compact />}

              {!movimientosLoading && (movimientos ?? []).length === 0 && (
                <Text style={styles.emptyText}>
                  No hay movimientos registrados. El histórico empieza en julio de 2015.
                </Text>
              )}
            </View>
          }
          renderItem={({ item }) => <TeamMovementRow entry={item} />}
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

      <SeasonButton
        season={season}
        onPress={onOpenPicker}
        wonChampionship={actual?.wonChampionship}
      />

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

function TeamPalmares({ titles }: { titles?: TeamTitle[] }) {
  if (!titles || titles.length === 0) return null;

  const porCompeticion = new Map<TeamTitle['competition'], TeamTitle[]>();
  for (const t of titles) {
    if (!porCompeticion.has(t.competition)) porCompeticion.set(t.competition, []);
    porCompeticion.get(t.competition)!.push(t);
  }

  const orden: TeamTitle['competition'][] = ['nba', 'nba_cup'];
  const grupos = orden
    .map((comp) => [comp, porCompeticion.get(comp)] as const)
    .filter((g): g is readonly [TeamTitle['competition'], TeamTitle[]] => !!g[1]);

  return (
    <View style={styles.palmaresCard}>
      <Text style={styles.palmaresTitle}>Palmarés</Text>
      <View style={styles.palmaresRow}>
        {grupos.map(([competition, lista]) => {
          const anios = lista.map((t) => t.year).sort((a, b) => a - b);
          return (
            <View key={competition} style={styles.palmaresGroup}>
              <View style={styles.palmaresHead}>
                <Trophy
                  award={competition === 'nba' ? 'champion' : 'nba_cup'}
                  season={lista[0]?.season ?? ''}
                  seasons={anios.map(String)}
                  size={44}
                />
                <Text style={styles.palmaresCount}>x{lista.length}</Text>
              </View>
              <Text style={styles.palmaresYears}>{anios.join(', ')}</Text>
            </View>
          );
        })}
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
      <Pressable
        onPress={() => onChange('movements')}
        style={[styles.tabButton, activeTab === 'movements' && styles.tabButtonActive]}
      >
        <Text
          style={[styles.tabButtonText, activeTab === 'movements' && styles.tabButtonTextActive]}
          numberOfLines={1}
        >
          Traspasos
        </Text>
      </Pressable>
    </View>
  );
}

function tipoMovimiento(tipo: string): string {
  if (tipo === 'Trade') return 'Traspaso';
  if (tipo === 'Signing') return 'Agencia libre';
  if (tipo === 'Waive') return 'Corte';
  if (tipo === 'AwardOnWaivers') return 'Reclamado';
  if (tipo === 'ContractConverted') return 'Contrato convertido';
  return tipo;
}

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase();
}

function TeamMovementRow({ entry }: { entry: TeamMovement }) {
  const entra = entry.direction === 'in';
  const abrible = !!entry.dealId && entry.type === 'Trade';
  const esDraft = !entry.playerId;

  return (
    <Pressable
      disabled={!abrible}
      onPress={() =>
        entry.dealId && router.push({ pathname: '/deal/[id]', params: { id: entry.dealId } })
      }
      style={({ pressed }) => [styles.movRow, pressed && abrible && styles.movRowPressed]}
    >
      <View style={[styles.movFlecha, entra ? styles.movEntra : styles.movSale]}>
        <Ionicons
          name={entra ? 'arrow-down' : 'arrow-up'}
          size={14}
          color={entra ? colors.success : colors.danger}
        />
      </View>

      {esDraft ? (
        <View style={styles.movDraft}>
          <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} />
        </View>
      ) : (
        <PlayerAvatar
          photoUrl={entry.photoUrl}
          initials={iniciales(entry.playerName ?? '?')}
          size={32}
        />
      )}

      <View style={styles.movInfo}>
        <Text style={styles.movNombre} numberOfLines={1}>
          {esDraft ? 'Elección de draft' : entry.playerName}
        </Text>
        <View style={styles.movMeta}>
          <Text style={styles.movMetaTexto}>
            {formatDateDMY(entry.date)} · {tipoMovimiento(entry.type)}
          </Text>
        </View>
      </View>

      {entry.otherTeam && (
        <View style={styles.movOtro}>
          <Text style={styles.movOtroTexto}>{entra ? 'de' : 'a'}</Text>
          <TeamLogo
            logoUrl={entry.otherTeam.logoUrl}
            abbreviation={entry.otherTeam.abbreviation}
            size={22}
          />
        </View>
      )}

      {abrible && <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />}
    </Pressable>
  );
}

function RosterRow({ entry, season }: { entry: TeamSeasonPlayer; season?: string }) {
  const hasStats = (entry.gamesPlayed ?? 0) > 0;

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/player/[id]',
          params: { id: entry.playerId, season: season ?? '' },
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
          {entry.wonChampionship && <Trophy award="champion" season="" size={16} />}
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
    paddingTop: spacing.xs,
    paddingBottom: spacing.lg,
  },

  palmaresCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  palmaresTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontFamily: fontFamily.displayBold,
    marginBottom: spacing.md,
  },
  palmaresRow: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  palmaresGroup: {
    flex: 1,
    alignItems: 'center',
  },
  palmaresHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  palmaresCount: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontFamily: fontFamily.displayBold,
  },
  palmaresYears: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.medium,
    textAlign: 'center',
    marginTop: spacing.xs,
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
  movRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  movRowPressed: { backgroundColor: colors.surface },
  movFlecha: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  movEntra: { backgroundColor: 'rgba(90, 180, 120, 0.15)' },
  movSale: { backgroundColor: 'rgba(209, 100, 100, 0.15)' },
  movDraft: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceLight,
  },
  movInfo: { flex: 1 },
  movNombre: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.displaySemibold,
  },
  movMeta: { flexDirection: 'row', marginTop: 1 },
  movMetaTexto: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
  },
  movOtro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  movOtroTexto: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
  },

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
