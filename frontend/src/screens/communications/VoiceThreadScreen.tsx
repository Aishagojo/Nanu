import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View, StyleSheet, Text, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { palette, spacing, typography } from '@theme/index';
import { NotificationBell, VoiceButton } from '@components/index';
import { createMessage, fetchThreads, transcribeAudio, type ApiMessage, type ApiThread } from '@services/api';
import { useAuth } from '@context/AuthContext';
import { useNotifications, type AppRoute } from '@context/NotificationContext';

const baseRecordingPreset = Audio.RecordingOptionsPresets.HIGH_QUALITY;

const recordingOptions: Audio.RecordingOptions = {
  ...baseRecordingPreset,
  android: {
    ...baseRecordingPreset.android,
    numberOfChannels: 1,
  },
  ios: {
    ...baseRecordingPreset.ios,
    numberOfChannels: 1,
  },
  web: {
    mimeType: 'audio/mp4',
    bitsPerSecond: 128000,
  },
};

type RecordingState = 'idle' | 'recording' | 'processing' | 'uploading';

export type QuickTemplate = {
  label: string;
  message?: string;
};

type ThreadChipProps = {
  key?: number;
  thread: ApiThread;
  isActive: boolean;
  onPress: (id: number) => void;
};

const ThreadChipItem = memo(({ thread, isActive, onPress }: ThreadChipProps) => (
  <TouchableOpacity
    key={thread.id}
    style={[
      styles.threadChip,
      isActive && styles.threadChipActive,
    ]}
    onPress={() => onPress(thread.id)}
  >
    <Ionicons name="chatbox" size={18} color={palette.primary} />
    <Text style={styles.threadChipText}>
      {thread.subject || thread.teacher_detail?.display_name || `Thread #${thread.id}`}
    </Text>
  </TouchableOpacity>
));

type MessageBubbleProps = {
  message: ApiMessage;
  onPlay: (message: ApiMessage) => void;
  activePlaybackId: number | null;
};

const MessageBubbleItem = memo(({ message, onPlay, activePlaybackId }: MessageBubbleProps) => (
  <View
    style={[
      styles.messageBubble,
      message.sender_role === 'student' ? styles.messageBubbleSelf : styles.messageBubbleOther,
    ]}
  >
    <Text style={styles.messageMeta}>
      {(message.author_detail.display_name || message.author_detail.username) +
        ' | ' +
        new Date(message.created_at).toLocaleString()}
    </Text>
    {message.body ? <Text style={styles.messageBody}>{message.body}</Text> : null}
    {message.audio ? (
      <TouchableOpacity
        style={styles.playButton}
        onPress={() => onPlay(message)}
        accessibilityRole="button"
        accessibilityHint="Play audio message"
      >
        <Ionicons
          name={activePlaybackId === message.id ? 'pause' : 'play'}
          size={20}
          color={palette.surface}
        />
        <Text style={styles.playButtonLabel}>
          {activePlaybackId === message.id ? 'Pause' : 'Play voice note'}
        </Text>
      </TouchableOpacity>
    ) : null}
    {message.transcript ? <Text style={styles.transcript}>{message.transcript}</Text> : null}
  </View>
));

type VoiceThreadScreenProps = {
  title: string;
  subtitle: string;
  quickTemplates?: QuickTemplate[];
  emptyPlaceholder?: string;
  voiceCardTitle?: string;
  voiceCardDescription?: string;
  notificationRoute: AppRoute;
};

export const VoiceThreadScreen: React.FC<VoiceThreadScreenProps> = ({
  title,
  subtitle,
  quickTemplates,
  emptyPlaceholder = 'No conversations found yet.',
  voiceCardTitle = 'Voice Message',
  voiceCardDescription = 'Hold to record a quick note. We will transcribe it for your records.',
  notificationRoute,
}) => {
  const { state } = useAuth();
  const token = state.accessToken;
  const { ingestThreads, markThreadRead } = useNotifications();

  const [threads, setThreads] = useState<ApiThread[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [recordingMime, setRecordingMime] = useState('audio/m4a');
  const [transcript, setTranscript] = useState<string>('');
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [permissionResponse, requestPermission] = Audio.usePermissions();

  const [activePlaybackId, setActivePlaybackId] = useState<number | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

const selectedThread = useMemo(
  () => threads.find((thread) => thread.id === selectedThreadId) ?? null,
  [selectedThreadId, threads]
);

  useEffect(() => {
    if (selectedThread) {
      markThreadRead(selectedThread);
    }
  }, [markThreadRead, selectedThread]);

  const loadThreads = useCallback(
    async (showSpinner = false) => {
      if (!token) {
        return;
      }
      if (showSpinner) {
        setLoadingThreads(true);
      }
      try {
        const data = await fetchThreads(token);
        setThreads(data);
        setThreadError(null);
        ingestThreads(data, notificationRoute);
        setSelectedThreadId((prev) => {
          if (prev && data.some((thread) => thread.id === prev)) {
            return prev;
          }
          return data.length ? data[0].id : null;
        });
      } catch (error: any) {
        console.warn('Failed to load threads', error);
        setThreadError(error?.message ?? 'Unable to load conversations.');
      } finally {
        if (showSpinner) {
          setLoadingThreads(false);
        }
      }
    },
    [ingestThreads, notificationRoute, token]
  );

  useEffect(() => {
    loadThreads(true);
  }, [loadThreads]);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  const ensurePermissions = useCallback(async () => {
    if (permissionResponse?.granted) {
      return true;
    }
    const response = await requestPermission();
    if (!response?.granted) {
      Alert.alert('Microphone blocked', 'Enable microphone access to record a voice note.');
      return false;
    }
    return true;
  }, [permissionResponse?.granted, requestPermission]);

  const startRecording = useCallback(async () => {
    if (recordingState === 'recording') {
      return;
    }
    const ok = await ensurePermissions();
    if (!ok) {
      return;
    }

    try {
      setRecordingState('recording');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
      });
      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(recordingOptions);
      await newRecording.startAsync();
      setRecording(newRecording);
      setRecordingUri(null);
      setTranscript('');
    } catch (error: any) {
      console.warn('Failed to start recording', error);
      Alert.alert('Recording error', error?.message ?? 'Unable to start microphone.');
      setRecordingState('idle');
    }
  }, [ensurePermissions, recordingState]);

  const stopRecording = useCallback(async () => {
    if (!recording) {
      return;
    }
    try {
      setRecordingState('processing');
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (!uri) {
        throw new Error('No recording file produced.');
      }
      setRecordingUri(uri);
      const mimeType = recordingOptions.android?.extension === '.m4a' ? 'audio/m4a' : 'audio/mp4';
      setRecordingMime(mimeType);
      if (token && selectedThread) {
        try {
          const { text } = await transcribeAudio(token, uri, mimeType);
          setTranscript(text);
        } catch (error: any) {
          console.warn('Transcription failed', error);
          Alert.alert('Transcription failed', error?.message ?? 'Could not transcribe this note.');
        }
      }
    } catch (error: any) {
      console.warn('Failed to stop recording', error);
      Alert.alert('Recording error', error?.message ?? 'Unable to save recording.');
      setRecordingUri(null);
      setTranscript('');
    } finally {
      setRecordingState('idle');
      setRecording(null);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    }
  }, [recording, selectedThread, token]);

  const handleRecordPress = useCallback(async () => {
    if (recordingState === 'recording') {
      await stopRecording();
    } else {
      await startRecording();
    }
  }, [recordingState, startRecording, stopRecording]);

  const handlePlayMessage = useCallback(
    async (message: ApiMessage) => {
      if (!message.audio) { return; }
      if (activePlaybackId === message.id && soundRef.current) {
        await soundRef.current.stopAsync().catch(() => {});
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
        setActivePlaybackId(null);
        return;
      }

      if (soundRef.current) {
        await soundRef.current.stopAsync().catch(() => {});
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }

      try {
        const { sound } = await Audio.Sound.createAsync({ uri: message.audio });
        soundRef.current = sound;
        setActivePlaybackId(message.id);
        await sound.playAsync();
        sound.setOnPlaybackStatusUpdate((status) => {
          if (!status.isLoaded) { return; }
          if (status.didJustFinish) {
            setActivePlaybackId(null);
            sound.unloadAsync().catch(() => {});
            soundRef.current = null;
          }
        });
      } catch (error: any) {
        console.warn('Playback failed', error);
        Alert.alert('Playback error', error?.message ?? 'Unable to play voice note.');
      }
    },
    [activePlaybackId]
  );

  const handleSendVoice = useCallback(async () => {
    if (!token || !selectedThread || !recordingUri) {
      Alert.alert('Select a thread', 'Choose a conversation before sending a voice note.');
      return;
    }
    try {
      setRecordingState('uploading');
      await createMessage(token, {
        thread: selectedThread.id,
        audioUri: recordingUri,
        audioMimeType: recordingMime,
        transcript: transcript.trim() || undefined,
      });
      setRecordingUri(null);
      setTranscript('');
      await loadThreads();
      Alert.alert('Voice note sent', 'Your message has been delivered.');
    } catch (error: any) {
      console.warn('Failed to send voice message', error);
      Alert.alert('Send failed', error?.message ?? 'Unable to upload the voice note.');
    } finally {
      setRecordingState('idle');
    }
  }, [loadThreads, recordingMime, recordingUri, selectedThread, token, transcript]);

  const handleSendQuickMessage = useCallback(
    async (template: QuickTemplate) => {
      if (!token || !selectedThread) {
        Alert.alert('Select a thread', 'Choose a conversation before sending a message.');
        return;
      }
      try {
        await createMessage(token, {
          thread: selectedThread.id,
          body: template.message ?? template.label,
        });
        await loadThreads();
      } catch (error: any) {
        console.warn('Failed to send message', error);
        Alert.alert('Send failed', error?.message ?? 'Unable to send message.');
      }
    },
    [loadThreads, selectedThread, token]
  );

  const recordingStatusLabel = useMemo(() => {
    switch (recordingState) {
      case 'recording':
        return 'Tap to stop';
      case 'processing':
        return 'Processing...';
      case 'uploading':
        return 'Sending...';
      default:
        return 'Tap to record';
    }
  }, [recordingState]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={[styles.headerRow, styles.sectionSpacing]}>
        <View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <View style={styles.headerActions}>
          <NotificationBell size={24} />
          <View style={styles.headerActionButton}>
            <VoiceButton
              label="Refresh"
              onPress={() => loadThreads(true)}
              accessibilityHint="Reload conversations"
            />
          </View>
        </View>
      </View>

      {threadError ? <Text style={[styles.error, styles.sectionSpacing]}>{threadError}</Text> : null}
      {loadingThreads ? <ActivityIndicator color={palette.primary} style={styles.sectionSpacing} /> : null}

      {threads.length > 0 ? (
        <View style={[styles.threadList, styles.sectionSpacing]}>
          {threads.map((thread) => (
            <ThreadChipItem
              key={thread.id}
              thread={thread}
              isActive={selectedThread?.id === thread.id}
              onPress={setSelectedThreadId}
            />
          ))}
        </View>
      ) : !loadingThreads ? (
        <Text style={[styles.helper, styles.sectionSpacing]}>{emptyPlaceholder}</Text>
      ) : null}

      {selectedThread ? (
        <View style={[styles.threadCard, styles.sectionSpacing]}>
          <View style={styles.threadHeader}>
            <Ionicons name="people" size={24} color={palette.primary} />
            <View style={styles.threadHeaderInfo}>
              <Text style={styles.threadTitle}>{selectedThread.subject || 'Conversation'}</Text>
              <Text style={styles.threadSubtitle}>
                {(selectedThread.teacher_detail?.display_name || 'Teacher') +
                  ' | ' +
                  (selectedThread.student_detail?.display_name || 'Student')}
              </Text>
            </View>
          </View>
          <View style={styles.messages}>
            {selectedThread.messages.map((msg) => (
              <MessageBubbleItem
                key={msg.id}
                message={msg}
                activePlaybackId={activePlaybackId}
                onPlay={handlePlayMessage}
              />
            ))}
          </View>
        </View>
      ) : null}

      <View style={[styles.card, styles.sectionSpacing]}>
        <Ionicons name="mic" size={32} color={palette.secondary} />
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{voiceCardTitle}</Text>
          <Text style={styles.cardDescription}>{voiceCardDescription}</Text>
          <VoiceButton
            label={recordingStatusLabel}
            onPress={handleRecordPress}
            isActive={recordingState === 'recording'}
            accessibilityHint="Toggle voice recording"
          />
          <View style={styles.preview}>
            <Text style={styles.previewLabel}>Preview</Text>
            <Text style={styles.previewTranscript}>
              {transcript || (recordingUri ? 'Processing your note...' : 'Record a message to see the transcript.')}
            </Text>
            <View style={[styles.previewAction, !recordingUri && styles.previewActionDisabled]}>
              <VoiceButton
                label="Send voice note"
                onPress={recordingUri ? handleSendVoice : undefined}
                accessibilityHint="Upload the recorded voice note"
              />
            </View>
          </View>
        </View>
      </View>

      {quickTemplates && quickTemplates.length > 0 ? (
        <View style={styles.sectionSpacing}>
          <Text style={[styles.subtitle, styles.quickTemplatesTitle]}>Quick templates</Text>
          <View style={styles.quickRow}>
            {quickTemplates.map((template: QuickTemplate) => (
              <View key={template.label} style={styles.quickRowButton}>
              <VoiceButton
                label={template.label}
                onPress={() => handleSendQuickMessage(template)}
                accessibilityHint={`Send template message: ${template.label}`}
              />
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    backgroundColor: palette.background,
  },
  sectionSpacing: {
    marginBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionButton: {
    marginLeft: spacing.sm,
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
  threadList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  threadChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.surface,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  threadChipActive: {
    borderColor: palette.primary,
  },
  threadChipText: {
    ...typography.helper,
    color: palette.textPrimary,
  },
  threadCard: {
    backgroundColor: palette.surface,
    borderRadius: 24,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  threadHeaderInfo: {
    marginLeft: spacing.md,
  },
  threadTitle: {
    ...typography.headingM,
    color: palette.textPrimary,
  },
  threadSubtitle: {
    ...typography.helper,
    color: palette.textSecondary,
  },
  messages: {
    marginTop: spacing.md,
  },
  messageBubble: {
    padding: spacing.md,
    borderRadius: 18,
    marginBottom: spacing.sm,
  },
  messageBubbleSelf: {
    alignSelf: 'flex-end',
    backgroundColor: '#E5EDFF',
  },
  messageBubbleOther: {
    alignSelf: 'flex-start',
    backgroundColor: '#F6F6F7',
  },
  messageMeta: {
    ...typography.helper,
    color: palette.textSecondary,
  },
  messageBody: {
    ...typography.body,
    color: palette.textPrimary,
  },
  transcript: {
    ...typography.helper,
    fontStyle: 'italic',
    color: palette.textSecondary,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: palette.primary,
    alignSelf: 'flex-start',
  },
  playButtonLabel: {
    ...typography.helper,
    color: palette.surface,
    marginLeft: spacing.xs,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: palette.surface,
    borderRadius: 24,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  cardBody: {
    flex: 1,
    marginLeft: spacing.md,
  },
  cardTitle: {
    ...typography.headingM,
    color: palette.textPrimary,
  },
  cardDescription: {
    ...typography.body,
    color: palette.textSecondary,
  },
  preview: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: palette.disabled,
    minHeight: 80,
  },
  previewLabel: {
    ...typography.helper,
    color: palette.textSecondary,
  },
  previewTranscript: {
    ...typography.body,
    color: palette.textPrimary,
    marginTop: spacing.xs,
  },
  previewAction: {
    marginTop: spacing.sm,
  },
  previewActionDisabled: {
    opacity: 0.5,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  quickTemplatesTitle: {
    marginBottom: spacing.sm,
  },
  quickRowButton: {
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
});
