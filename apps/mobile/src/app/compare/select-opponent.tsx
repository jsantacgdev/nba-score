import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { useSearch } from '@/hooks/useSearch';
import { getPositionName } from '@/constants/positions';
import { colors, fontSize, fontFamily, radius, spacing, shadows } from '@/constants/theme';
import type { SearchResultPlayer } from '@/types/domain';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';

export default function SelectOpponentScreen() {
  const { playerId } = useLocalSearchParams<{ playerId: string }>();
  const [query, setQuery] = useState('');
  const { data, isLoading } = useSearch(query);

  const hasQuery = query.trim().length >= 2;
  const players = (data?.players ?? []).filter((p) => p.id !== playerId);

  const handleSelect = (otherId: string) => {
    router.replace({
      pathname: '/compare/[ids]',
      params: { ids: `${playerId}-vs-${otherId}` },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.searchBar}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.inputWrapper}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Busca un jugador para comparar..."
            placeholderTextColor={colors.textMuted}
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.titleSection}>
        <Text style={styles.title}>Elige al rival</Text>
        <Text style={styles.subtitle}>Busca el jugador con el que quieres comparar</Text>
      </View>

      {!hasQuery && (
        <EmptyState
          icon="people-outline"
          title="Elige un rival"
          message="Escribe al menos 2 caracteres para buscar."
        />
      )}

      {hasQuery && isLoading && <LoadingState message="Buscando..." />}

      {hasQuery && !isLoading && players.length === 0 && (
        <EmptyState
          icon="alert-circle-outline"
          title="Sin resultados"
          message={`No encontramos jugadores con "${query}".`}
        />
      )}

      {hasQuery && players.length > 0 && (
        <FlatList
          data={players}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <OpponentRow player={item} onSelect={() => handleSelect(item.id)} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function OpponentRow({ player, onSelect }: { player: SearchResultPlayer; onSelect: () => void }) {
  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <PlayerAvatar
        photoUrl={player.photoUrl}
        initials={`${player.firstName[0] ?? ''}${player.lastName[0] ?? ''}`}
        size={40}
      />
      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>{player.fullName}</Text>
        <View style={styles.rowMeta}>
          {player.teamLogoUrl && (
            <Image
              source={{ uri: player.teamLogoUrl }}
              style={styles.teamBadgeLogo}
              contentFit="contain"
            />
          )}
          {player.teamAbbreviation && (
            <Text style={styles.rowMetaText}>{player.teamAbbreviation}</Text>
          )}
          {player.position && (
            <>
              <Text style={styles.rowDivider}>·</Text>
              <Text style={styles.rowMetaText}>{getPositionName(player.position)}</Text>
            </>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  backButton: { padding: spacing.xs },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.md,
    padding: 0,
  },
  titleSection: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontFamily: fontFamily.displayBold,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSize.md,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    ...shadows.card,
  },
  rowPressed: { opacity: 0.7 },
  rowInfo: { flex: 1 },
  rowName: {
    color: colors.text,
    fontSize: fontSize.md,
    fontFamily: fontFamily.displaySemibold,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  teamBadgeLogo: {
    width: 14,
    height: 14,
  },
  rowMetaText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  rowDivider: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
});
