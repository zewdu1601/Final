import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getApiErrorMessage } from '../../services/api';
import { createOrder } from '../../services/orderService';
import { PAYMENT_METHODS } from '../../constants/paymentMethods';
import './Checkout.css';

const CheckoutPage = ({ cart, products = [], user, onOrderPlaced }) => {
  const navigate = useNavigate();
  const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cash_on_delivery');
  const [appliedPaymentMethod, setAppliedPaymentMethod] = useState('');
  const unavailableItems = cart.filter(({ product, quantity }) => {
    const currentProduct = products.find((item) => Number(item.id) === Number(product.id)) || product;
    const stockIsKnown = currentProduct.stock !== undefined
      && currentProduct.stock !== null
      && currentProduct.stock !== '';
    return stockIsKnown && quantity > Number(currentProduct.stock);
  });
  const [shipping, setShipping] = useState({
    fullName: user?.full_name || '',
    phone: user?.contact_phone || '',
    address: user?.address || '',
    city: '',
    state: '',
    pincode: '',
  });

  const handleShippingChange = (e) => {
    setShipping({ ...shipping, [e.target.name]: e.target.value });
  };

  const handleShippingSubmit = (e) => {
    e.preventDefault();
    setStep(2);
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (unavailableItems.length > 0) {
      toast.error('Update your cart to match current stock before placing the order.');
      return;
    }
    setLoading(true);

    try {
      const order = await createOrder({
        shippingAddress: [
          shipping.fullName,
          shipping.phone,
          shipping.address,
          shipping.city,
          shipping.state,
          shipping.pincode,
        ].join(', '),
        paymentMethod: appliedPaymentMethod,
        items: cart,
      });
      onOrderPlaced();
      toast.success('Order placed successfully!');
      navigate(`/order-success/${order.id}`, { state: { paymentMethod: appliedPaymentMethod } });
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="checkout-page container">
        <div className="empty-checkout">
          <h2>Your cart is empty</h2>
          <p>Add some products before checking out.</p>
          <button className="btn btn-primary" onClick={() => navigate('/products')}>
            Shop Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page container">
      <h1>Checkout</h1>

      <div className="checkout-steps">
        <div className={`step ${step >= 1 ? 'active' : ''}`}>
          <span className="step-number">1</span>
          <span>Shipping</span>
        </div>
        <div className="step-line" />
        <div className={`step ${step >= 2 ? 'active' : ''}`}>
          <span className="step-number">2</span>
          <span>Review</span>
        </div>
        <div className="step-line" />
        <div className={`step ${step >= 3 ? 'active' : ''}`}>
          <span className="step-number">3</span>
          <span>Payment</span>
        </div>
      </div>

      <div className="checkout-layout">
        <div className="checkout-main">
          {step === 1 && (
            <form className="checkout-form" onSubmit={handleShippingSubmit}>
              <h2>Delivery and contact details</h2>

              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    name="fullName"
                    value={shipping.fullName}
                    onChange={handleShippingChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    name="phone"
                    value={shipping.phone}
                    onChange={handleShippingChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Pincode</label>
                  <input
                    name="pincode"
                    value={shipping.pincode}
                    onChange={handleShippingChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Address</label>
                <input
                  name="address"
                  value={shipping.address}
                  onChange={handleShippingChange}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>City</label>
                  <input
                    name="city"
                    value={shipping.city}
                    onChange={handleShippingChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>State</label>
                  <input
                    name="state"
                    value={shipping.state}
                    onChange={handleShippingChange}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary">
                Review Order →
              </button>
            </form>
          )}

          {step === 2 && (
            <section className="checkout-form" aria-labelledby="checkout-review-title">
              <h2 id="checkout-review-title">Review your order</h2>
              <div className="checkout-delivery-review">
                <h3>Delivery details</h3>
                <p><strong>{shipping.fullName}</strong> · {shipping.phone}</p>
                <p>{shipping.address}, {shipping.city}, {shipping.state} {shipping.pincode}</p>
              </div>
              <p>Confirm your contact and delivery details before choosing a payment method.</p>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setStep(1)}
                >
                  ← Edit delivery details
                </button>
                <button type="button" className="btn btn-primary" onClick={() => setStep(3)}>
                  Continue to payment →
                </button>
              </div>
            </section>
          )}

          {step === 3 && (
            <form className="checkout-form" onSubmit={handlePlaceOrder}>
              <h2>Choose Payment Method</h2>
              <p>Select how you want to pay for your order.</p>
              {unavailableItems.length > 0 && (
                <div className="checkout-stock-warning" role="alert">
                  <p>Some cart quantities exceed available stock. Update them before ordering.</p>
                  <Link to="/cart">Return to cart</Link>
                </div>
              )}
              <div className="payment-methods">
                {PAYMENT_METHODS.map((method) => (
                  <label
                    key={method.value}
                    className={`payment-option${selectedPaymentMethod === method.value ? ' selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.value}
                      checked={selectedPaymentMethod === method.value}
                      onChange={() => {
                        setSelectedPaymentMethod(method.value);
                        setAppliedPaymentMethod('');
                      }}
                    />
                    <span className="payment-option-copy">
                      <strong>{method.label}</strong>
                      <small>{method.description}</small>
                    </span>
                  </label>
                ))}
              </div>
              <div className="selected-payment-method">
                <span>Selected method</span>
                <strong>{PAYMENT_METHODS.find((method) => method.value === selectedPaymentMethod)?.label}</strong>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setAppliedPaymentMethod(selectedPaymentMethod)}
                >
                  {appliedPaymentMethod === selectedPaymentMethod ? 'Method selected' : 'Use this method'}
                </button>
              </div>
              <p className="payment-preview-notice" role="note">
                This is a design preview; selecting a method here does not make a real payment.
                Payment will remain pending until it is confirmed separately.
              </p>

              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={() => setStep(2)}>
                  ← Back to review
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading || unavailableItems.length > 0 || !appliedPaymentMethod}>
                  {loading ? 'Placing Order...' : 'Place Order'}
                </button>
              </div>
            </form>
          )}
        </div>

        <aside className="checkout-summary">
          <h2>Order Summary</h2>

          <div className="summary-items">
            {cart.map((item) => (
              <div key={item.product.id} className="summary-item">
                <img src={item.product.image} alt={item.product.name} />
                <div>
                  <p>{item.product.name}</p>
                  <span>Qty: {item.quantity}</span>
                </div>
                <span className="summary-price">
                  ${(item.product.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="summary-row">
            <span>Subtotal</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <div className="summary-row">
            <span>Shipping</span>
            <span>Free</span>
          </div>
          <div className="summary-row total">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CheckoutPage;