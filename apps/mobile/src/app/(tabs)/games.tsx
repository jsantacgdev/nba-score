import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GameCard } from '@/components/game/GameCard';
import { DateSelector } from '@/components/game/DateSelector';
import { useGamesByDate } from '@/hooks/useGamesByDate';
import { fetchMostRecentGameDate } from '@/lib/api/games';
import { formatLongDate, isSameDay, startOfDay, formatShortDate } from '@/lib/format';
import { colors, fontSize, fontWeight, spacing } from '@/constants/theme';
import { useRecentDays } from '@/hooks/useRecentDays';

export default function GamesScreen() {
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized) return;

    async function pickInitialDate() {
      try {
        const today = startOfDay(new Date());
        const mostRecent = await fetchMostRecentGameDate();
        if (mostRecent) {
          const recentDay = startOfDay(mostRecent);
          if (recentDay < today) {
            setSelectedDate(recentDay);
          }
        }
      } catch {
        // si falla, dejamos la fecha en hoy
      } finally {
        setInitialized(true);
      }
    }

    pickInitialDate();
  }, [initialized]);

  const { data: games, isLoading, isRefetching, refetch, error } = useGamesByDate(selectedDate);

  const safeGames = games ?? [];
  const liveGames = safeGames.filter((g) => g.status === 'live');
  const finalGames = safeGames.filter((g) => g.status === 'final');
  const scheduledGames = safeGames.filter((g) => g.status === 'scheduled');

  const today = startOfDay(new Date());
  const showRecentDays = isSameDay(selectedDate, today) || safeGames.length === 0;

  const { data: recentDays } = useRecentDays(selectedDate, 4);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.dateHeader}>
        <Text style={styles.dateLabel}>{formatLongDate(selectedDate)}</Text>
      </View>

      <DateSelector selectedDate={selectedDate} onDateChange={setSelectedDate} />
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
            {isLoading && (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            )}

            {error && (
              <View style={styles.centered}>
                <Text style={styles.errorText}>Error al cargar partidos</Text>
                <Text style={styles.errorDetail}>{error.message}</Text>
              </View>
            )}

            {!isLoading && !error && safeGames.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Sin partidos</Text>
                <Text style={styles.emptySubtitle}>No hay partidos programados para este día.</Text>
              </View>
            )}

            {liveGames.length > 0 && (
              <Section title="En vivo" count={liveGames.length} showLiveIndicator>
                {liveGames.map((g) => (
                  <GameCard key={g.id} game={g} />
                ))}
              </Section>
            )}

            {finalGames.length > 0 && (
              <Section title="Finalizados" count={finalGames.length}>
                {finalGames.map((g) => (
                  <GameCard key={g.id} game={g} />
                ))}
              </Section>
            )}

            {scheduledGames.length > 0 && (
              <Section title="Próximos" count={scheduledGames.length}>
                {scheduledGames.map((g) => (
                  <GameCard key={g.id} game={g} />
                ))}
              </Section>
            )}

            {showRecentDays && recentDays && recentDays.length > 0 && (
              <View style={styles.recentDaysSection}>
                <View style={styles.recentDaysHeader}>
                  <Text style={styles.recentDaysTitle}>Días anteriores</Text>
                </View>
                {recentDays.map((day) => (
                  <View key={day.date.toISOString()} style={styles.daySection}>
                    <Text style={styles.daySectionTitle}>{formatShortDate(day.date)}</Text>
                    {day.games.map((g) => (
                      <GameCard key={g.id} game={g} />
                    ))}
                  </View>
                ))}
              </View>
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
  container: { flex: 1, backgroundColor: colors.background },
  dateHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: 0,
    paddingBottom: spacing.xs,
  },
  dateLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    textTransform: 'capitalize',
    letterSpacing: 0.5,
  },
  listContent: { padding: spacing.md },
  centered: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
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
  emptyState: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
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
    paddingHorizontal: spacing.xl,
  },
  section: { marginBottom: spacing.lg },
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
  recentDaysSection: {
    marginTop: spacing.lg,
  },
  recentDaysHeader: {
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.md,
  },
  recentDaysTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  daySection: {
    marginBottom: spacing.lg,
  },
  daySectionTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    textTransform: 'capitalize',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
});
