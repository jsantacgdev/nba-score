import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useIsFavoriteTeam, useToggleFavoriteTeam } from '@/hooks/useFavorites';
import { colors, spacing } from '@/constants/theme';
import * as Haptics from 'expo-haptics';

const AnimatedIonicons = Animated.createAnimatedComponent(Ionicons);

type Props = {
  teamId: string;
  size?: number;
};

export function FavoriteTeamButton({ teamId, size = 24 }: Props) {
  const isFavorite = useIsFavoriteTeam(teamId);
  const toggle = useToggleFavoriteTeam();
  const scale = useSharedValue(1);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    scale.value = withSequence(
      withTiming(1.25, { duration: 120 }),
      withSpring(1, { damping: 15, stiffness: 250 }),
    );
  }, [isFavorite, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = (e: any) => {
    e.stopPropagation?.();
    Haptics.impactAsync(
      isFavorite ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium,
    );
    toggle.mutate({ teamId, isFavorite });
  };

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={8}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
    >
      <AnimatedIonicons
        name={isFavorite ? 'star' : 'star-outline'}
        size={size}
        color={isFavorite ? colors.primary : colors.textSecondary}
        style={animatedStyle}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: spacing.xs,
  },
  buttonPressed: {
    opacity: 0.6,
  },
});
