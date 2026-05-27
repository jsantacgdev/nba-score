export const colors = {
  // Fondos
  background: '#0A0E1A',
  surface: '#141925',
  surfaceLight: '#1E2535',
  
  // Texto
  text: '#FFFFFF',
  textSecondary: '#9BA3B4',
  textMuted: '#5C6478',
  
  // Acentos
  primary: '#FF6B35',      // naranja NBA
  secondary: '#1D428A',    // azul NBA
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  
  // Bordes
  border: '#252B3D',
  borderLight: '#2F3649',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  heavy: '800' as const,
};