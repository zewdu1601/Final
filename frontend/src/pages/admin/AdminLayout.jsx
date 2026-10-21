import React from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  IoBarChartOutline,
  IoBagHandleOutline,
  IoChatbubblesOutline,
  IoBulbOutline,
  IoCubeOutline,
  IoDocumentTextOutline,
  IoGridOutline,
  IoLayersOutline,
  IoLogOutOutline,
  IoNotificationsOutline,
  IoPeopleOutline,
  IoPersonOutline,
  IoPricetagsOutline,
  IoSettingsOutline,
  IoShieldCheckmarkOutline,
} from 'react-icons/io5';
import { getAdminMediaUrl } from '../../services/adminService';
import useChatNotifications from '../../hooks/useChatNotifications';
import useOrderNotifications from '../../hooks/useOrderNotifications';
import ChatNotificationBadge from '../../components/navigation/ChatNotificationBadge';
import OrderNotificationBadge from '../../components/navigation/OrderNotificationBadge';
import './Admin.css';

const AdminLayout = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const isManager = user?.role === 'manager';
  const { unreadCount, error: chatNotificationError } = useChatNotifications();
  const { unreadCount: unreadOrderCount, error: orderNotificationError } = useOrderNotifications();

  const logout = async () => {
    await onLogout();
    navigate(isManager ? '/login' : '/admin/login', { replace: true });
  };

  return (
    <div className={`admin-shell${isManager ? ' manager-shell' : ''}`}>
      <aside className="admin-sidebar">
        <div className="admin-sidebar-heading">
          <span>AI Store</span>
          <strong>Intelligent Management</strong>
        </div>
        <nav aria-label={isManager ? 'Store management navigation' : 'Admin navigation'}>
          <NavLink to="/admin" end><IoGridOutline aria-hidden="true" /><span>Dashboard</span></NavLink>
          {isManager ? (
            <>
              <NavLink to="/admin/products"><IoCubeOutline aria-hidden="true" /><span>Products</span></NavLink>
              <NavLink to="/admin/categories"><IoPricetagsOutline aria-hidden="true" /><span>Categories</span></NavLink>
              <NavLink to="/admin/inventory"><IoLayersOutline aria-hidden="true" /><span>Inventory / Stock</span></NavLink>
              <NavLink to="/admin/orders"><IoBagHandleOutline aria-hidden="true" /><span>Orders & Customers</span></NavLink>
              <NavLink to="/admin/notifications"><IoNotificationsOutline aria-hidden="true" /><span>Order Notifications</span><OrderNotificationBadge unreadCount={unreadOrderCount} error={orderNotificationError} /></NavLink>
              <NavLink to="/chat"><IoChatbubblesOutline aria-hidden="true" /><span>Staff & Customer Chat</span><ChatNotificationBadge unreadCount={unreadCount} error={chatNotificationError} /></NavLink>
              <NavLink to="/admin/analytics"><IoBarChartOutline aria-hidden="true" /><span>Sales Analytics</span></NavLink>
              <NavLink to="/admin/reports"><IoDocumentTextOutline aria-hidden="true" /><span>Reports</span></NavLink>
              <NavLink to="/profile"><IoPersonOutline aria-hidden="true" /><span>My Profile</span></NavLink>
            </>
          ) : (
            <>
              <NavLink to="/admin/users"><IoPeopleOutline aria-hidden="true" /><span>2. User Management</span></NavLink>
              <NavLink to="/admin/functions"><IoShieldCheckmarkOutline aria-hidden="true" /><span>3. Admin Functions</span></NavLink>
              <NavLink to="/admin/profile"><IoPersonOutline aria-hidden="true" /><span>4. Admin Profile</span></NavLink>
              <NavLink to="/admin/products"><IoCubeOutline aria-hidden="true" /><span>5. Products</span></NavLink>
              <NavLink to="/admin/categories"><IoPricetagsOutline aria-hidden="true" /><span>6. Categories</span></NavLink>
              <NavLink to="/admin/inventory"><IoLayersOutline aria-hidden="true" /><span>7. Inventory / Stock</span></NavLink>
              <NavLink to="/admin/orders"><IoBagHandleOutline aria-hidden="true" /><span>8. Orders</span></NavLink>
              <NavLink to="/admin/notifications"><IoNotificationsOutline aria-hidden="true" /><span>Order Notifications</span><OrderNotificationBadge unreadCount={unreadOrderCount} error={orderNotificationError} /></NavLink>
              <NavLink to="/chat"><IoChatbubblesOutline aria-hidden="true" /><span>Chat</span><ChatNotificationBadge unreadCount={unreadCount} error={chatNotificationError} /></NavLink>
              <NavLink to="/admin/analytics"><IoBarChartOutline aria-hidden="true" /><span>9. Analytics</span></NavLink>
              <NavLink to="/admin/ai-monitoring"><IoBulbOutline aria-hidden="true" /><span>10. AI Monitoring</span></NavLink>
              <NavLink to="/admin/reports"><IoDocumentTextOutline aria-hidden="true" /><span>11. Reports</span></NavLink>
              <NavLink to="/admin/settings"><IoSettingsOutline aria-hidden="true" /><span>12. Settings</span></NavLink>
            </>
          )}
          <button type="button" className="admin-sidebar-logout" onClick={logout}>
            <IoLogOutOutline aria-hidden="true" />
            <span>Logout</span>
          </button>
        </nav>
      </aside>
      <main className="admin-main">
        <div className="admin-topbar">
          <Link to={isManager ? '/profile' : '/admin/profile'} className="admin-topbar-profile">
            {user?.photo_url ? (
              <img src={getAdminMediaUrl(user.photo_url)} alt="" className="admin-topbar-avatar" />
            ) : (
              <span className="admin-topbar-avatar admin-avatar-fallback">{(user?.full_name || user?.username || 'A').charAt(0).toUpperCase()}</span>
            )}
            <span>{user?.full_name || user?.username || 'Administrator'}</span>
          </Link>
        </div>
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
