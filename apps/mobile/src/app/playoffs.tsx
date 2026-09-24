import { useMemo } from 'react';
import { ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { TeamLogo } from '@/components/ui/TeamLogo';
import { Trophy } from '@/components/ui/Trophy';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { usePlayoffBracket } from '@/hooks/usePlayoffBracket';
import { colors, fontFamily, fontSize, radius, spacing } from '@/constants/theme';
import type { PlayoffSeries } from '@/types/domain';

const ANCHO_TARJETA = 112;
const HUECO = 12;
const PASO = ANCHO_TARJETA + HUECO;
const ALTO_TARJETA = 58;
const ALTO_ENLACE = 34;
const ALTO_FILA = ALTO_TARJETA + ALTO_ENLACE;
const ANCHO_ETIQUETAS = 58;
const GROSOR = 2;

const RONDAS: Record<number, string> = {
  1: '1ª ronda',
  2: 'Semis',
  3: 'F. conf.',
  4: 'FINAL',
};

type Lado = 'este' | 'final' | 'oeste';

type Nodo = {
  serie: PlayoffSeries;
  hijos: Nodo[];
  hueco: number;
  fila: number;
};

type Etiqueta = {
  fila: number;
  texto: string;
  conferencia: string | null;
  destacada: boolean;
};

function ladoDe(serie: PlayoffSeries): Lado {
  if (serie.conference === 'East') return 'este';
  if (serie.conference === 'West') return 'oeste';
  return 'final';
}

function construirCuadro(series: PlayoffSeries[]) {
  const clave = (s: PlayoffSeries) => `${s.round}:${s.teamA.id}-${s.teamB.id}`;

  const porRonda = new Map<number, PlayoffSeries[]>();
  for (const s of series) {
    const lista = porRonda.get(s.round) ?? [];
    lista.push(s);
    porRonda.set(s.round, lista);
  }

  const hijosDe = new Map<string, PlayoffSeries[]>();
  const esHijo = new Set<string>();
  for (const s of series) {
    const previas = porRonda.get(s.round - 1) ?? [];
    const suyos = previas.filter((p) => {
      const ganador = p.decided ? p.teamA.id : null;
      return ganador === s.teamA.id || ganador === s.teamB.id;
    });
    if (suyos.length > 0) {
      hijosDe.set(clave(s), [...suyos].sort((a, b) => a.order - b.order));
      for (const h of suyos) esHijo.add(clave(h));
    }
  }

  const rondasDe = (lado: Lado) =>
    [...new Set(series.filter((s) => ladoDe(s) === lado).map((s) => s.round))].sort(
      (a, b) => a - b,
    );

  const rondasEste = rondasDe('este');
  const rondasOeste = rondasDe('oeste');
  const hayFinal = series.some((s) => ladoDe(s) === 'final');

  const filaEste = new Map(rondasEste.map((r, i) => [r, i]));
  const filaFinal = rondasEste.length;
  const arranqueOeste = filaFinal + (hayFinal ? 1 : 0);
  const filaOeste = new Map(
    [...rondasOeste].reverse().map((r, i) => [r, arranqueOeste + i]),
  );

  const filaDe = (s: PlayoffSeries) => {
    const lado = ladoDe(s);
    if (lado === 'este') return filaEste.get(s.round) ?? 0;
    if (lado === 'final') return filaFinal;
    return filaOeste.get(s.round) ?? arranqueOeste;
  };

  const contadores = { este: 0, oeste: 0 };
  const nodos: Nodo[] = [];
  const visitadas = new Set<string>();

  function bajar(serie: PlayoffSeries): Nodo {
    visitadas.add(clave(serie));
    const hijos = (hijosDe.get(clave(serie)) ?? []).map(bajar);
    const lado = ladoDe(serie);
    const hueco =
      hijos.length > 0
        ? hijos.reduce((suma, h) => suma + h.hueco, 0) / hijos.length
        : contadores[lado === 'oeste' ? 'oeste' : 'este']++;
    const nodo: Nodo = { serie, hijos, hueco, fila: filaDe(serie) };
    nodos.push(nodo);
    return nodo;
  }

  const raices = series
    .filter((s) => !esHijo.has(clave(s)))
    .sort((a, b) => b.round - a.round || a.order - b.order);

  for (const raiz of raices) bajar(raiz);
  for (const s of series) {
    if (!visitadas.has(clave(s))) bajar(s);
  }

  const etiquetas: Etiqueta[] = [];
  rondasEste.forEach((r, i) => {
    etiquetas.push({
      fila: i,
      texto: RONDAS[r] ?? `Ronda ${r}`,
      conferencia: i === 0 ? 'ESTE' : null,
      destacada: false,
    });
  });
  if (hayFinal) {
    etiquetas.push({ fila: filaFinal, texto: 'FINAL', conferencia: null, destacada: true });
  }
  [...rondasOeste].reverse().forEach((r, i) => {
    etiquetas.push({
      fila: arranqueOeste + i,
      texto: RONDAS[r] ?? `Ronda ${r}`,
      conferencia: i === rondasOeste.length - 1 ? 'OESTE' : null,
      destacada: false,
    });
  });

  return {
    nodos,
    etiquetas,
    huecos: Math.max(contadores.este, contadores.oeste, 1),
    filas: arranqueOeste + rondasOeste.length,
  };
}

export default function PlayoffsScreen() {
  const { season } = useLocalSearchParams<{ season?: string }>();
  const { data, isLoading } = usePlayoffBracket(season);

  const series = useMemo(() => data ?? [], [data]);
  const { nodos, etiquetas, huecos, filas } = useMemo(() => construirCuadro(series), [series]);

  const centroDe = (hueco: number) => hueco * PASO + PASO / 2;
  const anchoLienzo = Math.max(huecos * PASO, PASO);
  const altoLienzo = Math.max(filas * ALTO_FILA - ALTO_ENLACE, ALTO_TARJETA);

  return (
    <>
      <Stack.Screen options={{ title: `Playoffs ${season ?? ''}` }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.vertical}>
        {isLoading && <LoadingState message="Cargando el cuadro..." />}

        {!isLoading && series.length === 0 && (
          <EmptyState
            icon="git-network-outline"
            title="Sin playoffs"
            message="No consta ninguna eliminatoria de esta temporada."
            compact
          />
        )}

        {series.length > 0 && (
          <View style={styles.lienzo}>
            <View style={{ width: ANCHO_ETIQUETAS, height: altoLienzo }}>
              {etiquetas.map((e) => (
                <View key={e.fila} style={[styles.etiqueta, { top: e.fila * ALTO_FILA + 8 }]}>
                  {e.conferencia && (
                    <Text style={styles.conferencia}>{e.conferencia}</Text>
                  )}
                  <Text style={[styles.rondaTexto, e.destacada && styles.rondaTextoFinal]}>
                    {e.texto}
                  </Text>
                </View>
              ))}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator
              contentContainerStyle={styles.horizontal}
            >
              <View style={{ width: anchoLienzo, height: altoLienzo }}>
                {nodos.map((nodo) =>
                  nodo.hijos.map((hijo) => {
                    const bajando = hijo.fila < nodo.fila;
                    return (
                      <Enlace
                        key={`${hijo.serie.round}-${hijo.serie.teamA.id}-${hijo.serie.teamB.id}`}
                        xHijo={centroDe(hijo.hueco)}
                        xPadre={centroDe(nodo.hueco)}
                        yHijo={
                          bajando
                            ? hijo.fila * ALTO_FILA + ALTO_TARJETA
                            : hijo.fila * ALTO_FILA
                        }
                        yPadre={
                          bajando
                            ? nodo.fila * ALTO_FILA
                            : nodo.fila * ALTO_FILA + ALTO_TARJETA
                        }
                      />
                    );
                  }),
                )}

                {nodos.map((nodo) => (
                  <View
                    key={`${nodo.serie.round}-${nodo.serie.teamA.id}-${nodo.serie.teamB.id}`}
                    style={[
                      styles.posicion,
                      {
                        left: centroDe(nodo.hueco) - ANCHO_TARJETA / 2,
                        top: nodo.fila * ALTO_FILA,
                      },
                    ]}
                  >
                    <TarjetaSerie serie={nodo.serie} season={season} />
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </>
  );
}

function Enlace({
  xHijo,
  xPadre,
  yHijo,
  yPadre,
}: {
  xHijo: number;
  xPadre: number;
  yHijo: number;
  yPadre: number;
}) {
  const medio = (yHijo + yPadre) / 2;
  const ancho = Math.abs(xPadre - xHijo);

  return (
    <>
      <View
        style={[
          styles.linea,
          {
            left: xHijo - GROSOR / 2,
            top: Math.min(yHijo, medio),
            width: GROSOR,
            height: Math.abs(medio - yHijo),
          },
        ]}
      />
      {ancho > 0 && (
        <View
          style={[
            styles.linea,
            {
              left: Math.min(xHijo, xPadre),
              top: medio - GROSOR / 2,
              width: ancho,
              height: GROSOR,
            },
          ]}
        />
      )}
      <View
        style={[
          styles.linea,
          {
            left: xPadre - GROSOR / 2,
            top: Math.min(medio, yPadre),
            width: GROSOR,
            height: Math.abs(yPadre - medio),
          },
        ]}
      />
    </>
  );
}

function TarjetaSerie({ serie, season }: { serie: PlayoffSeries; season?: string }) {
  return (
    <View style={[styles.tarjeta, ladoDe(serie) === 'final' && styles.tarjetaFinal]}>
      <LadoEquipo
        equipo={serie.teamA}
        season={season}
        ganador={serie.decided}
        trofeo={ladoDe(serie) === 'final' && serie.champion}
      />
      <View style={styles.separador} />
      <LadoEquipo equipo={serie.teamB} season={season} ganador={false} />
    </View>
  );
}

function LadoEquipo({
  equipo,
  season,
  ganador,
  trofeo = false,
}: {
  equipo: PlayoffSeries['teamA'];
  season?: string;
  ganador: boolean;
  trofeo?: boolean;
}) {
  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/team/[id]', params: { id: equipo.id, season: season ?? '' } })
      }
      style={({ pressed }) => [styles.lado, pressed && styles.ladoPressed]}
    >
      <TeamLogo logoUrl={equipo.logoUrl} abbreviation={equipo.abbreviation} size={18} />
      <Text style={[styles.abbr, ganador && styles.abbrGanador]} numberOfLines={1}>
        {equipo.abbreviation}
      </Text>
      {trofeo && <Trophy award="champion" season={season ?? ''} size={13} />}
      <Text style={[styles.wins, ganador && styles.winsGanador]}>{equipo.wins}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  vertical: { paddingVertical: spacing.md, paddingBottom: spacing.xxl },
  horizontal: { paddingRight: spacing.md, paddingBottom: spacing.md },
  lienzo: { flexDirection: 'row', paddingLeft: spacing.sm },
  etiqueta: {
    position: 'absolute',
    left: 0,
    width: ANCHO_ETIQUETAS,
  },
  conferencia: {
    color: colors.secondary,
    fontSize: 9,
    fontFamily: fontFamily.displayBold,
    letterSpacing: 1,
  },
  rondaTexto: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.displaySemibold,
  },
  rondaTextoFinal: { color: colors.primary },
  posicion: {
    position: 'absolute',
    width: ANCHO_TARJETA,
    height: ALTO_TARJETA,
  },
  linea: {
    position: 'absolute',
    backgroundColor: colors.borderStrong,
  },
  tarjeta: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  tarjetaFinal: { borderColor: colors.primary },
  separador: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
  lado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  ladoPressed: { opacity: 0.6 },
  abbr: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.displaySemibold,
    letterSpacing: 0.5,
  },
  abbrGanador: {
    color: colors.text,
    fontFamily: fontFamily.displayBold,
  },
  wins: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.displayBold,
    minWidth: 11,
    textAlign: 'right',
  },
  winsGanador: { color: colors.primary },
});
