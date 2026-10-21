import { useCallback, useEffect, useState } from 'react';
import { getApiErrorMessage } from '../services/api';
import chatService from '../services/chatService';

const useChatNotifications = (enabled = true) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!enabled) {
      setUnreadCount(0);
      setError('');
      return;
    }
    try {
      const conversations = await chatService.getConversations();
      setUnreadCount(conversations.reduce(
        (total, conversation) => total + Number(conversation.unread_count || 0),
        0
      ));
      setError('');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => window.clearInterval(timer);
  }, [enabled, refresh]);

  return { unreadCount, error, refresh };
};

export default useChatNotifications;
