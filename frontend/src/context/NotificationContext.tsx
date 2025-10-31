import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { fetchResources, fetchThreads, type ApiResource, type ApiThread } from '@services/api';
import type { RootStackParamList } from '@navigation/AppNavigator';
import type { Role } from '@app-types/roles';

export type AppRoute = {
  name: keyof RootStackParamList;
  params?: Record<string, unknown>;
};

const THREAD_ROUTES: Partial<Record<Role, AppRoute>> = {
  student: { name: 'StudentCommunicate' },
  parent: { name: 'ParentMessages' },
  lecturer: { name: 'LecturerMessages' },
  admin: { name: 'AdminUsers' },
  hod: { name: 'HodCommunications' },
  finance: { name: 'FinanceAlerts' },
  records: { name: 'RecordsReports' },
};

const RESOURCE_ROUTES: Partial<Record<Role, AppRoute>> = {
  student: { name: 'StudentLibrary' },
  parent: { name: 'ParentAnnouncements' },
  lecturer: { name: 'LecturerRecords' },
  admin: { name: 'AdminSystems' },
};

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  type: 'thread' | 'resource';
  timestamp: string;
  read: boolean;
  route: AppRoute;
  threadId?: number;
  resourceId?: number;
};

type StoredState = {
  notifications: AppNotification[];
  lastSeenThreads: Record<number, string>;
  seenResourceIds: number[];
  threadsInitialized: boolean;
  resourcesInitialized: boolean;
};

type NotificationContextValue = {
  notifications: AppNotification[];
  unreadCount: number;
  ingestThreads: (threads: ApiThread[], route: AppRoute) => void;
  markThreadRead: (thread: ApiThread) => void;
  ingestResources: (resources: ApiResource[], route: AppRoute) => void;
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;
};

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

const storageKeyForUser = (userId: number) => `eduassist.notifications.${userId}`;

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state } = useAuth();
  const user = state.user;
  const token = state.accessToken;

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [lastSeenThreads, setLastSeenThreads] = useState<Record<number, string>>({});
  const [seenResourceIds, setSeenResourceIds] = useState<number[]>([]);
  const [threadsInitialized, setThreadsInitialized] = useState(false);
  const [resourcesInitialized, setResourcesInitialized] = useState(false);

  const storageKey = user ? storageKeyForUser(user.id) : null;

  const lastSeenThreadsRef = useRef(lastSeenThreads);
  const threadsInitializedRef = useRef(threadsInitialized);
  const seenResourceIdsRef = useRef(seenResourceIds);
  const resourcesInitializedRef = useRef(resourcesInitialized);

  useEffect(() => {
    lastSeenThreadsRef.current = lastSeenThreads;
  }, [lastSeenThreads]);

  useEffect(() => {
    threadsInitializedRef.current = threadsInitialized;
  }, [threadsInitialized]);

  useEffect(() => {
    seenResourceIdsRef.current = seenResourceIds;
  }, [seenResourceIds]);

  useEffect(() => {
    resourcesInitializedRef.current = resourcesInitialized;
  }, [resourcesInitialized]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLastSeenThreads({});
      setSeenResourceIds([]);
      setThreadsInitialized(false);
      setResourcesInitialized(false);
      return;
    }
    const loadState = async () => {
      try {
        const raw = storageKey ? await AsyncStorage.getItem(storageKey) : null;
        if (raw) {
          const parsed: StoredState = JSON.parse(raw);
          setNotifications(parsed.notifications ?? []);
          setLastSeenThreads(parsed.lastSeenThreads ?? {});
          setSeenResourceIds(parsed.seenResourceIds ?? []);
          setThreadsInitialized(parsed.threadsInitialized ?? false);
          setResourcesInitialized(parsed.resourcesInitialized ?? false);
        } else {
          setNotifications([]);
          setLastSeenThreads({});
          setSeenResourceIds([]);
          setThreadsInitialized(false);
          setResourcesInitialized(false);
        }
      } catch (error) {
        console.warn('Failed to load notification state', error);
        setNotifications([]);
        setLastSeenThreads({});
        setSeenResourceIds([]);
        setThreadsInitialized(false);
        setResourcesInitialized(false);
      }
    };
    loadState();
  }, [storageKey, user]);

  useEffect(() => {
    if (!storageKey) {
      return;
    }
    const stateToPersist: StoredState = {
      notifications,
      lastSeenThreads,
      seenResourceIds,
      threadsInitialized,
      resourcesInitialized,
    };
    AsyncStorage.setItem(storageKey, JSON.stringify(stateToPersist)).catch((error) =>
      console.warn('Failed to persist notifications', error),
    );
  }, [
    notifications,
    lastSeenThreads,
    seenResourceIds,
    threadsInitialized,
    resourcesInitialized,
    storageKey,
  ]);

  const addNotifications = useCallback((entries: AppNotification[]) => {
    if (!entries.length) {
      return;
    }
    setNotifications((prev) => {
      const existingIds = new Set(prev.map((item) => item.id));
      const merged = [...entries.filter((item) => !existingIds.has(item.id)), ...prev];
      merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return merged;
    });
  }, []);

  const ingestThreads = useCallback(
    (threads: ApiThread[], route: AppRoute) => {
      if (!user) {
        return;
      }
      const seenSnapshot = lastSeenThreadsRef.current;
      const hasInitialized = threadsInitializedRef.current;
      if (!hasInitialized && Object.keys(seenSnapshot).length === 0) {
        const initialSeen: Record<number, string> = {};
        threads.forEach((thread) => {
          const lastMessage = thread.messages[thread.messages.length - 1];
          if (lastMessage) {
            initialSeen[thread.id] = lastMessage.created_at;
          }
        });
        lastSeenThreadsRef.current = initialSeen;
        threadsInitializedRef.current = true;
        setLastSeenThreads(initialSeen);
        setThreadsInitialized(true);
        return;
      }

      const updates: Record<number, string> = {};
      const newNotifications: AppNotification[] = [];

      threads.forEach((thread) => {
        const lastMessage = thread.messages[thread.messages.length - 1];
        if (!lastMessage) {
          return;
        }
        const timestamp = lastMessage.created_at;
        updates[thread.id] = timestamp;
        const lastSeen = seenSnapshot[thread.id];
        const authoredByViewer = lastMessage.author_detail.id === user.id;
        if (authoredByViewer) {
          return;
        }
        if (!lastSeen || new Date(timestamp) > new Date(lastSeen)) {
          const notificationId = `thread-${thread.id}-${lastMessage.id}`;
          const bodyText =
            lastMessage.body?.trim() ||
            lastMessage.transcript?.trim() ||
            'New voice note waiting for you.';
          newNotifications.push({
            id: notificationId,
            title: thread.subject || thread.teacher_detail?.display_name || 'Conversation update',
            body: bodyText.length > 160 ? `${bodyText.slice(0, 157)}...` : bodyText,
            type: 'thread',
            timestamp,
            read: false,
            route,
            threadId: thread.id,
          });
        }
      });

      if (Object.keys(updates).length) {
        lastSeenThreadsRef.current = { ...seenSnapshot, ...updates };
        setLastSeenThreads((prev) => ({ ...prev, ...updates }));
      }
      if (newNotifications.length) {
        addNotifications(newNotifications);
      }
    },
    [addNotifications, user],
  );

  const markThreadRead = useCallback((thread: ApiThread) => {
    const lastMessage = thread.messages[thread.messages.length - 1];
    if (!lastMessage) {
      return;
    }
    const timestamp = lastMessage.created_at;
    setLastSeenThreads((prev) => {
      if (prev[thread.id] === timestamp) {
        return prev;
      }
      return { ...prev, [thread.id]: timestamp };
    });
    setNotifications((prev) =>
      prev.map((item) =>
        item.threadId === thread.id
          ? {
              ...item,
              read: true,
            }
          : item,
      ),
    );
  }, []);

  const ingestResources = useCallback(
    (resources: ApiResource[], route: AppRoute) => {
      if (!user) {
        return;
      }
      const knownIds = seenResourceIdsRef.current;
      const resourcesReady = resourcesInitializedRef.current;
      if (!resourcesReady && knownIds.length === 0 && resources.length) {
        const initialIds = resources.map((item) => item.id);
        seenResourceIdsRef.current = initialIds;
        resourcesInitializedRef.current = true;
        setSeenResourceIds(initialIds);
        setResourcesInitialized(true);
        return;
      }

      const known = new Set(knownIds);
      const fresh = resources.filter((item) => !known.has(item.id));
      if (!fresh.length) {
        return;
      }

      setSeenResourceIds((prev) => {
        const updated = [...prev, ...fresh.map((item) => item.id)];
        seenResourceIdsRef.current = updated;
        return updated;
      });
      const timestamp = new Date().toISOString();
      const notificationsToAdd = fresh.map<AppNotification>((item) => ({
        id: `resource-${item.id}`,
        title: 'New library item',
        body: `${item.title} (${item.kind}) is now available.`,
        type: 'resource',
        timestamp,
        read: false,
        route,
        resourceId: item.id,
      }));
      addNotifications(notificationsToAdd);
    },
    [addNotifications, user],
  );

  useEffect(() => {
    if (!user || !token) {
      return;
    }

    let cancelled = false;

    const poll = async () => {
      const role = user.role as Role;
      const threadRoute = THREAD_ROUTES[role];
      if (threadRoute) {
        try {
          const data = await fetchThreads(token);
          if (!cancelled) {
            ingestThreads(data, threadRoute);
          }
        } catch (error) {
          console.warn('Notification thread preload failed', error);
        }
      }
      const resourceRoute = RESOURCE_ROUTES[role];
      if (resourceRoute) {
        try {
          const resourcesLatest = await fetchResources(token);
          if (!cancelled) {
            ingestResources(resourcesLatest, resourceRoute);
          }
        } catch (error) {
          console.warn('Notification resource preload failed', error);
        }
      }
    };

    poll();
    const interval = setInterval(poll, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [ingestResources, ingestThreads, token, user]);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              read: true,
            }
          : item,
      ),
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications],
  );

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount,
      ingestThreads,
      markThreadRead,
      ingestResources,
      markNotificationRead,
      markAllRead,
    }),
    [
      ingestResources,
      ingestThreads,
      markAllRead,
      markNotificationRead,
      markThreadRead,
      notifications,
      unreadCount,
    ],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotifications = (): NotificationContextValue => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return ctx;
};
