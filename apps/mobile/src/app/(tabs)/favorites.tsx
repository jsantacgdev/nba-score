import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TeamLogo } from '@/components/ui/TeamLogo';
import { FavoriteTeamButton } from '@/components/ui/FavoriteButton';
import { useFavoriteTeamIds } from '@/hooks/useFavorites';
import { useTeams } from '@/hooks/useTeams';
import { colors, fontSize, fontWeight, radius, spacing } from '@/constants/theme';

export default function FavoritesScreen() {
  const { data: favoriteIds, isLoading: loadingIds } = useFavoriteTeamIds();
  const { data: teams, isLoading: loadingTeams } = useTeams();

  const isLoading = loadingIds || loadingTeams;
  const favoriteTeams = teams?.filter((t) => favoriteIds?.includes(t.id)) ?? [];

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (favoriteTeams.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* <View style={styles.content}>
          <Text style={styles.title}>Favoritos</Text>
        </View> */}
        <View style={styles.empty}>
          <Ionicons name="star-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Aún no tienes favoritos</Text>
          <Text style={styles.emptySubtitle}>
            Marca tus equipos preferidos con la estrella para verlos aquí.
          </Text>
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
        ListHeaderComponent={
          <View style={styles.headerSection}>
            {/* <Text style={styles.title}>Favoritos</Text> */}
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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.md },
  listContent: { padding: spacing.md },
  headerSection: { marginBottom: spacing.lg },
  title: {
    color: colors.text,
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.heavy,
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
    fontWeight: fontWeight.bold,
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
    fontWeight: fontWeight.bold,
  },
  teamConference: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
});
