import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import adminService, { getAdminMediaUrl } from '../../services/adminService';
import { getApiErrorMessage } from '../../services/api';
import { getStoredUser } from '../../services/authService';
import './Admin.css';

const emptyForm = {
  full_name: '',
  username: '',
  email: '',
  role: 'customer',
  password: '',
  is_active: true,
};

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [active, setActive] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingUserId, setUploadingUserId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [details, setDetails] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const currentUser = getStoredUser();

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: pageSize };
      if (search.trim()) params.search = search.trim();
      if (role) params.role = role;
      if (active !== '') params.active = active === 'active';
      const response = await adminService.getUsers(params);
      setUsers(response.items);
      setTotal(response.total);
      setTotalPages(response.total_pages);
      setStats(response.stats);
      setPage(response.page);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [active, page, pageSize, role, search]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({
      full_name: user.full_name || '',
      username: user.username || '',
      email: user.email || '',
      role: user.role || (user.is_admin ? 'admin' : 'customer'),
      password: '',
      is_active: user.is_active,
    });
    setFormOpen(true);
  };

  const submitUser = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (editingUser) {
        const updated = await adminService.updateUser(editingUser.id, {
          full_name: form.full_name,
          username: form.username,
          email: form.email,
          role: form.role,
          is_active: form.is_active,
        });
        if (updated.id === currentUser?.id) {
          localStorage.setItem('aiStoreUser', JSON.stringify(updated));
          window.dispatchEvent(new Event('aiStoreUserUpdated'));
        }
        toast.success('User updated.');
      } else {
        await adminService.createUser(form);
        toast.success('User created.');
      }
      setFormOpen(false);
      await loadUsers();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user) => {
    const nextActive = !user.is_active;
    const action = nextActive ? 'reactivate' : 'deactivate';
    if (!window.confirm(`Are you sure you want to ${action} ${user.full_name || user.username}?`)) return;
    try {
      const updated = await adminService.setUserActive(user.id, nextActive);
      setUsers((current) => current.map((entry) => entry.id === user.id ? updated : entry));
      toast.success(`Account ${updated.is_active ? 'activated' : 'deactivated'}.`);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const showDetails = async (user) => {
    try {
      setDetails(await adminService.getUser(user.id));
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const uploadPhoto = async (user, file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Choose a JPG, PNG, or WebP photo.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Profile photos must be 5 MB or smaller.');
      return;
    }
    setUploadingUserId(user.id);
    try {
      const updated = await adminService.uploadUserPhoto(user.id, file);
      setUsers((current) => current.map((entry) => entry.id === user.id ? updated : entry));
      if (details?.id === user.id) setDetails(updated);
      toast.success(`Profile photo updated for ${user.full_name || user.username}.`);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setUploadingUserId(null);
    }
  };

  const deleteUser = async (user) => {
    if (!window.confirm(`Permanently delete ${user.full_name || user.username}? This cannot be undone.`)) return;
    try {
      await adminService.deleteUser(user.id);
      if (details?.id === user.id) setDetails(null);
      toast.success('User deleted.');
      await loadUsers();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>User Management</h1>
          <p>{total} accounts · Search, filter, manage roles, and control account access.</p>
        </div>
      </div>

      <div className="user-management-stats" aria-label="User statistics">
        {[
          ['Total Users', stats?.total_users],
          ['Admins', stats?.admins],
          ['Store Managers', stats?.store_managers],
          ['Customers', stats?.customers],
        ].map(([label, value]) => (
          <article className="user-management-stat" key={label}>
            <span>{label}</span>
            <strong>{value ?? '—'}</strong>
          </article>
        ))}
      </div>

      <div className="admin-user-search">
        <input
          className="search-input"
          type="search"
          placeholder="Search name, email, or username"
          value={search}
          onChange={(event) => { setSearch(event.target.value); setPage(1); }}
        />
      </div>

      <div className="admin-toolbar-actions admin-user-filters">
        <select className="status-select" aria-label="Filter by role" value={role} onChange={(event) => { setRole(event.target.value); setPage(1); }}>
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Store Manager</option>
          <option value="customer">Customer</option>
        </select>
        <select className="status-select" aria-label="Filter by account status" value={active} onChange={(event) => { setActive(event.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button type="button" className="btn btn-primary" onClick={openCreate}>Add User</button>
      </div>

      {formOpen && (
        <form className="admin-user-form admin-section" onSubmit={submitUser}>
          <div className="admin-section-heading">
            <h2>{editingUser ? `Edit ${editingUser.full_name || editingUser.username}` : 'Create User'}</h2>
            <button type="button" className="btn btn-outline" onClick={() => setFormOpen(false)}>Close</button>
          </div>
          <div className="admin-profile-fields">
            <label>Full name<input required maxLength="255" value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} /></label>
            <label>Username<input required minLength="3" maxLength="100" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} /></label>
            <label>Email<input type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
            <label>Role<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
              <option value="customer">Customer</option><option value="manager">Store Manager</option><option value="admin">Admin</option>
            </select></label>
            {!editingUser && <label>Temporary password<input type="password" required minLength="10" maxLength="72" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>}
            {editingUser && <label className="admin-checkbox-label"><input type="checkbox" checked={form.is_active} disabled={editingUser.id === currentUser?.id} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} /> Account active</label>}
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editingUser ? 'Save Changes' : 'Create User'}</button>
        </form>
      )}

      {details && (
        <section className="admin-user-details admin-section" aria-live="polite">
          <button type="button" className="btn btn-outline" onClick={() => setDetails(null)}>Close details</button>
          <h2>{details.full_name || details.username}</h2>
          <p>User ID: {details.id} · {details.email}</p>
          <p>Username: {details.username} · Role: {details.role} · {details.is_active ? 'Active' : 'Inactive'}</p>
          <p>Registered: {details.created_at ? new Date(details.created_at).toLocaleString() : 'Unknown'}</p>
          {details.photo_url && <img className="admin-user-photo admin-user-detail-photo" src={getAdminMediaUrl(details.photo_url)} alt={`${details.full_name || details.username} profile`} />}
        </section>
      )}

      {loading ? <p className="loading-text">Loading users...</p> : users.length === 0 ? (
        <p className="empty-text">No users match these filters.</p>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="admin-table">
              <thead><tr><th>ID</th><th>Photo</th><th>Name</th><th>Email</th><th>Username</th><th>Role</th><th>Status</th><th>Registered</th><th>Actions</th></tr></thead>
              <tbody>{users.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.photo_url ? <img className="admin-user-photo" src={getAdminMediaUrl(user.photo_url)} alt="" /> : <div className="user-avatar">{(user.full_name || user.username || 'U').charAt(0).toUpperCase()}</div>}</td>
                  <td>{user.full_name || '—'}</td>
                  <td>{user.email}</td>
                  <td>{user.username}</td>
                  <td><span className={`role-badge role-${user.role || (user.is_admin ? 'admin' : 'customer')}`}>{user.role === 'manager' ? 'Store Manager' : user.role || (user.is_admin ? 'admin' : 'customer')}</span></td>
                  <td><span className={`user-status-badge${user.is_active ? ' is-active' : ' is-inactive'}`}>{user.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td>{user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</td>
                  <td><div className="admin-row-actions">
                    <button type="button" className="btn btn-outline" onClick={() => showDetails(user)}>View</button>
                    <button type="button" className="btn btn-outline" onClick={() => openEdit(user)}>Edit</button>
                    <button type="button" className="btn btn-outline" disabled={user.id === currentUser?.id} onClick={() => toggleActive(user)}>{user.is_active ? 'Deactivate' : 'Activate'}</button>
                    <label className="btn btn-outline admin-user-photo-button">
                      {uploadingUserId === user.id ? 'Uploading...' : 'Photo'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        aria-label={`Upload profile photo for ${user.full_name || user.username}`}
                        disabled={uploadingUserId === user.id}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = '';
                          uploadPhoto(user, file);
                        }}
                      />
                    </label>
                    <button type="button" className="btn btn-outline admin-user-delete" disabled={user.id === currentUser?.id} onClick={() => deleteUser(user)}>Delete</button>
                  </div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </>
      )}
      <div className="admin-pagination">
        <span>Page {page} of {Math.max(totalPages, 1)} · {total} users</span>
        <div>
          <button className="btn btn-outline" type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Previous</button>
          <button className="btn btn-outline" type="button" disabled={page >= totalPages || loading || totalPages === 0} onClick={() => setPage((value) => value + 1)}>Next</button>
        </div>
      </div>
    </div>
  );
};

export default ManageUsers;
