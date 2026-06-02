import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TeamLogo } from '@/components/ui/TeamLogo';
import { FavoriteTeamButton } from '@/components/ui/FavoriteButton';
import { useFavoriteTeamIds } from '@/hooks/useFavorites';
import { useTeams } from '@/hooks/useTeams';
import { colors, fontSize, fontFamily, radius, spacing, shadows } from '@/constants/theme';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchButton } from '@/components/ui/SearchButton';
import { LoadingState } from '@/components/ui/LoadingState';
import { RefreshControl } from 'react-native-gesture-handler';

export default function FavoritesScreen() {
  const {
    data: favoriteIds,
    isLoading: loadingIds,
    refetch: refetchFavorites,
    isRefetching: refetchingFavorites,
  } = useFavoriteTeamIds();

  const {
    data: teams,
    isLoading: loadingTeams,
    refetch: refetchTeams,
    isRefetching: refetchingTeams,
  } = useTeams();

  const isLoading = loadingIds || loadingTeams;
  const isRefetching = refetchingFavorites || refetchingTeams;
  const favoriteTeams = teams?.filter((t) => favoriteIds?.includes(t.id)) ?? [];

  const handleRefresh = () => {
    refetchFavorites();
    refetchTeams();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LoadingState message="Cargando favoritos..." />
      </SafeAreaView>
    );
  }

  if (favoriteTeams.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Favoritos</Text>
          <SearchButton />
        </View>
        <View style={styles.emptyWrapper}>
          <EmptyState
            icon="star-outline"
            title="Aún no tienes favoritos"
            message="Marca tus equipos preferidos con la estrella para verlos aquí."
            action={
              <Pressable
                onPress={() => router.push('/(tabs)/teams')}
                style={({ pressed }) => [
                  styles.actionButton,
                  pressed && styles.actionButtonPressed,
                ]}
              >
                <Text style={styles.actionButtonText}>Explorar equipos</Text>
              </Pressable>
            }
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={favoriteTeams}
        keyExtractor={(t) => t.id}
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
          <View style={styles.headerSection}>
            <Text style={styles.title}>Favoritos</Text>
            <Text style={styles.subtitle}>
              {favoriteTeams.length}{' '}
              {favoriteTeams.length === 1 ? 'equipo seguido' : 'equipos seguidos'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/team/[id]', params: { id: item.id } })}
            style={({ pressed }) => [styles.teamCard, pressed && styles.teamCardPressed]}
          >
            <TeamLogo logoUrl={item.logoUrl} abbreviation={item.abbreviation} size={56} />
            <View style={styles.teamInfo}>
              <Text style={styles.teamCity}>{item.city}</Text>
              <Text style={styles.teamName}>{item.name}</Text>
              <Text style={styles.teamConference}>
                Conferencia {item.conference === 'East' ? 'Este' : 'Oeste'}
              </Text>
            </View>
            <FavoriteTeamButton teamId={item.id} size={22} />
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  listContent: { padding: spacing.md },
  headerSection: { marginBottom: spacing.lg },
  title: {
    color: colors.text,
    fontSize: fontSize.xxxl,
    fontFamily: fontFamily.displayBold,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    marginTop: spacing.xs,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontFamily: fontFamily.displayBold,
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  teamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    ...shadows.card,
  },
  teamCardPressed: { opacity: 0.7 },
  teamInfo: { flex: 1 },
  teamCity: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  teamName: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontFamily: fontFamily.displayBold,
  },
  teamConference: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  emptyWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  actionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  actionButtonPressed: {
    opacity: 0.85,
  },
  actionButtonText: {
    color: colors.background,
    fontSize: fontSize.md,
    fontFamily: fontFamily.displayBold,
  },
});
