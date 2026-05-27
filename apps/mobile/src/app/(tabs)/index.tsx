import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GameCard } from '@/components/game/GameCard';
import { mockGames } from '@/lib/mockData';
import { colors, fontSize, fontWeight, spacing } from '@/constants/theme';

export default function TodayScreen() {
  const liveGames = mockGames.filter((g) => g.status === 'live');
  const finalGames = mockGames.filter((g) => g.status === 'final');
  const upcomingGames = mockGames.filter((g) => g.status === 'scheduled');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title}>Hoy</Text>
              <Text style={styles.subtitle}>
                {new Date().toLocaleDateString('es-ES', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </Text>
            </View>

            {liveGames.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.liveIndicator} />
                  <Text style={styles.sectionTitle}>En vivo</Text>
                  <Text style={styles.sectionCount}>{liveGames.length}</Text>
                </View>
                {liveGames.map((game) => (
                  <GameCard key={game.id} game={game} />
                ))}
              </View>
            )}

            {finalGames.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Finalizados</Text>
                  <Text style={styles.sectionCount}>{finalGames.length}</Text>
                </View>
                {finalGames.map((game) => (
                  <GameCard key={game.id} game={game} />
                ))}
              </View>
            )}

            {upcomingGames.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Próximos</Text>
                  <Text style={styles.sectionCount}>{upcomingGames.length}</Text>
                </View>
                {upcomingGames.map((game) => (
                  <GameCard key={game.id} game={game} />
                ))}
              </View>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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