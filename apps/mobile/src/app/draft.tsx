import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { TeamLogo } from '@/components/ui/TeamLogo';
import { Trophy } from '@/components/ui/Trophy';
import { SeasonButton, SeasonPicker } from '@/components/ui/SeasonPicker';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDraftClass, useDraftYears } from '@/hooks/useDraft';
import { colors, fontFamily, fontSize, radius, spacing } from '@/constants/theme';
import type { DraftPick } from '@/types/domain';

function roundTitle(round: number | null): string {
  if (round === null || round === 0) return 'Elecciones territoriales';
  if (round === 1) return 'Primera ronda';
  if (round === 2) return 'Segunda ronda';
  return `Ronda ${round}`;
}

type Row =
  | { kind: 'header'; round: number | null; count: number }
  | { kind: 'pick'; pick: DraftPick };

export default function DraftScreen() {
  const { year } = useLocalSearchParams<{ year?: string }>();

  const { data: years } = useDraftYears();
  const [picked, setPicked] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const activeYear =
    picked ?? (year ? Number(year) : undefined) ?? years?.[0]?.year;

  const { data: picks, isLoading } = useDraftClass(activeYear);

  const rows: Row[] = [];
  let lastRound: number | null | undefined;
  for (const pick of picks ?? []) {
    if (pick.round !== lastRound) {
      lastRound = pick.round;
      rows.push({
        kind: 'header',
        round: pick.round,
        count: (picks ?? []).filter((p) => p.round === pick.round).length,
      });
    }
    rows.push({ kind: 'pick', pick });
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.close}>
          <Ionicons name="close" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Draft</Text>
        <View style={styles.close} />
      </View>

      <View style={styles.yearRow}>
        <SeasonButton
          season={activeYear ? String(activeYear) : undefined}
          onPress={() => setPickerOpen(true)}
        />
      </View>

      {isLoading && <LoadingState message="Cargando draft..." />}

      {!isLoading && rows.length === 0 && (
        <EmptyState
          icon="people-outline"
          title="Sin datos"
          message="No hay selecciones registradas para este año."
        />
      )}

      <FlatList
        data={rows}
        keyExtractor={(r) =>
          r.kind === 'header'
            ? `h-${r.round}`
            : `p-${r.pick.playerId}-${r.pick.overallPick}`
        }
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) =>
          item.kind === 'header' ? (
            <View style={styles.roundHeader}>
              <Text style={styles.roundTitle}>{roundTitle(item.round)}</Text>
              <Text style={styles.roundCount}>{item.count}</Text>
            </View>
          ) : (
            <PickRow pick={item.pick} />
          )
        }
      />

      <SeasonPicker
        visible={pickerOpen}
        title="Año del draft"
        seasons={(years ?? []).map((y) => ({
          season: String(y.year),
          featuredPlayers: y.roy.map((r) => ({ name: r.playerName, photoUrl: r.photoUrl })),
        }))}
        selected={activeYear ? String(activeYear) : undefined}
        onSelect={(s) => {
          setPicked(Number(s));
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </SafeAreaView>
  );
}

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase();
}

function PickRow({ pick }: { pick: DraftPick }) {
  const abrible = pick.hasProfile;

  return (
    <Pressable
      disabled={!abrible}
      onPress={() =>
        router.push({ pathname: '/player/[id]', params: { id: pick.playerId } })
      }
      style={({ pressed }) => [styles.row, pressed && abrible && styles.rowPressed]}
    >
      <Text style={styles.pickNumber}>
        {pick.overallPick && pick.overallPick > 0 ? pick.overallPick : '·'}
      </Text>

      <PlayerAvatar
        photoUrl={pick.photoUrl}
        initials={iniciales(pick.playerName)}
        size={34}
      />

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, !abrible && styles.nameMuted]} numberOfLines={1}>
            {pick.playerName}
          </Text>
          {pick.roySeason && (
            <Trophy award="roy" season={pick.roySeason} size={20} />
          )}
        </View>
        {pick.organization && (
          <Text style={styles.org} numberOfLines={1}>
            {pick.organization}
          </Text>
        )}
      </View>

      <TeamLogo
        logoUrl={pick.teamLogoUrl}
        abbreviation={pick.teamAbbreviation ?? '?'}
        size={26}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  close: { width: 32 },
  title: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontFamily: fontFamily.displayBold,
  },
  yearRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  roundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  roundTitle: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.displayBold,
    letterSpacing: 0.5,
  },
  roundCount: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semibold,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowPressed: { backgroundColor: colors.surface },
  pickNumber: {
    width: 32,
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontFamily: fontFamily.displayBold,
  },
  info: { flex: 1 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    color: colors.text,
    fontSize: fontSize.md,
    fontFamily: fontFamily.displaySemibold,
  },
  nameMuted: { color: colors.textMuted },
  org: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    marginTop: 1,
  },
});
