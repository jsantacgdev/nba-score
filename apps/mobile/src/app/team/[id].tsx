import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { useTeam, useTeamRoster, useTeamSeasonStats } from '@/hooks/useTeamRoster';
import { colors, fontSize, fontWeight, radius, spacing } from '@/constants/theme';
import { FavoriteTeamButton } from '@/components/ui/FavoriteButton';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { RefreshControl } from 'react-native-gesture-handler';

export default function TeamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: team, refetch: refetchTeam } = useTeam(id);
  const {
    data: roster,
    isLoading,
    error,
    refetch: refetchRoster,
    isRefetching,
  } = useTeamRoster(id);
  const { data: seasonStats, refetch: refetchStats } = useTeamSeasonStats(id);

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

  return (
    <FlatList
      style={styles.container}
      data={roster}
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
          <View style={styles.teamHeader}>
            {team.logoUrl && (
              <Image
                source={{ uri: team.logoUrl }}
                style={styles.teamHeaderLogo}
                contentFit="contain"
                transition={200}
              />
            )}
            <View style={styles.teamNameRow}>
              <Text style={styles.teamHeaderName}>{team.fullName}</Text>
              <FavoriteTeamButton teamId={team.id} size={28} />
            </View>
            <Text style={styles.teamHeaderConf}>
              Conferencia {team.conference === 'East' ? 'Este' : 'Oeste'}
            </Text>
            <Text style={styles.rosterCount}>{roster?.length ?? 0} jugadores</Text>
          </View>
        ) : null
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push(`/player/${item.id}`)}
          style={({ pressed }) => [styles.playerCard, pressed && styles.playerCardPressed]}
        >
          <PlayerAvatar
            photoUrl={item.photoUrl}
            initials={`${item.firstName[0] ?? ''}${item.lastName[0] ?? ''}`}
            size={52}
          />
          <View style={styles.playerInfo}>
            <Text style={styles.playerName}>
              {item.firstName} {item.lastName}
            </Text>
            <Text style={styles.playerMeta}>{item.position ?? 'N/A'}</Text>
            {(() => {
              const s = seasonStats?.get(item.id);
              if (!s || s.gamesPlayed === 0) return null;
              return (
                <View style={styles.statsRow}>
                  <Text style={styles.statText}>{s.points} PTS</Text>
                  <Text style={styles.statDivider}>·</Text>
                  <Text style={styles.statText}>{s.rebounds} REB</Text>
                  <Text style={styles.statDivider}>·</Text>
                  <Text style={styles.statText}>{s.assists} AST</Text>
                </View>
              );
            })()}
          </View>
          {item.jerseyNumber && <Text style={styles.jersey}>#{item.jerseyNumber}</Text>}
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.md,
  },
  teamHeader: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
  },
  teamHeaderLogo: {
    width: 96,
    height: 96,
    marginBottom: spacing.md,
  },
  teamHeaderName: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.heavy,
    textAlign: 'center',
  },
  teamHeaderConf: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  rosterCount: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  playerCardPressed: {
    opacity: 0.7,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  playerMeta: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  jersey: {
    color: colors.textSecondary,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  statText: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  statDivider: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  teamNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
