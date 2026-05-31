import { Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/constants/theme';

export function SearchButton() {
  return (
    <Pressable
      onPress={() => router.push('/search')}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      hitSlop={8}
    >
      <Ionicons name="search" size={22} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonPressed: {
    opacity: 0.6,
  },
});
