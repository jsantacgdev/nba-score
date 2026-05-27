import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { colors, fontSize, fontWeight, spacing } from '@/constants/theme';

export default function GameDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Detalle del partido</Text>
      <Text style={styles.id}>Game ID: {id}</Text>
      <Text style={styles.placeholder}>
        Aquí mostraremos el box score completo, stats por jugador y el MVP del partido.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.sm,
  },
  id: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginBottom: spacing.lg,
  },
  placeholder: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    lineHeight: 22,
  },
});