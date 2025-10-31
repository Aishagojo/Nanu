import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { palette, roleColors, spacing, typography } from '@theme/index';
import { NotificationBell, VoiceButton } from '@components/index';
import {
  createMessage,
  createThread,
  fetchCourseRoster,
  fetchCourses,
  fetchParentLinks,
  fetchThreads,
  transcribeAudio,
  type ApiMessage,
  type ApiParentLink,
  type ApiThread,
  type ApiUser,
  type CreateThreadPayload,
} from '@services/api';
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

type ThreadMeta = {
  title: string;
  badge: string;
  preview: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  role: string | null;
};

type ContactSeed = {
  key: string;
  meta: ThreadMeta;
  payload: CreateThreadPayload;
};

type ContactCard = {
  key: string;
  meta: ThreadMeta;
  thread?: ApiThread;
  payload?: CreateThreadPayload;
};

type ConversationTileProps = {
  contact: ContactCard;
  meta: ThreadMeta;
  isActive: boolean;
  onPress: (contact: ContactCard) => void;
  disabled?: boolean;
};

const getDisplayName = (user?: ApiUser | null): string => {
  if (!user) {
    return '';
  }
  if (user.display_name?.trim()) {
    return user.display_name.trim();
  }
  const composed = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  if (composed.length) {
    return composed;
  }
  return user.username;
};

const capitalise = (value: string) =>
  value.length ? value.charAt(0).toUpperCase() + value.slice(1) : value;

const roleSectionTitle = (role: string | null): string => {
  switch (role) {
    case 'lecturer':
      return 'Lecturers';
    case 'student':
      return 'Students';
    case 'parent':
      return 'Parents & Guardians';
    case 'finance':
      return 'Finance Office';
    case 'records':
      return 'Records Office';
    case 'hod':
      return 'Heads of Department';
    case 'admin':
      return 'Administrators';
    case 'support':
      return 'Support Team';
    default:
      return 'Other conversations';
  }
};

const buildThreadMeta = (thread: ApiThread, currentRole?: string | null): ThreadMeta => {
  const subject = thread.subject?.trim() ?? '';
  const lastMessage = thread.messages[thread.messages.length - 1];
  const lastSnippet =
    lastMessage?.body?.trim() ||
    lastMessage?.transcript?.trim() ||
    'No messages yet. Tap to say hello.';
  const lastTime = lastMessage
    ? new Date(lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;
  const preview = lastTime ? `${lastSnippet}${lastSnippet ? ' · ' : ''}${lastTime}` : lastSnippet;

  let contactRole: string | null = null;
  let title = subject || 'Conversation';
  let icon: keyof typeof Ionicons.glyphMap = 'chatbubbles';

  if (currentRole === 'student') {
    if (thread.teacher_detail) {
      contactRole = 'lecturer';
      title = getDisplayName(thread.teacher_detail) || 'Lecturer';
      icon = 'school';
    } else if (thread.parent_detail) {
      contactRole = 'parent';
      title = getDisplayName(thread.parent_detail) || 'Parent / Guardian';
      icon = 'people';
    } else {
      contactRole = 'support';
      title = 'Support Team';
      icon = 'chatbubbles';
    }
  } else if (currentRole === 'lecturer') {
    if (thread.student_detail) {
      contactRole = 'student';
      title = getDisplayName(thread.student_detail) || 'Student';
      icon = 'person';
    } else if (thread.parent_detail) {
      contactRole = 'parent';
      title = getDisplayName(thread.parent_detail) || 'Parent / Guardian';
      icon = 'people';
    }
  } else if (currentRole === 'parent') {
    if (thread.teacher_detail) {
      contactRole = 'lecturer';
      title = getDisplayName(thread.teacher_detail) || 'Lecturer';
      icon = 'school';
    } else if (thread.student_detail) {
      contactRole = 'student';
      title = getDisplayName(thread.student_detail) || 'Student';
      icon = 'person';
    }
  } else if (currentRole === 'finance') {
    contactRole = 'student';
    title = getDisplayName(thread.student_detail) || subject || 'Student account';
    icon = 'cash';
  } else if (currentRole === 'records') {
    contactRole = 'student';
    title = getDisplayName(thread.student_detail) || subject || 'Student records';
    icon = 'albums';
  } else if (currentRole === 'hod') {
    if (thread.teacher_detail && thread.teacher_detail.id !== thread.student_detail?.id) {
      contactRole = 'lecturer';
      title = getDisplayName(thread.teacher_detail) || 'Lecturer';
      icon = 'school';
    } else {
      contactRole = 'student';
      title = getDisplayName(thread.student_detail) || subject || 'Student';
      icon = 'person';
    }
  } else {
    if (thread.student_detail && currentRole !== 'student') {
      contactRole = 'student';
      title = getDisplayName(thread.student_detail) || subject || 'Conversation';
      icon = 'person';
    } else if (thread.teacher_detail) {
      contactRole = 'lecturer';
      title = getDisplayName(thread.teacher_detail) || subject || 'Conversation';
      icon = 'school';
    }
  }

  if (!contactRole) {
    contactRole = 'other';
  }

  const courseLabel = subject && subject !== title ? subject : '';
  const accent =
    (contactRole && roleColors[contactRole as keyof typeof roleColors]) || palette.accent;

  const badgeParts: string[] = [];
  if (contactRole) {
    badgeParts.push(capitalise(contactRole));
  }
  if (courseLabel) {
    badgeParts.push(courseLabel);
  }

  return {
    title,
    badge: badgeParts.join(' • '),
    preview: preview || 'Tap to open conversation',
    icon,
    accent,
    role: contactRole,
  };
};

const getThreadContactKey = (thread: ApiThread, currentRole?: string | null) => {
  if (!currentRole) {
    return `thread-${thread.id}`;
  }
  switch (currentRole) {
    case 'student':
      return thread.teacher ? `teacher-${thread.teacher}` : `thread-${thread.id}`;
    case 'lecturer':
      return thread.student ? `student-${thread.student}` : `thread-${thread.id}`;
    case 'parent':
      if (thread.teacher && thread.student) {
        return `student-${thread.student}-teacher-${thread.teacher}`;
      }
      return thread.teacher ? `teacher-${thread.teacher}` : `thread-${thread.id}`;
    default:
      return `thread-${thread.id}`;
  }
};

const ConversationTile = memo(
  ({ contact, meta, isActive, onPress, disabled }: ConversationTileProps) => {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1600, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  const tileStyles = useMemo(
    () =>
      isActive
        ? [styles.conversationCard, styles.conversationCardActive, { borderColor: meta.accent }]
        : [styles.conversationCard],
    [isActive, meta.accent],
  );

  const pending = !contact.thread;
  const previewLabel = pending
    ? disabled
      ? 'Starting conversation...'
      : meta.preview || 'Tap to start a new chat.'
    : meta.preview;

  return (
    <TouchableOpacity
      style={tileStyles}
      onPress={() => onPress(contact)}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      accessibilityHint={
        pending
          ? `Start a new conversation with ${meta.title}`
          : `Open conversation with ${meta.title}`
      }
    >
      <Animated.View
        style={[
          styles.conversationIconShell,
          {
            backgroundColor: meta.accent,
            transform: [{ scale }],
          },
        ]}
      >
        <Ionicons name={meta.icon as any} size={24} color={palette.surface} />
      </Animated.View>
      <View style={styles.conversationCopy}>
        <Text style={styles.conversationTitle}>{meta.title}</Text>
        {meta.badge ? <Text style={styles.conversationMeta}>{meta.badge}</Text> : null}
        <Text numberOfLines={2} style={styles.conversationSubtitle}>
          {previewLabel}
        </Text>
        {pending ? <Text style={styles.pendingChip}>New</Text> : null}
      </View>
    </TouchableOpacity>
  );
});

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
      {(
        message.author_detail?.display_name ||
        message.author_detail?.username ||
        'Participant'
      ) +
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
  const storageKey = useMemo(
    () => (state.user?.id ? `eduassist.voiceThreads.${state.user.id}` : null),
    [state.user?.id],
  );
  const { ingestThreads, markThreadRead } = useNotifications();

  const [threads, setThreads] = useState<ApiThread[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
  const [contactSeeds, setContactSeeds] = useState<ContactSeed[]>([]);
  const [creatingContactKey, setCreatingContactKey] = useState<string | null>(null);

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [recordingMime, setRecordingMime] = useState('audio/m4a');
  const [transcript, setTranscript] = useState<string>('');
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [permissionResponse, requestPermission] = Audio.usePermissions();

  const [activePlaybackId, setActivePlaybackId] = useState<number | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => () => {
    isMountedRef.current = false;
  }, []);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) ?? null,
    [selectedThreadId, threads],
  );

  const contacts = useMemo(() => {
    const role = state.user?.role;
    const map = new Map<string, ContactCard>();
    threads.forEach((thread) => {
      const key = getThreadContactKey(thread, role) || `thread-${thread.id}`;
      const meta = buildThreadMeta(thread, role);
      map.set(key, { key, meta, thread });
    });
    contactSeeds.forEach((seed) => {
      if (!map.has(seed.key)) {
        map.set(seed.key, { key: seed.key, meta: seed.meta, payload: seed.payload });
      }
    });
    return Array.from(map.values());
  }, [contactSeeds, state.user?.role, threads]);

  const groupedContacts = useMemo(() => {
    const order = [
      'lecturer',
      'student',
      'parent',
      'finance',
      'records',
      'hod',
      'admin',
      'support',
      'other',
    ];
    const orderIndex = (role: string) => {
      const idx = order.indexOf(role);
      return idx === -1 ? order.length : idx;
    };
    const groups = new Map<string, { key: string; title: string; items: ContactCard[] }>();
    contacts.forEach((contact) => {
      const role = contact.meta.role ?? 'other';
      if (!groups.has(role)) {
        groups.set(role, { key: role, title: roleSectionTitle(role), items: [] });
      }
      groups.get(role)!.items.push(contact);
    });
    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        items: [...group.items].sort((a, b) => a.meta.title.localeCompare(b.meta.title)),
      }))
      .sort((a, b) => orderIndex(a.key) - orderIndex(b.key));
  }, [contacts]);

  const selectedMeta = useMemo(() => {
    if (!selectedThread) {
      return null;
    }
    const match = contacts.find(
      (contact) => contact.thread && contact.thread.id === selectedThread.id,
    );
    return match?.meta ?? buildThreadMeta(selectedThread, state.user?.role);
  }, [contacts, selectedThread, state.user?.role]);

  const participantLine = useMemo(() => {
    if (!selectedThread) {
      return '';
    }
    const teacherName = getDisplayName(selectedThread.teacher_detail) || 'Lecturer';
    const studentName = getDisplayName(selectedThread.student_detail) || 'Student';
    const parentName = selectedThread.parent_detail
      ? getDisplayName(selectedThread.parent_detail) || 'Parent'
      : null;
    return parentName
      ? `${teacherName} | ${studentName} | ${parentName}`
      : `${teacherName} | ${studentName}`;
  }, [selectedThread]);

  const loadStoredThreads = useCallback(async () => {
    if (!storageKey) {
      return;
    }
    try {
      const raw = await AsyncStorage.getItem(storageKey);
      if (!raw) {
        return;
      }
      const cached: ApiThread[] = JSON.parse(raw);
      if (cached.length) {
        setThreads(cached);
        setThreadError(null);
        setSelectedThreadId((prev) => {
          if (prev && cached.some((thread) => thread.id === prev)) {
            return prev;
          }
          return cached[0]?.id ?? null;
        });
      }
    } catch (error) {
      console.warn('Failed to load stored conversations', error);
    }
  }, [storageKey]);

  useEffect(() => {
    if (selectedThread) {
      markThreadRead(selectedThread);
    }
  }, [markThreadRead, selectedThread]);

  useEffect(() => {
    loadStoredThreads();
  }, [loadStoredThreads]);

  const loadExtraContacts = useCallback(async () => {
    if (!token || !state.user) {
      if (isMountedRef.current) {
        setContactSeeds([]);
      }
      return;
    }
    const role = state.user.role;
    const existingKeys = new Set(
      threads.map((thread) => getThreadContactKey(thread, role) || `thread-${thread.id}`),
    );
    let seeds: ContactSeed[] = [];
    try {
      if (role === 'student') {
        if (state.user.id) {
          const courses = await fetchCourses(token);
          seeds = courses
            .filter((course) => course.lecturer && !existingKeys.has(`teacher-${course.lecturer}`))
            .map((course) => ({
              key: `teacher-${course.lecturer}`,
              meta: {
                title: course.lecturer_name || 'Lecturer',
                badge: [course.code, course.name].filter(Boolean).join(' • '),
                preview: 'Tap to start a conversation about this class.',
                icon: 'school',
                accent: roleColors.lecturer,
                role: 'lecturer',
              },
              payload: {
                student: state.user.id!,
                teacher: course.lecturer!,
                subject: course.name || course.code,
              },
            }));
        }
      } else if (role === 'lecturer') {
        if (state.user.id) {
          const courses = await fetchCourses(token);
          const seedMap = new Map<string, ContactSeed>();
          for (const course of courses) {
            if (!course.id) {
              continue;
            }
            try {
              const roster = await fetchCourseRoster(token, course.id);
              roster.students.forEach((student) => {
                const key = `student-${student.id}`;
                if (existingKeys.has(key) || seedMap.has(key)) {
                  return;
                }
                const name = student.display_name || student.username;
                seedMap.set(key, {
                  key,
                  meta: {
                    title: name,
                    badge: [course.code, course.name].filter(Boolean).join(' • '),
                    preview: 'Tap to send a quick update.',
                    icon: 'person',
                    accent: roleColors.student,
                    role: 'student',
                  },
                  payload: {
                    student: student.id,
                    teacher: state.user.id!,
                    subject:
                      `${course.code ?? ''} ${course.name ?? ''}`.trim() || 'Course update',
                  },
                });
              });
            } catch (error) {
              console.warn('Failed to load roster for course', course.id, error);
            }
          }
          seeds = Array.from(seedMap.values());
        }
      } else if (role === 'parent') {
        if (state.user.id) {
          let links: ApiParentLink[] = [];
          try {
            links = await fetchParentLinks(token);
          } catch (error) {
            console.warn('Failed to load parent links', error);
          }
          const myLinks = links.filter((link) => link.parent === state.user!.id);
          const seenKeys = new Set<string>();
          for (const link of myLinks) {
            const studentName =
              getDisplayName(link.student_detail) || link.student_detail.username;
            try {
              const courses = await fetchCourses(token, { student: link.student });
              courses.forEach((course) => {
                if (!course.lecturer) {
                  return;
                }
                const key = `student-${link.student}-teacher-${course.lecturer}`;
                if (existingKeys.has(key) || seenKeys.has(key)) {
                  return;
                }
                seenKeys.add(key);
                seeds.push({
                  key,
                  meta: {
                    title: course.lecturer_name || 'Lecturer',
                    badge: `${studentName} • ${
                      [course.code, course.name].filter(Boolean).join(' ') || 'Class'
                    }`,
                    preview: 'Tap to start a conversation with this lecturer.',
                    icon: 'school',
                    accent: roleColors.lecturer,
                    role: 'lecturer',
                  },
                  payload: {
                    student: link.student,
                    teacher: course.lecturer,
                    parent: state.user.id!,
                    subject:
                      `${studentName} • ${course.name || course.code}`.trim() ||
                      `${studentName} conversation`,
                  },
                });
              });
            } catch (error) {
              console.warn('Failed to load courses for linked student', link.student, error);
            }
          }
        }
      } else {
        if (isMountedRef.current) {
          setContactSeeds([]);
        }
        return;
      }
    } catch (error) {
      console.warn('Failed to load additional contacts', error);
      seeds = [];
    }
    if (isMountedRef.current) {
      setContactSeeds(seeds);
    }
  }, [token, state.user, threads]);

  const loadThreads = useCallback(
    async (showSpinner = false) => {
      if (!token) {
        return;
      }
      if (showSpinner || threads.length === 0) {
        setLoadingThreads(true);
      }
      try {
        const data = await fetchThreads(token);
        setThreads(data);
        setThreadError(null);
        ingestThreads(data, notificationRoute);
        if (storageKey) {
          await AsyncStorage.setItem(storageKey, JSON.stringify(data));
        }
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
        setLoadingThreads(false);
      }
    },
    [ingestThreads, notificationRoute, storageKey, threads.length, token],
  );

  useEffect(() => {
    loadThreads(true);
  }, [loadThreads]);

  useEffect(() => {
    loadExtraContacts();
  }, [loadExtraContacts]);

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

const handleContactPress = useCallback(
  async (contact: ContactCard) => {
    if (contact.thread) {
      setSelectedThreadId(contact.thread.id);
      return;
    }
    if (!contact.thread && creatingContactKey && creatingContactKey !== contact.key) {
      return;
    }
    if (!contact.payload || !token) {
      return;
    }
    try {
      setCreatingContactKey(contact.key);
        const thread = await createThread(token, contact.payload);
        setThreads((prev) => {
          const next = [thread, ...prev.filter((item) => item.id !== thread.id)];
          if (storageKey) {
            AsyncStorage.setItem(storageKey, JSON.stringify(next)).catch(() => {});
          }
          return next;
        });
        setContactSeeds((prev) => prev.filter((seed) => seed.key !== contact.key));
        setSelectedThreadId(thread.id);
        setThreadError(null);
      } catch (error: any) {
        console.warn('Failed to start conversation', error);
        Alert.alert(
          'Conversation unavailable',
          error?.message ?? 'Unable to start this chat right now.',
        );
      } finally {
        setCreatingContactKey(null);
      }
    },
    [creatingContactKey, storageKey, token],
  );

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
      {loadingThreads ? (
        <ActivityIndicator color={palette.primary} style={styles.sectionSpacing} />
      ) : null}

      {groupedContacts.length > 0 ? (
        groupedContacts.map((group) => (
          <View key={group.key} style={[styles.conversationSection, styles.sectionSpacing]}>
            <Text style={styles.conversationSectionTitle}>{group.title}</Text>
            <View style={styles.conversationList}>
              {group.items.map((contact) => (
                <ConversationTile
                  key={contact.key}
                  contact={contact}
                  meta={contact.meta}
                  isActive={
                    !!(contact.thread && selectedThread && contact.thread.id === selectedThread.id)
                  }
                  onPress={handleContactPress}
                  disabled={creatingContactKey === contact.key}
                />
              ))}
            </View>
          </View>
        ))
      ) : !loadingThreads ? (
        <Text style={[styles.helper, styles.sectionSpacing]}>{emptyPlaceholder}</Text>
      ) : null}

      {selectedThread ? (
        <View style={[styles.threadCard, styles.sectionSpacing]}>
          <View style={styles.threadHeader}>
            <Ionicons
              name={(selectedMeta?.icon as any) || 'people'}
              size={26}
              color={selectedMeta?.accent ?? palette.primary}
            />
            <View style={styles.threadHeaderInfo}>
              <Text style={styles.threadTitle}>
                {selectedMeta?.title || selectedThread.subject || 'Conversation'}
              </Text>
              {selectedMeta?.badge ? (
                <Text style={styles.threadSubtitle}>{selectedMeta.badge}</Text>
              ) : null}
              <Text style={styles.threadSubtitle}>{participantLine}</Text>
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
  conversationSection: {
    marginBottom: spacing.lg,
  },
  conversationSectionTitle: {
    ...typography.helper,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: palette.textSecondary,
    marginBottom: spacing.sm,
  },
  conversationList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginHorizontal: -spacing.xs,
  },
  conversationCard: {
    width: '48%',
    flexGrow: 1,
    minWidth: 160,
    backgroundColor: palette.surface,
    borderRadius: 24,
    padding: spacing.md,
    marginBottom: spacing.md,
    marginHorizontal: spacing.xs,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  conversationCardActive: {
    borderWidth: 2,
    borderColor: palette.primary,
    shadowOpacity: 0.12,
  },
  conversationIconShell: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  conversationCopy: {
    gap: spacing.xs,
  },
  conversationTitle: {
    ...typography.headingM,
    color: palette.textPrimary,
  },
  conversationMeta: {
    ...typography.helper,
    color: palette.textSecondary,
  },
  conversationSubtitle: {
    ...typography.body,
    color: palette.textSecondary,
  },
  pendingChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.md,
    backgroundColor: '#E8EDFF',
    ...typography.helper,
    color: palette.primary,
    marginTop: spacing.xs,
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
    flexDirection: "row",
    alignItems: "center",
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
