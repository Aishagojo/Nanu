import React from "react";
import { ScrollView, View, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { palette, spacing, typography } from "@theme/index";
import { VoiceButton } from "@components/index";

const markingQueue = [
  { title: "ICT201 Homework 4", submissions: 12, due: "Submitted today", action: "Open grading" },
  { title: "ICT305 Reflection", submissions: 8, due: "Due tomorrow", action: "Send reminder" },
];

export const LecturerAssignmentsScreen: React.FC = () => (
  <ScrollView contentContainerStyle={styles.container}>
    <Text style={styles.title}>Assignments & Marking</Text>
    <Text style={styles.subtitle}>Check recent submissions, give audio feedback, and share new tasks.</Text>
    {markingQueue.map((item) => (
      <View key={item.title} style={styles.card}>
        <Ionicons name="reader" size={28} color={palette.accent} />
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardMeta}>{item.submissions} submissions • {item.due}</Text>
          <VoiceButton label={item.action} onPress={() => {}} />
        </View>
      </View>
    ))}
    <VoiceButton label="Create new assignment" onPress={() => {}} />
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
    color: palette.textSecondary,
  },
});
