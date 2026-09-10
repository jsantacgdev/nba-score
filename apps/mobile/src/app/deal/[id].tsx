import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { TeamLogo } from '@/components/ui/TeamLogo';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDealDetail } from '@/hooks/useMovements';
import { formatDateDMY } from '@/lib/format';
import { colors, fontFamily, fontSize, radius, spacing } from '@/constants/theme';
import type { DealEntry } from '@/types/domain';

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase();
}

export default function DealScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: piezas, isLoading } = useDealDetail(id);

  const porEquipo = new Map<string, DealEntry[]>();
  for (const p of piezas ?? []) {
    const clave = p.toTeam?.id ?? 'sin-equipo';
    if (!porEquipo.has(clave)) porEquipo.set(clave, []);
    porEquipo.get(clave)!.push(p);
  }
  const bloques = Array.from(porEquipo.values());
  const fecha = piezas?.[0]?.date;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.close}>
          <Ionicons name="close" size={26} color={colors.text} />
        </Pressable>
        <View>
          <Text style={styles.title}>Operación</Text>
          {fecha && <Text style={styles.subtitle}>{formatDateDMY(fecha)}</Text>}
        </View>
        <View style={styles.close} />
      </View>

      {isLoading && <LoadingState message="Cargando operación..." />}

      {!isLoading && bloques.length === 0 && (
        <EmptyState
          icon="swap-horizontal-outline"
          title="Sin detalles"
          message="No hay piezas registradas para esta operación."
        />
      )}

      <FlatList
        data={bloques}
        keyExtractor={(b) => b[0]?.toTeam?.id ?? 'sin-equipo'}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <BloqueEquipo piezas={item} />}
      />
    </SafeAreaView>
  );
}

function BloqueEquipo({ piezas }: { piezas: DealEntry[] }) {
  const equipo = piezas[0]?.toTeam;

  return (
    <View style={styles.bloque}>
      <View style={styles.bloqueHeader}>
        <TeamLogo logoUrl={equipo?.logoUrl} abbreviation={equipo?.abbreviation ?? '?'} size={28} />
        <Text style={styles.bloqueTitulo}>{equipo?.name || equipo?.abbreviation}</Text>
        <Text style={styles.bloqueRecibe}>recibe</Text>
      </View>

      {piezas.map((p) => (
        <Pressable
          key={p.id}
          disabled={!p.playerId}
          onPress={() =>
            p.playerId &&
            router.push({ pathname: '/player/[id]', params: { id: p.playerId } })
          }
          style={({ pressed }) => [styles.pieza, pressed && p.playerId && styles.piezaPressed]}
        >
          {p.isDraftPick ? (
            <View style={styles.draftIcono}>
              <Ionicons name="document-text-outline" size={18} color={colors.textSecondary} />
            </View>
          ) : (
            <PlayerAvatar
              photoUrl={p.photoUrl}
              initials={iniciales(p.playerName ?? '?')}
              size={34}
            />
          )}

          <View style={styles.piezaInfo}>
            <Text style={styles.piezaNombre} numberOfLines={1}>
              {p.isDraftPick ? 'Elección de draft' : p.playerName}
            </Text>
            {p.fromTeam && (
              <View style={styles.desde}>
                <Text style={styles.desdeTexto}>de</Text>
                <TeamLogo
                  logoUrl={p.fromTeam.logoUrl}
                  abbreviation={p.fromTeam.abbreviation}
                  size={14}
                />
                <Text style={styles.desdeEquipo}>{p.fromTeam.abbreviation}</Text>
              </View>
            )}
          </View>

          {p.playerId && (
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          )}
        </Pressable>
      ))}
    </View>
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
  close: { width: 32 },
  title: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontFamily: fontFamily.displayBold,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semibold,
    textAlign: 'center',
    marginTop: 1,
  },
  list: { padding: spacing.md, gap: spacing.md },
  bloque: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  bloqueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  bloqueTitulo: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.md,
    fontFamily: fontFamily.displayBold,
  },
  bloqueRecibe: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pieza: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  piezaPressed: { opacity: 0.6 },
  draftIcono: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceLight,
  },
  piezaInfo: { flex: 1 },
  piezaNombre: {
    color: colors.text,
    fontSize: fontSize.md,
    fontFamily: fontFamily.displaySemibold,
  },
  desde: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  desdeTexto: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
  },
  desdeEquipo: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semibold,
  },
});
