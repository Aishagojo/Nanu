import { useCallback, useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';

export type AudioPlayerHandle = {
  load: (uri: string) => Promise<boolean>;
  play: () => Promise<boolean>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  unload: () => Promise<void>;
};

export type AudioPlayerStatus = {
  isLoaded: boolean;
  isPlaying: boolean;
  positionMillis: number;
  durationMillis: number;
  didJustFinish: boolean;
};

export const useAudioPlayer = (): AudioPlayerHandle => {
  const sound = useRef<Audio.Sound | null>(null);

  const load = useCallback(async (uri: string) => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });
      const { sound: newSound } = await Audio.Sound.createAsync({ uri });
      sound.current = newSound;
      return true;
    } catch (error) {
      console.warn('Failed to load audio', error);
      return false;
    }
  }, []);

  const play = useCallback(async () => {
    if (!sound.current) {
      return false;
    }
    try {
      await sound.current.playAsync();
      return true;
    } catch (error) {
      console.warn('Failed to play audio', error);
      return false;
    }
  }, []);

  const pause = useCallback(async () => {
    if (!sound.current) {
      return;
    }
    try {
      await sound.current.pauseAsync();
    } catch (error) {
      console.warn('Failed to pause audio', error);
    }
  }, []);

  const stop = useCallback(async () => {
    if (!sound.current) {
      return;
    }
    try {
      await sound.current.stopAsync();
    } catch (error) {
      console.warn('Failed to stop audio', error);
    }
  }, []);

  const unload = useCallback(async () => {
    if (!sound.current) {
      return;
    }
    try {
      await sound.current.unloadAsync();
      sound.current = null;
    } catch (error) {
      console.warn('Failed to unload audio', error);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (sound.current) {
        sound.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  return {
    load,
    play,
    pause,
    stop,
    unload,
  };
};

export const useAudioPlayerStatus = (player: AudioPlayerHandle): AudioPlayerStatus => {
  const [status] = useState<AudioPlayerStatus>({
    isLoaded: false,
    isPlaying: false,
    positionMillis: 0,
    durationMillis: 0,
    didJustFinish: false,
  });

  const updateInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const update = async () => {
      if (!player) {
        return;
      }
      try {
        // Get status updates
        // Implementation depends on expo-av API
      } catch (error) {
        console.warn('Failed to get audio status', error);
      }
    };

    updateInterval.current = setInterval(update, 100);
    return () => {
      if (updateInterval.current) {
        clearInterval(updateInterval.current);
        updateInterval.current = null;
      }
    };
  }, [player]);

  return status;
};
