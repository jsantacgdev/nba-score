import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { TeamLogo } from '@/components/ui/TeamLogo';
import { formatMinutes } from '@/lib/format';
import { colors, fontFamily, fontSize, radius, spacing } from '@/constants/theme';
import type { GameBoxScoreEntry } from '@/types/domain';

type PuntosCuarto = { periodo: number; points: number };

function etiquetaCuarto(periodo: number): string {
  return periodo > 4 ? `PR${periodo - 4}` : `Q${periodo}`;
}

function porcentaje(hechos: number, intentos: number): string {
  return intentos > 0 ? `${((hechos / intentos) * 100).toFixed(1)}%` : '—';
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
  porCuarto: PuntosCuarto[];
  onCerrar: () => void;
}) {
  if (!jugador) return null;

  const jugo = jugador.minutes > 0;
  const maximo = Math.max(...porCuarto.map((c) => c.points), 1);
  const sumaCuartos = porCuarto.reduce((total, c) => total + c.points, 0);

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onCerrar}>
      <Pressable style={styles.backdrop} onPress={onCerrar}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          <View style={styles.cabecera}>
            <PlayerAvatar
              photoUrl={jugador.photoUrl}
              initials={`${jugador.firstName[0] ?? ''}${jugador.lastName[0] ?? ''}`}
              size={48}
            />
            <View style={styles.cabeceraTextos}>
              <Text style={styles.nombre} numberOfLines={1}>
                {jugador.firstName} {jugador.lastName}
              </Text>
              <View style={styles.cabeceraMeta}>
                {equipoAbbr && <TeamLogo logoUrl={equipoLogo} abbreviation={equipoAbbr} size={16} />}
                {equipoAbbr && <Text style={styles.metaTexto}>{equipoAbbr}</Text>}
                {jugo && <Text style={styles.metaTexto}>· {formatMinutes(jugador.minutes)} min</Text>}
              </View>
            </View>
            <Pressable onPress={onCerrar} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          {jugo ? (
            <ScrollView contentContainerStyle={styles.cuerpo}>
              <View style={styles.grandes}>
                <Grande valor={jugador.points} etiqueta="PTS" />
                <Grande valor={jugador.rebounds} etiqueta="REB" />
                <Grande valor={jugador.assists} etiqueta="AST" />
              </View>

              <Text style={styles.seccion}>Puntos por cuarto</Text>
              {porCuarto.length > 0 ? (
                <>
                  <View style={styles.cuartos}>
                    {porCuarto.map((c) => (
                      <View key={c.periodo} style={styles.cuarto}>
                        <Text style={styles.cuartoValor}>{c.points}</Text>
                        <View style={styles.cuartoCarril}>
                          <View
                            style={[
                              styles.cuartoBarra,
                              { height: `${(c.points / maximo) * 100}%` },
                              c.points === 0 && styles.cuartoBarraVacia,
                            ]}
                          />
                        </View>
                        <Text style={styles.cuartoEtiqueta}>{etiquetaCuarto(c.periodo)}</Text>
                      </View>
                    ))}
                  </View>
                  {sumaCuartos !== jugador.points && (
                    <Text style={styles.nota}>
                      El desglose suma {sumaCuartos} de los {jugador.points} puntos: al relato de
                      jugadas de ESPN le faltan algunas.
                    </Text>
                  )}
                </>
              ) : (
                <Text style={styles.nota}>
                  ESPN no publica el relato de jugadas de este partido, así que no se puede
                  desglosar por cuartos.
                </Text>
              )}

              <Text style={styles.seccion}>Tiros</Text>
              <View style={styles.tiros}>
                <FilaTiro
                  etiqueta="Tiros de campo"
                  hechos={jugador.fgMade}
                  intentos={jugador.fgAttempted}
                />
                <FilaTiro
                  etiqueta="Triples"
                  hechos={jugador.fg3Made}
                  intentos={jugador.fg3Attempted}
                />
                <FilaTiro
                  etiqueta="Tiros libres"
                  hechos={jugador.ftMade}
                  intentos={jugador.ftAttempted}
                />
              </View>

              <Text style={styles.seccion}>Resto</Text>
              <View style={styles.rejilla}>
                <Pequeno valor={jugador.steals} etiqueta="ROB" />
                <Pequeno valor={jugador.blocks} etiqueta="TAP" />
                <Pequeno valor={jugador.turnovers} etiqueta="PÉR" />
                <Pequeno
                  valor={jugador.plusMinus}
                  etiqueta="+/-"
                  texto={jugador.plusMinus > 0 ? `+${jugador.plusMinus}` : `${jugador.plusMinus}`}
                />
                <Pequeno valor={jugador.gameScore} etiqueta="VAL" texto={jugador.gameScore.toFixed(1)} />
              </View>
            </ScrollView>
          ) : (
            <View style={styles.cuerpo}>
              <Text style={styles.nota}>Este jugador no disputó ningún minuto.</Text>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Grande({ valor, etiqueta }: { valor: number; etiqueta: string }) {
  return (
    <View style={styles.grande}>
      <Text style={styles.grandeValor}>{valor}</Text>
      <Text style={styles.grandeEtiqueta}>{etiqueta}</Text>
    </View>
  );
}

function Pequeno({
  valor,
  etiqueta,
  texto,
}: {
  valor: number;
  etiqueta: string;
  texto?: string;
}) {
  return (
    <View style={styles.pequeno}>
      <Text style={styles.pequenoValor}>{texto ?? valor}</Text>
      <Text style={styles.pequenoEtiqueta}>{etiqueta}</Text>
    </View>
  );
}

function FilaTiro({
  etiqueta,
  hechos,
  intentos,
}: {
  etiqueta: string;
  hechos: number;
  intentos: number;
}) {
  return (
    <View style={styles.filaTiro}>
      <Text style={styles.filaTiroEtiqueta}>{etiqueta}</Text>
      <Text style={styles.filaTiroIntentos}>
        {hechos}-{intentos}
      </Text>
      <Text style={styles.filaTiroPct}>{porcentaje(hechos, intentos)}</Text>
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
    paddingBottom: spacing.xl,
    maxHeight: '85%',
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
    fontSize: fontSize.lg,
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
  grandes: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
  },
  grande: {
    alignItems: 'center',
  },
  grandeValor: {
    color: colors.text,
    fontSize: fontSize.xxxl,
    fontFamily: fontFamily.displayBold,
  },
  grandeEtiqueta: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.displayBold,
    letterSpacing: 0.5,
  },
  seccion: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.displayBold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  cuartos: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cuarto: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  cuartoValor: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.displayBold,
  },
  cuartoCarril: {
    width: '100%',
    height: 64,
    justifyContent: 'flex-end',
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  cuartoBarra: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
  },
  cuartoBarraVacia: {
    height: 2,
    backgroundColor: colors.border,
  },
  cuartoEtiqueta: {
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: fontFamily.displaySemibold,
  },
  tiros: {
    marginBottom: spacing.lg,
  },
  filaTiro: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filaTiroEtiqueta: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
  },
  filaTiroIntentos: {
    width: 64,
    textAlign: 'right',
    color: colors.text,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.displaySemibold,
  },
  filaTiroPct: {
    width: 64,
    textAlign: 'right',
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.displaySemibold,
  },
  rejilla: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pequeno: {
    alignItems: 'center',
    minWidth: 48,
  },
  pequenoValor: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontFamily: fontFamily.displayBold,
  },
  pequenoEtiqueta: {
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: fontFamily.displayBold,
    letterSpacing: 0.5,
  },
  nota: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    lineHeight: 16,
    marginBottom: spacing.lg,
  },
});
