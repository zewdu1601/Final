import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getApiErrorMessage } from '../../services/api';
import { register as registerUser } from '../../services/authService';
import './Auth.css';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match!');
      return;
    }

    setLoading(true);
    try {
      await registerUser({
        fullName: formData.name,
        username: formData.username,
        email: formData.email,
        contactPhone: formData.phone,
        address: formData.address,
        password: formData.password,
      });
      toast.success('Account created successfully! Please login.');
      navigate('/login', { state: { email: formData.email } });
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Create Account</h2>
        <p>Join AI Store today</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input 
              type="text" 
              name="name"
              placeholder="John Doe" 
              value={formData.name}
              onChange={handleChange}
              required 
            />
          </div>

          <div className="form-group">
            <label htmlFor="register-username">Username</label>
            <input
              id="register-username"
              type="text"
              name="username"
              placeholder="Choose a username"
              value={formData.username}
              onChange={handleChange}
              minLength={3}
              required
            />
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              name="email"
              placeholder="you@example.com" 
              value={formData.email}
              onChange={handleChange}
              required 
            />
          </div>

          <div className="form-group">
            <label htmlFor="register-phone">Phone Number</label>
            <input
              id="register-phone"
              type="tel"
              name="phone"
              placeholder="Your contact number"
              value={formData.phone}
              onChange={handleChange}
              maxLength={40}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="register-address">Delivery Address</label>
            <input
              id="register-address"
              type="text"
              name="address"
              placeholder="Street, city, and postal code"
              value={formData.address}
              onChange={handleChange}
              maxLength={500}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              name="password"
              placeholder="Minimum 6 characters" 
              value={formData.password}
              onChange={handleChange}
              minLength={6}
              required 
            />
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input 
              type="password" 
              name="confirmPassword"
              placeholder="Re-enter password" 
              value={formData.confirmPassword}
              onChange={handleChange}
              required 
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;