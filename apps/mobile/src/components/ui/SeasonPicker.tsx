import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { TeamLogo } from '@/components/ui/TeamLogo';
import { Trophy } from '@/components/ui/Trophy';
import { colors, fontFamily, fontSize, radius, spacing } from '@/constants/theme';

export type SeasonOption = {
  season: string;
  wonChampionship?: boolean;
  champion?: {
    name: string;
    abbreviation: string;
    logoUrl?: string;
  };
  featuredPlayers?: {
    name: string;
    photoUrl?: string;
  }[];
};

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase();
}

export function SeasonButton({
  season,
  onPress,
  wonChampionship,
  champion,
}: {
  season?: string;
  onPress: () => void;
  wonChampionship?: boolean;
  champion?: SeasonOption['champion'];
}) {
  if (!season) return null;

  return (
    <Pressable onPress={onPress} style={styles.button}>
      <Text style={styles.buttonText}>{season}</Text>

      {champion && (
        <>
          <TeamLogo
            logoUrl={champion.logoUrl}
            abbreviation={champion.abbreviation}
            size={22}
          />
          <Text style={styles.buttonChampion} numberOfLines={1}>
            {champion.name}
          </Text>
        </>
      )}

      {wonChampionship && (
        <Trophy award="champion" season={season} size={20} interactive={false} />
      )}
      <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
    </Pressable>
  );
}

export function SeasonPicker({
  visible,
  seasons,
  selected,
  onSelect,
  onClose,
  title = 'Temporada',
}: {
  visible: boolean;
  seasons: SeasonOption[];
  selected?: string;
  onSelect: (season: string) => void;
  onClose: () => void;
  title?: string;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>
          <FlatList
            data={seasons}
            keyExtractor={(s) => s.season}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onSelect(item.season)}
                style={[styles.row, item.season === selected && styles.rowActive]}
              >
                <Text
                  style={[styles.rowText, item.season === selected && styles.rowTextActive]}
                >
                  {item.season}
                </Text>

                {/* Hueco flexible: con campeon lo ocupa el equipo, sin el
                    empuja el check hasta el borde derecho. */}
                <View style={styles.rowFill}>
                  {item.champion && (
                    <>
                      <TeamLogo
                        logoUrl={item.champion.logoUrl}
                        abbreviation={item.champion.abbreviation}
                        size={22}
                      />
                      <Text style={styles.championName} numberOfLines={1}>
                        {item.champion.name}
                      </Text>
                    </>
                  )}
                  {item.featuredPlayers?.map((p, i) => (
                    <View key={p.name} style={styles.playerChip}>
                      {i > 0 && <Text style={styles.ampersand}>&</Text>}
                      <PlayerAvatar
                        photoUrl={p.photoUrl}
                        initials={iniciales(p.name)}
                        size={24}
                      />
                      <Text style={styles.championName} numberOfLines={1}>
                        {p.name}
                      </Text>
                    </View>
                  ))}
                </View>

                {item.wonChampionship && (
                  <Trophy
                    award="champion"
                    season={item.season}
                    size={22}
                    interactive={false}
                  />
                )}
                {item.season === selected && (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                )}
              </Pressable>
            )}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    minHeight: 46,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  buttonText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontFamily: fontFamily.displaySemibold,
  },
  buttonChampion: {
    flexShrink: 1,
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '70%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.borderStrong,
    marginBottom: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontFamily: fontFamily.displayBold,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowActive: {
    backgroundColor: colors.surfaceLight,
  },
  rowText: {
    width: 78,
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontFamily: fontFamily.displaySemibold,
  },
  rowFill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  playerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
  },
  ampersand: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginRight: 2,
  },
  championName: {
    flexShrink: 1,
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
  },
  rowTextActive: {
    color: colors.text,
  },
});
