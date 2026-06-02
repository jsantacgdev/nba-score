import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { colors, fontSize, fontFamily, spacing } from '@/constants/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type Props = {
  icon?: IoniconName;
  title: string;
  message?: string;
  action?: React.ReactNode;
  compact?: boolean;
};

export function EmptyState({
  icon = 'information-circle-outline',
  title,
  message,
  action,
  compact = false,
}: Props) {
  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <View style={styles.iconWrapper}>
        <Ionicons name={icon} size={compact ? 36 : 48} color={colors.textMuted} />
      </View>
      <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
      {message && <Text style={[styles.message, compact && styles.messageCompact]}>{message}</Text>}
      {action && <View style={styles.actionWrapper}>{action}</View>}
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
  },
  containerCompact: {
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontFamily: fontFamily.displayBold,
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
    maxWidth: 280,
  },
  messageCompact: {
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  actionWrapper: {
    marginTop: spacing.sm,
  },
});
