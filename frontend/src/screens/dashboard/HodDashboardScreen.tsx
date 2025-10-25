import React from "react";
import { ScrollView, View, StyleSheet, RefreshControl } from "react-native";
import { GreetingHeader, DashboardTile, BottomUtilityBar, FloatingAssistantButton, AlertBanner } from "@components/index";
import { palette, spacing } from "@theme/index";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "@navigation/AppNavigator";
import { Ionicons } from "@expo/vector-icons";
import { usePullToRefresh } from "@hooks/usePullToRefresh";

type HodTile = {
  key: string;
  title: string;
  subtitle: string;
  icon: string;
  navigateTo: keyof RootStackParamList;
};

const hodTiles: HodTile[] = [
  { key: "assignments", title: "Course Assignments", subtitle: "Allocate lecturers and review conflicts.", icon: "swap-horizontal", navigateTo: "HodAssignments" },
  { key: "timetable", title: "Timetables", subtitle: "Approve weekly schedules with clash detection.", icon: "calendar", navigateTo: "HodTimetable" },
  { key: "performance", title: "Performance", subtitle: "Monitor averages and pass rates.", icon: "trending-up", navigateTo: "HodPerformance" },
  { key: "communications", title: "Communications", subtitle: "Broadcast to parents and lecturers.", icon: "mail", navigateTo: "HodCommunications" },
  { key: "reports", title: "Reports", subtitle: "Generate PDF & CSV summaries.", icon: "document", navigateTo: "HodReports" },
];

export const HodDashboardScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { refreshing, onRefresh } = usePullToRefresh();

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} />}
      >
        <GreetingHeader name="Dr. Kendi" />
        <AlertBanner message="Conflict: CS202 overlaps with ENG110" variant="danger" />
        <View style={styles.tiles}>
          {hodTiles.map((tile) => (
            <DashboardTile
              key={tile.key}
              title={tile.title}
              subtitle={tile.subtitle}
              onPress={() => navigation.navigate(tile.navigateTo as never)}
              icon={<Ionicons name={tile.icon as any} size={28} color={palette.primary} />}
            />
          ))}
        </View>
      </ScrollView>
      <FloatingAssistantButton onPress={() => navigation.navigate("HodCommunications")} />
      <BottomUtilityBar
        items={[
          { label: "Home", isActive: true },
          { label: "Search", onPress: () => navigation.navigate("Search") },
          { label: "Profile", onPress: () => navigation.navigate("Profile") },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  scroll: { padding: spacing.lg, paddingBottom: 160, gap: spacing.md },
  tiles: { gap: spacing.md },
});
