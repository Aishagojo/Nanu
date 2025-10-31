import React from 'react';
import { ScrollView, View, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette, spacing, typography } from '@theme/index';
import { VoiceButton } from '@components/index';

const trackers = [
  { student: 'Lina', credits: '48 / 60', flag: 'On track' },
  { student: 'Daniel', credits: '32 / 60', flag: 'At risk' },
];

export const RecordsProgressScreen: React.FC = () => (
  <ScrollView contentContainerStyle={styles.container}>
    <Text style={styles.title}>Programme Progress</Text>
    <Text style={styles.subtitle}>Track credits and flag students needing intervention.</Text>
    {trackers.map((item) => (
      <View key={item.student} style={styles.card}>
        <Ionicons name='speedometer' size={28} color={palette.primary} />
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{item.student}</Text>
          <Text style={styles.cardMeta}>
            {item.credits} � {item.flag}
          </Text>
          <VoiceButton label='Plan support' onPress={() => {}} />
        </View>
      </View>
    ))}
  </ScrollView>
);

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg, backgroundColor: palette.background },
  title: { ...typography.headingXL, color: palette.textPrimary },
  subtitle: { ...typography.body, color: palette.textSecondary },
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: palette.surface,
    borderRadius: 24,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  cardBody: { flex: 1, gap: spacing.sm },
  cardTitle: { ...typography.headingM, color: palette.textPrimary },
  cardMeta: { ...typography.helper, color: palette.textSecondary },
});
