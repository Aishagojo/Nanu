import { useCallback, useRef, useState } from 'react';
import { Audio } from 'expo-av';

type VoiceRecorderHookOptions = {
  overrides?: Partial<Audio.RecordingOptions>;
};

export type VoiceRecorderHandle = {
  start: () => Promise<boolean>;
  stop: () => Promise<string | null>;
  isRecording: boolean;
};

const mergeRecordingOptions = (
  overrides?: Partial<Audio.RecordingOptions>,
): Audio.RecordingOptions => {
  const preset = Audio.RecordingOptionsPresets.HIGH_QUALITY;

  return {
    ...preset,
    ...overrides,
    android: {
      ...preset.android,
      ...(overrides?.android ?? {}),
      numberOfChannels: 1,
    },
    ios: {
      ...preset.ios,
      ...(overrides?.ios ?? {}),
      numberOfChannels: 1,
    },
    web: overrides?.web ?? preset.web ?? {
      mimeType: 'audio/webm',
      bitsPerSecond: 128000,
    },
  };
};

export const useVoiceRecorder = (
  options: VoiceRecorderHookOptions = {},
): VoiceRecorderHandle => {
  const recording = useRef<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const start = useCallback(async () => {
    try {
      const current = await Audio.getPermissionsAsync();
      if (!current.granted) {
        const request = await Audio.requestPermissionsAsync();
        if (!request.granted) {
          return false;
        }
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        staysActiveInBackground: true,
      });

      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(mergeRecordingOptions(options.overrides));
      recording.current = newRecording;
      await newRecording.startAsync();
      setIsRecording(true);
      return true;
    } catch (error) {
      console.warn('Failed to start recording', error);
      return false;
    }
  }, [options.overrides]);

  const stop = useCallback(async () => {
    if (!recording.current) {
      return null;
    }
    try {
      await recording.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.current.getURI();
      recording.current = null;
      setIsRecording(false);
      return uri ?? null;
    } catch (error) {
      console.warn('Failed to stop recording', error);
      return null;
    }
  }, []);

  return {
    start,
    stop,
    isRecording,
  };
};

