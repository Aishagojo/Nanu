import React from 'react';
import { ScrollView, View, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette, spacing, typography } from '@theme/index';
import { VoiceButton } from '@components/index';

const week = [
  { day: 'Monday', slots: ['ICT201 08:00 - Room B302', 'Advisory 14:00 - Counseling Room'] },
  { day: 'Wednesday', slots: ['ICT305 10:00 - Innovation Lab', 'Team Workshop 15:00 - Online'] },
  { day: 'Friday', slots: ['ICT201 09:00 - Room B302', 'Guardian Consultations 13:30 - Online'] },
];

export const LecturerTimetableScreen: React.FC = () => (
  <ScrollView contentContainerStyle={styles.container}>
    <Text style={styles.title}>Weekly Timetable</Text>
    <Text style={styles.subtitle}>Toggle reminders or send reschedule notices.</Text>
    {week.map((day) => (
      <View key={day.day} style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name='calendar' size={24} color={palette.primary} />
          <Text style={styles.cardTitle}>{day.day}</Text>
        </View>
        {day.slots.map((slot) => (
          <Text key={slot} style={styles.slot}>
            {slot}
          </Text>
        ))}
      </View>
    ))}
    <VoiceButton label='Export timetable' onPress={() => {}} />
  </ScrollView>
);

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.lg,
    backgroundColor: palette.background,
  },
  title: {
    ...typography.headingXL,
    color: palette.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: palette.textSecondary,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 24,
    padding: spacing.lg,
    gap: spacing.xs,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.headingM,
    color: palette.textPrimary,
  },
  slot: {
    ...typography.body,
    color: palette.textSecondary,
  },
});
