import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getApiErrorMessage } from '../../services/api';
import { getOrders } from '../../services/orderService';
import { getPaymentMethodLabel } from '../../constants/paymentMethods';
import '../checkout/Checkout.css';

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getOrders()
      .then((data) => {
        if (active) setOrders(data);
      })
      .catch((requestError) => {
        if (active) setError(getApiErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="page section order-history">
      <h1 className="page-title">My Orders</h1>
      <p className="order-review-link"><Link to="/reviews">Review products from your orders</Link></p>
      {loading && <p role="status">Loading your orders…</p>}
      {!loading && error && <p role="alert">{error}</p>}
      {!loading && !error && orders.length === 0 && (
        <div className="cart-empty-state">
          <h2>No orders yet</h2>
          <p>Your purchases will appear here.</p>
          <Link to="/products" className="btn btn-primary">Browse products</Link>
        </div>
      )}
      {!loading && !error && orders.map((order) => (
        <article className="order-history-card" key={order.id}>
          <div className="order-history-heading">
            <div>
              <h2>Order #{order.id}</h2>
              <p>{order.created_at ? new Date(order.created_at).toLocaleString() : 'Date unavailable'}</p>
            </div>
            <strong>${Number(order.total_amount).toFixed(2)}</strong>
          </div>
          <p>Status: {order.status} · Payment: {order.payment_status} ({getPaymentMethodLabel(order.payment_method)})</p>
          <ul>
            {order.items.map((item) => (
              <li key={item.id}>
                Product #{item.product_id} × {item.quantity} — ${(item.price * item.quantity).toFixed(2)}
              </li>
            ))}
          </ul>
          <p className="order-shipping-address">{order.shipping_address}</p>
          <Link to={`/orders/${order.id}`} className="btn btn-outline">Order details</Link>
        </article>
      ))}
    </section>
  );
};

export default OrderHistory;