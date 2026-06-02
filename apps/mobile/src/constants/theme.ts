// apps/mobile/src/constants/theme.ts
import { Platform } from 'react-native';

export const colors = {
  // Fondos
  background: '#0E1117',
  surface: '#1A1D24',
  surfaceLight: '#252932',

  // Bordes
  border: '#2A2F38',
  borderStrong: '#3A4049',

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

export const shadows = {
  // Sombra sutil para tarjetas (lo que más usaremos)
  card: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
    },
    android: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
    },
    default: {},
  }),

  // Sombra más pronunciada para elementos destacados (MVP, modales)
  raised: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
    },
    android: {
      elevation: 6,
    },
    default: {},
  }),

  // Sombra muy suave para elementos pequeños (botones, badges)
  subtle: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
    },
    android: {
      elevation: 1,
    },
    default: {},
  }),
};
