import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  IoBagHandleOutline,
  IoCubeOutline,
  IoEyeOutline,
  IoGiftOutline,
  IoHomeOutline,
  IoLogOutOutline,
  IoMailOutline,
  IoLocationOutline,
  IoNotificationsOutline,
  IoPersonOutline,
  IoCallOutline,
  IoSearchOutline,
  IoStarOutline,
  IoSparklesOutline,
  IoShieldCheckmarkOutline,
  IoTimeOutline,
  IoCartOutline,
  IoChatbubblesOutline,
} from 'react-icons/io5';
import { getApiErrorMessage } from '../../services/api';
import { getOrders } from '../../services/orderService';
import { getPersonalizedRecommendations } from '../../services/recommendationService';
import { getProductReviews } from '../../services/reviewService';
import useChatNotifications from '../../hooks/useChatNotifications';
import useOrderNotifications from '../../hooks/useOrderNotifications';
import ChatNotificationBadge from '../../components/navigation/ChatNotificationBadge';
import OrderNotificationBadge from '../../components/navigation/OrderNotificationBadge';
import './CustomerDashboard.css';

const formatCurrency = (amount) => `$${Number(amount || 0).toFixed(2)}`;

const orderStatusClass = (status) => (
  String(status || 'Pending').toLowerCase().replace(/\s+/g, '-')
);

const CustomerDashboard = ({ user, products, cart, onAddToCart, onLogout }) => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [reviewCount, setReviewCount] = useState(0);
  const [orderError, setOrderError] = useState('');
  const [recommendationError, setRecommendationError] = useState('');
  const [search, setSearch] = useState('');
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);
  const { unreadCount: unreadChatCount, error: chatNotificationError } = useChatNotifications();
  const { unreadCount: unreadOrderCount, error: orderNotificationError } = useOrderNotifications();

  useEffect(() => {
    let active = true;
    getOrders()
      .then(async (data) => {
        if (!active) return;
        setOrders(data);
        const productIds = [...new Set(data
          .filter((order) => order.status !== 'Cancelled')
          .flatMap((order) => order.items.map((item) => item.product_id)))];
        const allReviews = await Promise.all(productIds.map((productId) => getProductReviews(productId)));
        if (active) {
          setReviewCount(allReviews.reduce(
            (count, reviews) => count + reviews.filter((review) => review.user_id === user.id).length,
            0
          ));
        }
      })
      .catch((error) => {
        if (active) setOrderError(getApiErrorMessage(error));
      })
      .finally(() => {
        if (active) setLoadingOrders(false);
      });

    return () => {
      active = false;
    };
  }, [user.id]);

  useEffect(() => {
    let active = true;
    getPersonalizedRecommendations()
      .then((items) => {
        if (active) setRecommendations(items);
      })
      .catch((error) => {
        if (active) setRecommendationError(getApiErrorMessage(error));
      })
      .finally(() => {
        if (active) setLoadingRecommendations(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const recentOrders = useMemo(
    () => [...orders].sort((first, second) => (
      new Date(second.created_at || 0) - new Date(first.created_at || 0)
    )).slice(0, 5),
    [orders]
  );
  const totalSpent = useMemo(
    () => orders
      .filter((order) => order.status !== 'Cancelled' && order.payment_status === 'Paid')
      .reduce((total, order) => total + Number(order.total_amount || 0), 0),
    [orders]
  );
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const customerName = user.full_name || user.username || 'Customer';

  const searchProducts = (event) => {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `/products?search=${encodeURIComponent(query)}` : '/products');
  };

  const handleLogout = async () => {
    await onLogout();
    navigate('/', { replace: true });
  };

  const productForOrderItem = (item) => products.find(
    (product) => Number(product.id) === Number(item.product_id)
  );

  return (
    <div className="customer-dashboard">
      <header className="customer-dashboard-topbar">
        <Link to="/dashboard" className="customer-dashboard-brand" aria-label="AI Store dashboard">
          <span className="customer-dashboard-brand-icon">🛍</span>
          <span>
            <strong>AI Store</strong>
            <small>Smarter Shopping, Better Life</small>
          </span>
        </Link>

        <form className="customer-dashboard-search" onSubmit={searchProducts} role="search">
          <IoSearchOutline aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search for products..."
            aria-label="Search products"
          />
        </form>

        <div className="customer-dashboard-top-actions">
          <Link to="/notifications" className="customer-dashboard-top-icon" aria-label="Order notifications">
            <IoNotificationsOutline aria-hidden="true" />
            <OrderNotificationBadge unreadCount={unreadOrderCount} error={orderNotificationError} />
          </Link>
          <Link to="/cart" className="customer-dashboard-top-icon" aria-label={`Cart, ${cartCount} items`}>
            <IoCartOutline aria-hidden="true" />
            {cartCount > 0 && <span className="customer-dashboard-count">{cartCount > 99 ? '99+' : cartCount}</span>}
          </Link>
          <Link to="/profile" className="customer-dashboard-user-menu">
            <span className="customer-dashboard-avatar customer-dashboard-avatar-small">
              {customerName.charAt(0).toUpperCase()}
            </span>
            <span><strong>{customerName}</strong><small>Customer</small></span>
          </Link>
          <button type="button" className="customer-dashboard-mobile-logout" onClick={handleLogout} aria-label="Log out">
            <IoLogOutOutline aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="customer-dashboard-layout">
        <aside className="customer-dashboard-sidebar" aria-label="Customer dashboard navigation">
          <nav>
            <NavLink to="/dashboard" className={({ isActive }) => `customer-dashboard-nav-link${isActive ? ' is-active' : ''}`}>
              <IoHomeOutline aria-hidden="true" /><span>Dashboard</span>
            </NavLink>
            <NavLink to="/products" className="customer-dashboard-nav-link">
              <IoBagHandleOutline aria-hidden="true" /><span>Browse Products</span>
            </NavLink>
            <NavLink to="/recommendations" className="customer-dashboard-nav-link">
              <IoSparklesOutline aria-hidden="true" /><span>Recommended Products</span>
            </NavLink>
            <NavLink to="/cart" className="customer-dashboard-nav-link">
              <IoCartOutline aria-hidden="true" /><span>My Cart</span>
              {cartCount > 0 && <span className="customer-dashboard-nav-badge">{cartCount}</span>}
            </NavLink>
            <NavLink to="/orders" className="customer-dashboard-nav-link">
              <IoCubeOutline aria-hidden="true" /><span>My Orders</span>
            </NavLink>
            <NavLink to="/reviews" className="customer-dashboard-nav-link">
              <IoStarOutline aria-hidden="true" /><span>Reviews &amp; Ratings</span>
            </NavLink>
            <NavLink to="/chat" className="customer-dashboard-nav-link">
              <IoChatbubblesOutline aria-hidden="true" /><span>Chat with Support</span>
              <ChatNotificationBadge unreadCount={unreadChatCount} error={chatNotificationError} />
            </NavLink>
            <NavLink to="/profile" className="customer-dashboard-nav-link">
              <IoPersonOutline aria-hidden="true" /><span>My Profile</span>
            </NavLink>
          </nav>
          <button type="button" className="customer-dashboard-nav-link customer-dashboard-logout" onClick={handleLogout}>
            <IoLogOutOutline aria-hidden="true" /><span>Logout</span>
          </button>
        </aside>

        <main className="customer-dashboard-main">
          <div className="customer-dashboard-content">
            <div className="customer-dashboard-primary">
              <section className="customer-dashboard-welcome">
                <div className="customer-dashboard-welcome-copy">
                  <span className="customer-dashboard-eyebrow">YOUR PERSONAL SHOPPING SPACE</span>
                  <h1>Welcome back, {customerName}! <span aria-hidden="true">👋</span></h1>
                  <p>Discover great products, amazing deals, and personalized recommendations just for you.</p>
                  <div className="customer-dashboard-welcome-actions">
                    <Link to="/products" className="customer-dashboard-button customer-dashboard-button-primary">Shop Now</Link>
                    <Link to="/recommendations" className="customer-dashboard-button customer-dashboard-button-secondary">View Recommendations</Link>
                  </div>
                </div>
                <div className="customer-dashboard-illustration" aria-hidden="true">
                  <span className="dashboard-illustration-sparkle sparkle-one">✦</span>
                  <span className="dashboard-illustration-phone"><IoBagHandleOutline /></span>
                  <span className="dashboard-illustration-cart"><IoCartOutline /></span>
                  <span className="dashboard-illustration-robot">✦</span>
                  <span className="dashboard-illustration-leaf leaf-one">✿</span>
                  <span className="dashboard-illustration-leaf leaf-two">✿</span>
                  <span className="dashboard-illustration-bubble">AI recommendations</span>
                </div>
              </section>

              <section className="customer-dashboard-panel customer-dashboard-system-flow" aria-labelledby="customer-system-flow-title">
                <div className="customer-dashboard-section-heading">
                  <h2 id="customer-system-flow-title">1. Collaborative system flow</h2>
                </div>
                <div className="customer-system-flow-roles">
                  <article className="customer-system-flow-role flow-admin">
                    <IoShieldCheckmarkOutline aria-hidden="true" />
                    <h3>1. ADMIN</h3>
                    <p>Manages users, assigns roles, controls access, and monitors system activities.</p>
                  </article>
                  <span className="customer-system-flow-arrow" aria-hidden="true">↕</span>
                  <article className="customer-system-flow-role flow-manager">
                    <IoBagHandleOutline aria-hidden="true" />
                    <h3>2. STORE MANAGER</h3>
                    <p>Manages products, categories, inventory, orders, sales, and stock updates.</p>
                  </article>
                  <span className="customer-system-flow-arrow" aria-hidden="true">↕</span>
                  <article className="customer-system-flow-role flow-customer">
                    <IoCartOutline aria-hidden="true" />
                    <h3>3. USER / CUSTOMER</h3>
                    <p>Browses products, receives AI recommendations, places orders, pays, tracks orders, and reviews products.</p>
                    <Link to="/products">Explore products <span aria-hidden="true">→</span></Link>
                  </article>
                </div>
                <div className="customer-system-flow-database">
                  <IoCubeOutline aria-hidden="true" />
                  <strong>Shared store database</strong>
                  <p>User accounts, products, stock, orders, payments, reviews, and customer activity stay connected across the store.</p>
                </div>
              </section>

              <section className="customer-dashboard-stat-grid" aria-label="Shopping summary">
                <Link to="/orders" className="customer-dashboard-stat stat-mint">
                  <span className="customer-dashboard-stat-icon"><IoBagHandleOutline /></span>
                  <span className="customer-dashboard-stat-label">Total Orders</span>
                  <strong>{loadingOrders ? '—' : orders.length}</strong>
                  <small>View all orders <span aria-hidden="true">→</span></small>
                </Link>
                <Link to="/cart" className="customer-dashboard-stat stat-blue">
                  <span className="customer-dashboard-stat-icon"><IoCartOutline /></span>
                  <span className="customer-dashboard-stat-label">Cart Items</span>
                  <strong>{cartCount}</strong>
                  <small>View your cart <span aria-hidden="true">→</span></small>
                </Link>
                <Link to="/reviews" className="customer-dashboard-stat stat-purple">
                  <span className="customer-dashboard-stat-icon"><IoStarOutline /></span>
                  <span className="customer-dashboard-stat-label">Reviews</span>
                  <strong>{loadingOrders ? '—' : reviewCount}</strong>
                  <small>View reviews <span aria-hidden="true">→</span></small>
                </Link>
                <Link to="/orders" className="customer-dashboard-stat stat-coral">
                  <span className="customer-dashboard-stat-icon"><IoGiftOutline /></span>
                  <span className="customer-dashboard-stat-label">Total Spent</span>
                  <strong>{loadingOrders ? '—' : formatCurrency(totalSpent)}</strong>
                  <small>View order details <span aria-hidden="true">→</span></small>
                </Link>
              </section>

              <section className="customer-dashboard-panel customer-dashboard-recommendations">
                <div className="customer-dashboard-section-heading">
                  <h2><IoSparklesOutline aria-hidden="true" /> Recommended for You</h2>
                  <Link to="/recommendations">View all <span aria-hidden="true">→</span></Link>
                </div>
                {loadingRecommendations && <p className="customer-dashboard-state" role="status">Finding products for you…</p>}
                {!loadingRecommendations && recommendationError && <p className="customer-dashboard-state" role="alert">{recommendationError}</p>}
                {!loadingRecommendations && !recommendationError && recommendations.length === 0 && (
                  <p className="customer-dashboard-state">Recommendations will appear here as products become available.</p>
                )}
                {!loadingRecommendations && !recommendationError && recommendations.length > 0 && (
                  <div className="customer-dashboard-product-grid">
                    {recommendations.slice(0, 4).map((product) => (
                      <article className="customer-dashboard-product-card" key={product.id}>
                        <Link to={`/products/${product.id}`} className="customer-dashboard-product-image">
                          {product.image ? <img src={product.image} alt={product.name} /> : <span>No image</span>}
                        </Link>
                        <div className="customer-dashboard-product-info">
                          <Link to={`/products/${product.id}`} className="customer-dashboard-product-name">{product.name}</Link>
                          <strong>{formatCurrency(product.price)}</strong>
                          <span className="customer-dashboard-product-rating" aria-label={`Rated ${Number(product.rating || 0).toFixed(1)} out of 5`}>
                            <span aria-hidden="true">★★★★★</span> {Number(product.rating || 0).toFixed(1)}
                          </span>
                          <button
                            type="button"
                            className="customer-dashboard-button customer-dashboard-button-primary"
                            onClick={() => onAddToCart(product)}
                            disabled={product.stock !== undefined && Number(product.stock) <= 0}
                          >
                            Add to Cart
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="customer-dashboard-panel customer-dashboard-activity">
                <div className="customer-dashboard-section-heading">
                  <h2><IoTimeOutline aria-hidden="true" /> Your Activity</h2>
                  <Link to="/orders">View all <span aria-hidden="true">→</span></Link>
                </div>
                {orderError && <p className="customer-dashboard-state" role="alert">{orderError}</p>}
                {!loadingOrders && !orderError && recentOrders.length === 0 && (
                  <div className="customer-dashboard-empty-activity">
                    <p>Your shopping activity will appear here after your first order.</p>
                    <Link to="/products">Explore products <span aria-hidden="true">→</span></Link>
                  </div>
                )}
                {recentOrders.map((order) => {
                  const item = order.items[0];
                  const product = item && productForOrderItem(item);
                  return (
                    <Link to={`/orders/${order.id}`} className="customer-dashboard-activity-row" key={order.id}>
                      <span className="customer-dashboard-activity-icon">
                        {order.status === 'Delivered' ? <IoStarOutline /> : <IoEyeOutline />}
                      </span>
                      <span className="customer-dashboard-activity-message">
                        <strong>{order.status === 'Delivered' ? 'Order delivered' : `Order ${order.status || 'placed'}`}</strong>
                        <small>
                          {product ? `${product.name}${order.items.length > 1 ? ` and ${order.items.length - 1} more item(s)` : ''}` : `Order #${order.id}`}
                        </small>
                      </span>
                      <time dateTime={order.created_at || undefined}>
                        {order.created_at ? new Date(order.created_at).toLocaleDateString() : ''}
                      </time>
                    </Link>
                  );
                })}
              </section>
            </div>

            <aside className="customer-dashboard-aside">
              <section className="customer-dashboard-panel customer-dashboard-profile-card">
                <div className="customer-dashboard-profile-heading">
                  <span className="customer-dashboard-avatar">
                    {customerName.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <h2>{customerName}</h2>
                    <p>Customer</p>
                    <Link to="/profile">✎ Edit Profile</Link>
                  </div>
                </div>
                <p><IoMailOutline aria-hidden="true" />{user.email || 'Email not provided'}</p>
                <p><IoCallOutline aria-hidden="true" />{user.contact_phone || 'Phone not provided'}</p>
                <p><IoLocationOutline aria-hidden="true" />{user.address || 'Add a delivery address'}</p>
              </section>

              <section className="customer-dashboard-panel customer-dashboard-recent-orders">
                <div className="customer-dashboard-section-heading">
                  <h2><IoCubeOutline aria-hidden="true" /> Recent Orders</h2>
                  <Link to="/orders">View all</Link>
                </div>
                {loadingOrders && <p className="customer-dashboard-state" role="status">Loading orders…</p>}
                {!loadingOrders && !orderError && recentOrders.length === 0 && (
                  <p className="customer-dashboard-state">You do not have any orders yet.</p>
                )}
                {recentOrders.map((order) => {
                  const item = order.items[0];
                  const product = item && productForOrderItem(item);
                  return (
                    <Link to={`/orders/${order.id}`} className="customer-dashboard-order-row" key={order.id}>
                      <span className="customer-dashboard-order-image">
                        {product?.image ? <img src={product.image} alt="" /> : <IoCubeOutline aria-hidden="true" />}
                      </span>
                      <span className="customer-dashboard-order-summary">
                        <strong>#{order.id}</strong>
                        <small>{order.created_at ? new Date(order.created_at).toLocaleDateString() : 'Date unavailable'}</small>
                        <span className={`customer-dashboard-status status-${orderStatusClass(order.status)}`}>{order.status}</span>
                      </span>
                      <span className="customer-dashboard-order-total">{formatCurrency(order.total_amount)} <b aria-hidden="true">›</b></span>
                    </Link>
                  );
                })}
              </section>

              <section className="customer-dashboard-offer">
                <div>
                  <span><IoGiftOutline aria-hidden="true" /> Special Offer</span>
                  <p>Discover something you’ll love in our latest collection.</p>
                  <Link to="/products" className="customer-dashboard-button customer-dashboard-button-primary">Shop Now</Link>
                </div>
                <span className="customer-dashboard-offer-art" aria-hidden="true">🎁</span>
              </section>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
};

export default CustomerDashboard;
