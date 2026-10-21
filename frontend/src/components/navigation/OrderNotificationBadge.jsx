import React from 'react';
import './OrderNotificationBadge.css';

const OrderNotificationBadge = ({ unreadCount, error }) => {
  if (error) {
    return (
      <span
        className="order-notification-badge has-error"
        aria-label={`Order notifications unavailable: ${error}`}
        title={`Order notifications unavailable: ${error}`}
      >
        !
      </span>
    );
  }
  if (!unreadCount) return null;
  return (
    <span className="order-notification-badge" aria-label={`${unreadCount} unread order notifications`}>
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  );
};

export default OrderNotificationBadge;
