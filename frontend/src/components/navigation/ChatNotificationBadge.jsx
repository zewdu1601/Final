import React from 'react';

const ChatNotificationBadge = ({ unreadCount, error }) => {
  if (error) {
    return (
      <span
        className="chat-notification-badge has-error"
        role="img"
        aria-label={`Chat notifications unavailable: ${error}`}
        title={`Chat notifications unavailable: ${error}`}
      >
        !
      </span>
    );
  }
  if (!unreadCount) return null;
  return (
    <span
      className="chat-notification-badge"
      aria-label={`${unreadCount} unread chat ${unreadCount === 1 ? 'message' : 'messages'}`}
    >
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  );
};

export default ChatNotificationBadge;
