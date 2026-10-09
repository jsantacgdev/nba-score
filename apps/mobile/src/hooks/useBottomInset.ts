import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '@/constants/theme';

/**
 * Relleno inferior para que el contenido no acabe debajo de la barra de
 * gestos del movil.
 *
 * Lo necesitan las pantallas que se abren encima de las pestañas, porque
 * ahi no hay barra inferior que reserve ese hueco: en las de pestaña lo
 * hace el propio tabBar.
 */
export function usePaddingInferior(extra: number = spacing.xl) {
  const insets = useSafeAreaInsets();
  return { paddingBottom: insets.bottom + extra };
}
