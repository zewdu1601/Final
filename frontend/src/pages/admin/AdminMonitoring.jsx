import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import adminService from '../../services/adminService';
import { getApiErrorMessage } from '../../services/api';
import './Admin.css';

const eventLabel = (eventType) => ({
  similar: 'Similar products',
  personalized: 'Personalized recommendations',
  trending: 'Trending products',
}[eventType] || eventType);

const AdminMonitoring = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await adminService.getRecommendationMonitoring());
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="admin-page"><p className="loading-text">Loading recommendation activity...</p></div>;
  if (!data) {
    return (
      <div className="admin-page">
        <div className="admin-error-state" role="alert">
          Recommendation activity could not be loaded.
          <button type="button" className="btn btn-outline" onClick={load}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header with-action">
        <div>
          <h1>AI Recommendation Monitoring</h1>
          <p>Live request activity and the status of the catalog recommendation model.</p>
        </div>
        <button type="button" className="btn btn-outline" onClick={load}>Refresh</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card" style={{ borderTopColor: data.service_status === 'ready' ? '#10b981' : '#f59e0b' }}>
          <div className="stat-icon" style={{ background: '#10b98120', color: '#10b981' }}>🤖</div>
          <div><p className="stat-label">Recommendation service</p><h3 className="stat-value">{data.service_status === 'ready' ? 'Ready' : 'Not ready'}</h3></div>
        </div>
        <div className="stat-card" style={{ borderTopColor: '#4f46e5' }}>
          <div className="stat-icon" style={{ background: '#4f46e520', color: '#4f46e5' }}>✨</div>
          <div><p className="stat-label">Recorded requests</p><h3 className="stat-value">{data.total_requests}</h3></div>
        </div>
        <div className="stat-card" style={{ borderTopColor: '#ec4899' }}>
          <div className="stat-icon" style={{ background: '#ec489920', color: '#ec4899' }}>🗓️</div>
          <div><p className="stat-label">Requests · last 7 days</p><h3 className="stat-value">{data.requests_last_7_days}</h3></div>
        </div>
        <div className="stat-card" style={{ borderTopColor: '#9333ea' }}>
          <div className="stat-icon" style={{ background: '#9333ea20', color: '#9333ea' }}>🛍️</div>
          <div><p className="stat-label">Indexed products</p><h3 className="stat-value">{data.indexed_products}</h3></div>
        </div>
      </div>

      <section className="admin-section">
        <h2>Activity by recommendation type</h2>
        {data.events_by_type.length ? (
          <div className="admin-event-grid">
            {data.events_by_type.map((event) => (
              <div className="admin-event-card" key={event.event_type}>
                <span>{eventLabel(event.event_type)}</span><strong>{event.count}</strong>
              </div>
            ))}
          </div>
        ) : <p className="empty-text">No recommendation requests have been recorded yet.</p>}
      </section>

      <section className="admin-section">
        <h2>Most requested base products</h2>
        <p className="admin-muted">Counts reflect product IDs submitted for similar-product recommendations, not products returned to customers.</p>
        {data.most_requested_base_products.length ? (
          <div className="table-wrapper">
            <table className="admin-table">
              <thead><tr><th>Product</th><th>Similar-product requests</th></tr></thead>
              <tbody>{data.most_requested_base_products.map((product) => (
                <tr key={product.id}><td>{product.name}</td><td>{product.request_count}</td></tr>
              ))}</tbody>
            </table>
          </div>
        ) : <p className="empty-text">No product-specific recommendation requests have been recorded.</p>}
      </section>

      <section className="admin-section">
        <h2>Recent recommendation activity</h2>
        {data.recent_events.length ? (
          <div className="table-wrapper">
            <table className="admin-table">
              <thead><tr><th>Type</th><th>Base product</th><th>Recorded</th></tr></thead>
              <tbody>{data.recent_events.map((event, index) => (
                <tr key={`${event.event_type}-${event.product_id || 'none'}-${event.created_at}-${index}`}>
                  <td>{eventLabel(event.event_type)}</td>
                  <td>{event.product_name || 'Not product-specific'}</td>
                  <td>{event.created_at ? new Date(event.created_at).toLocaleString() : 'Unknown'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <p className="empty-text">No activity has been recorded yet.</p>}
        {!data.error_tracking_available && (
          <p className="admin-muted">Recommendation errors are not currently persisted by the service, so an error history is unavailable.</p>
        )}
      </section>
    </div>
  );
};

export default AdminMonitoring;
