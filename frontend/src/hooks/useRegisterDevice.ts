import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

import { useAuth } from '@context/AuthContext';
import { registerDevice } from '@services/api';

type RegisterDeviceOptions = {
  platform?: 'expo' | 'ios' | 'android';
  maxAttempts?: number;
};

const DEFAULT_ATTEMPTS = 3;

export function useRegisterDevice(enabled: boolean, options: RegisterDeviceOptions = {}) {
  const { state } = useAuth();
  const token = state.accessToken;
  const platform = options.platform ?? 'expo';
  const maxAttempts = options.maxAttempts ?? DEFAULT_ATTEMPTS;
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;

  useEffect(() => {
    if (!enabled || !token) {
      return;
    }

    let active = true;

    const registerWithRetry = async (attempt: number) => {
      try {
        const permission = await Notifications.getPermissionsAsync();
        if (permission.status !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          if (status !== 'granted' || !active) {
            console.warn('Push notifications permission denied');
            return;
          }
        }

        const pushResponse = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined,
        );
        if (!active) {
          return;
        }
        await registerDevice(token, {
          platform,
          push_token: pushResponse.data,
          app_id: projectId,
        });
      } catch (error) {
        if (!active) {
          return;
        }
        if (attempt + 1 >= maxAttempts) {
          console.warn('Device registration failed after retries', error);
          return;
        }
        const delay = Math.pow(2, attempt) * 1000;
        setTimeout(() => registerWithRetry(attempt + 1), delay);
      }
    };

    registerWithRetry(0);
    return () => {
      active = false;
    };
  }, [enabled, token, platform, maxAttempts, projectId]);
}
