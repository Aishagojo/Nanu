import { useCallback, useState } from 'react';

export const usePullToRefresh = (action?: () => Promise<void> | void) => {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    if (refreshing) {
      return;
    }
    setRefreshing(true);
    try {
      const result = action?.();
      if (result instanceof Promise) {
        await result;
      }
    } finally {
      setTimeout(() => setRefreshing(false), 400);
    }
  }, [action, refreshing]);

  return { refreshing, onRefresh };
};
