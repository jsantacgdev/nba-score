import { StyleSheet, Text, View } from 'react-native';
import { TeamLogo } from '@/components/ui/TeamLogo';
import { colors, fontFamily, fontSize, radius, spacing } from '@/constants/theme';
import type { ModelRecord, Team, WinProbability } from '@/types/domain';

type Props = {
  home: Team;
  away: Team;
  data?: WinProbability | null;
  record?: ModelRecord | null;
  isLoading: boolean;
};

function porcentaje(valor: number): string {
  return `${Math.round(valor * 100)}%`;
}

function conSigno(valor: number, decimales = 1): string {
  const redondeado = Number(valor.toFixed(decimales));
  if (redondeado === 0) return '0';
  return `${redondeado > 0 ? '+' : ''}${redondeado.toFixed(decimales)}`;
}

function dias(n: number): string {
  if (n === 0) return 'sin descanso';
  return `${n} ${n === 1 ? 'día' : 'días'}`;
}

const MEDIDOS_MINIMO = 10;

export function Probabilidad({ home, away, data, record, isLoading }: Props) {
  if (isLoading) return null;

  if (!data) return null;

  const probLocal = data.probHome;
  const probVisitante = 1 - probLocal;
  const favorito = probLocal >= 0.5 ? home : away;
  const sinJugar = data.gamesHome === 0 && data.gamesAway === 0;
  const pretemporada = data.seasonType === 'preseason';
  const acierto =
    record && record.resolved >= MEDIDOS_MINIMO
      ? `Esta temporada lleva ${record.hits} de ${record.resolved} (${Math.round(
          record.accuracy * 100,
        )}%). Es una estimación, no una apuesta.`
      : 'Acierta el 66% de los partidos de las tres últimas temporadas y el 68% entre 2006 y 2016. Es una estimación, no una apuesta.';
  const caption = pretemporada
    ? 'Pretemporada: el nivel sale de la temporada pasada y los titulares jugarán poco'
    : sinJugar
      ? 'La temporada no ha empezado: el nivel sale de la anterior'
      : `Temporada ${data.season}, con ${data.gamesHome} y ${data.gamesAway} partidos jugados`;

  return (
    <View style={styles.seccion}>
      <Text style={styles.titulo}>Probabilidad de victoria</Text>
      <Text style={styles.caption}>{caption}</Text>

      <View style={styles.card}>
        <View style={styles.cabecera}>
          <View style={styles.lado}>
            <TeamLogo logoUrl={home.logoUrl} abbreviation={home.abbreviation} size={26} />
            <Text style={styles.abbr}>{home.abbreviation}</Text>
          </View>
          <View style={[styles.lado, styles.ladoDerecha]}>
            <Text style={styles.abbr}>{away.abbreviation}</Text>
            <TeamLogo logoUrl={away.logoUrl} abbreviation={away.abbreviation} size={26} />
          </View>
        </View>

        <View style={styles.porcentajes}>
          <Text style={[styles.porcentaje, probLocal >= 0.5 && styles.porcentajeFavorito]}>
            {porcentaje(probLocal)}
          </Text>
          <Text style={[styles.porcentaje, probLocal < 0.5 && styles.porcentajeFavorito]}>
            {porcentaje(probVisitante)}
          </Text>
        </View>

        <View style={styles.barra}>
          <View style={[styles.barraLocal, { flex: Math.round(probLocal * 1000) }]} />
          <View style={[styles.barraVisitante, { flex: Math.round(probVisitante * 1000) }]} />
        </View>

        <View style={styles.factores}>
          <Factor
            label="Nivel de equipo"
            detalle={`${conSigno(data.ratingHome)} vs ${conSigno(data.ratingAway)}`}
            valor={data.ratingHome - data.ratingAway}
          />
          <Factor label="Ventaja de campo" valor={data.homeAdvantage} />
          {!sinJugar && (
            <Factor
              label="Descanso"
              detalle={`${dias(data.restDaysHome)} vs ${dias(data.restDaysAway)}`}
              valor={data.restEffect}
            />
          )}
          <Factor
            label="Bajas"
            detalle={`${data.injuriesHome} vs ${data.injuriesAway}`}
            valor={data.injuryAdjustment}
          />

          <View style={styles.separador} />

          <Factor
            label="Margen esperado"
            detalle={favorito.abbreviation}
            valor={data.expectedMargin}
            destacado
          />
        </View>
      </View>

      <Text style={styles.nota}>{acierto}</Text>
    </View>
  );
}

function Factor({
  label,
  detalle,
  valor,
  destacado = false,
}: {
  label: string;
  detalle?: string;
  valor: number;
  destacado?: boolean;
}) {
  const redondeado = Number(valor.toFixed(1));

  return (
    <View style={styles.factor}>
      <Text style={[styles.factorLabel, destacado && styles.factorLabelDestacado]}>{label}</Text>
      {detalle ? <Text style={styles.factorDetalle}>{detalle}</Text> : null}
      <Text
        style={[
          styles.factorValor,
          destacado && styles.factorValorDestacado,
          redondeado > 0 && styles.factorLocal,
          redondeado < 0 && styles.factorVisitante,
        ]}
      >
        {conSigno(valor)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  seccion: { marginBottom: spacing.lg },
  titulo: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontFamily: fontFamily.displayBold,
    marginBottom: 2,
  },
  caption: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lado: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ladoDerecha: { justifyContent: 'flex-end' },
  abbr: {
    color: colors.text,
    fontSize: fontSize.md,
    fontFamily: fontFamily.displayBold,
    letterSpacing: 0.5,
  },
  porcentajes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  porcentaje: {
    color: colors.textSecondary,
    fontSize: fontSize.xxl,
    fontFamily: fontFamily.displayBold,
  },
  porcentajeFavorito: { color: colors.text },
  barra: {
    flexDirection: 'row',
    height: 8,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.surfaceLight,
    marginTop: spacing.sm,
  },
  barraLocal: { backgroundColor: colors.primary },
  barraVisitante: { backgroundColor: colors.secondary },
  factores: {
    marginTop: spacing.md,
    gap: 6,
  },
  factor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  factorLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
  },
  factorLabelDestacado: {
    color: colors.text,
    fontFamily: fontFamily.displaySemibold,
  },
  factorDetalle: {
    flex: 1,
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
  },
  factorValor: {
    marginLeft: 'auto',
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.displaySemibold,
    minWidth: 42,
    textAlign: 'right',
  },
  factorValorDestacado: { fontSize: fontSize.md },
  factorLocal: { color: colors.primary },
  factorVisitante: { color: colors.secondary },
  separador: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  nota: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    marginTop: spacing.sm,
    lineHeight: 15,
  },
});
