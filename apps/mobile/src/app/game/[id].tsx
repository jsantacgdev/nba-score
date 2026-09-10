import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { useGameDetail } from '@/hooks/useGameDetail';
import { formatDateDMY, formatMinutes } from '@/lib/format';
import { colors, fontSize, fontFamily, radius, spacing } from '@/constants/theme';
import type { GameBoxScoreEntry, GameLineupPlayer } from '@/types/domain';
import { LoadingState } from '@/components/ui/LoadingState';
import { GameDetailSkeleton } from '@/components/ui/Skeleton';
import { CourtLineup } from '@/components/game/CourtLineup';
import { useLiveLineup, useStartingLineups } from '@/hooks/useLive';
import type { JugadorEnPista } from '@/components/game/CourtLineup';
import { useState } from 'react';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';

export default function GameDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, error, refetch } = useGameDetail(id);
  const [vista, setVista] = useState<'stats' | 'court'>('stats');
  const enJuego = data?.game.status === 'live';
  const { data: enPista } = useLiveLineup(id, enJuego);
  const { data: quintetos } = useStartingLineups(enJuego ? undefined : id);

  const [selectedTeam, setSelectedTeam] = useState<'home' | 'away'>('home');

  if (isLoading) {
    return (
      <>
        {/* Sin titulo explicito, expo-router escribe el nombre de la ruta
            y se veia "game/[id]" mientras cargaba */}
        <Stack.Screen options={{ title: '' }} />
        <GameDetailSkeleton />
      </>
    );
  }
  if (error) {
    return <ErrorState title="No se puede cargar el partido" onRetry={refetch} />;
  }

  if (!data) {
    return (
      <ErrorState
        icon="basketball-outline"
        title="Partido no encontrado"
        message="Es posible que este partido no esté en nuestra base de datos."
      />
    );
  }

  const { game, homeRoster, awayRoster, mvp } = data;
  const homeLineup = data.homeLineup ?? [];
  const awayLineup = data.awayLineup ?? [];
  const jugado = game.status === 'final' || game.status === 'live';
  const homeWinning = jugado && game.scoreHome > game.scoreAway;
  const awayWinning = jugado && game.scoreAway > game.scoreHome;

  const title = `${game.homeTeam.name} vs ${game.awayTeam.name}`;

  function suplentesDe(lado: 'home' | 'away'): GameBoxScoreEntry[] {
    const teamId = lado === 'home' ? game.homeTeam.id : game.awayTeam.id;
    const plantel = lado === 'home' ? homeRoster : awayRoster;
    const titulares = new Set(
      ((quintetos ?? []).find((q) => q.teamId === teamId)?.players ?? []).map((p) => p.playerId),
    );
    return plantel.filter((p) => !titulares.has(p.playerId));
  }

  function quintetoDe(lado: 'home' | 'away'): JugadorEnPista[] {
    const teamId = lado === 'home' ? game.homeTeam.id : game.awayTeam.id;

    if (enJuego) {
      const equipo = lado === 'home' ? enPista?.home : enPista?.away;
      return (equipo?.players ?? [])
        .filter((p) => p.onCourt)
        .map((p) => ({
          playerId: p.playerId,
          name: p.name,
          jerseyNumber: p.jerseyNumber,
          points: p.points,
        }));
    }

    const guardado = (quintetos ?? []).find((q) => q.teamId === teamId);
    return (guardado?.players ?? []).map((p) => ({
      playerId: p.playerId,
      name: p.name,
      jerseyNumber: p.jerseyNumber,
      photoUrl: p.photoUrl,
      points: p.points,
    }));
  }

  return (
    <>
      <Stack.Screen options={{ title }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Marcador */}
        <View style={styles.scoreboard}>
          <Text style={styles.gameDate}>{formatDateDMY(game.startsAt)}</Text>
          <Text style={styles.gameStatus}>
            {game.status === 'final' ? 'FINAL' : game.status === 'live' ? 'EN VIVO' : 'PROGRAMADO'}
          </Text>

          <View style={styles.scoreboardRow}>
            <TeamBlock
              teamId={game.homeTeam.id}
              abbreviation={game.homeTeam.abbreviation}
              logoUrl={game.homeTeam.logoUrl}
            />

            <View style={styles.scoresCenter}>
              {/* Sin jugar no hay marcador: un 0-0 se lee como empate */}
              <Text style={[styles.bigScore, homeWinning && styles.bigScoreWinning]}>
                {jugado ? game.scoreHome : '-'}
              </Text>
              {/* El separador sobra sin marcador: quedarian tres guiones */}
              {jugado && <Text style={styles.scoreSeparator}>-</Text>}
              <Text style={[styles.bigScore, awayWinning && styles.bigScoreWinning]}>
                {jugado ? game.scoreAway : '-'}
              </Text>
            </View>

            <TeamBlock
              teamId={game.awayTeam.id}
              abbreviation={game.awayTeam.abbreviation}
              logoUrl={game.awayTeam.logoUrl}
            />
          </View>
        </View>

        {/* MVP */}
        {mvp && <MVPCard mvp={mvp} />}

        {/* Estadisticas o pista */}
        <View style={styles.vistaRow}>
          <VistaTab
            label="Estadísticas"
            active={vista === 'stats'}
            onPress={() => setVista('stats')}
          />
          <VistaTab
            label="Alineación"
            active={vista === 'court'}
            onPress={() => setVista('court')}
          />
        </View>

        {/* Toggle entre equipos */}
        <View style={styles.teamToggleRow}>
          <TeamToggle
            label={game.homeTeam.abbreviation}
            active={selectedTeam === 'home'}
            onPress={() => setSelectedTeam('home')}
          />
          <TeamToggle
            label={game.awayTeam.abbreviation}
            active={selectedTeam === 'away'}
            onPress={() => setSelectedTeam('away')}
          />
        </View>

        {vista === 'court' ? (
          <>
            <CourtLineup
              players={quintetoDe(selectedTeam)}
              vacioTexto={
                enJuego
                  ? 'Todavía no hay nadie en pista.'
                  : 'No consta el quinteto inicial de este partido.'
              }
            />
            <Banquillo jugadores={suplentesDe(selectedTeam)} />
          </>
        ) : /* Jugado: box score. Sin jugar: la plantilla convocada. */
        selectedTeam === 'home' ? (
          jugado ? (
            <TeamBoxScore
              title={game.homeTeam.fullName}
              logoUrl={game.homeTeam.logoUrl}
              roster={homeRoster}
            />
          ) : (
            <TeamLineup
              title={game.homeTeam.fullName}
              logoUrl={game.homeTeam.logoUrl}
              lineup={homeLineup}
            />
          )
        ) : jugado ? (
          <TeamBoxScore
            title={game.awayTeam.fullName}
            logoUrl={game.awayTeam.logoUrl}
            roster={awayRoster}
          />
        ) : (
          <TeamLineup
            title={game.awayTeam.fullName}
            logoUrl={game.awayTeam.logoUrl}
            lineup={awayLineup}
          />
        )}
      </ScrollView>
    </>
  );
}

function TeamBlock({
  teamId,
  abbreviation,
  logoUrl,
}: {
  teamId: string;
  abbreviation: string;
  logoUrl?: string;
}) {
  return (
    <View style={styles.teamBlock}>
      <Pressable
        onPress={() => router.push({ pathname: '/team/[id]', params: { id: teamId } })}
        style={({ pressed }) => [styles.teamCard, pressed && styles.teamCardPressed]}
      >
        {logoUrl && (
          <Image source={{ uri: logoUrl }} style={styles.scoreLogo} contentFit="contain" />
        )}
      </Pressable>
      <Text style={styles.teamAbbr}>{abbreviation}</Text>
    </View>
  );
}

function TeamLineup({
  title,
  logoUrl,
  lineup,
}: {
  title: string;
  logoUrl?: string;
  lineup?: GameLineupPlayer[];
}) {
  if (!lineup || lineup.length === 0) {
    return (
      <EmptyState
        icon="people-outline"
        title="Sin plantilla"
        message="Todavia no hay jugadores registrados para este equipo."
        compact
      />
    );
  }

  return (
    <View style={styles.boxScoreSection}>
      <View style={styles.boxScoreHeader}>
        {logoUrl && (
          <Image source={{ uri: logoUrl }} style={styles.boxScoreLogo} contentFit="contain" />
        )}
        <Text style={styles.boxScoreTitle}>{title}</Text>
        <Text style={styles.lineupCount}>{lineup.length}</Text>
      </View>

      {lineup.map((p) => (
        <Pressable
          key={p.playerId}
          onPress={() => router.push({ pathname: '/player/[id]', params: { id: p.playerId } })}
          style={({ pressed }) => [styles.playerRow, pressed && styles.playerRowPressed]}
        >
          <Text style={styles.lineupJersey}>{p.jerseyNumber ?? '-'}</Text>
          <View style={[styles.colPlayer, styles.playerCol]}>
            <PlayerAvatar
              photoUrl={p.photoUrl}
              initials={`${p.firstName[0] ?? ''}${p.lastName[0] ?? ''}`}
              size={32}
            />
            <Text style={styles.playerName} numberOfLines={1}>
              {p.firstName[0]}. {p.lastName}
            </Text>
          </View>
          {p.position && <Text style={styles.lineupPosition}>{p.position}</Text>}
        </Pressable>
      ))}
    </View>
  );
}

function MVPCard({ mvp }: { mvp: GameBoxScoreEntry }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/player/[id]', params: { id: mvp.playerId } })}
      style={({ pressed }) => [styles.mvpCard, pressed && styles.mvpCardPressed]}
    >
      <View style={styles.mvpBadge}>
        <Ionicons name="star" size={14} color={colors.background} />
        <Text style={styles.mvpBadgeText}>MVP DEL PARTIDO</Text>
      </View>
      <View style={styles.mvpContent}>
        <PlayerAvatar
          photoUrl={mvp.photoUrl}
          initials={`${mvp.firstName[0] ?? ''}${mvp.lastName[0] ?? ''}`}
          size={72}
        />
        <View style={styles.mvpInfo}>
          <Text style={styles.mvpName}>
            {mvp.firstName} {mvp.lastName}
          </Text>
          <View style={styles.mvpStatsRow}>
            <Text style={styles.mvpStat}>
              <Text style={styles.mvpStatValue}>{mvp.points}</Text> pts
            </Text>
            <Text style={styles.mvpStatDot}>·</Text>
            <Text style={styles.mvpStat}>
              <Text style={styles.mvpStatValue}>{mvp.rebounds}</Text> reb
            </Text>
            <Text style={styles.mvpStatDot}>·</Text>
            <Text style={styles.mvpStat}>
              <Text style={styles.mvpStatValue}>{mvp.assists}</Text> ast
            </Text>
          </View>
          <Text style={styles.mvpScore}>Game Score: {mvp.gameScore.toFixed(1)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function TeamBoxScore({
  title,
  logoUrl,
  roster,
}: {
  title: string;
  logoUrl?: string;
  roster: GameBoxScoreEntry[];
}) {
  if (roster.length === 0) return null;

  return (
    <View style={styles.boxScoreSection}>
      <View style={styles.boxScoreHeader}>
        {logoUrl && (
          <Image source={{ uri: logoUrl }} style={styles.boxScoreLogo} contentFit="contain" />
        )}
        <Text style={styles.boxScoreTitle}>{title}</Text>
      </View>

      {/* Cabecera de columnas */}
      <View style={styles.statsHeader}>
        <Text style={[styles.statsHeaderText, styles.colPlayer]}>Jugador</Text>
        <View style={styles.colStat} />
        <Text style={[styles.statsHeaderText, styles.colStat]}>PTS</Text>
        <Text style={[styles.statsHeaderText, styles.colStat]}>REB</Text>
        <Text style={[styles.statsHeaderText, styles.colStat]}>AST</Text>
      </View>

      {roster.map((p) => (
        <Pressable
          key={p.playerId}
          onPress={() => router.push({ pathname: '/player/[id]', params: { id: p.playerId } })}
          style={({ pressed }) => [
            styles.playerRow,
            pressed && styles.playerRowPressed,
            p.minutes === 0 && styles.playerRowDnp,
          ]}
        >
          <View style={[styles.colPlayer, styles.playerCol]}>
            <PlayerAvatar
              photoUrl={p.photoUrl}
              initials={`${p.firstName[0] ?? ''}${p.lastName[0] ?? ''}`}
              size={32}
            />
            <Text style={styles.playerName} numberOfLines={1}>
              {p.firstName[0]}. {p.lastName}
            </Text>
          </View>
          <Text style={[styles.statValue, styles.colStat]}>
            {p.minutes > 0 ? formatMinutes(p.minutes) : '-'}
          </Text>
          <Text style={[styles.statValue, styles.colStat]}>{p.points}</Text>
          <Text style={[styles.statValue, styles.colStat]}>{p.rebounds}</Text>
          <Text style={[styles.statValue, styles.colStat]}>{p.assists}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Banquillo({ jugadores }: { jugadores: GameBoxScoreEntry[] }) {
  if (jugadores.length === 0) return null;

  return (
    <View style={styles.banquillo}>
      <Text style={styles.banquilloTitulo}>Suplentes</Text>

      {jugadores.map((p) => {
        const jugo = p.minutes > 0;
        return (
          <Pressable
            key={p.playerId}
            onPress={() => router.push({ pathname: '/player/[id]', params: { id: p.playerId } })}
            style={({ pressed }) => [
              styles.suplenteRow,
              pressed && styles.playerRowPressed,
              !jugo && styles.playerRowDnp,
            ]}
          >
            <PlayerAvatar
              photoUrl={p.photoUrl}
              initials={`${p.firstName[0] ?? ''}${p.lastName[0] ?? ''}`}
              size={30}
            />
            <Text style={styles.suplenteNombre} numberOfLines={1}>
              {p.firstName[0]}. {p.lastName}
            </Text>

            {jugo ? (
              <>
                <Text style={styles.suplenteMin}>{formatMinutes(p.minutes)}</Text>
                <Text style={styles.suplenteStat}>{p.points}</Text>
                <Text style={styles.suplenteStat}>{p.rebounds}</Text>
                <Text style={styles.suplenteStat}>{p.assists}</Text>
              </>
            ) : (
              <Text style={styles.suplenteDnp}>No jugó</Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

function VistaTab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.vistaTab, active && styles.vistaTabActive]}>
      <Text style={[styles.vistaTabText, active && styles.vistaTabTextActive]}>{label}</Text>
    </Pressable>
  );
}

function TeamToggle({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.teamToggle, active && styles.teamToggleActive]}>
      <Text style={[styles.teamToggleText, active && styles.teamToggleTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },

  // Scoreboard
  scoreboard: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  gameDate: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.displaySemibold,
  },
  gameStatus: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.displayBold,
    letterSpacing: 1,
    marginTop: 2,
  },
  scoreboardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingHorizontal: 0, // antes: spacing.md
    width: '100%',
    gap: spacing.sm,
  },

  teamScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.sm,
  },
  teamScorePressed: {
    opacity: 0.6,
  },
  teamColumn: {
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    maxWidth: 120,
  },
  scoreLogo: {
    width: 56,
    height: 56,
  },
  teamAbbr: {
    color: colors.text,
    fontSize: fontSize.md,
    fontFamily: fontFamily.displayBold,
    letterSpacing: 0.5,
  },
  bigScore: {
    color: colors.textSecondary,
    fontSize: 36,
    fontFamily: fontFamily.displayBold,
    textAlign: 'center',
  },

  bigScoreWinning: {
    color: colors.text,
  },
  scoreSeparator: {
    color: colors.textMuted,
    fontSize: 28,
    fontFamily: fontFamily.displayBold,
  },

  // MVP card
  mvpCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  mvpCardPressed: { opacity: 0.85 },
  mvpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    gap: 4,
    marginBottom: spacing.md,
  },
  mvpBadgeText: {
    color: colors.background,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.displayBold,
    letterSpacing: 0.5,
  },
  mvpContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  mvpInfo: { flex: 1 },
  mvpName: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontFamily: fontFamily.displayBold,
  },
  mvpStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  mvpStat: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  mvpStatValue: {
    color: colors.text,
    fontFamily: fontFamily.displayBold,
  },
  mvpStatDot: { color: colors.textMuted },
  mvpScore: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.displaySemibold,
    marginTop: spacing.xs,
  },

  // Box score
  lineupCount: {
    marginLeft: 'auto',
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semibold,
  },
  lineupJersey: {
    width: 32,
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.displayBold,
  },
  lineupPosition: {
    width: 44,
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semibold,
  },
  boxScoreSection: {
    marginBottom: spacing.lg,
  },
  boxScoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  boxScoreLogo: { width: 28, height: 28 },
  boxScoreTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontFamily: fontFamily.displayBold,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xs,
  },
  statsHeaderText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.displayBold,
    letterSpacing: 0.5,
  },
  colPlayer: { flex: 3 },
  colStat: { flex: 1, textAlign: 'center' },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  playerRowPressed: { backgroundColor: colors.surface },
  playerRowDnp: { opacity: 0.4 },
  playerCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  playerName: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.displaySemibold,
    flex: 1,
  },
  statValue: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.displaySemibold,
  },
  teamBlock: {
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
    maxWidth: 120,
  },
  teamCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
  },
  teamCardPressed: {
    opacity: 0.7,
    borderColor: colors.primary,
  },
  scoresCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  banquillo: {
    marginTop: spacing.lg,
  },
  banquilloTitulo: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.displaySemibold,
    marginBottom: spacing.sm,
  },
  suplenteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suplenteNombre: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.displaySemibold,
  },
  suplenteMin: {
    width: 48,
    textAlign: 'right',
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
  },
  suplenteStat: {
    width: 30,
    textAlign: 'right',
    color: colors.text,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.displaySemibold,
  },
  suplenteDnp: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
  },
  vistaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  vistaTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  vistaTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  vistaTabText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.displaySemibold,
  },
  vistaTabTextActive: { color: colors.background },

  teamToggleRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  teamToggle: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  teamToggleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  teamToggleText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.displaySemibold,
    letterSpacing: 0.5,
  },
  teamToggleTextActive: {
    color: colors.text,
  },
});
