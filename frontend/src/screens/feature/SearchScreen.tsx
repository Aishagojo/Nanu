import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View, ActivityIndicator, Alert } from "react-native";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { palette, spacing, typography } from "@theme/index";
import { VoiceButton } from "@components/index";
import { fetchResources, transcribeAudio, type ApiResource } from "@services/api";
import { useAuth } from "@context/AuthContext";
import { featureCatalog } from "@data/featureCatalog";
import type { Role } from "@app-types/roles";
import { useNotifications } from "@context/NotificationContext";

type SearchState = "idle" | "recording" | "thinking";

type SearchResult = {
  id: string;
  title: string;
  subtitle: string;
  meta?: string;
  type: "feature" | "resource";
};

const searchPreset = Audio.RecordingOptionsPresets.HIGH_QUALITY;

const searchRecordingOptions: Audio.RecordingOptions = {
  ...searchPreset,
  android: {
    ...searchPreset.android,
    numberOfChannels: 1,
    bitRate: 96000,
  },
  ios: {
    ...searchPreset.ios,
    numberOfChannels: 1,
    bitRate: 96000,
  },
  web: {
    mimeType: "audio/mp4",
    bitsPerSecond: 96000,
  },
};

export const SearchScreen: React.FC = () => {
  const { state } = useAuth();
  const token = state.accessToken;
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const { ingestResources } = useNotifications();
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [stateFlag, setStateFlag] = useState<SearchState>("idle");
  const [query, setQuery] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [resources, setResources] = useState<ApiResource[] | null>(null);
  const [loadingResources, setLoadingResources] = useState(false);

  const featurePool = useMemo(() => {
    return Object.entries(featureCatalog).flatMap(([role, entries]) =>
      entries.map((entry) => ({
        id: `${role}-${entry.key}`,
        role: role as Role,
        title: entry.title,
        description: entry.description,
        callToAction: entry.callToAction,
        apiHint: entry.apiHint,
      }))
    );
  }, []);

  const ensureResources = useCallback(async () => {
    if (!token) {
      return resources ?? [];
    }
    setLoadingResources(true);
    try {
      const data = await fetchResources(token);
      setResources(data);
      ingestResources(data, { name: "Search" });
      return data;
    } catch (err: any) {
      console.warn("Failed to load resources for search", err);
      setError(err?.message ?? "Unable to fetch library resources.");
      return resources ?? [];
    } finally {
      setLoadingResources(false);
    }
  }, [ingestResources, resources, token]);

const ensurePermission = useCallback(async () => {
    if (permissionResponse?.granted) return true;
    const res = await requestPermission();
    if (!res.granted) {
      Alert.alert("Microphone needed", "Please enable microphone to use voice search.");
      return false;
    }
    return true;
  }, [permissionResponse?.granted, requestPermission]);

  const startRecording = useCallback(async () => {
    const ok = await ensurePermission();
    if (!ok) return;
    try {
      setError(null);
      setStateFlag("recording");
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(searchRecordingOptions);
      await rec.startAsync();
      setRecording(rec);
      setQuery("");
      setResults([]);
    } catch (err: any) {
      console.warn("Search recording failed", err);
      setError(err?.message ?? "Unable to start microphone.");
      setStateFlag("idle");
    }
  }, [ensurePermission]);

  const runSearch = useCallback(
    async (spokenText: string) => {
      const queryText = spokenText.trim().toLowerCase();
      if (!queryText) {
        setResults([]);
        return;
      }

      const matches: SearchResult[] = [];
      featurePool.forEach((feature) => {
        const haystack = `${feature.title} ${feature.description} ${feature.apiHint ?? ""}`.toLowerCase();
        if (haystack.includes(queryText)) {
          matches.push({
            id: `feature-${feature.id}`,
            type: "feature",
            title: feature.title,
            subtitle: `${feature.role.toUpperCase()} - ${feature.description}`,
            meta: feature.apiHint || feature.callToAction || undefined,
          });
        }
      });

      const libraryItems = await ensureResources();
      libraryItems
        .filter((item) => {
          const haystack = `${item.title} ${item.description ?? ""} ${item.kind}`.toLowerCase();
          return haystack.includes(queryText);
        })
        .forEach((item) => {
          matches.push({
            id: `resource-${item.id}`,
            type: "resource",
            title: item.title,
            subtitle: `${item.kind.toUpperCase()} - ${item.description || "Resource in library"}`,
            meta: item.url || undefined,
          });
        });

      setResults(matches);
    },
    [ensureResources, featurePool]
  );

  const stopRecording = useCallback(async () => {
    if (!recording) return;
    try {
      setStateFlag("thinking");
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (!uri || !token) {
        throw new Error("No audio captured.");
      }
      const { text } = await transcribeAudio(token, uri);
      const spoken = text || "(No speech detected)";
      setQuery(spoken);
      await runSearch(spoken);
      setError(null);
    } catch (err: any) {
      console.warn("Search transcription failed", err);
      setError(err?.message ?? "Could not recognise speech.");
      setResults([]);
    } finally {
      setRecording(null);
      setStateFlag("idle");
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    }
  }, [recording, runSearch, token]);

  const handlePressIn = useCallback(async () => {
    if (stateFlag !== "idle") return;
    await startRecording();
  }, [startRecording, stateFlag]);

  const handlePressOut = useCallback(async () => {
    if (stateFlag !== "recording") return;
    await stopRecording();
  }, [stateFlag, stopRecording]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Voice-first Search</Text>
      <Text style={styles.body}>
        Hold the microphone, describe what you need, and we will auto-transcribe your request to find matching features
        and resources.
      </Text>
      <VoiceButton
        label={
          stateFlag === "recording"
            ? "Listening... release to search"
            : stateFlag === "thinking"
              ? "Searching..."
              : "Hold to search by voice"
        }
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        isActive={stateFlag === "recording"}
        accessibilityHint="Hold to dictate your search query"
      />
      {stateFlag === "thinking" || loadingResources ? <ActivityIndicator color={palette.primary} /> : null}
      {query ? (
        <View style={styles.chip}>
          <Ionicons name="text-outline" size={16} color={palette.primary} />
          <Text style={styles.chipText}>{query}</Text>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {results.length > 0 ? (
        <View style={styles.results}>
          {results.map((item) => (
            <View key={item.id} style={styles.resultCard}>
              <Ionicons
                name={item.type === "feature" ? "apps" : "book"}
                size={24}
                color={item.type === "feature" ? palette.primary : palette.success}
              />
              <View style={styles.resultBody}>
                <Text style={styles.resultTitle}>{item.title}</Text>
                <Text style={styles.resultSubtitle}>{item.subtitle}</Text>
                {item.meta ? <Text style={styles.resultMeta}>{item.meta}</Text> : null}
              </View>
            </View>
          ))}
        </View>
      ) : query && !error ? (
        <Text style={styles.helper}>No matching features or library resources found yet.</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  title: {
    ...typography.headingXL,
    color: palette.textPrimary,
  },
  body: {
    ...typography.body,
    color: palette.textSecondary,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: "#E5EDFF",
    borderRadius: 999,
  },
  chipText: {
    ...typography.body,
    color: palette.textPrimary,
  },
  error: {
    ...typography.body,
    color: palette.danger,
  },
  helper: {
    ...typography.helper,
    color: palette.textSecondary,
  },
  results: {
    gap: spacing.md,
  },
  resultCard: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: palette.surface,
    borderRadius: 24,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 2,
  },
  resultBody: {
    flex: 1,
    gap: spacing.xs,
  },
  resultTitle: {
    ...typography.headingM,
    color: palette.textPrimary,
  },
  resultSubtitle: {
    ...typography.body,
    color: palette.textSecondary,
  },
  resultMeta: {
    ...typography.helper,
    color: palette.accent,
  },
});

