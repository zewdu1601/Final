import { useCallback, useEffect, useState } from 'react';
import { getApiErrorMessage } from '../services/api';
import { getOrderNotifications } from '../services/orderService';

const useOrderNotifications = (enabled = true) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!enabled) {
      setUnreadCount(0);
      setError('');
      return;
    }
    try {
      const notifications = await getOrderNotifications();
      setUnreadCount(notifications.filter((notification) => !notification.read_at).length);
      setError('');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    refresh();
    const timer = window.setInterval(refresh, 10000);
    return () => window.clearInterval(timer);
  }, [enabled, refresh]);

  return { unreadCount, error, refresh };
};

export default useOrderNotifications;
