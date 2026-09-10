import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { TeamLogo } from '@/components/ui/TeamLogo';
import { Trophy } from '@/components/ui/Trophy';
import { formatShortDate, formatTime } from '@/lib/format';
import { colors, fontFamily, fontSize, radius, spacing } from '@/constants/theme';
import type { Game } from '@/types/domain';

const ROUNDS: Record<number, string> = {
  1: 'Primera ronda',
  2: 'Semifinales de conferencia',
  3: 'Finales de conferencia',
  4: 'Finales de la NBA',
};

function roundLabel(game: Game): string | null {
  if (game.seasonType === 'playin') return 'Play-in';
  if (game.seasonType !== 'playoffs') return null;
  return game.playoffRound ? (ROUNDS[game.playoffRound] ?? 'Playoffs') : 'Playoffs';
}

export function CompactGameRow({ game }: { game: Game }) {
  const isFinal = game.status === 'final';
  const isLive = game.status === 'live';
  const jugado = isFinal || isLive;

  const ganaLocal = game.scoreHome > game.scoreAway;
  const ganaVisitante = game.scoreAway > game.scoreHome;

  const hora = formatTime(game.startsAt);

  const ronda = roundLabel(game);
  const serie = game.seriesWins;
  const campeonEsLocal = game.titleDecider && ganaLocal;
  const campeonEsVisitante = game.titleDecider && ganaVisitante;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/game/[id]', params: { id: game.id } })}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.dateLine}>
        <Text style={styles.date}>{formatShortDate(game.startsAt)}</Text>
        {isLive && <Text style={styles.live}>EN VIVO</Text>}
      </View>

      <View style={styles.teams}>
        {/* Visitante primero: es como se lee un marcador, "Magic en Hawks" */}
        <View style={styles.side}>
          <TeamLogo
            logoUrl={game.awayTeam.logoUrl}
            abbreviation={game.awayTeam.abbreviation}
            size={22}
          />
          <Text
            style={[styles.name, jugado && ganaVisitante && styles.winner]}
            numberOfLines={1}
          >
            {game.awayTeam.name}
          </Text>
          {campeonEsVisitante && (
            <Trophy award="champion" season="" size={18} interactive={false} />
          )}
        </View>

        {jugado ? (
          <View style={styles.score}>
            <Text style={[styles.scoreText, ganaVisitante && styles.winner]}>
              {game.scoreAway}
            </Text>
            <Text style={styles.dash}>-</Text>
            <Text style={[styles.scoreText, ganaLocal && styles.winner]}>
              {game.scoreHome}
            </Text>
          </View>
        ) : (
          <Text style={styles.time}>{hora}</Text>
        )}

        <View style={[styles.side, styles.sideRight]}>
          {campeonEsLocal && (
            <Trophy award="champion" season="" size={18} interactive={false} />
          )}
          <Text
            style={[styles.name, styles.nameRight, jugado && ganaLocal && styles.winner]}
            numberOfLines={1}
          >
            {game.homeTeam.name}
          </Text>
          <TeamLogo
            logoUrl={game.homeTeam.logoUrl}
            abbreviation={game.homeTeam.abbreviation}
            size={22}
          />
        </View>
      </View>

      {ronda && (
        <View style={styles.seriesLine}>
          <Text style={styles.series}>
            {ronda}
            {/* Mismo orden que el marcador de arriba, visitante-local */}
            {serie ? `  ·  ${serie.away}-${serie.home}` : ''}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowPressed: {
    backgroundColor: colors.surface,
  },
  dateLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 2,
  },
  date: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.medium,
  },
  live: {
    color: colors.danger,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.displayBold,
  },
  teams: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  side: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sideRight: {
    justifyContent: 'flex-end',
  },
  name: {
    flexShrink: 1,
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
  },
  nameRight: {
    textAlign: 'right',
  },
  winner: {
    color: colors.text,
    fontFamily: fontFamily.displayBold,
  },
  score: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  scoreText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontFamily: fontFamily.displaySemibold,
    minWidth: 28,
    textAlign: 'center',
  },
  dash: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  seriesLine: {
    alignItems: 'center',
    marginTop: 2,
  },
  series: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semibold,
  },
  time: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    paddingHorizontal: spacing.sm,
  },
});
