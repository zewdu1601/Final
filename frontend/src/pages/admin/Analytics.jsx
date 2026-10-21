import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminService from '../../services/adminService';
import './Admin.css';

const Analytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateInput, setDateInput] = useState({ start_date: '', end_date: '' });
  const [filters, setFilters] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await adminService.getAnalytics(filters));
    } catch (error) {
      toast.error(error.response?.data?.detail || error.message || 'Could not load analytics');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const applyFilters = (event) => {
    event.preventDefault();
    setFilters(Object.fromEntries(Object.entries(dateInput).filter(([, value]) => value)));
  };

  const exportReport = () => {
    const rows = [
      ['Report', 'Store analytics'],
      ['Start date', data.start_date || 'Last 6 months'],
      ['End date', data.end_date || 'Today'],
      ['Paid revenue', Number(data.total_revenue).toFixed(2)],
      ['Average order value', Number(data.average_order_value).toFixed(2)],
      ['Orders', data.total_orders],
      [],
      ['Sales by month'],
      ['Month', 'Paid sales'],
      ...salesByMonth.map((item) => [item.month, Number(item.value).toFixed(2)]),
      [],
      ['Top products'],
      ['Product', 'Units sold', 'Revenue'],
      ...topProducts.map((product) => [product.name, product.units_sold, Number(product.revenue).toFixed(2)]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const objectUrl = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = 'ai-store-report.csv';
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  };

  if (loading) return <div className="admin-page"><p className="loading-text">Loading analytics...</p></div>;
  if (!data) return <div className="admin-page"><p className="empty-text">Analytics could not be loaded. Check the notification for details.</p></div>;

  const topProducts = data.top_products || [];
  const salesByMonth = data.sales_by_month || [];
  const maxSales = Math.max(...salesByMonth.map((s) => s.value), 1);

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Analytics</h1>
        <p>Insights into your store's performance</p>
      </div>
      <div className="admin-report-toolbar">
        <Link to="/admin" className="btn btn-outline">Back to dashboard</Link>
        <form className="admin-report-filters" onSubmit={applyFilters}>
          <label>From<input type="date" value={dateInput.start_date} max={dateInput.end_date || undefined} onChange={(event) => setDateInput({ ...dateInput, start_date: event.target.value })} /></label>
          <label>To<input type="date" value={dateInput.end_date} min={dateInput.start_date || undefined} onChange={(event) => setDateInput({ ...dateInput, end_date: event.target.value })} /></label>
          <button className="btn btn-primary" type="submit">Apply dates</button>
          <button className="btn btn-outline" type="button" onClick={() => { setDateInput({ start_date: '', end_date: '' }); setFilters({}); }}>Clear</button>
          <button className="btn btn-outline" type="button" onClick={exportReport}>Export CSV</button>
        </form>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid">
        <div className="stat-card" style={{ borderTopColor: '#4f46e5' }}>
          <div className="stat-icon" style={{ background: '#4f46e520', color: '#4f46e5' }}>📈</div>
          <div>
            <p className="stat-label">Total Revenue</p>
            <h3 className="stat-value">${Number(data.total_revenue).toFixed(2)}</h3>
            <p className="admin-kpi-footnote">Completed and paid orders</p>
          </div>
        </div>

        <div className="stat-card" style={{ borderTopColor: '#10b981' }}>
          <div className="stat-icon" style={{ background: '#10b98120', color: '#10b981' }}>🛒</div>
          <div>
            <p className="stat-label">Avg Order Value</p>
            <h3 className="stat-value">${Number(data.average_order_value).toFixed(2)}</h3>
          </div>
        </div>

        <div className="stat-card" style={{ borderTopColor: '#9333ea' }}>
          <div className="stat-icon" style={{ background: '#9333ea20', color: '#9333ea' }}>👥</div>
          <div>
            <p className="stat-label">Total Orders</p>
            <h3 className="stat-value">{data.total_orders}</h3>
          </div>
        </div>
      </div>

      {/* Sales Chart */}
      <div className="admin-section">
        <h2>Sales Overview</h2>
        <div className="bar-chart">
          {salesByMonth.map((s) => (
            <div key={s.month} className="bar-wrapper">
              <div
                className="bar"
                style={{ height: `${(s.value / maxSales) * 100}%` }}
                title={`$${s.value}`}
              />
              <span className="bar-label">{s.month}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Products */}
      <div className="admin-section">
        <h2>Top Selling Products</h2>
        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Product</th>
                <th>Units Sold</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((p, i) => (
                <tr key={p.id}>
                  <td>{i + 1}</td>
                  <td>{p.name}</td>
                  <td>{p.units_sold}</td>
                  <td className="price-cell">${Number(p.revenue).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Analytics;