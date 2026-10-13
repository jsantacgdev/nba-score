import { useEffect, useRef } from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '@/constants/theme';

const SUBIDA_MS = 180;
const SOSTENIDO_MS = 700;
const BAJADA_MS = 2600;

export function NumeroVivo({
  valor,
  activo,
  colorBase,
  colorDestello = colors.primary,
  style,
}: {
  valor: number;
  activo: boolean;
  colorBase: string;
  colorDestello?: string;
  style?: StyleProp<TextStyle>;
}) {
  const brillo = useSharedValue(0);
  const anterior = useRef(valor);

  useEffect(() => {
    if (anterior.current === valor) return;
    const cambio = valor - anterior.current;
    anterior.current = valor;
    if (!activo || cambio <= 0) return;

    brillo.value = 0;
    brillo.value = withSequence(
      withTiming(1, { duration: SUBIDA_MS }),
      withTiming(1, { duration: SOSTENIDO_MS }),
      withTiming(0, { duration: BAJADA_MS }),
    );
  }, [valor, activo, brillo]);

  const animado = useAnimatedStyle(() => ({
    color: interpolateColor(brillo.value, [0, 1], [colorBase, colorDestello]),
    transform: [{ scale: 1 + brillo.value * 0.16 }],
  }));

  return <Animated.Text style={[style, animado]}>{valor}</Animated.Text>;
}
