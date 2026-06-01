import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { TeamLogo } from '@/components/ui/TeamLogo';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { FavoriteTeamButton } from '@/components/ui/FavoriteButton';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useTeam, useTeamRoster, useTeamSeasonStats } from '@/hooks/useTeamRoster';
import { getPositionName } from '@/constants/positions';
import { colors, fontFamily, fontSize, radius, spacing } from '@/constants/theme';
import type { Player, PlayerSeasonStats } from '@/types/domain';

export default function TeamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const teamId = id ?? '';

  const { data: team, refetch: refetchTeam } = useTeam(teamId);
  const {
    data: roster,
    isLoading,
    error,
    refetch: refetchRoster,
    isRefetching,
  } = useTeamRoster(teamId);
  const { data: seasonStats, refetch: refetchStats } = useTeamSeasonStats(teamId);

  const handleRefresh = () => {
    refetchTeam();
    refetchRoster();
    refetchStats();
  };

  if (isLoading) {
    return <LoadingState message="Cargando plantilla..." />;
  }

  if (error) {
    return <ErrorState title="No se puede cargar la plantilla" onRetry={refetchRoster} />;
  }

  // Indexar stats por jugador
  const statsByPlayer = new Map<string, PlayerSeasonStats>();
  for (const s of seasonStats ?? []) {
    statsByPlayer.set(s[0], s[1]);
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: team?.fullName ?? 'Equipo',
        }}
      />
      <FlatList
        style={styles.container}
        data={roster ?? []}
        keyExtractor={(p) => p.id}
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
          team ? (
            <View style={styles.header}>
              <TeamLogo logoUrl={team.logoUrl} abbreviation={team.abbreviation} size={100} />
              <Text style={styles.teamCity}>{team.city}</Text>
              <Text style={styles.teamName}>{team.name}</Text>
              <View style={styles.headerMeta}>
                <View style={styles.conferenceBadge}>
                  <Text style={styles.conferenceBadgeText}>
                    {team.conference === 'East' ? 'Conferencia Este' : 'Conferencia Oeste'}
                  </Text>
                </View>
                <FavoriteTeamButton teamId={team.id} size={28} />
              </View>
              <Text style={styles.sectionTitle}>Plantilla</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => <RosterRow player={item} stats={statsByPlayer.get(item.id)} />}
      />
    </>
  );
}

function RosterRow({ player, stats }: { player: Player; stats?: PlayerSeasonStats }) {
  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/player/[id]',
          params: { id: player.id },
        })
      }
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <PlayerAvatar
        photoUrl={player.photoUrl}
        initials={`${player.firstName[0] ?? ''}${player.lastName[0] ?? ''}`}
        size={48}
      />
      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>
          {player.firstName} {player.lastName}
        </Text>
        <View style={styles.rowMeta}>
          {player.jerseyNumber && <Text style={styles.rowMetaText}>#{player.jerseyNumber}</Text>}
          {player.jerseyNumber && player.position && <Text style={styles.rowDivider}>·</Text>}
          {player.position && (
            <Text style={styles.rowMetaText}>{getPositionName(player.position)}</Text>
          )}
        </View>
        {stats && stats.gamesPlayed > 0 && (
          <View style={styles.statsInline}>
            <Text style={styles.statInlineValue}>{stats.points.toFixed(1)}</Text>
            <Text style={styles.statInlineLabel}>PTS</Text>
            <Text style={styles.statInlineValue}>{stats.rebounds.toFixed(1)}</Text>
            <Text style={styles.statInlineLabel}>REB</Text>
            <Text style={styles.statInlineValue}>{stats.assists.toFixed(1)}</Text>
            <Text style={styles.statInlineLabel}>AST</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: spacing.md },

  // Cabecera
  header: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  teamCity: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontFamily: fontFamily.medium,
    marginTop: spacing.md,
  },
  teamName: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontFamily: fontFamily.displayBold,
    marginTop: spacing.xs,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  conferenceBadge: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  conferenceBadgeText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    marginTop: spacing.xl,
    alignSelf: 'flex-start',
  },

  // Fila de jugador
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    color: colors.text,
    fontSize: fontSize.md,
    fontFamily: fontFamily.semibold,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  rowMetaText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
  },
  rowDivider: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  statsInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  statInlineValue: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.displaySemibold,
  },
  statInlineLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.medium,
    marginRight: spacing.xs,
  },
});
