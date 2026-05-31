import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TeamLogo } from '@/components/ui/TeamLogo';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { useSearch } from '@/hooks/useSearch';
import { colors, fontSize, fontWeight, radius, spacing } from '@/constants/theme';
import type { SearchResultPlayer, SearchResultTeam } from '@/types/domain';
import { getPositionName } from '@/constants/positions';
import { Image } from 'expo-image';
import { EmptyState } from '@/components/ui/EmptyState';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const { data, isLoading, isFetching } = useSearch(query);

  const hasQuery = query.trim().length >= 2;
  const teams = data?.teams ?? [];
  const players = data?.players ?? [];
  const hasResults = teams.length > 0 || players.length > 0;

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
            placeholder="Buscar equipos y jugadores..."
            placeholderTextColor={colors.textMuted}
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {!hasQuery && (
        <EmptyState
          icon="search"
          title="Busca jugadores o equipos"
          message="Escribe al menos 2 caracteres para empezar."
        />
      )}

      {hasQuery && isLoading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {hasQuery && !isLoading && !hasResults && (
        <EmptyState
          icon="alert-circle-outline"
          title="Sin resultados"
          message={`No encontramos nada para "${query}". Prueba con otro término.`}
        />
      )}

      {hasQuery && hasResults && (
        <FlatList
          data={[]}
          renderItem={null}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View>
              {teams.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Equipos · {teams.length}</Text>
                  {teams.map((t) => (
                    <TeamSearchRow key={t.id} team={t} />
                  ))}
                </View>
              )}

              {players.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Jugadores · {players.length}</Text>
                  {players.map((p) => (
                    <PlayerSearchRow key={p.id} player={p} />
                  ))}
                </View>
              )}

              {isFetching && (
                <View style={styles.refreshIndicator}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function TeamSearchRow({ team }: { team: SearchResultTeam }) {
  return (
    <Pressable
      onPress={() => router.replace({ pathname: '/team/[id]', params: { id: team.id } })}
      style={({ pressed }) => [styles.resultRow, pressed && styles.resultRowPressed]}
    >
      <TeamLogo logoUrl={team.logoUrl} abbreviation={team.abbreviation} size={40} />
      <View style={styles.resultInfo}>
        <Text style={styles.resultPrimary}>{team.fullName}</Text>
        <Text style={styles.resultSecondary}>
          {team.conference === 'East' ? 'Conferencia Este' : 'Conferencia Oeste'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

function PlayerSearchRow({ player }: { player: SearchResultPlayer }) {
  return (
    <Pressable
      onPress={() => router.replace({ pathname: '/player/[id]', params: { id: player.id } })}
      style={({ pressed }) => [styles.resultRow, pressed && styles.resultRowPressed]}
    >
      <PlayerAvatar
        photoUrl={player.photoUrl}
        initials={`${player.firstName[0] ?? ''}${player.lastName[0] ?? ''}`}
        size={40}
      />
      <View style={styles.resultInfo}>
        <Text style={styles.resultPrimary}>{player.fullName}</Text>
        <View style={styles.playerMetaRow}>
          {player.teamAbbreviation && (
            <View style={styles.teamBadge}>
              {player.teamLogoUrl && (
                <Image
                  source={{ uri: player.teamLogoUrl }}
                  style={styles.teamBadgeLogo}
                  contentFit="contain"
                  transition={150}
                />
              )}
              <Text style={styles.resultSecondary}>{player.teamAbbreviation}</Text>
            </View>
          )}
          {player.position && (
            <>
              <Text style={styles.resultDivider}>·</Text>
              <Text style={styles.resultSecondary}>{getPositionName(player.position)}</Text>
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
  backButton: {
    padding: spacing.xs,
  },
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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    textAlign: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  resultRow: {
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
  },
  resultRowPressed: {
    opacity: 0.7,
  },
  resultInfo: {
    flex: 1,
  },
  resultPrimary: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  resultSecondary: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  playerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  resultDivider: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  refreshIndicator: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  teamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  teamBadgeLogo: {
    width: 16,
    height: 16,
  },
});
