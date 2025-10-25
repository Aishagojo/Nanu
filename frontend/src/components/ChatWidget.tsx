import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList } from "react-native";
import { palette, spacing, typography, radius } from "@theme/index";
import { useAuth } from "@context/AuthContext";
import type { Role } from "@app-types/roles";
import { globalFaq } from "@data/faq";

let API_BASE = "";
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  API_BASE = require("@env").EXPO_PUBLIC_API_URL || "";
} catch {
  API_BASE = "";
}

type Message = { id: string; text: string; from: "user" | "bot" };

type ChatWidgetProps = {
  onClose?: () => void;
  onNavigateRole?: (role: Role) => void;
};

const roleLabels: Record<Role, string> = {
  student: "Student",
  parent: "Parent",
  lecturer: "Lecturer",
  hod: "Head of Department",
  finance: "Finance Officer",
  records: "Records Officer",
  admin: "Administrator",
  superadmin: "Super Administrator",
  librarian: "Librarian",
};

const roleMatchers: Array<{ role: Role; keywords: string[] }> = [
  { role: "student", keywords: ["student", "learner", "pupil"] },
  { role: "parent", keywords: ["parent", "guardian"] },
  { role: "lecturer", keywords: ["lecturer", "teacher", "tutor"] },
  { role: "hod", keywords: ["hod", "head of department", "department head"] },
  { role: "finance", keywords: ["finance", "bursar", "fees"] },
  { role: "records", keywords: ["records", "registry", "registrar"] },
  { role: "admin", keywords: ["admin", "administrator"] },
  { role: "superadmin", keywords: ["super admin", "superadmin", "platform admin"] },
  { role: "librarian", keywords: ["librarian", "library", "resource desk"] },
];

export const ChatWidget: React.FC<ChatWidgetProps> = ({ onClose, onNavigateRole }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "intro",
      text: 'Hi! You can ask things like "Open student login" or tap a common question below.',
      from: "bot",
    },
  ]);
  const [input, setInput] = useState("");
  const auth = useAuth();
  const quickFaqs = useMemo(() => globalFaq.slice(0, 4), []);

  const send = (text: string) => {
    if (!text || !text.trim()) return;
    const cleaned = text.trim();
    const userMsg: Message = { id: String(Date.now()), text: cleaned, from: "user" };
    setMessages((m) => [...m, userMsg]);

    const lower = cleaned.toLowerCase();

    if (onNavigateRole) {
      const matched = roleMatchers.find((item) => item.keywords.some((keyword) => lower.includes(keyword)));
      if (matched) {
        const label = roleLabels[matched.role];
        const botMsg: Message = {
          id: String(Date.now() + 1),
          text: `Opening the ${label} experience for you.`,
          from: "bot",
        };
        setMessages((m) => [...m, botMsg]);
        onNavigateRole(matched.role);
        setInput("");
        return;
      }
    }

    (async () => {
      try {
        const url = `${API_BASE || ""}/api/communications/support/chat/`;
        const token = auth?.state?.accessToken;
        const resp = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ text: cleaned }),
        });
        const data = await resp.json();
        const reply = data?.reply || "I'm checking that for you. If it persists, reach out to support.";
        const botMsg: Message = { id: String(Date.now() + 2), text: reply, from: "bot" };
        setMessages((m) => [...m, botMsg]);
      } catch (error) {
        const botMsg: Message = {
          id: String(Date.now() + 2),
          text: "I couldn't reach the help desk right now. Please try again in a moment.",
          from: "bot",
        };
        setMessages((m) => [...m, botMsg]);
      }
    })();
    setInput("");
  };

  return (
    <View style={styles.overlay} accessible accessibilityLabel="EduAssist helper">
      <View style={styles.header}>
        <Text style={styles.title}>EduAssist Helper</Text>
        <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close helper">
          <Text style={styles.close}>Close</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        style={styles.messages}
        renderItem={({ item }) => (
          <View style={[styles.message, item.from === "bot" ? styles.bot : styles.user]}>
            <Text style={item.from === "bot" ? styles.botText : styles.userText}>{item.text}</Text>
          </View>
        )}
      />

      <View style={styles.suggestions}>
        {quickFaqs.map((faq) => (
          <TouchableOpacity
            key={faq.question}
            style={styles.suggestion}
            onPress={() => send(faq.question)}
            accessibilityRole="button"
          >
            <Text style={styles.suggestionText}>{faq.question}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder='Describe your issue (e.g. "Open student login")'
          value={input}
          onChangeText={setInput}
          accessibilityLabel="help input"
        />
        <TouchableOpacity style={styles.send} onPress={() => send(input)} accessibilityRole="button">
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    bottom: 96,
    right: 16,
    width: 320,
    maxHeight: 520,
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 12,
    elevation: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  title: { ...typography.headingL, color: palette.textPrimary },
  close: { color: palette.accent },
  messages: { maxHeight: 320, marginBottom: spacing.sm },
  message: { padding: spacing.sm, borderRadius: 12, marginBottom: spacing.xs, maxWidth: "95%" },
  bot: { backgroundColor: palette.background, alignSelf: "flex-start" },
  user: { backgroundColor: palette.primary, alignSelf: "flex-end" },
  botText: { color: palette.textPrimary },
  userText: { color: palette.surface },
  suggestions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.sm },
  suggestion: { backgroundColor: palette.surface, paddingVertical: 6, paddingHorizontal: spacing.sm, borderRadius: 8 },
  suggestionText: { color: palette.textSecondary, ...typography.helper },
  inputRow: { flexDirection: "row", alignItems: "center" },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: palette.surface,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: palette.disabled,
  },
  send: { paddingHorizontal: spacing.md, paddingVertical: 8 },
  sendText: { color: palette.accent, ...typography.body },
});

