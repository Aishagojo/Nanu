import React from "react";
import { ScrollView, View, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { palette, spacing, typography } from "@theme/index";
import { VoiceButton } from "@components/index";

const analytics = [
  { label: "Weekly logins", value: "312", icon: "log-in" },
  { label: "Chatbot questions", value: "128", icon: "chatbubble" },
  { label: "Alerts sent", value: "54", icon: "notifications" },
];

export const AdminAnalyticsScreen: React.FC = () => (
  <ScrollView contentContainerStyle={styles.container}>
    <Text style={styles.title}>Analytics</Text>
    <Text style={styles.subtitle}>Monitor usage stats and voice assistant interactions.</Text>
    {analytics.map((item) => (
      <View key={item.label} style={styles.card}>
        <Ionicons name={item.icon as any} size={28} color={palette.primary} />
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{item.label}</Text>
          <Text style={styles.cardMeta}>{item.value}</Text>
        </View>
      </View>
    ))}
    <VoiceButton label="Export analytics" onPress={() => {}} />
  </ScrollView>
);

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg, backgroundColor: palette.background },
  title: { ...typography.headingXL, color: palette.textPrimary },
  subtitle: { ...typography.body, color: palette.textSecondary },
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
  cardBody: { flex: 1, gap: spacing.sm },
  cardTitle: { ...typography.headingM, color: palette.textPrimary },
  cardMeta: { ...typography.helper, color: palette.textSecondary },
});
