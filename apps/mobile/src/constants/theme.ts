// apps/mobile/src/constants/theme.ts
import { Platform } from 'react-native';

export const colors = {
  background: '#0E1117',
  surface: '#1F242E', // subido de '#1A1D24'
  surfaceLight: '#2A3140', // subido de '#252932'

  border: '#363B45', // subido de '#2A2F38'
  borderStrong: '#454C58', // subido de '#3A4049'

  // Primary (ámbar quemado)
  primary: '#E89154',
  primaryDark: '#C77439',
  primaryLight: '#F0A876',

  // Secondary (azul acero)
  secondary: '#5A8FB8',

  // Texto
  text: '#E8E6E1',
  textSecondary: '#A8A8A0',
  textMuted: '#6B6E78',

  // Semánticos
  success: '#5DAB85',
  warning: '#D9B056',
  danger: '#D16464',

  // Sombras
  shadow: 'rgba(0, 0, 0, 0.5)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
};

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  heavy: '800' as const,
};

export const fontFamily = {
  // UI (text, labels, buttons)
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  heavy: 'Inter_800ExtraBold',

  // Texts
  displayMedium: 'Sora_500Medium',
  displaySemibold: 'Sora_600SemiBold',
  displayBold: 'Sora_700Bold',
};
