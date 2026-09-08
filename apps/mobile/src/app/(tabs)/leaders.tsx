import { useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { TeamLogo } from '@/components/ui/TeamLogo';
import { SeasonButton, SeasonPicker } from '@/components/ui/SeasonPicker';
import { SearchButton } from '@/components/ui/SearchButton';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { useStandingsSeasons } from '@/hooks/useStandings';
import { useLatestStatsSeason, useSeasonLeaders } from '@/hooks/useLeaders';
import { colors, fontFamily, fontSize, radius, spacing } from '@/constants/theme';
import type { LeaderEntry, LeaderStat } from '@/types/domain';

/** Campos por los que se puede ordenar. Por defecto, puntos. */
const CAMPOS: { stat: LeaderStat; label: string }[] = [
  { stat: 'points', label: 'Puntos' },
  { stat: 'rebounds', label: 'Rebotes' },
  { stat: 'assists', label: 'Asistencias' },
  { stat: 'steals', label: 'Robos' },
  { stat: 'blocks', label: 'Tapones' },
  { stat: 'minutes', label: 'Minutos' },
];

export default function LeadersScreen() {
  const [stat, setStat] = useState<LeaderStat>('points');
  const [pickedSeason, setPickedSeason] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const { data: seasons } = useStandingsSeasons();
  const { data: ultimaConDatos } = useLatestStatsSeason();
  const season = pickedSeason ?? ultimaConDatos ?? seasons?.[0]?.season;

  const { data: leaders, isLoading, isRefetching, refetch, error } = useSeasonLeaders(season, stat);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Líderes</Text>
        <SearchButton />
      </View>

      <View style={styles.seasonRow}>
        <SeasonButton season={season} onPress={() => setPickerOpen(true)} />
      </View>

      {/* Campo por el que se ordena */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chips}
      >
        {CAMPOS.map((c) => (
          <Pressable
            key={c.stat}
            onPress={() => setStat(c.stat)}
            style={[styles.chip, stat === c.stat && styles.chipActive]}
          >
            <Text style={[styles.chipText, stat === c.stat && styles.chipTextActive]}>
              {c.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {isLoading && <LoadingState message="Cargando líderes..." compact />}

      {error && (
        <ErrorState
          title="No se pueden cargar los líderes"
          message="Comprueba tu conexión o inténtalo de nuevo en unos segundos."
          onRetry={refetch}
          compact
        />
      )}

      {!isLoading && !error && (leaders ?? []).length === 0 && (
        <EmptyState
          icon="stats-chart-outline"
          title="Sin datos"
          message="No hay medias registradas para esta temporada."
          compact
        />
      )}

      <FlatList
        data={leaders ?? []}
        keyExtractor={(l) => `${l.playerId}-${l.rank}`}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        renderItem={({ item }) => (
          <LeaderCard entry={item} season={season ?? ''} destacado={stat} />
        )}
      />

      <SeasonPicker
        visible={pickerOpen}
        title="Temporada"
        // Aqui el campeon sobra: se elige temporada para ordenar medias,
        // no para consultar quien gano
        seasons={(seasons ?? []).map((s) => ({ season: s.season }))}
        selected={season}
        onSelect={(s) => {
          setPickedSeason(s);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </SafeAreaView>
  );
}

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase();
}

function LeaderCard({
  entry,
  season,
  destacado,
}: {
  entry: LeaderEntry;
  season: string;
  /** El campo por el que se ordena va resaltado, para saber que se mira. */
  destacado: LeaderStat;
}) {
  const medias: { stat: LeaderStat; label: string; valor: number }[] = [
    { stat: 'points', label: 'PTS', valor: entry.points },
    { stat: 'rebounds', label: 'REB', valor: entry.rebounds },
    { stat: 'assists', label: 'AST', valor: entry.assists },
    { stat: 'steals', label: 'ROB', valor: entry.steals },
    { stat: 'blocks', label: 'TAP', valor: entry.blocks },
    { stat: 'minutes', label: 'MIN', valor: entry.minutes },
  ];

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/player/[id]', params: { id: entry.playerId } })}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.rank}>{entry.rank}</Text>

        <PlayerAvatar photoUrl={entry.photoUrl} initials={iniciales(entry.playerName)} size={40} />

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {entry.playerName}
          </Text>
          {entry.teamAbbreviation && (
            <View style={styles.teamRow}>
              <TeamLogo
                logoUrl={entry.teamLogoUrl}
                abbreviation={entry.teamAbbreviation}
                size={16}
              />
              <Text style={styles.teamText}>{entry.teamAbbreviation}</Text>
            </View>
          )}
        </View>
      </View>

      <Text style={styles.subtitle}>
        Medias de {season} ({entry.gamesPlayed}{' '}
        {entry.gamesPlayed === 1 ? 'partido jugado' : 'partidos jugados'})
      </Text>

      <View style={styles.statsRow}>
        {medias.map((m) => (
          <View key={m.stat} style={styles.stat}>
            <Text style={[styles.statValue, m.stat === destacado && styles.statValueActive]}>
              {m.valor.toFixed(1)}
            </Text>
            <Text style={[styles.statLabel, m.stat === destacado && styles.statLabelActive]}>
              {m.label}
            </Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontFamily: fontFamily.displayBold,
  },
  seasonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  // Sin esto el ScrollView horizontal se come el alto libre y las
  // pildoras se estiran de arriba abajo
  chipsScroll: { flexGrow: 0, flexShrink: 0 },
  chips: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
  },
  chipTextActive: { color: colors.background },

  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPressed: { opacity: 0.75 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rank: {
    minWidth: 24,
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: fontSize.md,
    fontFamily: fontFamily.displayBold,
  },
  info: { flex: 1 },
  name: {
    color: colors.text,
    fontSize: fontSize.md,
    fontFamily: fontFamily.displaySemibold,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  teamText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semibold,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: { alignItems: 'center', flex: 1 },
  statValue: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontFamily: fontFamily.displayBold,
  },
  // El campo por el que se ordena, resaltado
  statValueActive: { color: colors.primary },
  statLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semibold,
  },
  statLabelActive: { color: colors.textSecondary },
});
