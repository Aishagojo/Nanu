import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, View, StyleSheet, Text, ActivityIndicator, Alert, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { palette, spacing, typography } from "@theme/index";
import { VoiceButton } from "@components/index";
import { useAuth } from "@context/AuthContext";
import { fetchResources, type ApiResource } from "@services/api";

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

const iconForKind = (kind: ApiResource["kind"]) => {
  switch (kind) {
    case "video":
      return "play-circle";
    case "image":
      return "images";
    case "pdf":
      return "book";
    case "document":
      return "document-text";
    case "audio":
      return "musical-notes";
    default:
      return "link";
  }
};

export const StudentLibraryScreen: React.FC = () => {
  const { state } = useAuth();
  const token = state.accessToken;
  const [resources, setResources] = useState<ApiResource[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fileHost = useMemo(() => {
    try {
      const parsed = new URL(API_BASE);
      return parsed.origin;
    } catch {
      return API_BASE.replace(/\/api\/?$/, "");
    }
  }, []);

  const loadResources = useCallback(async () => {
    if (!token) {
      setResources([]);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await fetchResources(token);
      setResources(data);
    } catch (err: any) {
      console.warn("Failed to load library resources", err);
      setError(err?.message ?? "Unable to load library resources.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  const handleOpen = useCallback(
    (resource: ApiResource) => {
      const target = resource.url || resource.file;
      if (!target) {
        Alert.alert("Unavailable", "This resource is not linked or uploaded yet.");
        return;
      }
      const href =
        target.startsWith("http://") || target.startsWith("https://")
          ? target
          : `${fileHost.replace(/\/$/, "")}/${target.replace(/^\//, "")}`;
      Linking.openURL(href).catch(() => {
        Alert.alert("Unable to open", "We could not launch the resource link.");
      });
    },
    [fileHost]
  );

  const content = useMemo(() => {
    if (loading) {
      return <ActivityIndicator color={palette.primary} />;
    }
    if (error) {
      return <Text style={styles.error}>{error}</Text>;
    }
    if (!resources.length) {
      return <Text style={styles.helper}>No library resources are available yet. Check back soon.</Text>;
    }
    return resources.map((item) => (
      <View key={item.id ?? item.title} style={styles.card}>
        <Ionicons name={iconForKind(item.kind) as any} size={32} color={palette.secondary} />
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardMeta}>{item.kind.toUpperCase()}</Text>
          {item.description ? <Text style={styles.cardDescription}>{item.description}</Text> : null}
          <VoiceButton
            label="Open resource"
            onPress={() => handleOpen(item)}
            accessibilityHint="Opens the selected learning material"
          />
        </View>
      </View>
    ));
  }, [error, handleOpen, loading, resources]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Library</Text>
      <Text style={styles.subtitle}>Browse curated materials mapped to your travel and tourism units.</Text>
      {content}
      <VoiceButton label="Refresh library" onPress={loadResources} accessibilityHint="Reload the latest materials" />
    </ScrollView>
  );
};

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
  error: {
    ...typography.body,
    color: palette.danger,
  },
  helper: {
    ...typography.helper,
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
  cardDescription: {
    ...typography.body,
    color: palette.textSecondary,
  },
});


