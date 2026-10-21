import React, { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { IoChatbubbleEllipsesOutline, IoNotificationsOutline } from 'react-icons/io5';
import useChatNotifications from '../../hooks/useChatNotifications';
import useOrderNotifications from '../../hooks/useOrderNotifications';
import ChatNotificationBadge from './ChatNotificationBadge';
import OrderNotificationBadge from './OrderNotificationBadge';
import './Navbar.css';

const Navbar = ({ isDarkMode, toggleTheme, cartCount = 0, user, onLogout }) => {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  const isManager = user?.role === 'manager';
  const isCustomer = user && !user.is_admin && user.role !== 'admin' && !isManager;
  const { unreadCount, error: chatNotificationError } = useChatNotifications(Boolean(user));
  const { unreadCount: unreadOrderCount, error: orderNotificationError } = useOrderNotifications(Boolean(user));
  if (location.pathname === '/chat') return null;
  if (isManager && location.pathname.startsWith('/admin')) return null;
  if (isCustomer && (location.pathname === '/' || location.pathname === '/dashboard')) return null;

  return (
    <header className={`navbar${menuOpen ? ' navbar-menu-open' : ''}`}>
      <div className="navbar-inner">
        <Link to="/" className="nav-brand" onClick={closeMenu} aria-label="AI Store home">
          <span className="nav-brand-mark" aria-hidden="true">🛒</span>
          <span className="nav-brand-copy">
            <strong>AI Store</strong>
            <small>Intelligent commerce</small>
          </span>
        </Link>

        <button
          type="button"
          className="nav-menu-toggle"
          onClick={() => setMenuOpen((isOpen) => !isOpen)}
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className="nav-links" id="primary-navigation" aria-label="Main navigation">
          <NavLink to="/" end onClick={closeMenu}>Home</NavLink>
          <NavLink to="/products" onClick={closeMenu}>Products</NavLink>
          <NavLink to="/recommendations" onClick={closeMenu}>Recommendations</NavLink>

          <span className="nav-divider" aria-hidden="true" />

          <Link
            to={user ? '/chat' : '/contact'}
            className="nav-icon-link"
            title={user ? 'Messages' : 'Contact support'}
            aria-label={user ? 'Messages' : 'Contact support'}
            onClick={closeMenu}
          >
            <IoChatbubbleEllipsesOutline aria-hidden="true" />
            {user && <ChatNotificationBadge unreadCount={unreadCount} error={chatNotificationError} />}
          </Link>

          {user && (
            <Link
              to="/notifications"
              className="nav-icon-link"
              title="Order notifications"
              aria-label="Order notifications"
              onClick={closeMenu}
            >
              <IoNotificationsOutline aria-hidden="true" />
              <OrderNotificationBadge unreadCount={unreadOrderCount} error={orderNotificationError} />
            </Link>
          )}

          <Link
            to="/cart"
            className="nav-icon-link"
            title="Cart"
            aria-label={`Shopping cart${cartCount ? `, ${cartCount} items` : ''}`}
            onClick={closeMenu}
          >
            🛒
            {cartCount > 0 && <span className="cart-count-badge">{cartCount > 99 ? '99+' : cartCount}</span>}
          </Link>

          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            title="Toggle Dark Mode"
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>

          {user ? (
            <>
              {(user.is_admin || user.role === 'admin' || isManager) && <NavLink to="/admin" onClick={closeMenu}>{isManager ? 'Store Management' : 'Admin'}</NavLink>}
              <NavLink to="/orders" onClick={closeMenu}>My Orders</NavLink>
              {isCustomer && <NavLink to="/reviews" onClick={closeMenu}>Reviews</NavLink>}
              {!user.is_admin && user.role !== 'admin' && <NavLink to="/profile" onClick={closeMenu}>My Profile</NavLink>}
              <button type="button" className="btn-login nav-logout" onClick={() => { closeMenu(); onLogout(); }}>
                Logout <span aria-hidden="true">→</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/register" className="btn-login" onClick={closeMenu}>Register</Link>
              <Link to="/login" className="btn-login" onClick={closeMenu}>Login <span aria-hidden="true">→</span></Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;