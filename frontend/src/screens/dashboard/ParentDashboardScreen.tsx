import React from "react";
import { ScrollView, View, StyleSheet, Text, RefreshControl } from "react-native";
import {
  GreetingHeader,
  DashboardTile,
  AlertBanner,
  FloatingAssistantButton,
  BottomUtilityBar,
  VoiceButton,
  NotificationBell,
} from "@components/index";
import { palette, spacing, typography } from "@theme/index";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "@navigation/AppNavigator";
import { Ionicons } from "@expo/vector-icons";
import { usePullToRefresh } from "@hooks/usePullToRefresh";

const progressBars = [
  { subject: "Math", color: palette.success, value: 85 },
  { subject: "Science", color: palette.warning, value: 72 },
  { subject: "English", color: palette.danger, value: 58 },
];

type ParentTile = {
  key: string;
  title: string;
  subtitle: string;
  icon: string;
  navigateTo: keyof RootStackParamList;
};

const parentTiles: ParentTile[] = [
  { key: "progress", title: "Progress", subtitle: "Color bars and attendance toggles.", icon: "ribbon", navigateTo: "ParentProgress" },
  { key: "fees", title: "Fees", subtitle: "Balances, plans, and quick payments.", icon: "cash", navigateTo: "ParentFees" },
  { key: "messages", title: "Messages", subtitle: "Threads with teachers and admin.", icon: "chatbubble", navigateTo: "ParentMessages" },
  { key: "timetable", title: "Timetable", subtitle: "Listen to today or plan the week.", icon: "time", navigateTo: "ParentTimetable" },
  { key: "announcements", title: "Announcements", subtitle: "School notices with audio playback.", icon: "megaphone", navigateTo: "ParentAnnouncements" },
  { key: "rewards", title: "Rewards Hub", subtitle: "See your student's perks.", icon: "gift", navigateTo: "Rewards" },
];

export const ParentDashboardScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { refreshing, onRefresh } = usePullToRefresh();

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} />}
      >
        <GreetingHeader name="Mrs. Oketch" rightAccessory={<NotificationBell />} />
        <AlertBanner message="KES 12,000 due in 5 days" variant="warning" />
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Progress Overview</Text>
          {progressBars.map((bar) => (
            <View key={bar.subject} style={styles.progressRow}>
              <Text style={styles.progressLabel}>{bar.subject}</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${bar.value}%`, backgroundColor: bar.color }]} />
              </View>
              <Text style={styles.progressValue}>{bar.value}%</Text>
            </View>
          ))}
        </View>
        {parentTiles.map((tile) => (
          <DashboardTile
            key={tile.key}
            title={tile.title}
            subtitle={tile.subtitle}
            icon={<Ionicons name={tile.icon as any} size={28} color={palette.primary} />}
            onPress={() => navigation.navigate(tile.navigateTo as never)}
          />
        ))}
      </ScrollView>
      <VoiceButton label="Speak summary" onPress={() => navigation.navigate("ParentProgress")} />
      <FloatingAssistantButton label="Chat" onPress={() => navigation.navigate("ParentMessages")} />
      <BottomUtilityBar
        items={[
          { label: "Home", isActive: true },
          { label: "Rewards", onPress: () => navigation.navigate("Rewards") },
          { label: "Search", onPress: () => navigation.navigate("Search") },
          { label: "Profile", onPress: () => navigation.navigate("Profile") },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  scroll: {
    padding: spacing.lg,
    paddingBottom: 180,
    gap: spacing.lg,
  },
  section: {
    backgroundColor: palette.surface,
    padding: spacing.lg,
    borderRadius: 24,
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.headingM,
    color: palette.textPrimary,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  progressLabel: {
    flex: 1,
    ...typography.body,
    color: palette.textPrimary,
  },
  progressTrack: {
    flex: 3,
    height: 20,
    borderRadius: 12,
    backgroundColor: palette.disabled,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 12,
  },
  progressValue: {
    width: 48,
    textAlign: "right",
    ...typography.helper,
  },
});
