import React from "react";
import { TouchableOpacity, StyleSheet, Text } from "react-native";
import { palette, radius, spacing, typography } from "@theme/index";

interface FloatingAssistantButtonProps {
  label?: string;
  onPress?: () => void;
}

export const FloatingAssistantButton: React.FC<FloatingAssistantButtonProps> = ({
  label = "Ask",
  onPress,
}) => (
  <TouchableOpacity
    style={styles.container}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel="Open EduAssist helper"
  >
    <Text style={styles.text}>{label}</Text>
  </TouchableOpacity>
);

const size = 72;

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: spacing.xl,
    right: spacing.xl,
    width: size,
    height: size,
    borderRadius: radius.pill,
    backgroundColor: palette.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 12,
  },
  text: {
    ...typography.body,
    color: palette.surface,
  },
});
