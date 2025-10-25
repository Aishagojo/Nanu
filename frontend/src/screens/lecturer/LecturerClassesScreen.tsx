import React from "react";
import { ScrollView, View, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { palette, spacing, typography } from "@theme/index";
import { VoiceButton } from "@components/index";

const sessions = [
  { time: "08:00", course: "ICT201", topic: "Networks & Internet", students: 24, location: "B-302", action: "Start attendance" },
  { time: "11:00", course: "ICT305", topic: "Assistive Tech Workshop", students: 18, location: "Innovation Lab", action: "Launch live class" },
  { time: "14:30", course: "Advisory", topic: "One-on-one check-ins", students: 6, location: "Counseling Room", action: "Open notes" },
];

export const LecturerClassesScreen: React.FC = () => (
  <ScrollView contentContainerStyle={styles.container}>
    <Text style={styles.title}>Today&apos;s Classes</Text>
    <Text style={styles.subtitle}>Tap any session to take attendance, share resources, or start a call.</Text>
    {sessions.map((session) => (
      <View key={session.course + session.time} style={styles.card}>
        <View style={styles.iconWrapper}>
          <Ionicons name="people" size={28} color={palette.primary} />
          <Text style={styles.studentCount}>{session.students}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{session.course} • {session.topic}</Text>
          <Text style={styles.cardMeta}>{session.time} • {session.location}</Text>
          <VoiceButton label={session.action} onPress={() => {}} />
        </View>
      </View>
    ))}
    <VoiceButton label="Speak schedule" onPress={() => {}} />
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
  iconWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  studentCount: {
    ...typography.helper,
    color: palette.textSecondary,
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
