import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { TeamLogo } from '@/components/ui/TeamLogo';
import { useStandings } from '@/hooks/useStandings';
import { colors, fontSize, fontWeight, radius, spacing } from '@/constants/theme';
import type { LeagueStanding } from '@/types/domain';
import { LoadingState } from '@/components/ui/LoadingState';

type ConferenceFilter = 'East' | 'West';

export default function StandingsScreen() {
  const [conference, setConference] = useState<ConferenceFilter>('East');
  const { data: standings, isLoading, error } = useStandings();

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

      {error && (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Error al cargar la clasificación</Text>
        </View>
      )}

      {!isLoading && !error && (
        <FlatList
          data={filtered}
          keyExtractor={(s) => s.teamId}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={<StandingsHeaderRow />}
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
  const isPlayoffSpot = position <= 8;
  const isPlayInSpot = position >= 9 && position <= 10;
  const diff = standing.pointDifferential;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/team/[id]', params: { id: standing.teamId } })}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={[styles.colPosition, styles.positionWrap]}>
        {isPlayoffSpot && <View style={styles.positionDotPlayoff} />}
        {isPlayInSpot && <View style={styles.positionDotPlayIn} />}
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
    fontWeight: fontWeight.heavy,
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
    fontWeight: fontWeight.semibold,
  },
  confTabTextActive: {
    color: colors.text,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSize.md,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
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
    fontWeight: fontWeight.bold,
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
  rowPressed: {
    backgroundColor: colors.surface,
  },
  positionWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  positionText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  positionDotPlayoff: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.success,
  },
  positionDotPlayIn: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.warning,
  },
  teamCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  teamName: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    flex: 1,
  },
  statText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  diffPositive: {
    color: colors.success,
  },
  diffNegative: {
    color: colors.danger,
  },
});
