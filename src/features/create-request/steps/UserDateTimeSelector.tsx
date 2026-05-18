import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '../../../core/theme';
import { addDays, format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday, isAfter, isBefore } from 'date-fns';

const TIME_SLOTS = [
  { start: '10:00', end: '12:00', label: '10:00 AM - 12:00 PM' },
  { start: '12:00', end: '15:00', label: '12:00 PM - 3:00 PM' },
  { start: '15:00', end: '18:00', label: '3:00 PM - 6:00 PM' },
];

interface UserDateTimeSelectorProps {
  preferredDate?: string;
  preferredTime?: string;
  onDateSlotSelect: (dateValue: string, slotValue: string) => void;
  error?: string;
  preferredDateError?: string;
  preferredTimeError?: string;
}

export default function UserDateTimeSelector({
  preferredDate,
  preferredTime,
  onDateSlotSelect,
  error,
  preferredDateError,
  preferredTimeError,
}: UserDateTimeSelectorProps) {
  const { colors, spacing, typography } = useTheme();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = addDays(today, 1);
  const dayAfterTomorrow = addDays(today, 2);

  const quickDates = [
    { date: today, label: 'Today', value: format(today, 'yyyy-MM-dd') },
    { date: tomorrow, label: 'Tomorrow', value: format(tomorrow, 'yyyy-MM-dd') },
    {
      date: dayAfterTomorrow,
      label: 'Day after tomorrow',
      value: format(dayAfterTomorrow, 'yyyy-MM-dd'),
    },
  ];

  // Calendar helper functions
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const getEmptyDays = () => {
    const firstDayOfWeek = getDay(monthStart);
    return Array(firstDayOfWeek).fill(null);
  };

  const isDateSelectable = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = addDays(today, 1);
    const dayAfterTomorrow = addDays(today, 2);
    
    // Only allow today, tomorrow, and day after tomorrow
    return (
      isSameDay(date, today) || 
      isSameDay(date, tomorrow) || 
      isSameDay(date, dayAfterTomorrow)
    );
  };

  const handleDateSelect = (date: Date) => {
    if (isDateSelectable(date)) {
      const dateValue = format(date, 'yyyy-MM-dd');
      onDateSlotSelect(dateValue, '');
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(newMonth.getMonth() - 1);
      } else {
        newMonth.setMonth(newMonth.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const handleDateSlotClick = (dateValue: string, slotValue: string) => {
    onDateSlotSelect(dateValue, slotValue);
  };

  // Helper function to check if a time slot is available for a given date
  const isSlotAvailable = (dateValue: string, slot: (typeof TIME_SLOTS)[0]): boolean => {
    const now = new Date();
    const selectedDateObj = new Date(dateValue);

    // If selected date is not today, all slots are available
    if (format(selectedDateObj, 'yyyy-MM-dd') !== format(now, 'yyyy-MM-dd')) {
      return true;
    }

    // For today, check if the slot end time has passed
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTimeInMinutes = currentHours * 60 + currentMinutes;

    // Parse slot end time (format: "HH:mm")
    const [endHours, endMinutes] = slot.end.split(':').map(Number);
    const slotEndTimeInMinutes = endHours * 60 + endMinutes;

    // Slot is available if current time hasn't passed the end time
    return currentTimeInMinutes < slotEndTimeInMinutes;
  };

  // Get available time slots for a specific date
  const getAvailableSlots = (dateValue: string) => {
    return TIME_SLOTS.filter(slot => isSlotAvailable(dateValue, slot));
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    } as ViewStyle,
    section: {
      marginBottom: spacing.xl,
    } as ViewStyle,
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: colors.foreground,
      marginBottom: spacing.md,
    } as TextStyle,
    quickDatesContainer: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      marginBottom: spacing.lg,
    } as ViewStyle,
    quickDateButton: {
      flex: 1,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginHorizontal: spacing.xs,
      minHeight: 44,
      shadowColor: '#000',
      shadowOpacity: 0.03,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    } as ViewStyle,
    quickDateButtonSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    } as ViewStyle,
    quickDateButtonError: {
      borderColor: colors.destructive,
      borderWidth: 1.5,
    } as ViewStyle,
    quickDateButtonText: {
      fontSize: 14,
      fontWeight: '500' as const,
      color: colors.mutedForeground,
      textAlign: 'center' as const,
    } as TextStyle,
    quickDateButtonTextSelected: {
      color: colors.primaryForeground,
    } as TextStyle,
    // Calendar styles
    calendarContainer: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: spacing.md,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    } as ViewStyle,
    calendarContainerError: {
      borderColor: colors.destructive,
      borderWidth: 1.5,
    } as ViewStyle,
    calendarHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      marginBottom: spacing.md,
    } as ViewStyle,
    calendarTitle: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.foreground,
    } as TextStyle,
    calendarNavButton: {
      padding: spacing.xs,
      borderRadius: 999,
      backgroundColor: colors.muted,
    } as ViewStyle,
    calendarNavText: {
      fontSize: 16,
      color: colors.foreground,
      fontWeight: '600' as const,
    } as TextStyle,
    weekDaysContainer: {
      flexDirection: 'row' as const,
      marginBottom: spacing.sm,
    } as ViewStyle,
    weekDayText: {
      flex: 1,
      textAlign: 'center' as const,
      fontSize: 12,
      fontWeight: '500' as const,
      color: colors.mutedForeground,
    } as TextStyle,
    calendarGrid: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
    } as ViewStyle,
    calendarDay: {
      width: '14.28%',
      aspectRatio: 1,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      borderRadius: 12,
      marginVertical: 2,
    } as ViewStyle,
    calendarDayText: {
      fontSize: 14,
      color: colors.foreground,
    } as TextStyle,
    calendarDayToday: {
      backgroundColor: colors.primary + '20',
    } as ViewStyle,
    calendarDayTodayText: {
      color: colors.primary,
      fontWeight: '600' as const,
    } as TextStyle,
    calendarDaySelected: {
      backgroundColor: colors.primary,
    } as ViewStyle,
    calendarDaySelectedText: {
      color: colors.primaryForeground,
      fontWeight: '600' as const,
    } as TextStyle,
    calendarDayDisabled: {
      opacity: 0.3,
    } as ViewStyle,
    calendarDayDisabledText: {
      color: colors.mutedForeground,
    } as TextStyle,
    calendarDayEmpty: {
      width: '14.28%',
    } as ViewStyle,
    // Time slots styles
    timeSlotsContainer: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      justifyContent: 'space-between' as const,
    } as ViewStyle,
    timeSlotButton: {
      width: '48%',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: spacing.md,
      justifyContent: 'center' as const,
      marginBottom: spacing.sm,
      alignItems: 'center' as const,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    } as ViewStyle,
    timeSlotButtonSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    } as ViewStyle,
    timeSlotButtonError: {
      borderColor: colors.destructive,
      borderWidth: 1.5,
    } as ViewStyle,
    timeSlotButtonDisabled: {
      backgroundColor: colors.muted,
      borderColor: colors.muted,
      opacity: 0.5,
    } as ViewStyle,
    timeSlotButtonText: {
      fontSize: 12,
      color: colors.mutedForeground,
      textAlign: 'center' as const,
    } as TextStyle,
    timeSlotButtonTextSelected: {
      color: colors.primaryForeground,
    } as TextStyle,
    timeSlotButtonTextDisabled: {
      color: colors.mutedForeground,
      opacity: 0.5,
    } as TextStyle,
    errorText: {
      fontSize: 12,
      color: colors.destructive,
      marginTop: spacing.xs,
    } as TextStyle,
    noSlotsText: {
      textAlign: 'center' as const,
      color: colors.mutedForeground,
      fontSize: 14,
      fontStyle: 'italic' as const,
      marginTop: spacing.md,
    } as TextStyle,
  });

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Select</Text>
        <View style={styles.quickDatesContainer}>
          {quickDates.map((dateOption) => {
            const isSelected = preferredDate === dateOption.value;
            return (
              <TouchableOpacity
                key={dateOption.value}
                style={[
                  styles.quickDateButton,
                  preferredDateError && !preferredDate && styles.quickDateButtonError,
                  isSelected && styles.quickDateButtonSelected,
                ]}
                onPress={() => {
                  // Clear time slot when date changes
                  onDateSlotSelect(dateOption.value, '');
                }}
              >
                <Text
                  style={[
                    styles.quickDateButtonText,
                    isSelected && styles.quickDateButtonTextSelected,
                  ]}
                >
                  {dateOption.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Date</Text>
        <View style={[styles.calendarContainer, preferredDateError && !preferredDate && styles.calendarContainerError]}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity 
              style={styles.calendarNavButton}
              onPress={() => navigateMonth('prev')}
            >
              <Text style={styles.calendarNavText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.calendarTitle}>
              {format(currentMonth, 'MMMM yyyy')}
            </Text>
            <TouchableOpacity 
              style={styles.calendarNavButton}
              onPress={() => navigateMonth('next')}
            >
              <Text style={styles.calendarNavText}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.weekDaysContainer}>
            {weekDays.map((day) => (
              <Text key={day} style={styles.weekDayText}>
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {getEmptyDays().map((_, index) => (
              <View key={`empty-${index}`} style={styles.calendarDayEmpty} />
            ))}
            {monthDays.map((day) => {
              const isSelected = preferredDate === format(day, 'yyyy-MM-dd');
              const isTodayDate = isToday(day);
              const isSelectable = isDateSelectable(day);
              
              return (
                <TouchableOpacity
                  key={day.toISOString()}
                  style={[
                    styles.calendarDay,
                    isTodayDate && !isSelected && styles.calendarDayToday,
                    isSelected && styles.calendarDaySelected,
                    !isSelectable && styles.calendarDayDisabled,
                  ]}
                  onPress={() => handleDateSelect(day)}
                  disabled={!isSelectable}
                >
                  <Text
                    style={[
                      styles.calendarDayText,
                      isTodayDate && !isSelected && styles.calendarDayTodayText,
                      isSelected && styles.calendarDaySelectedText,
                      !isSelectable && styles.calendarDayDisabledText,
                    ]}
                  >
                    {format(day, 'd')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        {preferredDateError && !preferredDate && <Text style={styles.errorText}>{preferredDateError}</Text>}
      </View>

      {preferredDate && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Time Slot</Text>
          <View style={styles.timeSlotsContainer}>
            {getAvailableSlots(preferredDate).length > 0 ? (
              getAvailableSlots(preferredDate).map((slot) => {
                const isSelected = preferredTime === `${slot.start} - ${slot.end}`;
                const isDisabled = !isSlotAvailable(preferredDate, slot);
                
                return (
                  <TouchableOpacity
                    key={`${slot.start}-${slot.end}`}
                    style={[
                      styles.timeSlotButton,
                      preferredTimeError && !preferredTime && styles.timeSlotButtonError,
                      isSelected && styles.timeSlotButtonSelected,
                      isDisabled && styles.timeSlotButtonDisabled,
                    ]}
                    onPress={() => {
                      if (!isDisabled) {
                        handleDateSlotClick(preferredDate, `${slot.start} - ${slot.end}`);
                      }
                    }}
                    disabled={isDisabled}
                  >
                    <Text
                      style={[
                        styles.timeSlotButtonText,
                        isSelected && styles.timeSlotButtonTextSelected,
                        isDisabled && styles.timeSlotButtonTextDisabled,
                      ]}
                    >
                      {slot.label}
                    </Text>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={{ width: '100%' }}>
                <Text style={styles.noSlotsText}>
                  No available time slots for this date
                </Text>
              </View>
            )}
          </View>
          {preferredTimeError && !preferredTime && <Text style={styles.errorText}>{preferredTimeError}</Text>}
        </View>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}
    </ScrollView>
  );
}
