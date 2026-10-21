import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminService, { getAdminMediaUrl } from '../../services/adminService';
import { getApiErrorMessage } from '../../services/api';
import { logout } from '../../services/authService';
import './Admin.css';

const AdminProfile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState({ full_name: '', username: '', email: '' });
  const [photo, setPhoto] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const previewUrl = useMemo(() => photo ? URL.createObjectURL(photo) : '', [photo]);

  useEffect(() => {
    if (!previewUrl) return undefined;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    let cancelled = false;
    adminService.getProfile().then((data) => {
      if (cancelled) return;
      setProfile(data);
      setForm({ full_name: data.full_name || '', username: data.username, email: data.email });
    }).catch((error) => {
      if (!cancelled) {
        setLoadError(getApiErrorMessage(error));
        toast.error(getApiErrorMessage(error));
      }
    });
    return () => { cancelled = true; };
  }, []);

  const persistUser = (user) => {
    localStorage.setItem('aiStoreUser', JSON.stringify(user));
    window.dispatchEvent(new Event('aiStoreUserUpdated'));
    setProfile(user);
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    try {
      persistUser(await adminService.updateProfile(form));
      toast.success('Profile updated.');
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSavingProfile(false);
    }
  };

  const selectPhoto = (event) => {
    const selected = event.target.files?.[0];
    event.target.value = '';
    if (!selected) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(selected.type)) {
      toast.error('Choose a JPG, PNG, or WebP photo.');
      return;
    }
    if (selected.size > 5 * 1024 * 1024) {
      toast.error('Profile photos must be smaller than 5 MB.');
      return;
    }
    setPhoto(selected);
  };

  const uploadPhoto = async () => {
    if (!photo) return;
    setSavingPhoto(true);
    try {
      persistUser(await adminService.uploadProfilePhoto(photo));
      setPhoto(null);
      toast.success('Profile photo updated.');
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSavingPhoto(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    if (passwords.new_password !== passwords.confirm_password) {
      toast.error('New password and confirmation do not match.');
      return;
    }
    setSavingPassword(true);
    try {
      await adminService.changePassword(passwords);
      logout();
      window.dispatchEvent(new Event('aiStoreUserUpdated'));
      toast.success('Password changed. Please log in again.');
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSavingPassword(false);
    }
  };

  if (!profile) return <div className="admin-page"><p className={loadError ? 'admin-inline-error' : 'loading-text'} role={loadError ? 'alert' : undefined}>{loadError || 'Loading admin profile...'}</p></div>;

  const displayedPhoto = previewUrl || getAdminMediaUrl(profile.photo_url);
  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Admin Profile</h1>
        <p>Manage your account details, profile photo, and sign-in security.</p>
      </div>

      <section className="admin-profile-card admin-section">
        <div className="admin-profile-photo-section">
          {displayedPhoto ? <img className="admin-profile-photo" src={displayedPhoto} alt="Admin profile" /> : (
            <div className="admin-profile-photo admin-avatar-fallback">{(profile.full_name || profile.username).charAt(0).toUpperCase()}</div>
          )}
          <label className="btn btn-outline admin-file-button">
            Choose photo
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={selectPhoto} />
          </label>
          {photo && <button type="button" className="btn btn-primary" disabled={savingPhoto} onClick={uploadPhoto}>{savingPhoto ? 'Uploading...' : 'Upload photo'}</button>}
          <span className="admin-muted">JPG, PNG, or WebP · up to 5 MB</span>
        </div>

        <div className="admin-profile-content">
          <h2>Account details</h2>
          <form onSubmit={saveProfile}>
            <div className="admin-profile-fields">
              <label>Full name<input required maxLength="255" value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} /></label>
              <label>Username<input required minLength="3" maxLength="100" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} /></label>
              <label>Email address<input type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
            </div>
            <p className="admin-profile-role">Role: <strong>Administrator</strong> · User ID: {profile.id}</p>
            <button type="submit" className="btn btn-primary" disabled={savingProfile}>{savingProfile ? 'Saving...' : 'Save profile'}</button>
          </form>
        </div>
      </section>

      <section className="admin-profile-card admin-section">
        <div className="admin-profile-content">
          <h2>Change password</h2>
          <p className="admin-muted">Use at least 10 characters with uppercase, lowercase, and a number. You will be signed out on this and other devices.</p>
          <form onSubmit={changePassword}>
            <div className="admin-profile-fields">
              <label>Current password<input type="password" required maxLength="72" autoComplete="current-password" value={passwords.current_password} onChange={(event) => setPasswords({ ...passwords, current_password: event.target.value })} /></label>
              <label>New password<input type="password" required minLength="10" maxLength="72" autoComplete="new-password" value={passwords.new_password} onChange={(event) => setPasswords({ ...passwords, new_password: event.target.value })} /></label>
              <label>Confirm new password<input type="password" required minLength="10" maxLength="72" autoComplete="new-password" value={passwords.confirm_password} onChange={(event) => setPasswords({ ...passwords, confirm_password: event.target.value })} /></label>
            </div>
            <button type="submit" className="btn btn-primary" disabled={savingPassword}>{savingPassword ? 'Updating...' : 'Change password'}</button>
          </form>
        </div>
      </section>
    </div>
  );
};

export default AdminProfile;
