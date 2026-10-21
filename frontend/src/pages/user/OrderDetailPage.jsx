import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getApiErrorMessage } from '../../services/api';
import { getOrderById } from '../../services/orderService';
import { getPaymentMethodLabel } from '../../constants/paymentMethods';
import '../checkout/Checkout.css';

const ORDER_STAGES = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered'];

const OrderDetailPage = ({ products = [] }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getOrderById(id)
      .then((data) => {
        if (active) setOrder(data);
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
  }, [id]);

  if (loading) return <section className="page section"><p role="status">Loading order…</p></section>;
  if (error) return <section className="page section"><p role="alert">{error}</p></section>;
  if (!order) return <section className="page section"><p>Order not found.</p></section>;

  const orderStatus = order.status;
  const currentStage = ORDER_STAGES.indexOf(orderStatus);

  return (
    <section className="page section order-detail-page">
      <button className="btn btn-outline" onClick={() => navigate('/orders')}>
        ← Back to Orders
      </button>
      <h1 className="page-title">Order #{order.id}</h1>
      <div className="order-detail-card">
        <section className="order-tracking" aria-label="Order tracking">
          <h2>Order tracking</h2>
          {['Cancelled', 'Returned'].includes(orderStatus) ? (
            <p className="order-cancelled-status">
              {orderStatus === 'Cancelled' ? 'This order was cancelled.' : 'This order has been returned.'}
            </p>
          ) : (
            <ol className="order-tracking-stages">
              {ORDER_STAGES.map((stage, index) => (
                <li
                  className={index <= currentStage ? 'is-complete' : ''}
                  aria-current={index === currentStage ? 'step' : undefined}
                  key={stage}
                >
                  <span aria-hidden="true">{index < currentStage ? '✓' : index + 1}</span>
                  <strong>{stage}</strong>
                </li>
              ))}
            </ol>
          )}
        </section>
        <h2>Items</h2>
        <ul>
          {order.items.map((item) => {
            const product = products.find((entry) => Number(entry.id) === Number(item.product_id));
            return (
              <li key={item.id}>
                <Link to={`/products/${item.product_id}`}>{product?.name || `Product #${item.product_id}`}</Link>
                {' '}× {item.quantity} — ${(Number(item.price) * item.quantity).toFixed(2)}
                {' '}· <Link to={`/reviews?productId=${item.product_id}`}>Review product</Link>
              </li>
            );
          })}
        </ul>
        <p><strong>Total:</strong> ${Number(order.total_amount).toFixed(2)}</p>
        <p><strong>Order status:</strong> {order.status}</p>
        <p><strong>Payment:</strong> {getPaymentMethodLabel(order.payment_method)} — {order.payment_status}</p>
        <h2>Delivery address</h2>
        <p>{order.shipping_address}</p>
      </div>
    </section>
  );
};

export default OrderDetailPage;