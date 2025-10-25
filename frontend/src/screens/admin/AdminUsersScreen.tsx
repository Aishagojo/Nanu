import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, View, StyleSheet, Text, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { palette, spacing, typography } from "@theme/index";
import { VoiceButton } from "@components/index";
import { useAuth } from "@context/AuthContext";
import { fetchJson, endpoints, type ApiUser } from "@services/api";
import type { Role } from "@app-types/roles";

const roleCycle: Role[] = [
  "student",
  "parent",
  "lecturer",
  "hod",
  "finance",
  "records",
  "admin",
  "superadmin",
  "librarian",
];

const getNextRole = (current: Role): Role => {
  const index = roleCycle.indexOf(current);
  if (index === -1) {
    return "student";
  }
  return roleCycle[(index + 1) % roleCycle.length];
};

export const AdminUsersScreen: React.FC = () => {
  const { state, assignRole } = useAuth();
  const accessToken = state.accessToken;
  const isSuperAdmin = state.user?.role === "superadmin";
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const loadUsers = useCallback(async () => {
    if (!accessToken) return;
    try {
      setLoading(true);
      setError(null);
      const data = await fetchJson<ApiUser[]>(endpoints.usersList(), accessToken);
      setUsers(data);
    } catch (err: any) {
      console.warn("Failed to load users", err);
      setError(err?.message ?? "Unable to load users.");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleAssign = useCallback(
    async (user: ApiUser) => {
      if (!isSuperAdmin) {
        Alert.alert("Permissions", "Only super administrators can change roles.");
        return;
      }
      const nextRole = getNextRole(user.role);
      try {
        setProcessingId(user.id);
        const updated = await assignRole(user.id, nextRole);
        setUsers((prev) => prev.map((item) => (item.id === updated.id ? { ...item, role: updated.role } : item)));
        Alert.alert("Role updated", `${user.username} is now assigned to ${nextRole.toUpperCase()}.`);
      } catch (err: any) {
        Alert.alert("Update failed", err?.message ?? "Could not assign the new role.");
      } finally {
        setProcessingId(null);
      }
    },
    [assignRole, isSuperAdmin]
  );

  const subtitle = useMemo(() => {
    if (!isSuperAdmin) {
      return "View accounts and audit authenticator usage. Role changes require super administrator access.";
    }
    return "Cycle through roles for each account to keep access aligned with responsibilities.";
  }, [isSuperAdmin]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Users & Roles</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <VoiceButton label="Refresh list" onPress={loadUsers} accessibilityHint="Reload the latest user roles" />
      {loading ? (
        <ActivityIndicator color={palette.primary} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        users.map((user) => (
          <View key={user.id} style={styles.card}>
            <Ionicons name="person" size={28} color={palette.primary} />
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{user.username}</Text>
              <Text style={styles.cardMeta}>
                Role: {user.role.toUpperCase()} | MFA: {user.totp_enabled ? "Enabled" : "Disabled"}
              </Text>
              <Text style={styles.cardMeta}>
                Status: {user.must_change_password ? "Needs password change" : "Active"}
              </Text>
              <VoiceButton
                label={
                  processingId === user.id
                    ? "Updating..."
                    : isSuperAdmin
                      ? `Assign next role (${getNextRole(user.role)})`
                      : "View permissions"
                }
                onPress={() => (isSuperAdmin ? handleAssign(user) : Alert.alert("Roles", "Review completed."))}
                accessibilityHint="Cycle to the next available role for this user"
              />
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg, backgroundColor: palette.background },
  title: { ...typography.headingXL, color: palette.textPrimary },
  subtitle: { ...typography.body, color: palette.textSecondary },
  error: { ...typography.body, color: palette.danger },
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