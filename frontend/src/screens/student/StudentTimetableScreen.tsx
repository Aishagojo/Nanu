import React from 'react';
import { ScrollView, View, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette, spacing, typography } from '@theme/index';
import { VoiceButton } from '@components/index';

const classes = [
  { time: '08:00', subject: 'Mathematics', room: 'B-204', action: 'Join lesson' },
  { time: '10:00', subject: 'Science Lab', room: 'Lab 1', action: 'Start experiment' },
  { time: '13:30', subject: 'Art Therapy', room: 'Studio', action: 'View materials' },
];

export const StudentTimetableScreen: React.FC = () => (
  <ScrollView contentContainerStyle={styles.container}>
    <Text style={styles.title}>Today&apos;s Timetable</Text>
    <Text style={styles.subtitle}>Tap any card to hear the details or join a virtual class.</Text>
    {classes.map((item) => (
      <View key={item.subject} style={styles.card}>
        <View style={styles.iconWrapper}>
          <Ionicons name='time' size={28} color={palette.primary} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{item.subject}</Text>
          <Text style={styles.cardMeta}>
            {item.time} � Room {item.room}
          </Text>
          <VoiceButton label={item.action} onPress={() => {}} />
        </View>
      </View>
    ))}
    <VoiceButton
      label='Speak entire timetable'
      onPress={() => {}}
      accessibilityHint='Read out schedule'
    />
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
    flexDirection: 'row',
    backgroundColor: palette.surface,
    borderRadius: 24,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
    gap: spacing.lg,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: palette.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.headingM,
    color: palette.textPrimary,
  },
  cardMeta: {
    ...typography.helper,
    color: palette.textSecondary,
  },
});
