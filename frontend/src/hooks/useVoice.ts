import { useCallback, useState } from 'react';
import * as Speech from 'expo-speech';

export const useVoice = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = useCallback((message: string) => {
    if (!message) {
      return;
    }
    Speech.stop();
    setIsSpeaking(true);
    Speech.speak(message, {
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
    });
  }, []);

  const stop = useCallback(() => {
    Speech.stop();
    setIsSpeaking(false);
  }, []);

  return { speak, stop, isSpeaking };
};
