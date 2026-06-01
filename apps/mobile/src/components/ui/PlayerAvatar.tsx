import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, fontFamily, radius } from '@/constants/theme';

type Props = {
  photoUrl?: string;
  initials: string;
  size?: number;
};

export function PlayerAvatar({ photoUrl, initials, size = 48 }: Props) {
  if (!photoUrl) {
    return (
      <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={styles.placeholderText}>{initials}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.imageWrapper, { width: size, height: size, borderRadius: size / 2 }]}>
      <Image
        source={{ uri: photoUrl }}
        style={{ width: size, height: size }}
        contentFit="cover"
        transition={200}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  imageWrapper: {
    overflow: 'hidden',
    backgroundColor: colors.surfaceLight,
  },
  placeholder: {
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.displayBold,
  },
});
