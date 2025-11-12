import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { palette, spacing, typography, radius } from '@theme/index';
import { useAuth } from '@context/AuthContext';
import type { Role } from '@app-types/roles';
import { transcribeAudio } from '@services/api';
import { useVoiceRecorder } from '@hooks/useVoiceRecorder';

let API_BASE = '';
try {
  API_BASE = require('@env').EXPO_PUBLIC_API_URL || '';
} catch {
  API_BASE = '';
}

type Message = { id: string; text: string; from: 'user' | 'bot' };

type ChatWidgetProps = {
  onClose?: () => void;
  onNavigateRole?: (role: Role) => void;
};

const roleLabels: Record<Role, string> = {
  student: 'Student',
  parent: 'Parent',
  lecturer: 'Lecturer',
  hod: 'Head of Department',
  finance: 'Finance Officer',
  records: 'Records Officer',
  admin: 'Administrator',
  superadmin: 'Super Administrator',
  librarian: 'Librarian',
};

const roleMatchers: Array<{ role: Role; keywords: string[] }> = [
  { role: 'student', keywords: ['student', 'learner', 'pupil'] },
  { role: 'parent', keywords: ['parent', 'guardian'] },
  { role: 'lecturer', keywords: ['lecturer', 'teacher', 'tutor'] },
  { role: 'hod', keywords: ['hod', 'head of department', 'department head'] },
  { role: 'finance', keywords: ['finance', 'bursar', 'fees'] },
  { role: 'records', keywords: ['records', 'registry', 'registrar'] },
  { role: 'admin', keywords: ['admin', 'administrator'] },
  { role: 'superadmin', keywords: ['super admin', 'superadmin', 'platform admin'] },
  { role: 'librarian', keywords: ['librarian', 'library', 'resource desk'] },
];

const introMessages: Message[] = [
  {
    id: 'intro-1',
    text: "Hi, I'm Nanu! I can guide you through EduAssist in simple steps.",
    from: 'bot',
  },
  {
    id: 'intro-2',
    text: 'We currently support 1,250 students and 160 lecturers. Tourism & Travel has 320 learners, 24 lecturers, 18 labs, and a field trip every term.',
    from: 'bot',
  },
  {
    id: 'intro-3',
    text: 'Ask me about assignments, rewards, fees, or travel facts. You can also speak using the microphone button.',
    from: 'bot',
  },
];

const knowledgeBase: Array<{ keywords: string[]; answer: string }> = [
  {
    keywords: ['tourism', 'travel', 'field trip', 'trip'],
    answer:
      'Tourism & Travel has 320 students and 24 lecturers. There are 18 lab sessions each term plus one field trip focused on safety, routes, and hospitality practice. Open the Repository screen to download tour plans, maps, and packing checklists.',
  },
  {
    keywords: ['assignment', 'homework', 'submit', 'video'],
    answer:
      'Assignments accept text, pictures, voice, or video. Tap the Assignments tile, pick the task, then use the microphone or camera buttons. Lecturers get an alert instantly and can respond in the Messages screen.',
  },
  {
    keywords: ['lecturer', 'teacher', 'staff', 'info'],
    answer:
      'We track 160 lecturers. Each lecturer dashboard shows classes, attendance, and communication threads. Parents can message a lecturer via the Messages tile and see plain-language summaries of replies.',
  },
  {
    keywords: ['students', 'numbers', 'enrolled'],
    answer:
      'Across campus there are 1,250 students. Tourism & Travel has 320 learners, ICT 280, Hospitality 210, and the rest are in Business, Special Education, and Arts.',
  },
  {
    keywords: ['fees', 'balance', 'finance', 'payment'],
    answer:
      'Only parents and Finance officers see exact fee balances. Everyone else sees a friendly status such as “pending clearance.” Students must clear fees before exam registration, and Finance can log payments in the Finance Students screen.',
  },
  {
    keywords: ['rewards', 'points', 'token'],
    answer:
      'Rewards come from on-time attendance, early submissions, and helping classmates. Fill the progress bar to unlock up to three claims per term. Each reward card shows the points you need before tapping Claim.',
  },
];

export const ChatWidget: React.FC<ChatWidgetProps> = ({ onClose, onNavigateRole }) => {
  const { state } = useAuth();
  const token = state.accessToken;
  const userName = useMemo(
    () => state.user?.display_name || state.user?.username || 'friend',
    [state.user?.display_name, state.user?.username],
  );
  const [messages, setMessages] = useState<Message[]>(introMessages);
  const [input, setInput] = useState('');
  const { start: beginRecording, stop: finishRecording, isRecording } = useVoiceRecorder();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const bar1 = useRef(new Animated.Value(0.4)).current;
  const bar2 = useRef(new Animated.Value(0.2)).current;
  const bar3 = useRef(new Animated.Value(0.3)).current;

  const speakReply = useCallback((text: string) => {
    try {
      Speech.stop();
      Speech.speak(text, { rate: 1, pitch: 1 });
    } catch {
      // ignore speech errors
    }
  }, []);

  const [welcomed, setWelcomed] = useState(false);

  const appendBotMessage = useCallback(
    (text: string) => {
      const botMsg: Message = { id: String(Date.now()), text, from: 'bot' };
      setMessages((prev) => [...prev, botMsg]);
      speakReply(text);
    },
    [speakReply],
  );

  const fetchWebAnswer = useCallback(async (query: string) => {
    try {
      const resp = await fetch(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(
          query,
        )}&format=json&no_redirect=1&no_html=1`,
      );
      const data = await resp.json();
      if (data?.AbstractText) {
        return data.AbstractText;
      }
      const related = data?.RelatedTopics?.find((topic: any) => topic?.Text);
      if (related?.Text) {
        return related.Text;
      }
    } catch {
      // ignore
    }
    return null;
  }, []);

  const send = useCallback(
    async (text: string) => {
      if (!text || !text.trim()) {
        return;
      }
      const cleaned = text.trim();
      const userMsg: Message = { id: String(Date.now()), text: cleaned, from: 'user' };
      setMessages((m) => [...m, userMsg]);
      setInput('');

      const lower = cleaned.toLowerCase();

      if (onNavigateRole) {
        const matched = roleMatchers.find((item) =>
          item.keywords.some((keyword) => lower.includes(keyword)),
        );
        if (matched) {
          const label = roleLabels[matched.role];
          appendBotMessage(
            `Opening the ${label} dashboard. I will stay here if you need more help.`,
          );
          onNavigateRole(matched.role);
          return;
        }
      }

      const kbMatch = knowledgeBase.find((entry) =>
        entry.keywords.some((keyword) => lower.includes(keyword)),
      );
      if (kbMatch) {
        appendBotMessage(kbMatch.answer);
        return;
      }

      try {
        const url = `${API_BASE || ''}/api/communications/support/chat/`;
        const resp = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ text: cleaned }),
        });
        const data = await resp.json();
        const reply = data?.reply;
        if (reply) {
          appendBotMessage(reply);
          return;
        }
      } catch {
        // fall through to web lookup
      }

      const webAnswer = await fetchWebAnswer(cleaned);
      if (webAnswer) {
        appendBotMessage(webAnswer);
        return;
      }

      appendBotMessage(
        'I could not find that yet. Try asking about assignments, tourism trips, rewards, or fees and I will explain it step by step.',
      );
    },
    [appendBotMessage, fetchWebAnswer, onNavigateRole, token],
  );

  const startRecording = useCallback(async () => {
    if (isRecording) {
      return;
    }
    try {
      const started = await beginRecording();
      if (!started) {
        Alert.alert('Microphone blocked', 'Enable microphone access to speak with Nanu.');
      }
    } catch (error) {
      console.warn('Mic start failed', error);
      Alert.alert('Recording error', 'Unable to start listening. Please try again.');
    }
  }, [beginRecording, isRecording]);

  const stopRecording = useCallback(async () => {
    if (!isRecording) {
      return;
    }
    try {
      const uri = await finishRecording();
      if (!uri) {
        Alert.alert('No audio', 'I could not capture your voice. Please try again.');
        return;
      }
      if (!token) {
        Alert.alert('Login required', 'Sign in again to use voice input.');
        return;
      }
      const { text } = await transcribeAudio(token, uri, 'audio/m4a');
      if (text) {
        send(text);
      } else {
        appendBotMessage('I could not understand that. Please try speaking again.');
      }
    } catch (error) {
      console.warn('Mic stop failed', error);
      Alert.alert('Recording error', 'Something went wrong while listening. Please try again.');
    }
  }, [appendBotMessage, finishRecording, isRecording, send, token]);

  useEffect(() => {
    if (welcomed) {
      return;
    }
    const welcome = `Hello ${userName}! I'm Nanu. Ask me anything about your classes, tourism trips, or even questions outside the app.`;
    appendBotMessage(welcome);
    setWelcomed(true);
  }, [appendBotMessage, userName, welcomed]);

  const handleMicPress = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  useEffect(() => {
    if (isRecording) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 350, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
        ]),
      );
      loop.start();
      const w1 = Animated.loop(
        Animated.sequence([
          Animated.timing(bar1, { toValue: 1, duration: 300, useNativeDriver: false }),
          Animated.timing(bar1, { toValue: 0.2, duration: 300, useNativeDriver: false }),
        ]),
      );
      const w2 = Animated.loop(
        Animated.sequence([
          Animated.timing(bar2, { toValue: 0.9, duration: 260, useNativeDriver: false }),
          Animated.timing(bar2, { toValue: 0.2, duration: 260, useNativeDriver: false }),
        ]),
      );
      const w3 = Animated.loop(
        Animated.sequence([
          Animated.timing(bar3, { toValue: 0.8, duration: 340, useNativeDriver: false }),
          Animated.timing(bar3, { toValue: 0.2, duration: 340, useNativeDriver: false }),
        ]),
      );
      w1.start();
      w2.start();
      w3.start();
      return () => {
        loop.stop();
        w1.stop();
        w2.stop();
        w3.stop();
      };
    }
    pulseAnim.setValue(1);
    bar1.setValue(0.4);
    bar2.setValue(0.2);
    bar3.setValue(0.3);
  }, [isRecording, pulseAnim, bar1, bar2, bar3]);

  return (
    <View style={styles.overlay} accessible accessibilityLabel="Nanu assistant">
      <View style={styles.header}>
        <Text style={styles.title}>Nanu</Text>
        <TouchableOpacity
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close Nanu"
        >
          <Ionicons name="close" size={22} color={palette.accent} />
        </TouchableOpacity>
      </View>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        style={styles.messages}
        contentContainerStyle={{ paddingBottom: spacing.sm }}
        renderItem={({ item }) => (
          <View style={[styles.message, item.from === 'bot' ? styles.bot : styles.user]}>
            <Text style={item.from === 'bot' ? styles.botText : styles.userText}>{item.text}</Text>
          </View>
        )}
      />

      <View style={styles.inputRow}>
        <Animated.View style={[styles.micWrapper, { transform: [{ scale: pulseAnim }] }]}>
          <TouchableOpacity
            style={[styles.micButton, isRecording && styles.micButtonActive]}
            onPress={handleMicPress}
            accessibilityRole="button"
          >
            <Ionicons
              name={isRecording ? 'stop-circle' : 'mic'}
              size={20}
              color={isRecording ? palette.surface : palette.primary}
            />
          </TouchableOpacity>
        </Animated.View>
        {isRecording ? (
          <View style={styles.listeningIndicator} accessibilityLabel="Listening">
            <Animated.View
              style={[
                styles.bar,
                { height: bar1.interpolate({ inputRange: [0, 1], outputRange: [6, 18] }) },
              ]}
            />
            <Animated.View
              style={[
                styles.bar,
                { height: bar2.interpolate({ inputRange: [0, 1], outputRange: [6, 18] }) },
              ]}
            />
            <Animated.View
              style={[
                styles.bar,
                { height: bar3.interpolate({ inputRange: [0, 1], outputRange: [6, 18] }) },
              ]}
            />
            <Text style={styles.listeningText}>Listening...</Text>
          </View>
        ) : null}
        <TextInput
          style={styles.input}
          placeholder="Ask Nanu anything..."
          value={input}
          onChangeText={setInput}
          accessibilityLabel="Ask Nanu"
        />
        <TouchableOpacity
          style={styles.send}
          onPress={() => send(input)}
          accessibilityRole="button"
        >
          <Ionicons name="arrow-up-circle" size={24} color={palette.accent} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.xl,
    width: 320,
    maxWidth: '92%',
    maxHeight: 560,
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: { ...typography.headingL, color: palette.textPrimary },
  messages: { maxHeight: 420 },
  message: { padding: spacing.sm, borderRadius: 12, marginBottom: spacing.xs, maxWidth: '95%' },
  bot: { backgroundColor: palette.background, alignSelf: 'flex-start' },
  user: { backgroundColor: palette.primary, alignSelf: 'flex-end' },
  botText: { color: palette.textPrimary },
  userText: { color: palette.surface },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: palette.surface,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: palette.disabled,
  },
  micWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonActive: {
    backgroundColor: palette.primary,
  },
  listeningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  bar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: palette.accent,
  },
  listeningText: {
    ...typography.helper,
    color: palette.textSecondary,
    marginLeft: 4,
    marginRight: 4,
  },
  send: { paddingHorizontal: spacing.xs, paddingVertical: spacing.xs },
});
