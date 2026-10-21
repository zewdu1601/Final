import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { toast } from 'react-toastify';
import './Cart.css';

const CartPage = () => {
  const { cart, updateQuantity, removeItem, total, clearCart } = useCart();
  const navigate = useNavigate();

  const handleQuantityChange = (id, qty) => {
    if (qty < 1) return;
    updateQuantity(id, qty);
  };

  const handleRemove = (id, name) => {
    removeItem(id);
    toast.info(`${name} removed from cart`);
  };

  const handleClearCart = () => {
    if (window.confirm('Clear all items from cart?')) {
      clearCart();
      toast.info('Cart cleared');
    }
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.warning('Your cart is empty');
      return;
    }
    navigate('/checkout');
  };

  // -------- Empty Cart --------
  if (cart.length === 0) {
    return (
      <div className="cart-page container">
        <div className="empty-cart">
          <div className="empty-icon">🛒</div>
          <h2>Your Cart is Empty</h2>
          <p>Looks like you haven't added anything yet.</p>
          <Link to="/products" className="btn btn-primary">
            Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  // -------- Cart With Items --------
  return (
    <div className="cart-page container">
      <div className="cart-header">
        <h1>Shopping Cart</h1>
        <button className="btn-clear" onClick={handleClearCart}>
          Clear Cart
        </button>
      </div>

      <div className="cart-layout">
        {/* Cart Items */}
        <div className="cart-items">
          {cart.map((item) => (
            <div key={item.id} className="cart-item">
              <img src={item.image} alt={item.name} className="item-image" />

              <div className="item-info">
                <h3>{item.name}</h3>
                <p className="item-price">${item.price}</p>
              </div>

              <div className="item-quantity">
                <button
                  onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                >
                  −
                </button>
                <span>{item.quantity}</span>
                <button
                  onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                >
                  +
                </button>
              </div>

              <div className="item-subtotal">
                ${(item.price * item.quantity).toFixed(2)}
              </div>

              <button
                className="btn-remove"
                onClick={() => handleRemove(item.id, item.name)}
                aria-label="Remove item"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <aside className="cart-summary">
          <h2>Order Summary</h2>

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

          <button className="btn btn-primary btn-block" onClick={handleCheckout}>
            Proceed to Checkout
          </button>

          <Link to="/products" className="continue-shopping">
            ← Continue Shopping
          </Link>
        </aside>
      </div>
    </div>
  );
};

export default CartPage;