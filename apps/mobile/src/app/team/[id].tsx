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
import { useTeamSalary } from '@/hooks/useTeamSalary';
import { SalaryRulesModal } from '@/components/team/SalaryRulesModal';
import type { TeamSalary, TeamSalaryPlayer } from '@/types/domain';
import { Ionicons } from '@expo/vector-icons';
import { formatDateDMY } from '@/lib/format';
import type { TeamMovement } from '@/types/domain';
import {
  useTeam,
  useTeamPalmares,
  useTeamSeasonRoster,
  useTeamInjuries,
  useTeamSeasons,
} from '@/hooks/useTeamRoster';
import { useTeamGames } from '@/hooks/useTeamGames';
import { getPositionName } from '@/constants/positions';
import { tipoMovimiento } from '@/constants/movements';
import { esBaja, estadoLesion, tituloLesion } from '@/constants/injuries';
import { colors, fontFamily, fontSize, radius, spacing } from '@/constants/theme';
import type {
  Game,
  PlayerInjury,
  Team,
  TeamSeason,
  TeamSeasonPlayer,
  TeamTitle,
} from '@/types/domain';

type Tab = 'roster' | 'games' | 'movements' | 'salary';

export default function TeamDetailScreen() {
  const { id, season } = useLocalSearchParams<{ id: string; season?: string }>();
  const teamId = id ?? '';
  const [activeTab, setActiveTab] = useState<Tab>('roster');
  const { data: movimientos, isLoading: movimientosLoading } = useTeamMovements(teamId);
  const [pickedSeason, setPickedSeason] = useState<string | null>(null);
  const [seasonPickerOpen, setSeasonPickerOpen] = useState(false);
  const [reglasAbiertas, setReglasAbiertas] = useState(false);

  const { data: team, refetch: refetchTeam } = useTeam(teamId);
  const { data: teamSeasons } = useTeamSeasons(teamId);
  const { data: palmares } = useTeamPalmares(teamId);

  const activeSeason =
    pickedSeason ?? (season && season.length > 0 ? season : teamSeasons?.[0]?.season);

  const esTemporadaVigente = !!activeSeason && activeSeason === teamSeasons?.[0]?.season;
  const { data: lesionados } = useTeamInjuries(teamId, esTemporadaVigente);
  const { data: salarial, isLoading: salarialLoading } = useTeamSalary(teamId, activeSeason);

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
          renderItem={({ item }) => (
            <RosterRow
              entry={item}
              season={activeSeason}
              lesion={esTemporadaVigente ? lesionados?.[item.playerId] : undefined}
            />
          )}
        />
      ) : activeTab === 'games' ? (
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
      ) : null}

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

      {activeTab === 'salary' && (
        <FlatList
          style={styles.container}
          data={salarial?.players ?? []}
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

              {salarialLoading && <LoadingState message="Cargando salarios..." compact />}

              {!salarialLoading && !salarial && (
                <Text style={styles.emptyText}>
                  No hay contratos cargados para {activeSeason}. Solo tenemos los vigentes.
                </Text>
              )}

              {salarial && (
                <ResumenSalarial datos={salarial} onExplicar={() => setReglasAbiertas(true)} />
              )}
            </View>
          }
          renderItem={({ item }) => (
            <FilaSalario jugador={item} nomina={salarial?.payroll ?? 0} />
          )}
        />
      )}

      {salarial && (
        <SalaryRulesModal
          visible={reglasAbiertas}
          onClose={() => setReglasAbiertas(false)}
          datos={salarial}
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
      <Pressable
        onPress={() => onChange('salary')}
        style={[styles.tabButton, activeTab === 'salary' && styles.tabButtonActive]}
      >
        <Text
          style={[styles.tabButtonText, activeTab === 'salary' && styles.tabButtonTextActive]}
          numberOfLines={1}
        >
          Salarial
        </Text>
      </Pressable>
    </View>
  );
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

/** Millones con un decimal: "58,5 M". */
function millones(valor: number): string {
  return `${(valor / 1_000_000).toFixed(1).replace('.', ',')} M`;
}

/**
 * En que tramo esta la nomina.
 *
 * El orden importa y es acumulativo: quien pasa el segundo apron esta
 * tambien sobre el primero y en impuesto de lujo. Se devuelve el mas alto
 * que haya superado, que es el que condiciona lo que el equipo puede hacer.
 */
function tramoSalarial(datos: TeamSalary): { etiqueta: string; color: string } {
  const { payroll: n } = datos;
  if (datos.secondApron && n >= datos.secondApron) {
    return { etiqueta: 'Sobre el segundo apron', color: colors.danger };
  }
  if (datos.firstApron && n >= datos.firstApron) {
    return { etiqueta: 'Sobre el primer apron', color: colors.danger };
  }
  if (datos.luxuryTax && n >= datos.luxuryTax) {
    return { etiqueta: 'En impuesto de lujo', color: colors.primary };
  }
  if (datos.salaryCap && n >= datos.salaryCap) {
    return { etiqueta: 'Sobre el tope salarial', color: colors.primary };
  }
  if (datos.salaryFloor && n < datos.salaryFloor) {
    return { etiqueta: 'Bajo el suelo salarial', color: colors.danger };
  }
  return { etiqueta: 'Bajo el tope salarial', color: colors.success };
}

function ResumenSalarial({
  datos,
  onExplicar,
}: {
  datos: TeamSalary;
  onExplicar: () => void;
}) {
  const tramo = tramoSalarial(datos);

  // La barra se escala al segundo apron, que es el techo real del sistema
  const techo = datos.secondApron || datos.luxuryTax || datos.salaryCap || 1;
  const marcas = [
    { nombre: 'Tope', valor: datos.salaryCap },
    { nombre: 'Impuesto', valor: datos.luxuryTax },
    { nombre: 'Apron 1', valor: datos.firstApron },
    { nombre: 'Apron 2', valor: datos.secondApron },
  ].filter((m) => m.valor > 0);

  return (
    <View style={styles.salCard}>
      <Text style={styles.salNomina}>{millones(datos.payroll)}</Text>
      <Text style={styles.salSubtitulo}>Nómina {datos.season}</Text>

      {/* Estado y barra abren la explicacion de que implica cada limite */}
      <Pressable
        onPress={onExplicar}
        style={({ pressed }) => [styles.salPulsable, pressed && styles.salPulsablePressed]}
      >
        <View style={[styles.salEstado, { borderColor: tramo.color }]}>
          <Text style={[styles.salEstadoTexto, { color: tramo.color }]}>{tramo.etiqueta}</Text>
          <Ionicons name="information-circle-outline" size={14} color={tramo.color} />
        </View>

        <View style={styles.salBarra}>
        <View
          style={[
            styles.salBarraRelleno,
            {
              width: `${Math.min(100, (datos.payroll / techo) * 100)}%`,
              backgroundColor: tramo.color,
            },
          ]}
        />
          {marcas.map((m) => (
            <View
              key={m.nombre}
              style={[styles.salMarca, { left: `${Math.min(99, (m.valor / techo) * 100)}%` }]}
            />
          ))}
        </View>

        <Text style={styles.salPista}>Toca para ver qué implica cada límite</Text>
      </Pressable>

      {marcas.map((m) => (
        <View key={m.nombre} style={styles.salUmbral}>
          <Text style={styles.salUmbralNombre}>{m.nombre}</Text>
          <Text style={styles.salUmbralValor}>{millones(m.valor)}</Text>
          <Text
            style={[
              styles.salUmbralDif,
              { color: datos.payroll >= m.valor ? colors.danger : colors.success },
            ]}
          >
            {datos.payroll >= m.valor ? '+' : '−'}
            {millones(Math.abs(datos.payroll - m.valor))}
          </Text>
        </View>
      ))}
    </View>
  );
}

function FilaSalario({ jugador, nomina }: { jugador: TeamSalaryPlayer; nomina: number }) {
  const porcentaje = nomina > 0 ? (jugador.salary / nomina) * 100 : 0;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/player/[id]', params: { id: jugador.playerId } })}
      style={({ pressed }) => [styles.salFila, pressed && styles.salFilaPressed]}
    >
      <PlayerAvatar
        photoUrl={jugador.photoUrl}
        initials={iniciales(jugador.playerName)}
        size={34}
      />
      <View style={styles.salFilaInfo}>
        <Text style={styles.salFilaNombre} numberOfLines={1}>
          {jugador.playerName}
        </Text>
        <View style={styles.salFilaBarra}>
          <View style={[styles.salFilaBarraRelleno, { width: `${porcentaje}%` }]} />
        </View>
      </View>
      <View style={styles.salFilaDinero}>
        <Text style={styles.salFilaImporte}>{millones(jugador.salary)}</Text>
        <Text style={styles.salFilaPorcentaje}>{porcentaje.toFixed(0)}%</Text>
      </View>
    </Pressable>
  );
}

function RosterRow({
  entry,
  season,
  lesion,
}: {
  entry: TeamSeasonPlayer;
  season?: string;
  lesion?: PlayerInjury;
}) {
  const hasStats = (entry.gamesPlayed ?? 0) > 0;
  const baja = esBaja(lesion?.status);
  const estado = estadoLesion(lesion?.status);

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

        {lesion && (
          <View style={styles.rowLesion}>
            <Ionicons name="medkit" size={12} color={colors.danger} />
            <Text style={styles.rowLesionTexto} numberOfLines={1}>
              {tituloLesion(lesion.injuryType, lesion.side)}
            </Text>
          </View>
        )}

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

      {estado && (
        <View style={[styles.rowEstado, baja ? styles.rowEstadoBaja : styles.rowEstadoDuda]}>
          <Text style={[styles.rowEstadoTexto, !baja && styles.rowEstadoTextoDuda]}>
            {estado}
          </Text>
        </View>
      )}
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
  salCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  salNomina: {
    color: colors.text,
    fontSize: 34,
    fontFamily: fontFamily.displayBold,
    textAlign: 'center',
  },
  salSubtitulo: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semibold,
    textAlign: 'center',
    marginTop: 2,
  },
  salPulsable: { borderRadius: radius.md },
  salPulsablePressed: { opacity: 0.7 },
  salPista: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    textAlign: 'center',
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
  salEstado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  salEstadoTexto: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  salBarra: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceLight,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
    position: 'relative',
  },
  salBarraRelleno: { height: '100%', borderRadius: 4 },
  // Marca de cada umbral sobre la barra
  salMarca: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: '100%',
    backgroundColor: colors.background,
  },
  salUmbral: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
  },
  salUmbralNombre: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
  },
  salUmbralValor: {
    width: 78,
    textAlign: 'right',
    color: colors.text,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.displaySemibold,
  },
  salUmbralDif: {
    width: 82,
    textAlign: 'right',
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semibold,
  },

  salFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  salFilaPressed: { backgroundColor: colors.surface },
  salFilaInfo: { flex: 1 },
  salFilaNombre: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.displaySemibold,
  },
  salFilaBarra: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceLight,
    marginTop: 5,
    overflow: 'hidden',
  },
  salFilaBarraRelleno: { height: '100%', backgroundColor: colors.primary, borderRadius: 2 },
  salFilaDinero: { alignItems: 'flex-end', minWidth: 68 },
  salFilaImporte: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.displayBold,
  },
  salFilaPorcentaje: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
  },

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
  rowLesion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 3,
  },
  rowLesionTexto: {
    flexShrink: 1,
    color: colors.danger,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
  },
  rowEstado: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
    minWidth: 72,
    alignItems: 'center',
  },
  rowEstadoBaja: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  rowEstadoDuda: {
    backgroundColor: 'transparent',
    borderColor: colors.danger,
  },
  rowEstadoTexto: {
    color: colors.text,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semibold,
    textAlign: 'center',
  },
  rowEstadoTextoDuda: { color: colors.danger },
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
