import React from "react";
import { ScrollView, View, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { palette, spacing, typography } from "@theme/index";
import { VoiceButton } from "@components/index";

const assignments = [
  { title: "Photosynthesis Poster", due: "Due tomorrow", description: "Record a 2 minute voice summary and add pictures." },
  { title: "Number Patterns", due: "Due in 3 days", description: "Complete worksheet pages 4-6." },
];

export const StudentAssignmentsScreen: React.FC = () => (
  <ScrollView contentContainerStyle={styles.container}>
    <Text style={styles.title}>Assignments</Text>
    <Text style={styles.subtitle}>Use the microphone button to dictate answers or ask for help.</Text>
    {assignments.map((item) => (
      <View key={item.title} style={styles.card}>
        <Ionicons name="document-text" size={28} color={palette.accent} />
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardMeta}>{item.due}</Text>
          <Text style={styles.cardDescription}>{item.description}</Text>
          <VoiceButton label="Open assignment" onPress={() => {}} />
        </View>
      </View>
    ))}
    <VoiceButton label="Ask for assignment help" onPress={() => {}} accessibilityHint="Send help message" />
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
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: palette.surface,
    borderRadius: 24,
    padding: spacing.lg,
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
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
    color: palette.warning,
  },
  cardDescription: {
    ...typography.body,
    color: palette.textSecondary,
  },
});
