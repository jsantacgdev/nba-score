import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { useGameDetail } from '@/hooks/useGameDetail';
import { formatDateDMY } from '@/lib/format';
import { colors, fontSize, fontFamily, radius, spacing } from '@/constants/theme';
import type { GameBoxScoreEntry } from '@/types/domain';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';

export default function GameDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, error, refetch } = useGameDetail(id);

  if (isLoading) {
    return <LoadingState message="Cargando partido..." />;
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
  const homeWinning = game.scoreHome > game.scoreAway;
  const awayWinning = game.scoreAway > game.scoreHome;

  const title = `${game.homeTeam.name} vs ${game.awayTeam.name}`;

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
              <Text style={[styles.bigScore, homeWinning && styles.bigScoreWinning]}>
                {game.scoreHome}
              </Text>
              <Text style={styles.scoreSeparator}>-</Text>
              <Text style={[styles.bigScore, awayWinning && styles.bigScoreWinning]}>
                {game.scoreAway}
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

        {/* Box score por equipo */}
        <TeamBoxScore
          title={game.homeTeam.fullName}
          logoUrl={game.homeTeam.logoUrl}
          roster={homeRoster}
        />
        <TeamBoxScore
          title={game.awayTeam.fullName}
          logoUrl={game.awayTeam.logoUrl}
          roster={awayRoster}
        />
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
        <Text style={[styles.statsHeaderText, styles.colStat]}>MIN</Text>
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
            {p.minutes > 0 ? p.minutes.toFixed(0) : '-'}
          </Text>
          <Text style={[styles.statValue, styles.colStat]}>{p.points}</Text>
          <Text style={[styles.statValue, styles.colStat]}>{p.rebounds}</Text>
          <Text style={[styles.statValue, styles.colStat]}>{p.assists}</Text>
        </Pressable>
      ))}
    </View>
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
});
