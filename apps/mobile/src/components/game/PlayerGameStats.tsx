import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { TeamLogo } from '@/components/ui/TeamLogo';
import { usePaddingInferior } from '@/hooks/useBottomInset';
import { formatMinutes } from '@/lib/format';
import type { LineaCuarto } from '@/lib/liveBoxScore';
import { colors, fontFamily, fontSize, radius, spacing } from '@/constants/theme';
import type { GameBoxScoreEntry } from '@/types/domain';

const ALTO_FILA = 30;
const ANCHO_ETIQUETA = 46;
const ANCHO_CUARTO = 54;
const ANCHO_TOTAL = 62;

type Fila = {
  etiqueta: string;
  cuarto: (c: LineaCuarto) => string;
  total: (j: GameBoxScoreEntry) => string;
  suma: (c: LineaCuarto) => number;
  oficial: (j: GameBoxScoreEntry) => number;
};

const FILAS: Fila[] = [
  {
    etiqueta: 'PTS',
    cuarto: (c) => `${c.points}`,
    total: (j) => `${j.points}`,
    suma: (c) => c.points,
    oficial: (j) => j.points,
  },
  {
    etiqueta: 'REB',
    cuarto: (c) => `${c.rebounds}`,
    total: (j) => `${j.rebounds}`,
    suma: (c) => c.rebounds,
    oficial: (j) => j.rebounds,
  },
  {
    etiqueta: 'AST',
    cuarto: (c) => `${c.assists}`,
    total: (j) => `${j.assists}`,
    suma: (c) => c.assists,
    oficial: (j) => j.assists,
  },
  {
    etiqueta: 'ROB',
    cuarto: (c) => `${c.steals}`,
    total: (j) => `${j.steals}`,
    suma: (c) => c.steals,
    oficial: (j) => j.steals,
  },
  {
    etiqueta: 'TAP',
    cuarto: (c) => `${c.blocks}`,
    total: (j) => `${j.blocks}`,
    suma: (c) => c.blocks,
    oficial: (j) => j.blocks,
  },
  {
    etiqueta: 'PÉR',
    cuarto: (c) => `${c.turnovers}`,
    total: (j) => `${j.turnovers}`,
    suma: (c) => c.turnovers,
    oficial: (j) => j.turnovers,
  },
  {
    etiqueta: 'TC',
    cuarto: (c) => `${c.fgMade}-${c.fgAttempted}`,
    total: (j) => `${j.fgMade}-${j.fgAttempted}`,
    suma: (c) => c.fgAttempted,
    oficial: (j) => j.fgAttempted,
  },
  {
    etiqueta: 'T3',
    cuarto: (c) => `${c.fg3Made}-${c.fg3Attempted}`,
    total: (j) => `${j.fg3Made}-${j.fg3Attempted}`,
    suma: (c) => c.fg3Attempted,
    oficial: (j) => j.fg3Attempted,
  },
  {
    etiqueta: 'TL',
    cuarto: (c) => `${c.ftMade}-${c.ftAttempted}`,
    total: (j) => `${j.ftMade}-${j.ftAttempted}`,
    suma: (c) => c.ftAttempted,
    oficial: (j) => j.ftAttempted,
  },
];

function etiquetaCuarto(periodo: number): string {
  return periodo > 4 ? `PR${periodo - 4}` : `Q${periodo}`;
}

export function PlayerGameStats({
  jugador,
  equipoAbbr,
  equipoLogo,
  porCuarto,
  onCerrar,
}: {
  jugador: GameBoxScoreEntry | null;
  equipoAbbr?: string;
  equipoLogo?: string;
  porCuarto: LineaCuarto[];
  onCerrar: () => void;
}) {
  const paddingInferior = usePaddingInferior();

  if (!jugador) return null;

  const jugo = jugador.minutes > 0;
  const descuadra = porCuarto.length
    ? FILAS.some(
        (f) => porCuarto.reduce((t, c) => t + f.suma(c), 0) !== f.oficial(jugador),
      )
    : false;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onCerrar}>
      <Pressable style={styles.backdrop} onPress={onCerrar}>
        <Pressable
          style={[styles.sheet, paddingInferior]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handle} />

          <View style={styles.cabecera}>
            <PlayerAvatar
              photoUrl={jugador.photoUrl}
              initials={`${jugador.firstName[0] ?? ''}${jugador.lastName[0] ?? ''}`}
              size={44}
            />
            <View style={styles.cabeceraTextos}>
              <Text style={styles.nombre} numberOfLines={1}>
                {jugador.firstName} {jugador.lastName}
              </Text>
              <View style={styles.cabeceraMeta}>
                {equipoAbbr && (
                  <TeamLogo logoUrl={equipoLogo} abbreviation={equipoAbbr} size={16} />
                )}
                {equipoAbbr && <Text style={styles.metaTexto}>{equipoAbbr}</Text>}
                {jugo && (
                  <Text style={styles.metaTexto}>· {formatMinutes(jugador.minutes)} min</Text>
                )}
              </View>
            </View>
            <Pressable onPress={onCerrar} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          {!jugo ? (
            <View style={styles.cuerpo}>
              <Text style={styles.nota}>Este jugador no disputó ningún minuto.</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.cuerpo}>
              {porCuarto.length > 0 ? (
                <>
                  <View style={styles.tabla}>
                    <View>
                      <View style={[styles.fila, styles.filaCabecera]}>
                        <Text style={[styles.etiqueta, styles.cabeceraCelda]}> </Text>
                      </View>
                      {FILAS.map((f) => (
                        <View key={f.etiqueta} style={styles.fila}>
                          <Text style={styles.etiqueta}>{f.etiqueta}</Text>
                        </View>
                      ))}
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View>
                        <View style={[styles.fila, styles.filaCabecera]}>
                          {porCuarto.map((c) => (
                            <Text key={c.periodo} style={[styles.cabeceraCelda, styles.celda]}>
                              {etiquetaCuarto(c.periodo)}
                            </Text>
                          ))}
                          <Text style={[styles.cabeceraCelda, styles.celdaTotal]}>TOTAL</Text>
                        </View>

                        {FILAS.map((f) => (
                          <View key={f.etiqueta} style={styles.fila}>
                            {porCuarto.map((c) => (
                              <Text key={c.periodo} style={[styles.valor, styles.celda]}>
                                {f.cuarto(c)}
                              </Text>
                            ))}
                            <Text style={[styles.valor, styles.celdaTotal, styles.valorTotal]}>
                              {f.total(jugador)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  </View>

                  {descuadra && (
                    <Text style={styles.nota}>
                      El desglose por cuartos sale del relato de jugadas de ESPN y el total de su
                      box score. Alguna jugada no cuadra entre los dos.
                    </Text>
                  )}
                </>
              ) : (
                <Text style={styles.nota}>
                  ESPN no publica el relato de jugadas de este partido, así que no se puede
                  desglosar por cuartos.
                </Text>
              )}

              <View style={styles.pie}>
                <Suelto etiqueta="MIN" valor={formatMinutes(jugador.minutes)} />
                <Suelto
                  etiqueta="+/-"
                  valor={jugador.plusMinus > 0 ? `+${jugador.plusMinus}` : `${jugador.plusMinus}`}
                />
                <Suelto etiqueta="VAL" valor={jugador.gameScore.toFixed(1)} />
              </View>
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Suelto({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={styles.suelto}>
      <Text style={styles.sueltoValor}>{valor}</Text>
      <Text style={styles.sueltoEtiqueta}>{etiqueta}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '88%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cabeceraTextos: {
    flex: 1,
  },
  nombre: {
    color: colors.text,
    fontSize: fontSize.md,
    fontFamily: fontFamily.displayBold,
  },
  cabeceraMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  metaTexto: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.displaySemibold,
  },
  cuerpo: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  tabla: {
    flexDirection: 'row',
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ALTO_FILA,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filaCabecera: {
    borderBottomColor: colors.textMuted,
  },
  etiqueta: {
    width: ANCHO_ETIQUETA,
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.displayBold,
    letterSpacing: 0.5,
  },
  cabeceraCelda: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.displayBold,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  celda: {
    width: ANCHO_CUARTO,
    textAlign: 'center',
  },
  celdaTotal: {
    width: ANCHO_TOTAL,
    textAlign: 'center',
  },
  valor: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.displaySemibold,
  },
  valorTotal: {
    fontFamily: fontFamily.displayBold,
  },
  pie: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.lg,
  },
  suelto: {
    alignItems: 'center',
  },
  sueltoValor: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontFamily: fontFamily.displayBold,
  },
  sueltoEtiqueta: {
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: fontFamily.displayBold,
    letterSpacing: 0.5,
  },
  nota: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    lineHeight: 16,
    marginTop: spacing.md,
  },
});
