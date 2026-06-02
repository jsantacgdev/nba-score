import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addDays, getWeekdayLabel, isSameDay, startOfDay } from '@/lib/format';
import { colors, fontSize, fontFamily, radius, spacing } from '@/constants/theme';

type Props = {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  daysBack?: number;
  daysForward?: number;
  gameCounts?: Map<string, number>;
};

const DAY_ITEM_WIDTH = 64;
const DAY_ITEM_GAP = 8;

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function DateSelector({
  selectedDate,
  onDateChange,
  daysBack = 60,
  daysForward = 60,
  gameCounts,
}: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const today = startOfDay(new Date());

  const days: Date[] = [];
  for (let i = -daysBack; i <= daysForward; i++) {
    days.push(addDays(today, i));
  }

  useEffect(() => {
    const selectedIndex = days.findIndex((d) => isSameDay(d, selectedDate));
    if (selectedIndex >= 0 && scrollRef.current) {
      const offset = selectedIndex * (DAY_ITEM_WIDTH + DAY_ITEM_GAP) - 120;
      scrollRef.current.scrollTo({ x: Math.max(0, offset), animated: true });
    }
  }, [selectedDate]);

  const goToPreviousDay = () => onDateChange(addDays(selectedDate, -1));
  const goToNextDay = () => onDateChange(addDays(selectedDate, 1));

  return (
    <View style={styles.container}>
      <Pressable onPress={goToPreviousDay} style={styles.arrowButton}>
        <Ionicons name="chevron-back" size={20} color={colors.text} />
      </Pressable>

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.daysList}
      >
        {days.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, today);
          const count = gameCounts?.get(toDateKey(day)) ?? 0;

          return (
            <Pressable
              key={day.toISOString()}
              onPress={() => onDateChange(day)}
              style={[styles.dayItem, isSelected && styles.dayItemSelected]}
            >
              <Text style={[styles.dayWeekday, isSelected && styles.dayTextSelected]}>
                {getWeekdayLabel(day)}
              </Text>
              <Text style={[styles.dayNumber, isSelected && styles.dayTextSelected]}>
                {String(day.getDate()).padStart(2, '0')}/
                {String(day.getMonth() + 1).padStart(2, '0')}
              </Text>
              {count >= 0 && (
                <Text style={[styles.dayCount, isSelected && styles.dayCountSelected]}>
                  {count} {count === 1 ? 'partido' : 'partidos'}
                </Text>
              )}
              {isToday && !isSelected && count === 0 && <View style={styles.todayDot} />}
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable onPress={goToNextDay} style={styles.arrowButton}>
        <Ionicons name="chevron-forward" size={20} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  arrowButton: {
    width: 32,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  daysList: {
    gap: DAY_ITEM_GAP,
    paddingHorizontal: spacing.xs,
  },
  dayItem: {
    width: DAY_ITEM_WIDTH,
    height: 72,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
    paddingVertical: 4,
  },
  dayItemSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayWeekday: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.displaySemibold,
    letterSpacing: 0.5,
  },
  dayNumber: {
    color: colors.text,
    fontSize: fontSize.md, // antes fontSize.lg
    fontFamily: fontFamily.displayBold,
    marginTop: 1,
    lineHeight: 20,
  },
  dayTextSelected: {
    color: colors.text,
  },
  dayCount: {
    color: colors.textMuted,
    fontSize: 9,
    fontFamily: fontFamily.medium,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  dayCountSelected: {
    color: colors.text,
    opacity: 0.85,
  },
  todayDot: {
    position: 'absolute',
    bottom: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
});
