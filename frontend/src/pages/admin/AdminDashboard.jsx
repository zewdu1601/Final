import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import adminService from '../../services/adminService';
import ManagerDashboard from './ManagerDashboard';
import './Admin.css';

const AdminOverview = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setStats(await adminService.getDashboardStats());
    } catch (requestError) {
      setError(requestError.response?.data?.detail || requestError.message || 'Could not load dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const cards = [
    { label: 'Total Users', value: stats?.total_users ?? '—', icon: '👥', color: '#f59e0b' },
    { label: 'Customers', value: stats?.total_customers ?? '—', icon: '🧑‍🤝‍🧑', color: '#0ea5e9' },
    { label: 'Store Managers', value: stats?.total_store_managers ?? '—', icon: '🏬', color: '#8b5cf6' },
    { label: 'Active Admins', value: stats?.total_admins ?? '—', icon: '🔐', color: '#4f46e5' },
    { label: 'Total Products', value: stats?.total_products ?? '—', icon: '🛍️', color: '#9333ea' },
    { label: 'Total Orders', value: stats?.total_orders ?? '—', icon: '📦', color: '#2563eb' },
    { label: 'Paid Sales', value: stats ? `$${Number(stats.total_revenue).toFixed(2)}` : '—', icon: '💰', color: '#10b981' },
    { label: 'AI Recommendations', value: stats?.recommendation_activity ?? '—', icon: '✨', color: '#ec4899', note: stats ? `${stats.recommendation_activity_last_7_days} in last 7 days` : null },
  ];

  return (
    <div className="admin-page admin-dashboard-page">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <p>Overview of your store's performance</p>
      </div>

      {loading && <p className="admin-dashboard-status" role="status">Loading store statistics...</p>}
      {error && (
        <div className="admin-error-state admin-dashboard-error" role="alert">
          <span>Dashboard statistics could not be loaded: {error}</span>
          <button type="button" className="btn btn-outline" onClick={load}>Retry</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid">
        {cards.map((c, i) => (
          <div key={c.label} className="stat-card" style={{ borderTopColor: c.color }}>
            <div className="stat-icon" style={{ background: c.color + '20', color: c.color }}>
              {c.icon}
            </div>
            <div>
              <p className="stat-label">{c.label}</p>
              <h3 className="stat-value">{c.value}</h3>
              {c.note && <p className="admin-kpi-footnote">{c.note}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="admin-section">
        <h2>Quick Actions</h2>
        <div className="quick-actions">
          <Link to="/admin/products/add" className="action-card">
            <span>➕</span><span>Add Product</span>
          </Link>
          <Link to="/admin/products" className="action-card">
            <span>📦</span><span>Manage Products</span>
          </Link>
          <Link to="/admin/orders" className="action-card">
            <span>🧾</span><span>Manage Orders</span>
          </Link>
          <Link to="/admin/users" className="action-card">
            <span>👥</span><span>Manage Users</span>
          </Link>
          <Link to="/admin/functions" className="action-card">
            <span>🧭</span><span>Admin Functions</span>
          </Link>
          <Link to="/admin/categories" className="action-card">
            <span>🏷️</span><span>Manage Categories</span>
          </Link>
          <Link to="/admin/analytics" className="action-card">
            <span>📈</span><span>View Analytics</span>
          </Link>
        </div>
      </div>

      <div className="admin-section">
        <h2>Low Stock Alerts</h2>
        {!stats ? (
          <p className="empty-text">Stock alerts are unavailable until dashboard statistics load.</p>
        ) : stats.low_stock_products.length === 0 ? (
          <p className="empty-text">All products have more than 10 units in stock.</p>
        ) : (
          <div className="admin-stock-list">
            {stats.low_stock_products.map((product) => (
              <div className="admin-stock-row" key={product.id}>
                <Link to={`/admin/products/edit/${product.id}`}>{product.name}</Link>
                <strong>{product.stock} left</strong>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="admin-section">
        <h2>Recent Orders</h2>
        <div className="activity-list">
          {!stats ? <p className="empty-text">Recent orders are unavailable until dashboard statistics load.</p> : stats.recent_orders.length === 0 ? <p className="empty-text">No orders have been placed.</p> : stats.recent_orders.map((order) => (
            <div key={order.id} className="activity-item">
              <span className="activity-dot" />
              <div>
                <p>Order #{order.id} · {order.status} · ${Number(order.total_amount).toFixed(2)}</p>
                <span className="activity-time">{order.created_at ? new Date(order.created_at).toLocaleString() : 'Date unavailable'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = ({ user }) => (
  user?.role === 'manager' ? <ManagerDashboard user={user} /> : <AdminOverview />
);

export default AdminDashboard;