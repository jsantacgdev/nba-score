import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing } from '@/constants/theme';

type Props = {
  message?: string;
  variant?: 'ball' | 'spinner';
  compact?: boolean;
};

export function LoadingState({ message, variant = 'ball', compact = false }: Props) {
  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {variant === 'ball' ? (
        <SpinningBall size={compact ? 36 : 48} />
      ) : (
        <ActivityIndicator size={compact ? 'small' : 'large'} color={colors.primary} />
      )}
      {message && <Text style={[styles.message, compact && styles.messageCompact]}>{message}</Text>}
    </View>
  );
}

function SpinningBall({ size }: { size: number }) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 1200,
        easing: Easing.linear,
      }),
      -1,
      false,
    );

    return () => {
      cancelAnimation(rotation);
    };
  }, [rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Ionicons name="basketball" size={size} color={colors.primary} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
    flex: 1,
  },
  containerCompact: {
    paddingVertical: spacing.lg,
    gap: spacing.sm,
    flex: 0,
  },
  message: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },
  messageCompact: {
    fontSize: fontSize.sm,
  },
});
