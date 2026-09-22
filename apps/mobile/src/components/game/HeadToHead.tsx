import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TeamLogo } from '@/components/ui/TeamLogo';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { formatDateDMY } from '@/lib/format';
import { colors, fontFamily, fontSize, radius, spacing } from '@/constants/theme';
import type { HeadToHead as Historial, HeadToHeadGame, Team } from '@/types/domain';

const PASO = 10;

type Props = {
  home: Team;
  away: Team;
  data?: Historial;
  isLoading: boolean;
};

function etiquetaFase(seasonType: string): string | null {
  if (seasonType === 'playoffs') return 'Playoffs';
  if (seasonType === 'playin') return 'Play-in';
  return null;
}

export function HeadToHead({ home, away, data, isLoading }: Props) {
  const [mostrados, setMostrados] = useState(PASO);

  if (isLoading) {
    return <LoadingState message="Cargando el historial..." compact />;
  }

  if (!data || data.games.length === 0) {
    return (
      <EmptyState
        icon="git-compare-outline"
        title="Sin precedentes"
        message="No consta ningún enfrentamiento anterior entre estos equipos."
        compact
      />
    );
  }

  const historial = data;
  const total = historial.games.length;
  const visibles = historial.games.slice(0, mostrados);

  const grupos: { season: string; games: HeadToHeadGame[] }[] = [];
  for (const game of visibles) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.season === game.season) ultimo.games.push(game);
    else grupos.push({ season: game.season, games: [game] });
  }

  function balanceDe(season: string): string {
    const delAno = historial.games.filter((g) => g.season === season);
    const local = delAno.filter((g) => g.winnerTeamId === home.id).length;
    return `${local}-${delAno.length - local}`;
  }

  const ganaLocal = historial.home.wins > historial.away.wins;
  const ganaVisitante = historial.away.wins > historial.home.wins;

  return (
    <View style={styles.container}>
      <View style={styles.balanceCard}>
        <View style={styles.balanceRow}>
          <View style={styles.balanceTeam}>
            <TeamLogo logoUrl={home.logoUrl} abbreviation={home.abbreviation} size={36} />
            <Text style={styles.balanceAbbr}>{home.abbreviation}</Text>
          </View>

          <View style={styles.balanceMarcador}>
            <Text style={[styles.balanceWins, ganaLocal && styles.balanceWinsMejor]}>
              {historial.home.wins}
            </Text>
            <Text style={styles.balanceSeparador}>-</Text>
            <Text style={[styles.balanceWins, ganaVisitante && styles.balanceWinsMejor]}>
              {historial.away.wins}
            </Text>
          </View>

          <View style={[styles.balanceTeam, styles.balanceTeamDerecha]}>
            <Text style={styles.balanceAbbr}>{away.abbreviation}</Text>
            <TeamLogo logoUrl={away.logoUrl} abbreviation={away.abbreviation} size={36} />
          </View>
        </View>

        <View style={styles.barraBalance}>
          <View style={[styles.barraLocal, { flex: historial.home.wins }]} />
          <View style={[styles.barraVisitante, { flex: historial.away.wins }]} />
        </View>

        <Text style={styles.balanceCaption}>
          {total} {total === 1 ? 'enfrentamiento' : 'enfrentamientos'}
          {historial.firstSeason ? ` desde ${historial.firstSeason}` : ''}
        </Text>

        <Racha streak={historial.streak} home={home} away={away} />
      </View>

      <Comparativa
        label="Victorias en casa"
        izquierda={historial.home.winsAtHome}
        derecha={historial.away.winsAtHome}
      />
      <Comparativa
        label="Puntos por partido"
        izquierda={historial.home.pointsAvg}
        derecha={historial.away.pointsAvg}
        decimales={1}
      />
      <Comparativa
        label="Mayor victoria"
        izquierda={historial.home.biggestWin?.margin ?? 0}
        derecha={historial.away.biggestWin?.margin ?? 0}
        prefijo="+"
      />

      <Text style={styles.listaTitulo}>Enfrentamientos anteriores</Text>

      {grupos.map((grupo) => (
        <View key={grupo.season}>
          <View style={styles.temporadaFila}>
            <Text style={styles.temporada}>{grupo.season}</Text>
            <Text style={styles.temporadaBalance}>{balanceDe(grupo.season)}</Text>
          </View>

          {grupo.games.map((game) => (
            <FilaEnfrentamiento key={game.id} game={game} home={home} away={away} />
          ))}
        </View>
      ))}

      {mostrados < total && (
        <Pressable
          onPress={() => setMostrados((n) => n + PASO)}
          style={({ pressed }) => [styles.verMas, pressed && styles.verMasPressed]}
        >
          <Text style={styles.verMasTexto}>Ver más</Text>
          <Ionicons name="chevron-down" size={14} color={colors.primary} />
        </Pressable>
      )}
    </View>
  );
}

function Racha({
  streak,
  home,
  away,
}: {
  streak?: Historial['streak'];
  home: Team;
  away: Team;
}) {
  if (!streak) return null;

  const equipo = streak.teamId === home.id ? home : away;
  const texto =
    streak.wins === 1
      ? `${equipo.name} ganó el último`
      : `${equipo.name} gana los ${streak.wins} últimos`;

  return (
    <View style={styles.racha}>
      <Ionicons name="flame" size={12} color={colors.primary} />
      <Text style={styles.rachaTexto}>{texto}</Text>
    </View>
  );
}

function Comparativa({
  label,
  izquierda,
  derecha,
  decimales = 0,
  prefijo = '',
}: {
  label: string;
  izquierda: number;
  derecha: number;
  decimales?: number;
  prefijo?: string;
}) {
  const max = Math.max(izquierda, derecha);
  const pctIzquierda = max > 0 ? (izquierda / max) * 100 : 0;
  const pctDerecha = max > 0 ? (derecha / max) * 100 : 0;

  const escribir = (valor: number) =>
    valor > 0 ? `${prefijo}${valor.toFixed(decimales)}` : valor.toFixed(decimales);

  return (
    <View style={styles.comparativa}>
      <View style={styles.comparativaFila}>
        <Text
          style={[
            styles.comparativaValor,
            styles.comparativaValorIzquierda,
            izquierda > derecha && styles.comparativaValorMejor,
          ]}
        >
          {escribir(izquierda)}
        </Text>
        <Text style={styles.comparativaLabel}>{label}</Text>
        <Text
          style={[
            styles.comparativaValor,
            styles.comparativaValorDerecha,
            derecha > izquierda && styles.comparativaValorMejor,
          ]}
        >
          {escribir(derecha)}
        </Text>
      </View>

      <View style={styles.barrasFila}>
        <View style={styles.barraHuecoIzquierda}>
          <View style={[styles.barra, styles.barraLocal, { width: `${pctIzquierda}%` }]} />
        </View>
        <View style={styles.barraHuecoDerecha}>
          <View style={[styles.barra, styles.barraVisitante, { width: `${pctDerecha}%` }]} />
        </View>
      </View>
    </View>
  );
}

function FilaEnfrentamiento({
  game,
  home,
  away,
}: {
  game: HeadToHeadGame;
  home: Team;
  away: Team;
}) {
  const localJugabaEnCasa = game.homeTeamId === home.id;
  const puntosLocal = localJugabaEnCasa ? game.scoreHome : game.scoreAway;
  const puntosVisitante = localJugabaEnCasa ? game.scoreAway : game.scoreHome;
  const ganoLocal = game.winnerTeamId === home.id;
  const fase = etiquetaFase(game.seasonType);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/game/[id]', params: { id: game.id } })}
      style={({ pressed }) => [styles.fila, pressed && styles.filaPressed]}
    >
      <View style={styles.filaCabecera}>
        <Text style={styles.filaFecha}>{formatDateDMY(game.startsAt)}</Text>
        {fase && <Text style={styles.filaFase}>{fase}</Text>}
      </View>

      <View style={styles.filaMarcador}>
        <View style={styles.filaEquipo}>
          <TeamLogo logoUrl={home.logoUrl} abbreviation={home.abbreviation} size={20} />
          <Text style={[styles.filaAbbr, ganoLocal && styles.filaGanador]}>
            {home.abbreviation}
          </Text>
          {localJugabaEnCasa && <Ionicons name="home" size={10} color={colors.textMuted} />}
        </View>

        <View style={styles.filaPuntos}>
          <Text style={[styles.filaPuntosTexto, ganoLocal && styles.filaGanador]}>
            {puntosLocal}
          </Text>
          <Text style={styles.filaGuion}>-</Text>
          <Text style={[styles.filaPuntosTexto, !ganoLocal && styles.filaGanador]}>
            {puntosVisitante}
          </Text>
        </View>

        <View style={[styles.filaEquipo, styles.filaEquipoDerecha]}>
          {!localJugabaEnCasa && <Ionicons name="home" size={10} color={colors.textMuted} />}
          <Text style={[styles.filaAbbr, !ganoLocal && styles.filaGanador]}>
            {away.abbreviation}
          </Text>
          <TeamLogo logoUrl={away.logoUrl} abbreviation={away.abbreviation} size={20} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.lg },

  balanceCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceTeam: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  balanceTeamDerecha: {
    justifyContent: 'flex-end',
  },
  balanceAbbr: {
    color: colors.text,
    fontSize: fontSize.md,
    fontFamily: fontFamily.displayBold,
    letterSpacing: 0.5,
  },
  balanceMarcador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  balanceWins: {
    color: colors.textSecondary,
    fontSize: fontSize.xxl,
    fontFamily: fontFamily.displayBold,
    minWidth: 32,
    textAlign: 'center',
  },
  balanceWinsMejor: { color: colors.text },
  balanceSeparador: {
    color: colors.textMuted,
    fontSize: fontSize.lg,
    fontFamily: fontFamily.displayBold,
  },
  barraBalance: {
    flexDirection: 'row',
    height: 6,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.surfaceLight,
    marginTop: spacing.md,
  },
  balanceCaption: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  racha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  rachaTexto: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.displaySemibold,
  },

  comparativa: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  comparativaFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  comparativaValor: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontFamily: fontFamily.displayBold,
    width: 60,
  },
  comparativaValorIzquierda: { textAlign: 'left' },
  comparativaValorDerecha: { textAlign: 'right' },
  comparativaValorMejor: { color: colors.text },
  comparativaLabel: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    textAlign: 'center',
  },
  barrasFila: {
    flexDirection: 'row',
    height: 6,
    gap: spacing.xs,
  },
  barraHuecoIzquierda: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.sm,
    overflow: 'hidden',
    alignItems: 'flex-end',
  },
  barraHuecoDerecha: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.sm,
    overflow: 'hidden',
    alignItems: 'flex-start',
  },
  barra: {
    height: '100%',
    borderRadius: radius.sm,
  },
  barraLocal: { backgroundColor: colors.primary },
  barraVisitante: { backgroundColor: colors.secondary },

  listaTitulo: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontFamily: fontFamily.displayBold,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  temporadaFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  temporada: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.displaySemibold,
  },
  temporadaBalance: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.displaySemibold,
    letterSpacing: 0.5,
  },
  fila: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filaPressed: { backgroundColor: colors.surface },
  filaCabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 2,
  },
  filaFecha: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.medium,
  },
  filaFase: {
    color: colors.secondary,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.displaySemibold,
  },
  filaMarcador: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filaEquipo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  filaEquipoDerecha: {
    justifyContent: 'flex-end',
  },
  filaAbbr: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.displaySemibold,
    letterSpacing: 0.5,
  },
  filaPuntos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  filaPuntosTexto: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontFamily: fontFamily.displaySemibold,
    minWidth: 28,
    textAlign: 'center',
  },
  filaGuion: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  filaGanador: {
    color: colors.text,
    fontFamily: fontFamily.displayBold,
  },
  verMas: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    borderRadius: radius.md,
  },
  verMasPressed: { backgroundColor: colors.surface },
  verMasTexto: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.displaySemibold,
  },
});
