import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { colors, fontSize, fontWeight, radius, spacing } from '@/constants/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type Props = {
  icon?: IoniconName;
  title?: string;
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
};

export function ErrorState({
  icon = 'cloud-offline-outline',
  title = 'Algo ha salido mal',
  message = 'No hemos podido cargar la información. Inténtalo de nuevo en unos segundos.',
  onRetry,
  compact = false,
}: Props) {
  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <View style={[styles.iconWrapper, compact && styles.iconWrapperCompact]}>
        <Ionicons name={icon} size={compact ? 28 : 40} color={colors.danger} />
      </View>
      <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
      {message && <Text style={[styles.message, compact && styles.messageCompact]}>{message}</Text>}
      {onRetry && (
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
        >
          <Ionicons name="refresh" size={16} color={colors.text} />
          <Text style={styles.retryText}>Reintentar</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    gap: spacing.md,
    flex: 1,
  },
  containerCompact: {
    paddingVertical: spacing.lg,
    gap: spacing.sm,
    flex: 0,
  },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  iconWrapperCompact: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  titleCompact: {
    fontSize: fontSize.md,
  },
  message: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  messageCompact: {
    fontSize: fontSize.sm,
    lineHeight: 18,
    maxWidth: 280,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
  },
  retryButtonPressed: {
    opacity: 0.7,
  },
  retryText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});
