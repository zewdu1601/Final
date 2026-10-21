import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import adminService from '../../services/adminService';
import { getApiErrorMessage } from '../../services/api';
import './Admin.css';

const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const AdminReports = ({ user }) => {
  const isAdmin = user?.is_admin || user?.role === 'admin';
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      setReport(await adminService.getReports(params));
    } catch (error) {
      setReport(null);
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [endDate, startDate]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const exportCsv = () => {
    if (!report) return;
    const rows = [
      ['Section', 'Metric', 'Value'],
      ['Period', 'Start date', report.start_date || 'All time'],
      ['Period', 'End date', report.end_date || 'All time'],
      ['Sales', 'Paid revenue', report.sales.paid_revenue],
      ['Sales', 'Paid orders', report.sales.paid_orders],
      ['Orders', 'All orders', report.sales.orders],
      ['Inventory', 'Total products', report.total_products],
      ...report.orders_by_status.map((item) => ['Orders by status', item.status, item.count]),
      ...report.users_by_role.map((item) => ['Users by role', item.role, item.count]),
      ...report.recommendation_events.map((item) => ['Recommendation events', item.event_type, item.count]),
      ...report.top_products.map((item) => ['Top product units sold', item.name, item.units_sold]),
      ...report.top_products.map((item) => ['Top product revenue', item.name, item.revenue]),
      ...report.low_stock_products.map((item) => ['Low stock', item.name, item.stock]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `ai-store-report-${startDate || 'all'}-${endDate || 'all'}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Store Reports</h1>
        <p>{isAdmin
          ? 'Sales, order, user, product, inventory, and recommendation activity from the database.'
          : 'Sales, order, product, and inventory activity from the database.'}</p>
      </div>

      <div className="admin-report-toolbar">
        <form className="admin-report-filters" onSubmit={(event) => { event.preventDefault(); loadReport(); }}>
          <label>From<input type="date" value={startDate} max={endDate || undefined} onChange={(event) => setStartDate(event.target.value)} /></label>
          <label>To<input type="date" value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} /></label>
          <button className="btn btn-outline" type="submit" disabled={loading}>Apply dates</button>
        </form>
        <button type="button" className="btn btn-primary" onClick={exportCsv} disabled={!report || loading}>Export CSV</button>
      </div>

      {loading ? <p className="loading-text">Loading reports...</p> : !report ? (
        <p className="empty-text">Report data could not be loaded. Check the notification for details.</p>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card" style={{ borderTopColor: '#10b981' }}><div className="stat-icon" style={{ background: '#10b98120', color: '#10b981' }}>💰</div><div><p className="stat-label">Paid sales</p><h3 className="stat-value">${Number(report.sales.paid_revenue).toFixed(2)}</h3></div></div>
            <div className="stat-card" style={{ borderTopColor: '#4f46e5' }}><div className="stat-icon" style={{ background: '#4f46e520', color: '#4f46e5' }}>📦</div><div><p className="stat-label">Orders</p><h3 className="stat-value">{report.sales.orders}</h3><p className="admin-kpi-footnote">{report.sales.paid_orders} paid, non-cancelled</p></div></div>
            <div className="stat-card" style={{ borderTopColor: '#9333ea' }}><div className="stat-icon" style={{ background: '#9333ea20', color: '#9333ea' }}>🛍️</div><div><p className="stat-label">Products</p><h3 className="stat-value">{report.total_products}</h3></div></div>
            {isAdmin && <div className="stat-card" style={{ borderTopColor: '#ec4899' }}><div className="stat-icon" style={{ background: '#ec489920', color: '#ec4899' }}>✨</div><div><p className="stat-label">Recommendation events</p><h3 className="stat-value">{report.recommendation_events.reduce((total, event) => total + event.count, 0)}</h3></div></div>}
          </div>

          <section className="admin-section">
            <h2>Orders by status</h2>
            {report.orders_by_status.length ? <div className="admin-event-grid">{report.orders_by_status.map((item) => <div className="admin-event-card" key={item.status}><span>{item.status}</span><strong>{item.count}</strong></div>)}</div> : <p className="empty-text">No orders in this period.</p>}
          </section>

          {isAdmin && (
            <section className="admin-section">
              <h2>User registrations by role</h2>
              {report.users_by_role.length ? <div className="admin-event-grid">{report.users_by_role.map((item) => <div className="admin-event-card" key={item.role}><span>{item.role === 'manager' ? 'Store Manager' : item.role}</span><strong>{item.count}</strong></div>)}</div> : <p className="empty-text">No users registered in this period.</p>}
            </section>
          )}

          <section className="admin-section">
            <h2>Top products by units sold</h2>
            {report.top_products.length ? (
              <div className="table-wrapper"><table className="admin-table">
                <thead><tr><th>Product</th><th>Units sold</th><th>Revenue</th></tr></thead>
                <tbody>{report.top_products.map((product) => <tr key={product.id}><td>{product.name}</td><td>{product.units_sold}</td><td>${Number(product.revenue).toFixed(2)}</td></tr>)}</tbody>
              </table></div>
            ) : <p className="empty-text">No paid product sales in this period.</p>}
          </section>

          <section className="admin-section">
            <h2>Low-stock inventory</h2>
            {report.low_stock_products.length ? (
              <div className="table-wrapper"><table className="admin-table">
                <thead><tr><th>Product</th><th>Units remaining</th></tr></thead>
                <tbody>{report.low_stock_products.map((product) => <tr key={product.id}><td>{product.name}</td><td>{product.stock}</td></tr>)}</tbody>
              </table></div>
            ) : <p className="empty-text">No products currently meet the low-stock threshold.</p>}
          </section>

          {isAdmin && (
            <section className="admin-section">
              <h2>Recommendation events</h2>
              {report.recommendation_events.length ? <div className="admin-event-grid">{report.recommendation_events.map((item) => <div className="admin-event-card" key={item.event_type}><span>{item.event_type}</span><strong>{item.count}</strong></div>)}</div> : <p className="empty-text">No recommendation activity in this period.</p>}
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default AdminReports;
