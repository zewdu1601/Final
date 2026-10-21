import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import adminService from '../../services/adminService';
import { getApiErrorMessage } from '../../services/api';
import './Admin.css';

const AdminSettings = () => {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    adminService.getSettings().then(setSettings).catch((error) => {
      setLoadError(getApiErrorMessage(error));
      toast.error(getApiErrorMessage(error));
    });
  }, []);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      setSettings(await adminService.updateSettings(settings));
      toast.success('Store settings saved.');
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <div className="admin-page"><p className={loadError ? 'admin-inline-error' : 'loading-text'} role={loadError ? 'alert' : undefined}>{loadError || 'Loading store settings...'}</p></div>;
  return (
    <div className="admin-page">
      <div className="admin-header"><h1>System Settings</h1><p>Update public store contact information. Secret server configuration is not exposed here.</p></div>
      <form className="admin-profile-card admin-settings-form" onSubmit={save}>
        <div className="admin-profile-fields">
          <label>Store name<input required maxLength="160" value={settings.store_name} onChange={(event) => setSettings({ ...settings, store_name: event.target.value })} /></label>
          <label>Contact email<input type="email" value={settings.contact_email || ''} onChange={(event) => setSettings({ ...settings, contact_email: event.target.value })} /></label>
          <label>Contact phone<input maxLength="40" value={settings.contact_phone || ''} onChange={(event) => setSettings({ ...settings, contact_phone: event.target.value })} /></label>
          <label>Store address<input maxLength="500" value={settings.address || ''} onChange={(event) => setSettings({ ...settings, address: event.target.value })} /></label>
        </div>
        <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save settings'}</button>
      </form>
    </div>
  );
};

export default AdminSettings;
