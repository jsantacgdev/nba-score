import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GameCard } from '@/components/game/GameCard';
import { useTodayGames } from '@/hooks/useTodayGames';
import { colors, fontSize, fontWeight, spacing } from '@/constants/theme';

export default function TodayScreen() {
  const { data, isLoading, isRefetching, refetch, error } = useTodayGames();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando partidos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Error al cargar partidos</Text>
          <Text style={styles.errorDetail}>{error.message}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const games = data?.games ?? [];
  const isToday = data?.isToday ?? true;
  const displayDate = data?.date ?? new Date();

  const liveGames = games.filter((g) => g.status === 'live');
  const finalGames = games.filter((g) => g.status === 'final');
  const scheduledGames = games.filter((g) => g.status === 'scheduled');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={[]}
        renderItem={null}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title}>{isToday ? 'Hoy' : 'Últimos partidos'}</Text>
              <Text style={styles.subtitle}>
                {displayDate.toLocaleDateString('es-ES', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </Text>
            </View>

            {games.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No hay partidos</Text>
                <Text style={styles.emptySubtitle}>
                  No se han encontrado partidos en la base de datos.
                </Text>
              </View>
            )}

            {liveGames.length > 0 && (
              <Section title="En vivo" count={liveGames.length} showLiveIndicator>
                {liveGames.map((g, i) => (
                  <GameCard key={g.id} game={g} index={i} />
                ))}
              </Section>
            )}

            {finalGames.length > 0 && (
              <Section title="Finalizados" count={finalGames.length}>
                {finalGames.map((g, i) => (
                  <GameCard key={g.id} game={g} index={i} />
                ))}
              </Section>
            )}

            {scheduledGames.length > 0 && (
              <Section title="Próximos" count={scheduledGames.length}>
                {scheduledGames.map((g, i) => (
                  <GameCard key={g.id} game={g} index={i} />
                ))}
              </Section>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

function Section({
  title,
  count,
  showLiveIndicator,
  children,
}: {
  title: string;
  count: number;
  showLiveIndicator?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        {showLiveIndicator && <View style={styles.liveIndicator} />}
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionCount}>{count}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  errorDetail: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  content: {
    padding: spacing.md,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.heavy,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    marginTop: spacing.xs,
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
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
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    flex: 1,
  },
  sectionCount: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});
