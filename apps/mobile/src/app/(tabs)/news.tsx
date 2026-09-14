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
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { TeamLogo } from '@/components/ui/TeamLogo';
import { SearchButton } from '@/components/ui/SearchButton';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { useNovedades } from '@/hooks/useNews';
import { estadoLesion, tituloLesion } from '@/constants/injuries';
import { sentidoMovimiento, tipoMovimiento } from '@/constants/movements';
import { formatRelative } from '@/lib/format';
import { colors, fontFamily, fontSize, radius, spacing } from '@/constants/theme';
import type { FeedEntry, FeedKind } from '@/types/domain';

/**
 * Novedades: lo que pasa cuando no hay partido.
 *
 * Tres fuentes en un solo hilo por fecha: los titulares de ESPN Deportes,
 * las lesiones vigentes y los movimientos. Van juntas a proposito, porque
 * muchas veces cuentan lo mismo desde tres sitios: el corte aparece como
 * movimiento, la lesion que lo explica como parte medico y el titular lo
 * remata.
 *
 * El filtro existe porque los tres ritmos son muy distintos. Los titulares
 * salen cada pocas horas y las lesiones se reportan a dias vista, asi que
 * sin filtro las lesiones no llegan a asomar.
 */

const FILTROS: { kind?: FeedKind; label: string }[] = [
  { kind: undefined, label: 'Todo' },
  { kind: 'news', label: 'Noticias' },
  { kind: 'movement', label: 'Movimientos' },
  { kind: 'injury', label: 'Lesiones' },
];

export default function NewsScreen() {
  const [filtro, setFiltro] = useState<FeedKind | undefined>(undefined);
  const { data, isLoading, isRefetching, refetch, error } = useNovedades(filtro);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Novedades</Text>
        <SearchButton />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chips}
      >
        {FILTROS.map((f) => (
          <Pressable
            key={f.label}
            onPress={() => setFiltro(f.kind)}
            style={[styles.chip, filtro === f.kind && styles.chipActive]}
          >
            <Text style={[styles.chipText, filtro === f.kind && styles.chipTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {isLoading && <LoadingState message="Cargando novedades..." compact />}

      {error && (
        <ErrorState
          title="No se pueden cargar las novedades"
          message="Comprueba tu conexión o inténtalo de nuevo en unos segundos."
          onRetry={refetch}
          compact
        />
      )}

      {!isLoading && !error && (data ?? []).length === 0 && (
        <EmptyState
          icon="newspaper-outline"
          title="Sin novedades"
          message="No hay nada nuevo registrado por ahora."
          compact
        />
      )}

      <FlatList
        data={data ?? []}
        keyExtractor={(e) => `${e.kind}-${e.id}`}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        renderItem={({ item }) => <FilaNovedad entry={item} />}
      />
    </SafeAreaView>
  );
}

function FilaNovedad({ entry }: { entry: FeedEntry }) {
  if (entry.kind === 'news') return <NoticiaRow entry={entry} />;
  if (entry.kind === 'injury') return <LesionRow entry={entry} />;
  return <MovimientoRow entry={entry} />;
}

// ============================================
// Noticia
// ============================================

function NoticiaRow({ entry }: { entry: FeedEntry }) {
  const abrible = !!entry.link;

  return (
    <Pressable
      disabled={!abrible}
      onPress={() => {
        if (entry.link) {
          openBrowserAsync(entry.link, {
            presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
          });
        }
      }}
      style={({ pressed }) => [styles.card, pressed && abrible && styles.cardPressed]}
    >
      <View style={styles.noticiaFila}>
        <View style={styles.noticiaTexto}>
          <Text style={styles.noticiaTitular} numberOfLines={3}>
            {entry.title}
          </Text>
          {entry.detail ? (
            <Text style={styles.noticiaResumen} numberOfLines={2}>
              {entry.detail}
            </Text>
          ) : null}
        </View>

        {entry.imageUrl ? (
          <Image source={{ uri: entry.imageUrl }} style={styles.noticiaImagen} contentFit="cover" />
        ) : null}
      </View>

      <View style={styles.meta}>
        <View style={styles.fuente}>
          <Ionicons name="newspaper" size={12} color={colors.secondary} />
          <Text style={styles.fuenteTexto}>ESPN</Text>
        </View>
        <Text style={styles.fecha}>{formatRelative(entry.happenedAt)}</Text>
        {abrible ? <Ionicons name="open-outline" size={14} color={colors.textMuted} /> : null}
      </View>
    </Pressable>
  );
}

// ============================================
// Lesion
// ============================================

function LesionRow({ entry }: { entry: FeedEntry }) {
  const abrible = !!entry.playerId;

  return (
    <Pressable
      disabled={!abrible}
      onPress={() => {
        if (entry.playerId) {
          router.push({ pathname: '/player/[id]', params: { id: entry.playerId } });
        }
      }}
      style={({ pressed }) => [styles.card, pressed && abrible && styles.cardPressed]}
    >
      <View style={styles.filaPrincipal}>
        <PlayerAvatar photoUrl={entry.photoUrl} initials={iniciales(entry.title)} size={40} />

        <View style={styles.centro}>
          <Text style={styles.nombre} numberOfLines={1}>
            {entry.title}
          </Text>
          <View style={styles.subLinea}>
            <Ionicons name="medkit" size={13} color={colors.danger} />
            <Text style={styles.subTexto} numberOfLines={1}>
              {tituloLesion(entry.injuryType, entry.injurySide)}
            </Text>
          </View>
        </View>

        <View style={styles.derecha}>
          {entry.subtitle ? (
            <View style={styles.badgeLesion}>
              <Text style={styles.badgeLesionTexto}>{estadoLesion(entry.subtitle)}</Text>
            </View>
          ) : null}
          {entry.team ? (
            <TeamLogo
              logoUrl={entry.team.logoUrl}
              abbreviation={entry.team.abbreviation}
              size={22}
            />
          ) : null}
        </View>
      </View>

      <View style={styles.meta}>
        <Text style={styles.fecha}>{formatRelative(entry.happenedAt)}</Text>
      </View>
    </Pressable>
  );
}

// ============================================
// Movimiento
// ============================================

function MovimientoRow({ entry }: { entry: FeedEntry }) {
  // El detalle de un traspaso solo existe cuando la NBA agrupo sus piezas
  const alTraspaso = !!entry.dealId && entry.subtitle === 'Trade';
  const abrible = alTraspaso || !!entry.playerId;
  const { desde, hasta } = sentidoMovimiento(entry.subtitle ?? '', entry.team, entry.otherTeam);

  return (
    <Pressable
      disabled={!abrible}
      onPress={() => {
        if (alTraspaso && entry.dealId) {
          router.push({ pathname: '/deal/[id]', params: { id: entry.dealId } });
        } else if (entry.playerId) {
          router.push({ pathname: '/player/[id]', params: { id: entry.playerId } });
        }
      }}
      style={({ pressed }) => [styles.card, pressed && abrible && styles.cardPressed]}
    >
      <View style={styles.filaPrincipal}>
        {entry.playerName ? (
          <PlayerAvatar photoUrl={entry.photoUrl} initials={iniciales(entry.title)} size={40} />
        ) : (
          <View style={styles.iconoDraft}>
            <Ionicons name="swap-horizontal" size={20} color={colors.textSecondary} />
          </View>
        )}

        <View style={styles.centro}>
          <Text style={styles.nombre} numberOfLines={1}>
            {entry.title}
          </Text>
          <View style={styles.equipos}>
            {desde ? (
              <TeamLogo logoUrl={desde.logoUrl} abbreviation={desde.abbreviation} size={20} />
            ) : (
              <Text style={styles.sinOrigen}>—</Text>
            )}
            <Ionicons name="arrow-forward" size={13} color={colors.textMuted} />
            {hasta ? (
              <TeamLogo logoUrl={hasta.logoUrl} abbreviation={hasta.abbreviation} size={20} />
            ) : (
              <Text style={styles.sinOrigen}>—</Text>
            )}
          </View>
        </View>

        {entry.subtitle ? (
          <View style={[styles.badge, entry.subtitle === 'Trade' && styles.badgeTrade]}>
            <Text style={styles.badgeTexto}>{tipoMovimiento(entry.subtitle)}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.meta}>
        <Text style={styles.fecha}>{formatRelative(entry.happenedAt)}</Text>
        {alTraspaso ? (
          <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
        ) : null}
      </View>
    </Pressable>
  );
}

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase();
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontFamily: fontFamily.displayBold,
  },

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
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
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
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  cardPressed: { opacity: 0.75 },

  noticiaFila: { flexDirection: 'row', gap: spacing.md },
  noticiaTexto: { flex: 1 },
  noticiaTitular: {
    color: colors.text,
    fontSize: fontSize.md,
    fontFamily: fontFamily.displaySemibold,
    lineHeight: 20,
  },
  noticiaResumen: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  noticiaImagen: {
    width: 78,
    height: 78,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceLight,
  },

  filaPrincipal: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  centro: { flex: 1, gap: 3 },
  nombre: {
    color: colors.text,
    fontSize: fontSize.md,
    fontFamily: fontFamily.displaySemibold,
  },
  subLinea: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  subTexto: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
  },
  derecha: { alignItems: 'flex-end', gap: spacing.xs },
  equipos: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sinOrigen: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    width: 20,
    textAlign: 'center',
  },
  iconoDraft: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceLight,
  },
  badgeTrade: { backgroundColor: colors.primaryDark },
  badgeTexto: {
    color: colors.text,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semibold,
  },
  badgeLesion: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.danger,
  },
  badgeLesionTexto: {
    color: colors.text,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semibold,
  },

  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  fuente: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fuenteTexto: {
    color: colors.secondary,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semibold,
  },
  fecha: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
  },
});
