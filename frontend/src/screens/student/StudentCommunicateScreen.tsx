import React from "react";
import { VoiceThreadScreen, type QuickTemplate } from "../communications/VoiceThreadScreen";

const studentTemplates: QuickTemplate[] = [
  { label: "I am present" },
  { label: "I need help" },
  { label: "I will be late" },
];

export const StudentCommunicateScreen: React.FC = () => (
  <VoiceThreadScreen
    title="Communicate"
    subtitle="Send quick voice notes or templates to your lecturers and support team."
    quickTemplates={studentTemplates}
    voiceCardTitle="Student voice note"
    voiceCardDescription="Hold to record a short update for your lecturer. We will save the audio and transcript."
    notificationRoute={{ name: "StudentCommunicate" }}
  />
);
