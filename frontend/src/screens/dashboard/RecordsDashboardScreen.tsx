import React from "react";
import { ScrollView, View, StyleSheet, RefreshControl } from "react-native";
import { GreetingHeader, DashboardTile, BottomUtilityBar, FloatingAssistantButton, AlertBanner } from "@components/index";
import { palette, spacing } from "@theme/index";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "@navigation/AppNavigator";
import { Ionicons } from "@expo/vector-icons";
import { usePullToRefresh } from "@hooks/usePullToRefresh";

type RecordsTile = {
  key: string;
  title: string;
  subtitle: string;
  icon: string;
  navigateTo: keyof RootStackParamList;
};

const recordsTiles: RecordsTile[] = [
  { key: "exams", title: "Exams & Grades", subtitle: "Import CSVs and publish marks.", icon: "cloud-upload", navigateTo: "RecordsExams" },
  { key: "transcripts", title: "Transcripts", subtitle: "Generate watermarked PDFs.", icon: "document-text", navigateTo: "RecordsTranscripts" },
  { key: "progress", title: "Programme Progress", subtitle: "Track credits and flags.", icon: "speedometer", navigateTo: "RecordsProgress" },
  { key: "verifications", title: "Verifications", subtitle: "Respond to employers quickly.", icon: "briefcase", navigateTo: "RecordsVerifications" },
  { key: "reports", title: "Reports", subtitle: "Create semester summaries.", icon: "stats-chart", navigateTo: "RecordsReports" },
];

export const RecordsDashboardScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { refreshing, onRefresh } = usePullToRefresh();

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} />}
      >
        <GreetingHeader name="Records Officer" />
        <AlertBanner message="3 transcripts pending approval" variant="info" />
        <View style={styles.tiles}>
          {recordsTiles.map((tile) => (
            <DashboardTile
              key={tile.key}
              title={tile.title}
              subtitle={tile.subtitle}
              icon={<Ionicons name={tile.icon as any} size={28} color={palette.primary} />}
              onPress={() => navigation.navigate(tile.navigateTo as never)}
            />
          ))}
        </View>
      </ScrollView>
      <FloatingAssistantButton onPress={() => navigation.navigate("RecordsExams")} />
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
