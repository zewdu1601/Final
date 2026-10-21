import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getApiErrorMessage } from '../../services/api';
import { getOrderById } from '../../services/orderService';
import { getPaymentMethodLabel } from '../../constants/paymentMethods';
import './Checkout.css';

const OrderSuccess = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getOrderById(id)
      .then((data) => {
        if (active) setOrder(data);
      })
      .catch((requestError) => {
        if (active) setError(getApiErrorMessage(requestError));
      });
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <div className="order-success-page container">
      <div className="success-card">
        <div className="success-icon">✓</div>

        <h1>Order Placed Successfully!</h1>
        <p className="success-message">
          Your order has been received. Payment is pending confirmation.
        </p>

        <div className="order-id-box">
          <span>Order ID:</span>
          <strong>{id}</strong>
        </div>

        {error ? (
          <p className="success-note" role="alert">{error}</p>
        ) : order ? (
          <p className="success-note">
            Selected method: {getPaymentMethodLabel(order.payment_method)} · Payment status: {order.payment_status}
          </p>
        ) : (
          <p className="success-note" role="status">Loading payment details…</p>
        )}
        <p className="payment-preview-notice">
          The payment method selection is a design preview. No payment was processed.
        </p>

        <div className="success-actions">
          <Link to="/orders" className="btn btn-outline">
            📦 View My Orders
          </Link>
          <Link to="/products" className="btn btn-primary">
            🛍️ Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;