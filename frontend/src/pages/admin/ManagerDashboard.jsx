import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  IoAlertCircleOutline,
  IoBagHandleOutline,
  IoBarChartOutline,
  IoCubeOutline,
  IoPeopleOutline,
  IoPricetagsOutline,
  IoReceiptOutline,
  IoTrendingUpOutline,
} from 'react-icons/io5';
import adminService from '../../services/adminService';
import './ManagerDashboard.css';

const money = (value) => `$${Number(value || 0).toLocaleString(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

const dateLabel = (value) => (
  value ? new Date(value).toLocaleDateString() : 'Date unavailable'
);

const normalizeStatus = (value) => String(value || 'Pending').toLowerCase().replace(/\s+/g, '-');

const SalesChart = ({ sales }) => {
  const width = 560;
  const height = 175;
  const max = Math.max(...sales.map((point) => Number(point.value) || 0), 1);
  const coordinates = sales.map((point, index) => ({
    x: sales.length < 2 ? width / 2 : 20 + (index * (width - 40)) / (sales.length - 1),
    y: height - 20 - ((Number(point.value) || 0) / max) * (height - 40),
    ...point,
  }));
  const line = coordinates.map((point) => `${point.x},${point.y}`).join(' ');
  const area = coordinates.length
    ? `20,${height - 20} ${line} ${coordinates[coordinates.length - 1].x},${height - 20}`
    : '';

  return (
    <div className="manager-sales-chart">
      {sales.length ? (
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Monthly paid sales">
          {[0, 1, 2, 3].map((lineIndex) => {
            const y = 20 + lineIndex * ((height - 40) / 3);
            return <line key={lineIndex} x1="20" x2={width - 20} y1={y} y2={y} className="manager-chart-gridline" />;
          })}
          <polygon points={area} className="manager-chart-area" />
          {coordinates.length > 1 && <polyline points={line} className="manager-chart-line" />}
          {coordinates.map((point) => (
            <g key={point.month}>
              <circle cx={point.x} cy={point.y} r="4" className="manager-chart-point">
                <title>{`${point.month}: ${money(point.value)}`}</title>
              </circle>
              <text x={point.x} y={height - 3} textAnchor="middle" className="manager-chart-label">
                {point.month.split(' ')[0]}
              </text>
            </g>
          ))}
        </svg>
      ) : (
        <p className="manager-empty-note">Sales data will appear as orders are paid.</p>
      )}
    </div>
  );
};

const ManagerDashboard = ({ user }) => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [stats, analytics, orders] = await Promise.all([
        adminService.getDashboardStats(),
        adminService.getAnalytics(),
        adminService.getOrders(),
      ]);
      setDashboard({ stats, analytics, orders });
    } catch (requestError) {
      setError(requestError.response?.data?.detail || requestError.message || 'Could not load the store dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const pendingOrders = useMemo(
    () => dashboard?.orders.filter((order) => ['Pending', 'Confirmed', 'Processing'].includes(order.status)) || [],
    [dashboard]
  );
  const orderCounts = useMemo(() => {
    const counts = { Pending: 0, Confirmed: 0, Processing: 0, Shipped: 0, Delivered: 0, Cancelled: 0, Returned: 0 };
    (dashboard?.orders || []).forEach((order) => {
      if (Object.prototype.hasOwnProperty.call(counts, order.status)) counts[order.status] += 1;
    });
    return counts;
  }, [dashboard]);
  const statusTotal = Object.values(orderCounts).reduce((sum, value) => sum + value, 0);
  const statusGradient = useMemo(() => {
    const colors = {
      Pending: '#f59e0b',
      Confirmed: '#3b82f6',
      Processing: '#0ea5e9',
      Shipped: '#10b981',
      Delivered: '#8b5cf6',
      Cancelled: '#f43f5e',
      Returned: '#64748b',
    };
    let offset = 0;
    const segments = Object.entries(orderCounts).map(([status, count]) => {
      const start = offset;
      offset += statusTotal ? (count / statusTotal) * 100 : 0;
      return `${colors[status]} ${start}% ${offset}%`;
    });
    return `conic-gradient(${segments.join(', ')})`;
  }, [orderCounts, statusTotal]);
  const lowStock = dashboard?.stats.low_stock_products || [];
  const topProducts = dashboard?.analytics.top_products || [];
  const recentOrders = dashboard?.orders.slice(0, 5) || [];

  const stats = [
    { label: 'Total Products', value: dashboard?.stats.total_products, icon: <IoCubeOutline />, tone: 'blue' },
    { label: 'Total Stock', value: Number(dashboard?.stats.total_stock || 0).toLocaleString(), icon: <IoBagHandleOutline />, tone: 'green' },
    { label: 'Pending Orders', value: pendingOrders.length, icon: <IoReceiptOutline />, tone: 'orange' },
    { label: 'Total Sales', value: money(dashboard?.stats.total_revenue), icon: <IoTrendingUpOutline />, tone: 'purple' },
    { label: 'Customers', value: dashboard?.stats.total_customers, icon: <IoPeopleOutline />, tone: 'teal' },
  ];

  return (
    <div className="manager-dashboard-page">
      <section className="manager-welcome-banner">
        <div>
          <p className="manager-dashboard-eyebrow">STORE OVERVIEW</p>
          <h1>Welcome back, {user?.full_name || user?.username || 'Store Manager'}!</h1>
          <p>Here’s what’s happening in your store today.</p>
          <span className="manager-dashboard-date">{new Date().toLocaleDateString(undefined, {
            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
          })}</span>
        </div>
        <div className="manager-welcome-art" aria-hidden="true">
          <span className="manager-storefront">🏬</span>
          <span className="manager-store-cart">🛒</span>
          <strong>Good products.<br />Happy customers.<br />Higher sales.</strong>
        </div>
      </section>

      {loading && <p className="manager-dashboard-feedback" role="status">Loading store information…</p>}
      {error && (
        <div className="manager-dashboard-error" role="alert">
          <span>Store dashboard could not be loaded: {error}</span>
          <button type="button" onClick={load}>Retry</button>
        </div>
      )}

      <section className="manager-kpi-grid" aria-label="Store summary">
        {stats.map((stat) => (
          <article className={`manager-kpi-card tone-${stat.tone}`} key={stat.label}>
            <span className="manager-kpi-icon">{stat.icon}</span>
            <div>
              <span className="manager-kpi-label">{stat.label}</span>
              <strong>{loading ? '—' : stat.value ?? '—'}</strong>
              <small>{stat.label === 'Pending Orders' ? 'Needs attention' : 'Store performance'}</small>
            </div>
          </article>
        ))}
      </section>

      {dashboard && (
        <>
          <section className="manager-overview-grid">
            <article className="manager-panel manager-sales-panel">
              <div className="manager-panel-heading">
                <h2><IoBarChartOutline aria-hidden="true" /> Sales Overview</h2>
                <Link to="/admin/analytics">View analytics <span aria-hidden="true">→</span></Link>
              </div>
              <SalesChart sales={dashboard.analytics.sales_by_month || []} />
              <p className="manager-chart-footnote">Monthly paid sales · Total {money(dashboard.analytics.total_revenue)}</p>
            </article>

            <article className="manager-panel manager-order-status-panel">
              <div className="manager-panel-heading">
                <h2><IoReceiptOutline aria-hidden="true" /> Order Status</h2>
                <Link to="/admin/orders">View orders <span aria-hidden="true">→</span></Link>
              </div>
              <div className="manager-order-status-content">
                <div className="manager-order-donut" style={{ background: statusGradient }}>
                  <div><strong>{statusTotal}</strong><span>Total Orders</span></div>
                </div>
                <ul>
                  {Object.entries(orderCounts).map(([status, count]) => (
                    <li key={status}>
                      <span className={`manager-status-dot status-dot-${normalizeStatus(status)}`} />
                      <span>{status}</span>
                      <strong>{count}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            </article>

            <article className="manager-panel manager-top-products-panel">
              <div className="manager-panel-heading">
                <h2><IoBagHandleOutline aria-hidden="true" /> Top Selling Products</h2>
                <Link to="/admin/products">View all <span aria-hidden="true">→</span></Link>
              </div>
              {topProducts.length ? topProducts.slice(0, 5).map((product) => (
                <div className="manager-top-product" key={product.id}>
                  <span>{product.name}</span>
                  <div><i style={{ width: `${Math.max(12, (product.units_sold / Math.max(topProducts[0].units_sold, 1)) * 100)}%` }} /></div>
                  <strong>{money(product.revenue)}</strong>
                </div>
              )) : <p className="manager-empty-note">No paid product sales yet.</p>}
            </article>
          </section>

          <section className="manager-bottom-grid">
            <article className="manager-panel manager-recent-orders">
              <div className="manager-panel-heading">
                <h2><IoReceiptOutline aria-hidden="true" /> Recent Orders</h2>
                <Link to="/admin/orders">View all <span aria-hidden="true">→</span></Link>
              </div>
              {recentOrders.length ? (
                <div className="manager-table-scroll">
                  <table>
                    <thead>
                      <tr><th>Order ID</th><th>Customer</th><th>Total Amount</th><th>Status</th><th>Date</th><th>Action</th></tr>
                    </thead>
                    <tbody>
                      {recentOrders.map((order) => (
                        <tr key={order.id}>
                          <td>#{order.id}</td>
                          <td>{order.customer_name || `Customer #${order.user_id}`}</td>
                          <td>{money(order.total_amount)}</td>
                          <td><span className={`manager-order-badge status-${normalizeStatus(order.status)}`}>{order.status}</span></td>
                          <td>{dateLabel(order.created_at)}</td>
                          <td><Link to="/admin/orders">View</Link></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="manager-empty-note">No orders have been placed yet.</p>}
            </article>

            <article className="manager-panel manager-low-stock-panel">
              <div className="manager-panel-heading">
                <h2><IoAlertCircleOutline aria-hidden="true" /> Low Stock Products</h2>
                <Link to="/admin/inventory">View all <span aria-hidden="true">→</span></Link>
              </div>
              {lowStock.length ? lowStock.slice(0, 6).map((product) => (
                <Link to={`/admin/products/edit/${product.id}`} className="manager-low-stock-row" key={product.id}>
                  <span className="manager-low-stock-thumbnail"><IoCubeOutline aria-hidden="true" /></span>
                  <strong>{product.name}</strong>
                  <span>{product.stock}</span>
                  <small>{Number(product.stock) <= 5 ? 'Low stock' : 'Reorder soon'}</small>
                </Link>
              )) : <p className="manager-empty-note">All products have healthy stock levels.</p>}
            </article>

            <article className="manager-panel manager-quick-actions">
              <div className="manager-panel-heading">
                <h2><IoTrendingUpOutline aria-hidden="true" /> Quick Actions</h2>
              </div>
              <div className="manager-quick-action-grid">
                <Link to="/admin/products/add" className="action-blue"><IoCubeOutline />Add Product</Link>
                <Link to="/admin/orders" className="action-green"><IoReceiptOutline />Manage Orders</Link>
                <Link to="/admin/inventory" className="action-orange"><IoBagHandleOutline />Update Inventory</Link>
                <Link to="/admin/reports" className="action-purple"><IoBarChartOutline />View Reports</Link>
                <Link to="/admin/categories" className="action-teal"><IoPricetagsOutline />Manage Categories</Link>
                <Link to="/admin/analytics" className="action-pink"><IoBarChartOutline />Sales Analytics</Link>
              </div>
            </article>
          </section>
        </>
      )}
    </div>
  );
};

export default ManagerDashboard;
