import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsFavoriteTeam, useToggleFavoriteTeam } from '@/hooks/useFavorites';
import { colors, spacing } from '@/constants/theme';

type Props = {
  teamId: string;
  size?: number;
};

export function FavoriteTeamButton({ teamId, size = 24 }: Props) {
  const isFavorite = useIsFavoriteTeam(teamId);
  const toggle = useToggleFavoriteTeam();

  const handlePress = (e: any) => {
    e.stopPropagation?.(); // evita que el padre Pressable capture el evento
    toggle.mutate({ teamId, isFavorite });
  };

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={8}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
    >
      <Ionicons
        name={isFavorite ? 'star' : 'star-outline'}
        size={size}
        color={isFavorite ? colors.primary : colors.textSecondary}
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
