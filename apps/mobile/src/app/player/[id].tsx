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
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { TeamLogo } from '@/components/ui/TeamLogo';
import { Trophy, awardLabel } from '@/components/ui/Trophy';
import { SeasonButton, SeasonPicker } from '@/components/ui/SeasonPicker';
import { usePlayerDraft } from '@/hooks/useDraft';
import { usePlayerInjuries, usePlayerMovements } from '@/hooks/useMovements';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  usePlayer,
  usePlayerAwards,
  usePlayerCareer,
  usePlayerCareerTotals,
  usePlayerGameLog,
  usePlayerSeasonStats,
} from '@/hooks/usePlayerDetail';
import { getPositionName } from '@/constants/positions';
import { formatDateDMY, formatMinutes } from '@/lib/format';
import { colors, fontFamily, fontSize, radius, spacing } from '@/constants/theme';
import type {
  PlayerAward,
  PlayerCareerEntry,
  PlayerGameLogEntry,
  PlayerInjury,
  PlayerMovement,
} from '@/types/domain';

type TabKey = 'games' | 'career' | 'movements' | 'injuries';

/** La lista es una sola FlatList y cambia de contenido segun la pestaña. */
type ListRow =
  | { kind: 'game'; game: PlayerGameLogEntry }
  | { kind: 'career'; career: PlayerCareerEntry }
  | { kind: 'movement'; movement: PlayerMovement }
  | { kind: 'injury'; injury: PlayerInjury };

/** Los nulos son reales: temporada con plantilla cargada pero sin jugar. */
function stat(value: number | null, decimals = 1): string {
  return value === null ? '—' : value.toFixed(decimals);
}

export default function PlayerDetailScreen() {
  const { id, season } = useLocalSearchParams<{ id: string; season?: string }>();
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
    data: career,
    refetch: refetchCareer,
    isRefetching: refetchingCareer,
  } = usePlayerCareer(playerId);

  const { data: awards, refetch: refetchAwards } = usePlayerAwards(playerId);
  const { data: carrera } = usePlayerCareerTotals(playerId);
  const { data: movimientos } = usePlayerMovements(playerId);
  const { data: lesiones } = usePlayerInjuries(playerId);

  // Basta una lesion vigente para marcar al jugador
  const lesionado = (lesiones ?? []).some((l) => l.isCurrent);
  const { data: draft } = usePlayerDraft(playerId);

  const [pickedSeason, setPickedSeason] = useState<string | null>(null);
  const [seasonPickerOpen, setSeasonPickerOpen] = useState(false);
  const [mediasAbiertas, setMediasAbiertas] = useState(false);

  // Las temporadas seleccionables son las de su carrera, sin repetir: un
  // traspasado tiene dos filas del mismo año, una por equipo.
  const careerSeasons = Array.from(new Set((career ?? []).map((c) => c.season)));
  const activeSeason =
    pickedSeason ?? (season && season.length > 0 ? season : careerSeasons[0]);

  // Va despues de la carrera porque necesita saber que temporada pedir
  const {
    data: gameLog,
    refetch: refetchGameLog,
    isRefetching: refetchingGameLog,
  } = usePlayerGameLog(playerId, !isRetired, activeSeason);

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

  let rows: ListRow[];
  if (tab === 'games') {
    rows = (gameLog ?? []).map((game) => ({ kind: 'game', game }) as ListRow);
  } else if (tab === 'career') {
    rows = (career ?? []).map((entry) => ({ kind: 'career', career: entry }) as ListRow);
  } else if (tab === 'movements') {
    rows = (movimientos ?? []).map((m) => ({ kind: 'movement', movement: m }) as ListRow);
  } else {
    rows = (lesiones ?? []).map((i) => ({ kind: 'injury', injury: i }) as ListRow);
  }

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
        keyExtractor={(item) => {
          if (item.kind === 'game') return item.game.gameId;
          if (item.kind === 'career') return `${item.career.season}-${item.career.teamId}`;
          if (item.kind === 'movement') return item.movement.id;
          return item.injury.id;
        }}
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
              <View style={styles.nameRow}>
                <Text style={styles.playerName}>
                  {player.firstName} {player.lastName}
                </Text>
                {/* Lesionado ahora mismo segun el parte diario */}
                {lesionado && (
                  <Ionicons name="medkit" size={22} color={colors.danger} />
                )}
              </View>
              <View style={styles.headerMeta}>
                {player.jerseyNumber && (
                  <View style={styles.metaBadge}>
                    <Text style={styles.metaBadgeText}>#{player.jerseyNumber}</Text>
                  </View>
                )}
                <View style={styles.metaBadge}>
                  <Text style={styles.metaBadgeText}>{getPositionName(player.position)}</Text>
                </View>
                {draft && (
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: '/draft',
                        params: { year: String(draft.draftYear) },
                      })
                    }
                    style={({ pressed }) => [
                      styles.metaBadge,
                      styles.metaBadgeDraft,
                      pressed && styles.metaBadgePressed,
                    ]}
                  >
                    <Text style={styles.metaBadgeText}>
                      {draft.overallPick && draft.overallPick > 0
                        ? `${draft.overallPick}º Draft ${draft.draftYear}`
                        : `Draft ${draft.draftYear}`}
                    </Text>
                  </Pressable>
                )}
                {isRetired && (
                  <View style={[styles.metaBadge, styles.metaBadgeRetired]}>
                    <Text style={styles.metaBadgeText}>Retirado</Text>
                  </View>
                )}
              </View>

              {careerSeasons.length > 0 && (
                <View style={styles.seasonRow}>
                  <SeasonButton
                    season={activeSeason}
                    onPress={() => setSeasonPickerOpen(true)}
                  />
                </View>
              )}
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

            {/* Medias de toda la carrera. Las de cada temporada estan en
                la pestaña Carrera, que las desglosa una por una.

                Plegado deja a la vista lo que se mira siempre (puntos,
                rebotes, asistencias) y guarda los minutos y los
                porcentajes de tiro para quien los busque. */}
            {carrera && carrera.gamesPlayed > 0 && (
              <Animated.View
                style={styles.careerCard}
                layout={LinearTransition.duration(250)}
              >
                <Pressable
                  onPress={() => setMediasAbiertas(!mediasAbiertas)}
                  style={({ pressed }) => [styles.careerCardHeader, pressed && styles.careerCardPressed]}
                >
                  <Text style={styles.seasonTitle}>
                    Medias de su carrera ({carrera.seasons}{' '}
                    {carrera.seasons === 1 ? 'temporada' : 'temporadas'}
                    {', '}
                    {carrera.gamesPlayed} partidos)
                  </Text>
                  <Animated.View
                    style={{ transform: [{ rotate: mediasAbiertas ? '180deg' : '0deg' }] }}
                  >
                    <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                  </Animated.View>
                </Pressable>

                <View style={styles.seasonStatsRow}>
                  <SeasonStat label="PTS" value={carrera.points} />
                  <SeasonStat label="REB" value={carrera.rebounds} />
                  <SeasonStat label="AST" value={carrera.assists} />
                  <SeasonStat label="ROB" value={carrera.steals} />
                  <SeasonStat label="TAP" value={carrera.blocks} />
                </View>

                {mediasAbiertas && (
                  <Animated.View
                    entering={FadeIn.duration(200)}
                    exiting={FadeOut.duration(150)}
                    style={styles.careerSecondRow}
                  >
                    <SeasonStat label="MIN" value={carrera.minutes} />
                    <SeasonStat label="TC%" value={carrera.fieldGoalPct * 100} />
                    <SeasonStat label="T3%" value={carrera.threePointPct * 100} />
                    <SeasonStat label="TL%" value={carrera.freeThrowPct * 100} />
                    <SeasonStat label="PÉR" value={carrera.turnovers} />
                  </Animated.View>
                )}
              </Animated.View>
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
                <DetailTab
                  label="Traspasos"
                  active={tab === 'movements'}
                  onPress={() => setSelectedTab('movements')}
                />
                <DetailTab
                  label="Lesiones"
                  active={tab === 'injuries'}
                  onPress={() => setSelectedTab('injuries')}
                />
              </View>
            )}

            {tab === 'games' ? (
              (!gameLog || gameLog.length === 0) && (
                <EmptyState
                  icon="calendar-outline"
                  title="Sin partidos cargados"
                  message={`No hay box scores de ${activeSeason ?? 'esta temporada'} en la base de datos. Su carrera y sus medias sí están disponibles.`}
                  compact
                />
              )
            ) : tab === 'career' ? (
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
            ) : tab === 'movements' ? (
              (!movimientos || movimientos.length === 0) && (
                <EmptyState
                  icon="swap-horizontal-outline"
                  title="Sin movimientos"
                  message="El registro de traspasos y fichajes empieza en julio de 2015."
                  compact
                />
              )
            ) : (
              (!lesiones || lesiones.length === 0) && (
                <EmptyState
                  icon="medkit-outline"
                  title="Sin lesiones"
                  message="No consta ninguna lesión activa. Solo se registran las vigentes en el parte diario."
                  compact
                />
              )
            )}
          </View>
        }
        renderItem={({ item }) => {
          if (item.kind === 'game') return <GameLogRow entry={item.game} />;
          if (item.kind === 'career') return <CareerRow entry={item.career} />;
          if (item.kind === 'movement') return <MovementRow entry={item.movement} />;
          return <InjuryRow entry={item.injury} />;
        }}
      />

      <SeasonPicker
        visible={seasonPickerOpen}
        seasons={careerSeasons.map((s) => ({ season: s }))}
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
                  <Trophy
                    award={primero.award}
                    season={ultima}
                    seasons={temporadas}
                    size={52}
                  />
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

/** Etiqueta en castellano del tipo de movimiento. */
function tipoMovimiento(tipo: string): string {
  if (tipo === 'Trade') return 'Traspaso';
  if (tipo === 'Signing') return 'Agencia libre';
  if (tipo === 'Waive') return 'Corte';
  if (tipo === 'AwardOnWaivers') return 'Reclamado';
  if (tipo === 'ContractConverted') return 'Contrato convertido';
  return tipo;
}

function MovementRow({ entry }: { entry: PlayerMovement }) {
  // Solo los traspasos tienen operacion detras que abrir
  const abrible = !!entry.dealId && entry.type === 'Trade';

  return (
    <Pressable
      disabled={!abrible}
      onPress={() =>
        entry.dealId && router.push({ pathname: '/deal/[id]', params: { id: entry.dealId } })
      }
      style={({ pressed }) => [styles.movementRow, pressed && abrible && styles.movementRowPressed]}
    >
      <View style={styles.movementTop}>
        <Text style={styles.movementDate}>{formatDateDMY(entry.date)}</Text>
        <View
          style={[
            styles.movementBadge,
            entry.type === 'Trade' && styles.movementBadgeTrade,
          ]}
        >
          <Text style={styles.movementBadgeText}>{tipoMovimiento(entry.type)}</Text>
        </View>
      </View>

      <View style={styles.movementTeams}>
        {entry.fromTeam ? (
          <View style={styles.movementTeam}>
            <TeamLogo
              logoUrl={entry.fromTeam.logoUrl}
              abbreviation={entry.fromTeam.abbreviation}
              size={24}
            />
            <Text style={styles.movementTeamText}>{entry.fromTeam.abbreviation}</Text>
          </View>
        ) : (
          // Un fichaje no tiene equipo de origen
          <Text style={styles.movementSinOrigen}>—</Text>
        )}

        <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />

        {entry.toTeam && (
          <View style={styles.movementTeam}>
            <TeamLogo
              logoUrl={entry.toTeam.logoUrl}
              abbreviation={entry.toTeam.abbreviation}
              size={24}
            />
            <Text style={styles.movementTeamText}>{entry.toTeam.abbreviation}</Text>
          </View>
        )}

        {abrible && (
          <Ionicons
            name="chevron-forward"
            size={16}
            color={colors.textMuted}
            style={styles.movementChevron}
          />
        )}
      </View>
    </Pressable>
  );
}

function InjuryRow({ entry }: { entry: PlayerInjury }) {
  const partes = [entry.injuryType, entry.side].filter(Boolean).join(' · ');

  return (
    <View style={styles.injuryRow}>
      <View style={styles.injuryTop}>
        <Ionicons name="medkit" size={16} color={colors.danger} />
        <Text style={styles.injuryTitle}>{partes || 'Lesión'}</Text>
        {entry.status && (
          <View style={[styles.injuryBadge, entry.isCurrent && styles.injuryBadgeCurrent]}>
            <Text style={styles.injuryBadgeText}>{entry.status}</Text>
          </View>
        )}
      </View>

      <View style={styles.injuryDates}>
        {entry.reportedAt && (
          <Text style={styles.injuryDate}>Desde {formatDateDMY(entry.reportedAt)}</Text>
        )}
        {entry.returnDate && (
          <Text style={styles.injuryDate}>Vuelta prevista {formatDateDMY(entry.returnDate)}</Text>
        )}
      </View>

      {entry.longComment && <Text style={styles.injuryComment}>{entry.longComment}</Text>}
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
      <Text
        style={[styles.detailTabText, active && styles.detailTabTextActive]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
      >
        {label}
      </Text>
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
          {/* El tiempo va sin etiqueta: se reconoce por el formato de reloj */}
          <StatPill value={formatMinutes(entry.minutes)} />
          <StatPill label="PTS" value={String(entry.points)} highlight />
          <StatPill label="REB" value={String(entry.rebounds)} />
          <StatPill label="AST" value={String(entry.assists)} />
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
  /** Sin etiqueta el valor queda solo, alineado con los demás. */
  label?: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.statPill}>
      <Text style={[styles.statPillValue, highlight && styles.statPillHighlight]}>{value}</Text>
      {label && <Text style={styles.statPillLabel}>{label}</Text>}
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  movementRow: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  movementRowPressed: { opacity: 0.7 },
  movementTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  movementDate: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semibold,
  },
  movementBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // El traspaso se distingue porque es el unico que abre detalle
  movementBadgeTrade: { borderColor: colors.primary },
  movementBadgeText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semibold,
  },
  movementTeams: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  movementTeam: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  movementTeamText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.displaySemibold,
  },
  movementSinOrigen: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    width: 32,
    textAlign: 'center',
  },
  movementChevron: { marginLeft: 'auto' },

  injuryRow: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  injuryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  injuryTitle: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.md,
    fontFamily: fontFamily.displaySemibold,
  },
  injuryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  injuryBadgeCurrent: { borderColor: colors.danger },
  injuryBadgeText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semibold,
  },
  injuryDates: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  injuryDate: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
  },
  injuryComment: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    lineHeight: 19,
    marginTop: spacing.sm,
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
  careerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    // Separada del Palmares: son dos bloques distintos
    marginTop: spacing.lg,
  },
  careerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  careerCardPressed: {
    opacity: 0.7,
  },
  careerSecondRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
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
  // Se distingue del resto porque este si es pulsable
  metaBadgeDraft: {
    borderColor: colors.primary,
  },
  metaBadgePressed: {
    backgroundColor: colors.surfaceLight,
  },

  seasonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.md,
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
    gap: spacing.xs,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  detailTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: 2,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
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
