import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import adminService from '../../services/adminService';
import { getPaymentMethodLabel } from '../../constants/paymentMethods';
import './Admin.css';

const ORDER_TRANSITIONS = {
  Pending: ['Confirmed', 'Cancelled'],
  Confirmed: ['Processing', 'Cancelled'],
  Processing: ['Shipped', 'Cancelled'],
  Shipped: ['Delivered'],
  Delivered: ['Returned'],
  Cancelled: [],
  Returned: [],
};

const ManageOrders = () => {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await adminService.getOrders();
      setOrders(data);
    } catch (error) {
      toast.error(error.response?.data?.detail || error.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleStatusChange = async (order, status) => {
    try {
      const updated = await adminService.updateOrder(order.id, { status });
      setOrders((current) => current.map((item) => (item.id === order.id ? updated : item)));
      toast.success('Status updated');
    } catch (error) {
      toast.error(error.response?.data?.detail || error.message || 'Update failed');
    }
  };

  const filtered = filter === 'all' ? orders : orders.filter((o) => o.status.toLowerCase() === filter);
  const statuses = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned'];

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Manage Orders</h1>
        <p>{orders.length} total orders</p>
      </div>

      <div className="filter-tabs">
        {['all', ...statuses.map((status) => status.toLowerCase())].map((s) => (
          <button
            key={s}
            className={`tab ${filter === s ? 'active' : ''}`}
            onClick={() => setFilter(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="loading-text">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="empty-text">No orders found.</p>
      ) : (
        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Total</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Change Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id}>
                  <td><strong>#{o.id}</strong></td>
                  <td>
                    <strong>{o.customer_name || `Customer #${o.user_id}`}</strong>
                    <br /><small>{o.customer_email}</small>
                  </td>
                  <td>{o.created_at ? new Date(o.created_at).toLocaleDateString() : 'N/A'}</td>
                  <td className="price-cell">${Number(o.total_amount).toFixed(2)}</td>
                  <td>
                    <span className={`status-badge status-${o.status?.toLowerCase()}`}>
                      {o.status}
                    </span>
                  </td>
                  <td>
                    {getPaymentMethodLabel(o.payment_method)}<br />
                    <select
                      aria-label={`Payment status for order ${o.id}`}
                      className="status-select"
                      value={o.payment_status}
                      onChange={async (event) => {
                        try {
                          const updated = await adminService.updateOrder(o.id, { payment_status: event.target.value });
                          setOrders((current) => current.map((item) => item.id === o.id ? updated : item));
                          toast.success('Payment status updated');
                        } catch (error) {
                          toast.error(error.response?.data?.detail || error.message || 'Payment status update failed');
                        }
                      }}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Paid">Paid</option>
                      <option value="Failed">Failed</option>
                      <option value="Refunded">Refunded</option>
                    </select>
                  </td>
                  <td>
                    <select
                      value={o.status}
                      disabled={!(ORDER_TRANSITIONS[o.status] || []).length}
                      onChange={(e) => handleStatusChange(o, e.target.value)}
                      className="status-select"
                    >
                      <option value={o.status}>{o.status}</option>
                      {(ORDER_TRANSITIONS[o.status] || []).map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ManageOrders;