import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { usePlayer, usePlayerCareerTotals } from '@/hooks/usePlayerDetail';
import { getPositionName } from '@/constants/positions';
import { colors, fontSize, fontFamily, radius, spacing } from '@/constants/theme';
import type { Player } from '@/types/domain';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';

export default function CompareScreen() {
  const { ids } = useLocalSearchParams<{ ids: string }>();
  const parts = (ids ?? '').split('-vs-');
  const id1 = parts[0] ?? '';
  const id2 = parts[1] ?? '';

  const { data: p1, isLoading: l1 } = usePlayer(id1);
  const { data: p2, isLoading: l2 } = usePlayer(id2);
  // Medias de carrera, no de temporada: es lo unico que permite comparar
  // a un retirado con un jugador en activo.
  const { data: s1, isLoading: ls1 } = usePlayerCareerTotals(id1);
  const { data: s2, isLoading: ls2 } = usePlayerCareerTotals(id2);

  const isLoading = l1 || l2 || ls1 || ls2;

  if (!id1 || !id2) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>URL de comparativa inválida</Text>
      </View>
    );
  }

  if (isLoading) {
    return <LoadingState message="Cargando comparativa..." />;
  }
  if (!p1 || !p2) {
    return (
      <ErrorState
        icon="person-remove-outline"
        title="Jugador no encontrado"
        message="No se pueden cargar los datos de uno de los jugadores."
      />
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Cabecera con ambos jugadores */}
      <View style={styles.playersHeader}>
        <PlayerHeader player={p1} />
        <Text style={styles.vsText}>VS</Text>
        <PlayerHeader player={p2} />
      </View>

      {/* Stats comparadas */}
      {s1 && s2 ? (
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Medias de carrera</Text>
          <Text style={styles.sectionCaption}>
            {s1.firstSeason}–{s1.lastSeason} vs {s2.firstSeason}–{s2.lastSeason}. Solo cuentan
            las temporadas cargadas en la base de datos.
          </Text>
          <StatComparison label="Temporadas" v1={s1.seasons} v2={s2.seasons} higherIsBetter />
          <StatComparison
            label="Anillos"
            v1={s1.championships}
            v2={s2.championships}
            higherIsBetter
          />
          <StatComparison label="Partidos" v1={s1.gamesPlayed} v2={s2.gamesPlayed} higherIsBetter />
          <StatComparison
            label="Minutos"
            v1={s1.minutes}
            v2={s2.minutes}
            higherIsBetter
            decimals={1}
          />
          <StatComparison
            label="Puntos"
            v1={s1.points}
            v2={s2.points}
            higherIsBetter
            decimals={1}
          />
          <StatComparison
            label="Rebotes"
            v1={s1.rebounds}
            v2={s2.rebounds}
            higherIsBetter
            decimals={1}
          />
          <StatComparison
            label="Asistencias"
            v1={s1.assists}
            v2={s2.assists}
            higherIsBetter
            decimals={1}
          />
          <StatComparison label="Robos" v1={s1.steals} v2={s2.steals} higherIsBetter decimals={1} />
          <StatComparison
            label="Tapones"
            v1={s1.blocks}
            v2={s2.blocks}
            higherIsBetter
            decimals={1}
          />
          <StatComparison
            label="% Tiros campo"
            v1={s1.fieldGoalPct * 100}
            v2={s2.fieldGoalPct * 100}
            higherIsBetter
            decimals={1}
            suffix="%"
          />
          <StatComparison
            label="% Triples"
            v1={s1.threePointPct * 100}
            v2={s2.threePointPct * 100}
            higherIsBetter
            decimals={1}
            suffix="%"
          />
          <StatComparison
            label="% Tiros libres"
            v1={s1.freeThrowPct * 100}
            v2={s2.freeThrowPct * 100}
            higherIsBetter
            decimals={1}
            suffix="%"
          />
        </View>
      ) : (
        <View style={styles.noStatsState}>
          <EmptyState
            icon="stats-chart-outline"
            title="Sin datos para comparar"
            message="Uno o ambos jugadores no tienen temporadas registradas en el histórico."
            compact
          />
        </View>
      )}
    </ScrollView>
  );
}

function PlayerHeader({ player }: { player: Player }) {
  return (
    <View style={styles.playerHeader}>
      <PlayerAvatar
        photoUrl={player.photoUrl}
        initials={`${player.firstName[0] ?? ''}${player.lastName[0] ?? ''}`}
        size={80}
      />
      <Text style={styles.playerName} numberOfLines={2}>
        {player.firstName}
        {'\n'}
        {player.lastName}
      </Text>
      <Text style={styles.playerPosition}>{getPositionName(player.position)}</Text>
      {player.jerseyNumber && <Text style={styles.playerNumber}>#{player.jerseyNumber}</Text>}
    </View>
  );
}

function StatComparison({
  label,
  v1,
  v2,
  higherIsBetter,
  decimals = 0,
  suffix = '',
}: {
  label: string;
  v1: number;
  v2: number;
  higherIsBetter: boolean;
  decimals?: number;
  suffix?: string;
}) {
  const better1 = higherIsBetter ? v1 > v2 : v1 < v2;
  const better2 = higherIsBetter ? v2 > v1 : v2 < v1;
  const tied = v1 === v2;

  // Para la barra visual: porcentajes relativos al máximo
  const max = Math.max(v1, v2);
  const pct1 = max > 0 ? (v1 / max) * 100 : 50;
  const pct2 = max > 0 ? (v2 / max) * 100 : 50;

  return (
    <View style={styles.statRow}>
      <View style={styles.statValuesRow}>
        <Text
          style={[styles.statValue, styles.statValueLeft, better1 && !tied && styles.statValueBest]}
        >
          {v1.toFixed(decimals)}
          {suffix}
        </Text>
        <Text style={styles.statLabel}>{label}</Text>
        <Text
          style={[
            styles.statValue,
            styles.statValueRight,
            better2 && !tied && styles.statValueBest,
          ]}
        >
          {v2.toFixed(decimals)}
          {suffix}
        </Text>
      </View>

      {/* Barras visuales */}
      <View style={styles.barsRow}>
        <View style={styles.barWrapperLeft}>
          <View
            style={[
              styles.bar,
              styles.barLeft,
              { width: `${pct1}%` },
              better1 && !tied ? styles.barBest : styles.barNormal,
            ]}
          />
        </View>
        <View style={styles.barWrapperRight}>
          <View
            style={[
              styles.bar,
              styles.barRight,
              { width: `${pct2}%` },
              better2 && !tied ? styles.barBest : styles.barNormal,
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionCaption: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    marginBottom: spacing.md,
  },
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  errorText: { color: colors.danger, fontSize: fontSize.md },

  // Cabecera con ambos jugadores
  playersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
  },
  playerHeader: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  playerName: {
    color: colors.text,
    fontSize: fontSize.md,
    fontFamily: fontFamily.displayBold,
    textAlign: 'center',
  },
  playerPosition: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  playerNumber: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.displaySemibold,
  },
  vsText: {
    color: colors.primary,
    fontSize: fontSize.xl,
    fontFamily: fontFamily.displayBold,
    paddingHorizontal: spacing.sm,
  },

  // Stats comparadas
  statsSection: {
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontFamily: fontFamily.displayBold,
    marginBottom: spacing.sm,
  },
  statRow: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValuesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  statValue: {
    color: colors.textSecondary,
    fontSize: fontSize.lg,
    fontFamily: fontFamily.displayBold,
    width: 70,
  },
  statValueLeft: {
    textAlign: 'left',
  },
  statValueRight: {
    textAlign: 'right',
  },
  statValueBest: {
    color: colors.primary,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.displaySemibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
    textAlign: 'center',
  },
  barsRow: {
    flexDirection: 'row',
    height: 6,
    gap: spacing.xs,
  },
  barWrapperLeft: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.sm,
    overflow: 'hidden',
    alignItems: 'flex-end',
  },
  barWrapperRight: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.sm,
    overflow: 'hidden',
    alignItems: 'flex-start',
  },
  bar: {
    height: '100%',
    borderRadius: radius.sm,
  },
  barLeft: {
    // Crece de derecha a izquierda
  },
  barRight: {
    // Crece de izquierda a derecha
  },
  barBest: {
    backgroundColor: colors.primary,
  },
  barNormal: {
    backgroundColor: colors.textMuted,
  },

  noStatsState: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  noStatsText: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    textAlign: 'center',
  },
});
