import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getApiErrorMessage } from '../../services/api';
import userService from '../../services/userService';
import './User.css';

const Profile = ({ user, onUserUpdated, onPasswordChanged }) => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    username: user?.username || '',
    email: user?.email || '',
    contact_phone: user?.contact_phone || '',
    address: user?.address || '',
  });
  const [loading, setLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    setForm({
      full_name: user?.full_name || '',
      username: user?.username || '',
      email: user?.email || '',
      contact_phone: user?.contact_phone || '',
      address: user?.address || '',
    });
  }, [user]);

  const handleChange = (e) => {
    setForm((current) => ({ ...current, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updated = await userService.updateProfile(form);
      onUserUpdated(updated);
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New password and confirmation do not match.');
      return;
    }
    setPasswordLoading(true);
    try {
      await userService.changePassword(passwordForm);
      toast.success('Password updated. Please log in again.');
      onPasswordChanged();
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <section className="page user-page">
      <header className="user-page-heading">
        <div>
          <p className="user-page-eyebrow">YOUR ACCOUNT</p>
          <h1>My Profile</h1>
          <p>Manage your personal details and keep your account up to date.</p>
        </div>
        <Link to="/orders" className="btn btn-outline">View my orders</Link>
      </header>

      <div className="profile-layout">
        <aside className="profile-sidebar">
          <div className="avatar">
            {(user?.full_name || user?.username || 'U').charAt(0).toUpperCase()}
          </div>
          <h2>{user?.full_name || user?.username || 'Customer'}</h2>
          <p>{user?.email || 'user@example.com'}</p>
          <span className="profile-account-role">Customer account</span>
          <div className="profile-sidebar-divider" />
          <Link to="/products">Continue shopping <span aria-hidden="true">→</span></Link>
        </aside>

        <form className="profile-form" onSubmit={handleSubmit}>
          <div className="profile-form-heading">
            <div>
              <h2>Personal information</h2>
              <p>Update the details associated with your account.</p>
            </div>
            <span className="profile-id">Customer ID #{user?.id ?? '—'}</span>
          </div>

          <div className="form-group">
            <label htmlFor="profile-full-name">Full name</label>
            <input
              type="text"
              id="profile-full-name"
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              maxLength={255}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="profile-username">Username</label>
            <input
              type="text"
              id="profile-username"
              name="username"
              value={form.username}
              onChange={handleChange}
              minLength={3}
              maxLength={100}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="profile-email">Email address</label>
            <input
              type="email"
              id="profile-email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="profile-phone">Phone number</label>
            <input
              type="tel"
              id="profile-phone"
              name="contact_phone"
              value={form.contact_phone}
              onChange={handleChange}
              maxLength={40}
            />
          </div>

          <div className="form-group">
            <label htmlFor="profile-address">Delivery address</label>
            <input
              type="text"
              id="profile-address"
              name="address"
              value={form.address}
              onChange={handleChange}
              maxLength={500}
            />
          </div>

          <div className="profile-form-footer">
            <p>Your account details are private and used to manage your orders.</p>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>

      <form className="profile-form password-change-form" onSubmit={handlePasswordSubmit}>
        <div className="profile-form-heading">
          <div>
            <h2>Change password</h2>
            <p>Use a new password with at least 10 characters. You will need to log in again.</p>
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="current-password">Current password</label>
          <input
            id="current-password"
            type="password"
            value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
            autoComplete="current-password"
            required
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="new-password">New password</label>
            <input
              id="new-password"
              type="password"
              minLength={10}
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              autoComplete="new-password"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirm-new-password">Confirm new password</label>
            <input
              id="confirm-new-password"
              type="password"
              minLength={10}
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              autoComplete="new-password"
              required
            />
          </div>
        </div>
        <div className="profile-form-footer">
          <p>Your other active sessions will be signed out after this change.</p>
          <button type="submit" className="btn btn-primary" disabled={passwordLoading}>
            {passwordLoading ? 'Updating…' : 'Update password'}
          </button>
        </div>
      </form>
    </section>
  );
};

export default Profile;