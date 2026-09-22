import { StyleSheet, Text, View } from 'react-native';
import { TeamLogo } from '@/components/ui/TeamLogo';
import { colors, fontFamily, fontSize, radius, spacing } from '@/constants/theme';
import type { GameTeamForm, Team, TeamForm } from '@/types/domain';

const RACHA_MINIMA = 3;

type Props = {
  home: Team;
  away: Team;
  data?: GameTeamForm | null;
  isLoading: boolean;
};

function conferencia(team: Team): string {
  return team.conference === 'East' ? 'Este' : 'Oeste';
}

export function ComoLlegan({ home, away, data, isLoading }: Props) {
  if (isLoading || !data) return null;

  return (
    <View style={styles.seccion}>
      <Text style={styles.titulo}>{data.previousSeason ? 'Así acabaron' : 'Cómo llegan'}</Text>
      <Text style={styles.caption}>Temporada {data.season}</Text>

      <View style={styles.card}>
        <Columna team={home} forma={data.home} donde="casa" />
        <View style={styles.separador} />
        <Columna team={away} forma={data.away} donde="fuera" />
      </View>
    </View>
  );
}

function Columna({
  team,
  forma,
  donde,
}: {
  team: Team;
  forma: TeamForm;
  donde: 'casa' | 'fuera';
}) {
  const split =
    donde === 'casa'
      ? { label: 'En casa', wins: forma.homeWins, losses: forma.homeLosses }
      : { label: 'Fuera', wins: forma.awayWins, losses: forma.awayLosses };

  const racha =
    forma.streak >= RACHA_MINIMA
      ? `${forma.streak} seguidas`
      : forma.streak <= -RACHA_MINIMA
        ? `${-forma.streak} derrotas seguidas`
        : null;

  return (
    <View style={styles.columna}>
      <View style={styles.cabecera}>
        <TeamLogo logoUrl={team.logoUrl} abbreviation={team.abbreviation} size={22} />
        <Text style={styles.abbr}>{team.abbreviation}</Text>
      </View>

      <Text style={styles.balance}>
        {forma.wins}-{forma.losses}
      </Text>

      {forma.conferenceRank !== undefined && (
        <Text style={styles.puesto}>
          {forma.conferenceRank}º {conferencia(team)}
        </Text>
      )}

      {forma.lastResults.length > 0 && (
        <View style={styles.tira}>
          {forma.lastResults.map((resultado, i) => (
            <View
              key={i}
              style={[styles.chip, resultado === 'W' ? styles.chipGanado : styles.chipPerdido]}
            >
              <Text
                style={[
                  styles.chipTexto,
                  resultado === 'W' ? styles.chipTextoGanado : styles.chipTextoPerdido,
                ]}
              >
                {resultado}
              </Text>
            </View>
          ))}
        </View>
      )}

      {racha && (
        <Text style={[styles.racha, forma.streak > 0 ? styles.rachaBuena : styles.rachaMala]}>
          {racha}
        </Text>
      )}

      <View style={styles.datos}>
        <Dato label={split.label} valor={`${split.wins}-${split.losses}`} />
        <Dato label="Anota" valor={forma.pointsFor.toFixed(1)} />
        <Dato label="Encaja" valor={forma.pointsAgainst.toFixed(1)} />
      </View>
    </View>
  );
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <View style={styles.dato}>
      <Text style={styles.datoLabel}>{label}</Text>
      <Text style={styles.datoValor}>{valor}</Text>
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
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  separador: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
  columna: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  abbr: {
    color: colors.text,
    fontSize: fontSize.md,
    fontFamily: fontFamily.displayBold,
    letterSpacing: 0.5,
  },
  balance: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontFamily: fontFamily.displayBold,
  },
  puesto: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.displaySemibold,
  },
  tira: {
    flexDirection: 'row',
    gap: 3,
    marginTop: spacing.xs,
  },
  chip: {
    width: 18,
    height: 18,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipGanado: { backgroundColor: 'rgba(93, 171, 133, 0.22)' },
  chipPerdido: { backgroundColor: 'rgba(209, 100, 100, 0.18)' },
  chipTexto: {
    fontSize: 10,
    fontFamily: fontFamily.displayBold,
  },
  chipTextoGanado: { color: colors.success },
  chipTextoPerdido: { color: colors.danger },
  racha: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.displaySemibold,
    textAlign: 'center',
  },
  rachaBuena: { color: colors.success },
  rachaMala: { color: colors.danger },
  datos: {
    alignSelf: 'stretch',
    marginTop: spacing.sm,
    gap: 2,
  },
  dato: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  datoLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
  },
  datoValor: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.displaySemibold,
  },
});
