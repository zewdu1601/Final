import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getApiErrorMessage } from '../../services/api';
import { getOrderNotifications, markOrderNotificationsRead } from '../../services/orderService';
import '../checkout/Checkout.css';

const OrderNotificationsPage = ({ user }) => {
  const location = useLocation();
  const isStaff = Boolean(user?.is_admin || user?.role === 'admin' || user?.role === 'manager');
  const ordersPath = isStaff ? '/admin/orders' : '/orders';
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const loadNotifications = async () => {
      try {
        const data = await getOrderNotifications();
        if (!active) return;
        setNotifications(data);
        if (data.some((notification) => !notification.read_at)) {
          await markOrderNotificationsRead();
        }
      } catch (requestError) {
        if (active) setError(getApiErrorMessage(requestError));
      } finally {
        if (active) setLoading(false);
      }
    };
    loadNotifications();
    return () => {
      active = false;
    };
  }, [location.key]);

  return (
    <section className="page section order-notifications-page">
      <h1 className="page-title">Order notifications</h1>
      {loading && <p role="status">Loading notifications…</p>}
      {!loading && error && <p role="alert">{error}</p>}
      {!loading && !error && notifications.length === 0 && (
        <div className="cart-empty-state">
          <h2>No order notifications</h2>
          <p>Updates about new orders and order progress will appear here.</p>
        </div>
      )}
      {!loading && !error && notifications.map((notification) => (
        <article className="order-history-card" key={notification.id}>
          <div className="order-history-heading">
            <div>
              <h2>{notification.title}</h2>
              <p>{notification.created_at ? new Date(notification.created_at).toLocaleString() : 'Date unavailable'}</p>
            </div>
            <Link to={`${ordersPath}${isStaff ? '' : `/${notification.order_id}`}`} className="btn btn-outline">
              Order #{notification.order_id}
            </Link>
          </div>
          <p>{notification.message}</p>
        </article>
      ))}
    </section>
  );
};

export default OrderNotificationsPage;
