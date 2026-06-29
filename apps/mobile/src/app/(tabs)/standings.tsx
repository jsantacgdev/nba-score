import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { TeamLogo } from '@/components/ui/TeamLogo';
import { useStandings } from '@/hooks/useStandings';
import { colors, fontSize, fontFamily, radius, spacing } from '@/constants/theme';
import type { LeagueStanding } from '@/types/domain';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';

type ConferenceFilter = 'East' | 'West';

export default function StandingsScreen() {
  const [conference, setConference] = useState<ConferenceFilter>('East');
  const { data: standings, isLoading, error, refetch, isRefetching } = useStandings();

  const filtered = (standings ?? []).filter((s) => s.conference === conference);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Clasificación</Text>
      </View>

      <View style={styles.tabsRow}>
        <ConferenceTab
          label="Conferencia Este"
          active={conference === 'East'}
          onPress={() => setConference('East')}
        />
        <ConferenceTab
          label="Conferencia Oeste"
          active={conference === 'West'}
          onPress={() => setConference('West')}
        />
      </View>

      {isLoading && <LoadingState message="Cargando clasificación..." />}

      {error && <ErrorState title="No se puede cargar la clasificación" onRetry={refetch} />}

      {!isLoading && !error && (
        <FlatList
          data={filtered}
          keyExtractor={(s) => s.teamId}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListHeaderComponent={
            <View>
              <Legend />
              <StandingsHeaderRow />
            </View>
          }
          renderItem={({ item, index }) => <StandingsRow standing={item} position={index + 1} />}
        />
      )}
    </SafeAreaView>
  );
}

function ConferenceTab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.confTab, active && styles.confTabActive]}>
      <Text style={[styles.confTabText, active && styles.confTabTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Legend() {
  return (
    <View style={styles.legend}>
      <View style={styles.legendItem}>
        <View style={[styles.legendSwatch, styles.legendSwatchPlayoff]} />
        <Text style={styles.legendText}>Playoffs</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendSwatch, styles.legendSwatchPlayIn]} />
        <Text style={styles.legendText}>Play-in</Text>
      </View>
    </View>
  );
}

function StandingsHeaderRow() {
  return (
    <View style={styles.headerRow}>
      <Text style={[styles.headerText, styles.colPosition]}>#</Text>
      <Text style={[styles.headerText, styles.colTeam]}>Equipo</Text>
      <Text style={[styles.headerText, styles.colStat]}>V</Text>
      <Text style={[styles.headerText, styles.colStat]}>D</Text>
      <Text style={[styles.headerText, styles.colStat]}>%</Text>
      <Text style={[styles.headerText, styles.colStatDiff]}>+/-</Text>
    </View>
  );
}

function StandingsRow({ standing, position }: { standing: LeagueStanding; position: number }) {
  const isPlayoffSpot = position <= 6;
  const isPlayInSpot = position >= 7 && position <= 10;
  const diff = standing.pointDifferential;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/team/[id]', params: { id: standing.teamId } })}
      style={({ pressed }) => [
        styles.row,
        isPlayoffSpot && styles.rowPlayoff,
        isPlayInSpot && styles.rowPlayIn,
        pressed && styles.rowPressed,
      ]}
    >
      <View style={[styles.colPosition, styles.positionWrap]}>
        <Text style={styles.positionText}>{position}</Text>
      </View>

      <View style={[styles.colTeam, styles.teamCell]}>
        <TeamLogo logoUrl={standing.logoUrl} abbreviation={standing.abbreviation} size={28} />
        <Text style={styles.teamName} numberOfLines={1}>
          {standing.name}
        </Text>
      </View>

      <Text style={[styles.statText, styles.colStat]}>{standing.wins}</Text>
      <Text style={[styles.statText, styles.colStat]}>{standing.losses}</Text>
      <Text style={[styles.statText, styles.colStat]}>
        {standing.winPercentage.toFixed(3).substring(1)}
      </Text>
      <Text
        style={[
          styles.statText,
          styles.colStatDiff,
          diff > 0 && styles.diffPositive,
          diff < 0 && styles.diffNegative,
        ]}
      >
        {diff > 0 ? '+' : ''}
        {diff.toFixed(1)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xxxl,
    fontFamily: fontFamily.displayBold,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  confTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  confTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  confTabText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.displaySemibold,
  },
  confTabTextActive: {
    color: colors.text,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },

  // Leyenda
  legend: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1,
  },
  legendSwatchPlayoff: {
    backgroundColor: 'rgba(93, 171, 133, 0.18)',
    borderColor: 'rgba(93, 171, 133, 0.35)',
  },
  legendSwatchPlayIn: {
    backgroundColor: 'rgba(217, 176, 86, 0.18)',
    borderColor: 'rgba(217, 176, 86, 0.35)',
  },
  legendText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semibold,
  },

  // Tabla
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.displayBold,
    letterSpacing: 0.5,
  },
  colPosition: {
    width: 32,
    alignItems: 'center',
  },
  colTeam: {
    flex: 1,
  },
  colStat: {
    width: 40,
    textAlign: 'center',
  },
  colStatDiff: {
    width: 56,
    textAlign: 'right',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowPlayoff: {
    backgroundColor: 'rgba(93, 171, 133, 0.12)',
  },
  rowPlayIn: {
    backgroundColor: 'rgba(217, 176, 86, 0.12)',
  },
  rowPressed: {
    backgroundColor: colors.surface,
  },
  positionWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.displaySemibold,
  },
  teamCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  teamName: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.displaySemibold,
    flex: 1,
  },
  statText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.displaySemibold,
  },
  diffPositive: {
    color: colors.success,
  },
  diffNegative: {
    color: colors.danger,
  },
});
