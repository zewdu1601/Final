import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import authService from '../../services/authService';
import './Auth.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const validate = () => {
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      // await authService.forgotPassword(email);
      await new Promise((res) => setTimeout(res, 1000)); // mock
      setSent(true);
      toast.success('Reset link sent to your email!');
    } catch (err) {
      toast.error('Failed to send reset link. Try again.');
    } finally {
      setLoading(false);
    }
  };

  // ---------- Success View ----------
  if (sent) {
    return (
      <div className="auth-page">
        <div className="auth-card success-view">
          <div className="success-icon">📧</div>
          <h1 className="auth-title">Check Your Email</h1>
          <p className="auth-subtitle">
            We've sent a password reset link to <strong>{email}</strong>.
            Please check your inbox.
          </p>

          <button
            className="btn btn-outline btn-block"
            onClick={() => setSent(false)}
          >
            Send Again
          </button>

          <p className="auth-footer">
            Remember your password? <Link to="/login">Login</Link>
          </p>
        </div>
      </div>
    );
  }

  // ---------- Form View ----------
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Forgot Password?</h1>
        <p className="auth-subtitle">
          Enter your email address and we'll send you a link to reset your password.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError('');
              }}
              placeholder="you@example.com"
              className={error ? 'error' : ''}
              autoFocus
            />
            {error && <span className="error-text">{error}</span>}
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <p className="auth-footer">
          Remember your password? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;