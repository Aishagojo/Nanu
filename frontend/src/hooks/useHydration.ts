import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@context/AuthContext';
import {
  endpoints,
  fetchJson,
  fetchCalendarEvents,
  fetchAssignments,
  type ApiUser,
  type ApiCalendarEvent,
  type ApiAssignmentSummary,
} from '@services/api';

type DateRange = {
  from: string;
  to: string;
};

export function useHydrateMe() {
  const { state } = useAuth();
  const token = state.accessToken;
  const userId = state.user?.id ?? 'anonymous';

  return useQuery({
    queryKey: ['me', userId],
    enabled: !!token,
    queryFn: () => fetchJson<ApiUser>(endpoints.me(), token!),
    staleTime: 60_000,
  });
}

export function useEvents(range: DateRange) {
  const { state } = useAuth();
  const token = state.accessToken;
  const userId = state.user?.id;

  return useQuery<ApiCalendarEvent[]>({
    queryKey: ['events', userId ?? 'anonymous', range.from, range.to],
    enabled: !!token && !!userId,
    queryFn: () => fetchCalendarEvents(token!, range),
  });
}

export function useAssignments(unitId?: number) {
  const { state } = useAuth();
  const token = state.accessToken;
  const userId = state.user?.id;
  const normalizedUnit = unitId ?? 'all';

  return useQuery<ApiAssignmentSummary[]>({
    queryKey: ['assignments', userId ?? 'anonymous', normalizedUnit],
    enabled: !!token && !!userId,
    queryFn: () => fetchAssignments(token!, { unitId }),
  });
}
