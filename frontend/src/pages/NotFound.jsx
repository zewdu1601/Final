import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './NotFound.css';

const NotFound = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [countdown, setCountdown] = useState(10);
  const [autoRedirect, setAutoRedirect] = useState(true);

  // ---------- Auto redirect countdown ----------
  useEffect(() => {
    if (!autoRedirect) return;

    if (countdown <= 0) {
      navigate('/', { replace: true });
      return;
    }

    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, autoRedirect, navigate]);

  // ---------- Handlers ----------
  const handleGoBack = () => navigate(-1);
  const handleGoHome = () => navigate('/');
  const cancelAutoRedirect = () => setAutoRedirect(false);

  return (
    <div className="notfound-page">

      {/* ============ BACKGROUND FLOATING SHAPES ============ */}
      <div className="bg-shapes" aria-hidden="true">
        <span className="shape shape-1"></span>
        <span className="shape shape-2"></span>
        <span className="shape shape-3"></span>
        <span className="shape shape-4"></span>
      </div>

      {/* ============ MAIN CONTENT ============ */}
      <div className="notfound-content">

        {/* ---------- Big 404 ---------- */}
        <div className="error-code">
          <span className="digit">4</span>
          <span className="digit zero">
            <span className="zero-inner">🤖</span>
          </span>
          <span className="digit">4</span>
        </div>

        {/* ---------- Text ---------- */}
        <h1 className="error-title">Page Not Found</h1>
        <p className="error-message">
          Oops! The page you're looking for doesn't exist, was moved, or is temporarily unavailable.
        </p>

        {/* ---------- Requested Path ---------- */}
        <div className="requested-path">
          <span className="path-label">Requested URL:</span>
          <code className="path-value">{location.pathname}</code>
        </div>

        {/* ---------- Auto Redirect Notice ---------- */}
        {autoRedirect && (
          <div className="redirect-notice">
            <span>
              Redirecting to home in <strong>{countdown}s</strong>...
            </span>
            <button
              className="cancel-redirect"
              onClick={cancelAutoRedirect}
              type="button"
            >
              Cancel
            </button>
          </div>
        )}

        {/* ---------- Action Buttons ---------- */}
        <div className="error-actions">
          <button
            className="btn btn-primary"
            onClick={handleGoHome}
            type="button"
          >
            🏠 Go Home
          </button>
          <button
            className="btn btn-outline"
            onClick={handleGoBack}
            type="button"
          >
            ← Go Back
          </button>
        </div>

        {/* ---------- Quick Links ---------- */}
        <div className="quick-links">
          <p>You might be looking for:</p>
          <div className="link-grid">
            <Link to="/products" className="quick-link">
              <span className="link-icon">🛍️</span>
              <span>Products</span>
            </Link>
            <Link to="/cart" className="quick-link">
              <span className="link-icon">🛒</span>
              <span>Cart</span>
            </Link>
            <Link to="/orders" className="quick-link">
              <span className="link-icon">📦</span>
              <span>Orders</span>
            </Link>
            <Link to="/contact" className="quick-link">
              <span className="link-icon">✉️</span>
              <span>Contact</span>
            </Link>
            <Link to="/about" className="quick-link">
              <span className="link-icon">ℹ️</span>
              <span>About</span>
            </Link>
            <Link to="/profile" className="quick-link">
              <span className="link-icon">👤</span>
              <span>Profile</span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default NotFound;