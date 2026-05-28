import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, fontWeight, radius } from '@/constants/theme';

type Props = {
  logoUrl?: string;
  abbreviation: string;
  size?: number;
};

export function TeamLogo({ logoUrl, abbreviation, size = 48 }: Props) {
  if (!logoUrl) {
    return (
      <View style={[styles.placeholder, { width: size, height: size, borderRadius: radius.full }]}>
        <Text style={styles.placeholderText}>{abbreviation}</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: logoUrl }}
      style={{ width: size, height: size }}
      contentFit="contain"
      transition={200}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
});
