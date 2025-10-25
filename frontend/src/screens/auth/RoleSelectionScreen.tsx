import React, { useMemo, useState } from "react";
import { View, StyleSheet, FlatList } from "react-native";
import {
  DashboardTile,
  GreetingHeader,
  RoleBadge,
  VoiceButton,
  FloatingAssistantButton,
  ChatWidget,
  FaqModal,
} from "@components/index";
import { palette, spacing } from "@theme/index";
import type { Role } from "@app-types/roles";

type RoleOption = {
  key: Role;
  title: string;
  subtitle: string;
};

const roles: RoleOption[] = [
  { key: "student", title: "Student", subtitle: "Access timetable, assignments, and help" },
  { key: "parent", title: "Parent", subtitle: "Track progress, fees, and messages" },
  { key: "lecturer", title: "Lecturer", subtitle: "Manage classes, assignments, communication" },
  { key: "hod", title: "Head of Department", subtitle: "Assign courses, view performance" },
  { key: "finance", title: "Finance Officer", subtitle: "Manage fees, receipts, and alerts" },
  { key: "records", title: "Records Officer", subtitle: "Publish grades, transcripts, verifications" },
  { key: "admin", title: "Administrator", subtitle: "Manage users, systems, policies" },
  { key: "superadmin", title: "Super Administrator", subtitle: "Govern roles, platform security, and compliance" },
];

interface RoleSelectionScreenProps {
  onSelectRole: (role: Role) => void;
}

export const RoleSelectionScreen: React.FC<RoleSelectionScreenProps> = ({ onSelectRole }) => {
  const [showHelper, setShowHelper] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const greeting = useMemo(() => `Welcome to EduAssist!`, []);
  return (
    <View style={styles.container}>
      <GreetingHeader name="Guest" greeting={greeting} />
      <FlatList
        data={roles}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => (
          <DashboardTile
            title={item.title}
            subtitle={item.subtitle}
            onPress={() => onSelectRole(item.key)}
            icon={<RoleBadge role={item.key} />}
          />
        )}
      />
      <VoiceButton
        label="Need help?"
        onPress={() => setShowFaq(true)}
        accessibilityHint="Opens frequently asked questions"
      />
      <FloatingAssistantButton onPress={() => setShowHelper((s) => !s)} />
      {showHelper ? (
        <ChatWidget
          onClose={() => setShowHelper(false)}
          onNavigateRole={(role) => {
            setShowHelper(false);
            onSelectRole(role);
          }}
        />
      ) : null}
      <FaqModal visible={showFaq} onClose={() => setShowFaq(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  list: {
    paddingBottom: spacing.xxl,
  },
});
