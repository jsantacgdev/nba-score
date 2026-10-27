import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { NumeroVivo } from '@/components/ui/NumeroVivo';
import { useRelojVivo } from '@/hooks/useRelojVivo';
import { useEstadisticasPorCuarto, useEventoEspn } from '@/hooks/useLive';
import { useGameDetail } from '@/hooks/useGameDetail';
import { formatDateDMY, formatMinutes } from '@/lib/format';
import { colors, fontSize, fontFamily, radius, spacing } from '@/constants/theme';
import type { GameBoxScoreEntry, GameLineupPlayer } from '@/types/domain';
import { LoadingState } from '@/components/ui/LoadingState';
import { GameDetailSkeleton } from '@/components/ui/Skeleton';
import { CourtLineup } from '@/components/game/CourtLineup';
import { HeadToHead } from '@/components/game/HeadToHead';
import { ComoLlegan } from '@/components/game/ComoLlegan';
import { Probabilidad } from '@/components/game/Probabilidad';
import { boxScoreDesdeDirecto } from '@/lib/api/live';
import { boxScoreDesdeEspn } from '@/lib/liveBoxScore';
import {
  fusionarDirecto,
  useLiveLineup,
  useLiveBoxScore,
  useLiveScoreboard,
  useStartingLineups,
} from '@/hooks/useLive';
import { useHeadToHead } from '@/hooks/useHeadToHead';
import { useGameTeamForm } from '@/hooks/useGameTeamForm';
import { useWinProbability } from '@/hooks/useWinProbability';
import { useModelRecord } from '@/hooks/useModelRecord';
import type { JugadorEnPista } from '@/components/game/CourtLineup';
import { useMemo, useState } from 'react';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { usePaddingInferior } from '@/hooks/useBottomInset';

export default function GameDetailScreen() {
  const paddingInferior = usePaddingInferior();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, error, refetch } = useGameDetail(id);
  const [vista, setVista] = useState<'stats' | 'court' | 'h2h'>('stats');
  const { data: marcadorVivo } = useLiveScoreboard();
  // El identificador de ESPN no es el de la NBA: se cruza por equipos
  const vivo = marcadorVivo?.find(
    (g) =>
      data?.game &&
      g.homeAbbr === data.game.homeTeam.abbreviation &&
      g.awayAbbr === data.game.awayTeam.abbreviation &&
      Math.abs(g.startsAt.getTime() - data.game.startsAt.getTime()) < 12 * 60 * 60 * 1000,
  );
  const partido = data?.game ? fusionarDirecto(data.game, vivo) : undefined;
  const enJuego = partido?.status === 'live';
  // Recien terminado nuestra base aun no tiene el box score: el job tarda
  // hasta quince minutos. Mientras tanto se sigue tirando de ESPN.
  const sinBoxScore =
    !!data && data.homeRoster.length === 0 && data.awayRoster.length === 0;
  const usarDirecto = enJuego || (partido?.status === 'final' && sinBoxScore);
  const { data: enPista } = useLiveLineup(id, enJuego);
  // El box score en vivo viene de ESPN, que si responde al movil
  const { data: enVivoEspn } = useLiveBoxScore(vivo?.gameId, usarDirecto);
  const { data: quintetos } = useStartingLineups(usarDirecto ? undefined : id);
  const reloj = useRelojVivo(partido?.timeRemaining, partido?.liveUpdatedAt, enJuego);
  const [cuarto, setCuarto] = useState<number | null>(null);
  const { data: eventoResuelto } = useEventoEspn(data?.game, vivo?.gameId, vista === 'stats');
  const eventoEspn = vivo?.gameId ?? eventoResuelto ?? undefined;
  const { data: porCuarto } = useEstadisticasPorCuarto(eventoEspn, vista === 'stats');
  const cuartosDisponibles = useMemo(
    () =>
      Object.keys(porCuarto ?? {})
        .map(Number)
        .sort((a, b) => a - b),
    [porCuarto],
  );
  const { data: historial, isLoading: cargandoHistorial } = useHeadToHead(
    data?.game,
    vista === 'h2h',
  );
  const { data: forma, isLoading: cargandoForma } = useGameTeamForm(id, vista === 'h2h');
  const porJugar = partido?.status === 'scheduled';
  const { data: pronostico, isLoading: cargandoPronostico } = useWinProbability(
    id,
    vista === 'h2h' && porJugar,
  );
  const { data: balanceModelo } = useModelRecord(vista === 'h2h' && porJugar);

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

  const { mvp } = data;
  const game = partido ?? data.game;

  const invertido =
    !!enPista &&
    enPista.home.abbreviation !== game.homeTeam.abbreviation &&
    enPista.away.abbreviation === game.homeTeam.abbreviation;
  const vivoLocal = invertido ? enPista?.away : enPista?.home;
  const vivoVisitante = invertido ? enPista?.home : enPista?.away;

  const homeLineup = data.homeLineup ?? [];
  const awayLineup = data.awayLineup ?? [];

  /**
   * De donde salen las estadisticas, por orden de preferencia:
   *
   *   1. El CDN de la NBA, que es el mas rico, cuando responde.
   *   2. ESPN, que responde siempre desde el movil.
   *   3. Lo que haya en la base, que durante el partido esta vacio
   *      porque el job solo carga partidos terminados.
   */
  const rosterEnVivo = (
    equipo: 'home' | 'away',
  ): ReturnType<typeof boxScoreDesdeDirecto> | undefined => {
    const desdeCdn = equipo === 'home' ? vivoLocal : vivoVisitante;
    const nuestro = equipo === 'home' ? game.homeTeam : game.awayTeam;

    if (desdeCdn) return boxScoreDesdeDirecto(desdeCdn, nuestro.id);
    if (enVivoEspn?.length) {
      return boxScoreDesdeEspn(
        enVivoEspn,
        equipo === 'home' ? homeLineup : awayLineup,
        nuestro.abbreviation,
        nuestro.id,
      );
    }
    return undefined;
  };

  const homeRoster = (usarDirecto ? rosterEnVivo('home') : undefined) ?? data.homeRoster;
  const awayRoster = (usarDirecto ? rosterEnVivo('away') : undefined) ?? data.awayRoster;
  const jugado = game.status === 'final' || game.status === 'live';
  const homeWinning = jugado && game.scoreHome > game.scoreAway;
  const awayWinning = jugado && game.scoreAway > game.scoreHome;

  const title = `${game.homeTeam.name} vs ${game.awayTeam.name}`;

  const rosterDeCuarto = (lado: 'home' | 'away'): GameBoxScoreEntry[] | null => {
    if (cuarto === null) return null;
    const jugadas = porCuarto?.[cuarto];
    if (!jugadas?.length) return null;
    const equipo = lado === 'home' ? game.homeTeam : game.awayTeam;
    const plantilla = lado === 'home' ? homeLineup : awayLineup;
    return boxScoreDesdeEspn(jugadas, plantilla, equipo.abbreviation, equipo.id)
      .filter((p) => p.points > 0 || p.rebounds > 0 || p.assists > 0)
      .sort((a, b) => b.points - a.points || b.rebounds - a.rebounds);
  };

  const rosterLocal = rosterDeCuarto('home') ?? homeRoster;
  const rosterVisitante = rosterDeCuarto('away') ?? awayRoster;

  function suplentesDe(lado: 'home' | 'away'): GameBoxScoreEntry[] {
    const teamId = lado === 'home' ? game.homeTeam.id : game.awayTeam.id;
    const plantel = lado === 'home' ? homeRoster : awayRoster;

    if (enJuego) {
      const equipo = lado === 'home' ? vivoLocal : vivoVisitante;
      const enCancha = new Set(
        (equipo?.players ?? []).filter((p) => p.onCourt).map((p) => p.playerId),
      );
      if (enCancha.size) return plantel.filter((p) => !enCancha.has(p.playerId));
    }

    if (usarDirecto) {
      const abreviatura =
        lado === 'home' ? game.homeTeam.abbreviation : game.awayTeam.abbreviation;
      const nombres = new Set(
        (enVivoEspn ?? [])
          .filter((p) => p.teamAbbr === abreviatura && p.starter)
          .map((p) => p.nombre),
      );
      if (nombres.size) {
        return plantel.filter((p) => !nombres.has(`${p.firstName} ${p.lastName}`.trim()));
      }
    }

    const titulares = new Set(
      ((quintetos ?? []).find((q) => q.teamId === teamId)?.players ?? []).map((p) => p.playerId),
    );
    return plantel.filter((p) => !titulares.has(p.playerId));
  }

  function quintetoDe(lado: 'home' | 'away'): JugadorEnPista[] {
    const teamId = lado === 'home' ? game.homeTeam.id : game.awayTeam.id;

    if (enJuego) {
      const equipo = lado === 'home' ? vivoLocal : vivoVisitante;
      const enCancha = (equipo?.players ?? []).filter((p) => p.onCourt);
      if (enCancha.length) {
        return enCancha.map((p) => ({
          playerId: p.playerId,
          name: p.name,
          jerseyNumber: p.jerseyNumber,
          points: p.points,
        }));
      }
    }

    if (usarDirecto) {
      const abreviatura =
        lado === 'home' ? game.homeTeam.abbreviation : game.awayTeam.abbreviation;
      const titularesEspn = (enVivoEspn ?? []).filter(
        (p) => p.teamAbbr === abreviatura && p.starter,
      );
      if (titularesEspn.length) {
        const plantel = lado === 'home' ? homeRoster : awayRoster;
        return titularesEspn.map((p) => {
          const nuestro = plantel.find(
            (x) => `${x.firstName} ${x.lastName}`.trim() === p.nombre,
          );
          return {
            playerId: nuestro?.playerId ?? p.espnId,
            name: p.nombre,
            photoUrl: nuestro?.photoUrl,
            points: p.points,
          };
        });
      }
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
      <ScrollView style={styles.container} decelerationRate="fast" contentContainerStyle={[styles.content, paddingInferior]}>
        {/* Marcador */}
        <View style={styles.scoreboard}>
          {!enJuego && <Text style={styles.gameDate}>{formatDateDMY(game.startsAt)}</Text>}
          <Text style={[styles.gameStatus, enJuego && styles.gameStatusVivo]}>
            {game.status === 'final' ? 'FINAL' : enJuego ? 'EN VIVO' : 'PROGRAMADO'}
          </Text>
          {enJuego && !!game.period && (
            <Text style={styles.gameReloj}>
              Q{game.period}
              {reloj ? ` · ${reloj}` : ''}
            </Text>
          )}

          <View style={styles.scoreboardRow}>
            <TeamBlock
              teamId={game.homeTeam.id}
              abbreviation={game.homeTeam.abbreviation}
              logoUrl={game.homeTeam.logoUrl}
            />

            <View style={styles.scoresCenter}>
              {/* Sin jugar no hay marcador: un 0-0 se lee como empate */}
              {jugado ? (
                <NumeroVivo
                  valor={game.scoreHome}
                  activo={enJuego}
                  colorBase={homeWinning ? colors.text : colors.textSecondary}
                  style={styles.bigScore}
                />
              ) : (
                <Text style={styles.bigScore}>-</Text>
              )}
              {/* El separador sobra sin marcador: quedarian tres guiones */}
              {jugado && <Text style={styles.scoreSeparator}>-</Text>}
              {jugado ? (
                <NumeroVivo
                  valor={game.scoreAway}
                  activo={enJuego}
                  colorBase={awayWinning ? colors.text : colors.textSecondary}
                  style={styles.bigScore}
                />
              ) : (
                <Text style={styles.bigScore}>-</Text>
              )}
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
          <VistaTab
            label="Cara a cara"
            active={vista === 'h2h'}
            onPress={() => setVista('h2h')}
          />
        </View>

        {vista === 'court' && (
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
        )}

        {vista === 'stats' && jugado && cuartosDisponibles.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.cuartosScroll}
            contentContainerStyle={styles.cuartosFila}
          >
            <CuartoChip label="Partido" activo={cuarto === null} onPress={() => setCuarto(null)} />
            {cuartosDisponibles.map((c) => (
              <CuartoChip
                key={c}
                label={c > 4 ? `PR${c - 4}` : `Q${c}`}
                activo={cuarto === c}
                onPress={() => setCuarto(c)}
              />
            ))}
          </ScrollView>
        )}

        {vista === 'h2h' ? (
          <>
            {porJugar && (
              <Probabilidad
                home={game.homeTeam}
                away={game.awayTeam}
                data={pronostico}
                record={balanceModelo}
                isLoading={cargandoPronostico}
              />
            )}
            <ComoLlegan
              home={game.homeTeam}
              away={game.awayTeam}
              data={forma}
              isLoading={cargandoForma}
            />
            <HeadToHead
              home={game.homeTeam}
              away={game.awayTeam}
              data={historial}
              isLoading={cargandoHistorial}
            />
          </>
        ) : vista === 'court' ? (
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
        ) : jugado ? (
          <>
            <TeamBoxScore
              title={game.homeTeam.fullName}
              logoUrl={game.homeTeam.logoUrl}
              roster={rosterLocal}
              enVivo={enJuego && cuarto === null}
              porCuarto={cuarto !== null}
            />
            <TeamBoxScore
              title={game.awayTeam.fullName}
              logoUrl={game.awayTeam.logoUrl}
              roster={rosterVisitante}
              enVivo={enJuego && cuarto === null}
              porCuarto={cuarto !== null}
            />
          </>
        ) : (
          <>
            <TeamLineup
              title={game.homeTeam.fullName}
              logoUrl={game.homeTeam.logoUrl}
              lineup={homeLineup}
            />
            <TeamLineup
              title={game.awayTeam.fullName}
              logoUrl={game.awayTeam.logoUrl}
              lineup={awayLineup}
            />
          </>
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
              size={26}
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

function CuartoChip({
  label,
  activo,
  onPress,
}: {
  label: string;
  activo: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.cuartoChip,
        activo && styles.cuartoChipActivo,
        pressed && styles.cuartoChipPressed,
      ]}
    >
      <Text style={[styles.cuartoChipTexto, activo && styles.cuartoChipTextoActivo]}>{label}</Text>
    </Pressable>
  );
}

function TeamBoxScore({
  title,
  logoUrl,
  roster,
  enVivo = false,
  porCuarto = false,
}: {
  title: string;
  logoUrl?: string;
  roster: GameBoxScoreEntry[];
  enVivo?: boolean;
  porCuarto?: boolean;
}) {
  if (roster.length === 0) return null;

  const ordenado = [...roster].sort(
    (a, b) => b.points - a.points || b.minutes - a.minutes,
  );

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

      {ordenado.map((p) => (
        <Pressable
          key={p.playerId}
          onPress={() => router.push({ pathname: '/player/[id]', params: { id: p.playerId } })}
          style={({ pressed }) => [
            styles.playerRow,
            pressed && styles.playerRowPressed,
            !porCuarto && p.minutes === 0 && styles.playerRowDnp,
          ]}
        >
          <View style={[styles.colPlayer, styles.playerCol]}>
            <PlayerAvatar
              photoUrl={p.photoUrl}
              initials={`${p.firstName[0] ?? ''}${p.lastName[0] ?? ''}`}
              size={26}
            />
            <Text style={styles.playerName} numberOfLines={1}>
              {p.firstName[0]}. {p.lastName}
            </Text>
          </View>
          <Text style={[styles.statValue, styles.colStat]}>
            {porCuarto ? '—' : p.minutes > 0 ? formatMinutes(p.minutes) : '-'}
          </Text>
          <NumeroVivo
            valor={p.points}
            activo={enVivo}
            colorBase={colors.text}
            style={[styles.statValue, styles.colStat]}
          />
          <NumeroVivo
            valor={p.rebounds}
            activo={enVivo}
            colorBase={colors.text}
            style={[styles.statValue, styles.colStat]}
          />
          <NumeroVivo
            valor={p.assists}
            activo={enVivo}
            colorBase={colors.text}
            style={[styles.statValue, styles.colStat]}
          />
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
  gameStatusVivo: {
    color: colors.danger,
    fontSize: fontSize.sm,
    letterSpacing: 1.5,
  },
  gameReloj: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.displaySemibold,
    marginTop: 3,
  },
  scoreboardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingHorizontal: 0,
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
    maxWidth: 104,
  },
  scoreLogo: {
    width: 42,
    height: 42,
  },
  teamAbbr: {
    color: colors.text,
    fontSize: fontSize.md,
    fontFamily: fontFamily.displayBold,
    letterSpacing: 0.5,
  },
  bigScore: {
    color: colors.textSecondary,
    fontSize: 22,
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
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
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
    marginBottom: spacing.xs,
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
    gap: spacing.sm,
  },
  mvpInfo: { flex: 1 },
  mvpName: {
    color: colors.text,
    fontSize: fontSize.md,
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
    marginBottom: spacing.md,
  },
  boxScoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  boxScoreLogo: { width: 24, height: 24 },
  boxScoreTitle: {
    color: colors.text,
    fontSize: fontSize.md,
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
    paddingVertical: 5,
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
    padding: spacing.sm,
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
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  vistaTab: {
    flex: 1,
    paddingVertical: 6,
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

  cuartosScroll: { flexGrow: 0, flexShrink: 0 },
  cuartosFila: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    gap: 6,
    alignItems: 'center',
  },
  cuartoChip: {
    minWidth: 62,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cuartoChipActivo: { backgroundColor: colors.primary, borderColor: colors.primary },
  cuartoChipPressed: { opacity: 0.6 },
  cuartoChipTexto: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontFamily: fontFamily.displaySemibold,
  },
  cuartoChipTextoActivo: { color: colors.background },
  teamToggleRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  teamToggle: {
    flex: 1,
    paddingVertical: 5,
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
