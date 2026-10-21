import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getApiErrorMessage } from '../../services/api';
import { invalidateSession, login as loginUser, logout } from '../../services/authService';
import './Auth.css';

const Login = ({ onLogin, adminOnly = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await loginUser(email, password);
      if (adminOnly && !(user.is_admin || user.role === 'admin')) {
        try {
          await invalidateSession();
        } catch (error) {
          console.error('Unable to invalidate a non-admin login session', error);
          logout();
        }
        toast.error('This account does not have administrator access.');
        return;
      }
      onLogin(user);
      toast.success(adminOnly ? 'Administrator login successful.' : 'Login successful! Welcome back.');
      const isStoreManager = user.role === 'manager';
      const isAdmin = user.is_admin || user.role === 'admin';
      navigate(isAdmin || isStoreManager ? '/admin' : location.state?.from || '/dashboard', { replace: true });
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>{adminOnly ? 'Administrator Login' : 'Welcome Back'}</h2>
        <p>{adminOnly ? 'Sign in with an administrator account to continue.' : 'Login to your account to continue'}</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address or Username</label>
            <input 
              type="text" 
              placeholder="you@example.com or username" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="auth-footer">
          {adminOnly ? (
            <>Store customer? <Link to="/login">Customer login</Link></>
          ) : (
            <>Don't have an account? <Link to="/register">Sign Up</Link> · <Link to="/admin/login">Admin login</Link></>
          )}
        </p>
      </div>
    </div>
  );
};

export default Login;