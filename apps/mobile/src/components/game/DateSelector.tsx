import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addDays, getWeekdayLabel, isSameDay, startOfDay } from '@/lib/format';
import { colors, fontSize, fontWeight, radius, spacing } from '@/constants/theme';

type Props = {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  daysBack?: number;
  daysForward?: number;
};

const DAY_ITEM_WIDTH = 56;
const DAY_ITEM_GAP = 8;

export function DateSelector({
  selectedDate,
  onDateChange,
  daysBack = 14,
  daysForward = 14,
}: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const today = startOfDay(new Date());

  // Generar la lista de días alrededor de hoy
  const days: Date[] = [];
  for (let i = -daysBack; i <= daysForward; i++) {
    days.push(addDays(today, i));
  }

  // Centrar el día seleccionado al cargar y al cambiar
  useEffect(() => {
    const selectedIndex = days.findIndex((d) => isSameDay(d, selectedDate));
    if (selectedIndex >= 0 && scrollRef.current) {
      // Posicionamos para que el día seleccionado quede más o menos centrado
      const offset = selectedIndex * (DAY_ITEM_WIDTH + DAY_ITEM_GAP) - 120;
      scrollRef.current.scrollTo({ x: Math.max(0, offset), animated: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
                {day.getDate()}
              </Text>
              {isToday && !isSelected && <View style={styles.todayDot} />}
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
    height: 56,
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
    height: 56,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  dayItemSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayWeekday: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.5,
  },
  dayNumber: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginTop: 2,
  },
  dayTextSelected: {
    color: colors.text,
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
