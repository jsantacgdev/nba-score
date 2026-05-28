import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTeams } from '@/hooks/useTeams';
import { colors, fontSize, fontWeight, radius, spacing } from '@/constants/theme';
import { Image } from 'expo-image';
import { TeamLogo } from '@/components/ui/TeamLogo';

export default function TeamsScreen() {
  const { data: teams, isLoading, error } = useTeams();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando equipos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Error al cargar equipos</Text>
          <Text style={styles.errorDetail}>{error.message}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const eastTeams = teams?.filter((t) => t.conference === 'East') ?? [];
  const westTeams = teams?.filter((t) => t.conference === 'West') ?? [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={
          <View style={styles.content}>
            <Text style={styles.title}>Equipos</Text>

            <View style={styles.section}>
              <Text style={styles.conferenceTitle}>Conferencia Este</Text>
              {eastTeams.map((team) => (
                <Pressable
                  key={team.id}
                  style={({ pressed }) => [styles.teamCard, pressed && styles.teamCardPressed]}
                >
                  <View style={styles.teamLogoPlaceholder}>
                    <TeamLogo logoUrl={team.logoUrl} abbreviation={team.abbreviation} size={48} />
                  </View>
                  <View style={styles.teamInfo}>
                    <Text style={styles.teamCity}>{team.city}</Text>
                    <Text style={styles.teamName}>{team.name}</Text>
                  </View>
                </Pressable>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.conferenceTitle}>Conferencia Oeste</Text>
              {westTeams.map((team) => (
                <Pressable
                  key={team.id}
                  style={({ pressed }) => [styles.teamCard, pressed && styles.teamCardPressed]}
                >
                  <View style={styles.teamLogoPlaceholder}>
                    <TeamLogo logoUrl={team.logoUrl} abbreviation={team.abbreviation} size={48} />
                  </View>
                  <View style={styles.teamInfo}>
                    <Text style={styles.teamCity}>{team.city}</Text>
                    <Text style={styles.teamName}>{team.name}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
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
  title: {
    color: colors.text,
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.heavy,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  conferenceTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
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
  teamCardPressed: {
    opacity: 0.7,
  },
  teamLogoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamLogoText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  teamInfo: {
    flex: 1,
  },
  teamCity: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  teamName: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
});
