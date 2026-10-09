import { useEffect, useRef, useState } from 'react';

/**
 * Reloj del partido que avanza segundo a segundo entre lecturas.
 *
 * El marcador se consulta cada 15 segundos, asi que el reloj daba saltos y
 * parecia que la app estuviera parada. Aqui se descuenta en local y se
 * resincroniza con cada dato nuevo.
 *
 * La parte delicada es que el reloj de la NBA se para a todas horas:
 * faltas, tiempos muertos, tiros libres, balon fuera. Descontar a ciegas
 * adelantaria el reloj y luego habria que corregirlo hacia atras, que se
 * ve peor que el salto que queriamos evitar.
 *
 * Por eso solo corre cuando consta que el partido corre: si dos lecturas
 * seguidas traen el mismo valor, es que esta detenido y se congela hasta
 * que vuelva a moverse.
 */

/** "5:42" o "48.5" a segundos. */
function aSegundos(reloj: string): number | null {
  const limpio = reloj.trim();
  if (!limpio) return null;

  if (limpio.includes(':')) {
    const [minutos, segundos] = limpio.split(':');
    const m = Number(minutos);
    const s = Number(segundos);
    return Number.isFinite(m) && Number.isFinite(s) ? m * 60 + s : null;
  }

  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}

/** Bajo el minuto la NBA muestra decimas, como hace su propio marcador. */
function aTexto(segundos: number): string {
  const restante = Math.max(segundos, 0);

  if (restante >= 60) {
    const minutos = Math.floor(restante / 60);
    const resto = Math.floor(restante % 60);
    return `${minutos}:${String(resto).padStart(2, '0')}`;
  }

  return restante.toFixed(1);
}

export function useRelojVivo(
  relojServidor?: string,
  actualizadoEn?: number,
  enVivo = false,
): string | undefined {
  const [segundos, setSegundos] = useState<number | null>(null);
  const ultimoValor = useRef<string | undefined>(undefined);
  const ultimaLectura = useRef<number | undefined>(undefined);
  const corriendo = useRef(false);

  useEffect(() => {
    if (!relojServidor || !enVivo) {
      ultimoValor.current = relojServidor;
      corriendo.current = false;
      setSegundos(null);
      return;
    }

    // Solo interesa cuando llega una lectura nueva, no en cada render
    if (actualizadoEn !== undefined && actualizadoEn === ultimaLectura.current) return;
    ultimaLectura.current = actualizadoEn;

    const cambio = ultimoValor.current !== undefined && relojServidor !== ultimoValor.current;
    corriendo.current = cambio;
    ultimoValor.current = relojServidor;
    setSegundos(aSegundos(relojServidor));
  }, [relojServidor, actualizadoEn, enVivo]);

  useEffect(() => {
    if (!enVivo || segundos === null) return;

    const temporizador = setInterval(() => {
      if (!corriendo.current) return;
      // Nunca por debajo de cero: el final del cuarto lo confirma el servidor
      setSegundos((anterior) => (anterior === null ? null : Math.max(anterior - 1, 0)));
    }, 1000);

    return () => clearInterval(temporizador);
  }, [enVivo, segundos !== null]);

  if (!enVivo) return undefined;
  if (segundos === null) return relojServidor;
  return aTexto(segundos);
}
