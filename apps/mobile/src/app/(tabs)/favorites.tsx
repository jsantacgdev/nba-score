import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { GameCard } from '@/components/game/GameCard';
import { SearchButton } from '@/components/ui/SearchButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useFavoriteTeamIds } from '@/hooks/useFavorites';
import { useFavoritesTimeline } from '@/hooks/useFavoritesTimeline';
import { colors, fontFamily, fontSize, radius, spacing } from '@/constants/theme';

export default function FavoritesScreen() {
  const { data: favoriteIds = [], isLoading: loadingIds } = useFavoriteTeamIds();
  const {
    data: games,
    isLoading: loadingGames,
    error,
    refetch,
    isRefetching,
  } = useFavoritesTimeline();

  const isLoading = loadingIds || loadingGames;

  // Separar partidos en próximos y pasados
  const now = new Date();
  const upcoming = (games ?? [])
    .filter((g) => g.startsAt >= now || g.status === 'live')
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const past = (games ?? [])
    .filter((g) => g.startsAt < now && g.status !== 'live')
    .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Favoritos</Text>
        <SearchButton />
      </View>

      {/* Estado: cargando */}
      {isLoading && favoriteIds.length > 0 && <LoadingState message="Cargando partidos..." />}

      {/* Estado: error */}
      {error && (
        <ErrorState
          title="No se pueden cargar los partidos"
          message="Comprueba tu conexión e inténtalo de nuevo."
          onRetry={refetch}
        />
      )}

      {/* Estado: sin equipos favoritos */}
      {!isLoading && favoriteIds.length === 0 && (
        <View style={styles.emptyWrapper}>
          <EmptyState
            icon="star-outline"
            title="Aún no sigues ningún equipo"
            message="Ve a Equipos y marca tus preferidos con la estrella para verlos aquí."
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
      )}

      {/* Estado: con equipos pero sin partidos */}
      {!isLoading &&
        !error &&
        favoriteIds.length > 0 &&
        upcoming.length === 0 &&
        past.length === 0 && (
          <View style={styles.emptyWrapper}>
            <EmptyState
              icon="calendar-outline"
              title="Sin partidos cercanos"
              message="No hay partidos de tus equipos favoritos en las próximas semanas."
            />
          </View>
        )}

      {/* Lista de partidos */}
      {!isLoading &&
        !error &&
        favoriteIds.length > 0 &&
        (upcoming.length > 0 || past.length > 0) && (
          <FlatList
            data={[]}
            renderItem={null}
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
                {/* Próximos partidos */}
                {upcoming.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Próximos partidos</Text>
                    {upcoming.map((g, i) => (
                      <GameCard key={g.id} game={g} index={i} showDate />
                    ))}
                  </View>
                )}

                {/* Pasados */}
                {past.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Últimos partidos</Text>
                    {past.map((g, i) => (
                      <GameCard key={g.id} game={g} index={i} showDate />
                    ))}
                  </View>
                )}
              </View>
            }
          />
        )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xxxl,
    fontFamily: fontFamily.displayBold,
  },
  listContent: {
    padding: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontFamily: fontFamily.displayBold,
    marginBottom: spacing.md,
  },
  emptyWrapper: {
    flex: 1,
    justifyContent: 'center',
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
    fontFamily: fontFamily.bold,
  },
});
