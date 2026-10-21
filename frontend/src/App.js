import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useParams } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

// Components
import Navbar from './components/navigation/Navbar';
import Footer from './components/navigation/Footer';
import About from './pages/About';
import Contact from './pages/Contact';
import Home from './pages/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import CheckoutPage from './pages/checkout/CheckoutPage';
import OrderSuccess from './pages/checkout/OrderSuccess';
import OrderHistory from './pages/user/OrderHistory';
import OrderDetailPage from './pages/user/OrderDetailPage';
import OrderNotificationsPage from './pages/user/OrderNotificationsPage';
import { getStoredUser, invalidateSession, logout, updateStoredUser } from './services/authService';
import { getCategories, getProducts } from './services/productService';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import Analytics from './pages/admin/Analytics';
import ManageProducts from './pages/admin/ManageProducts';
import AddProduct from './pages/admin/AddProduct';
import EditProduct from './pages/admin/EditProduct';
import ManageCategories from './pages/admin/ManageCategories';
import ManageOrders from './pages/admin/ManageOrders';
import ManageUsers from './pages/admin/ManageUsers';
import CategoryPage from './pages/products/CategoryPage';
import AdminFunctions from './pages/admin/AdminFunctions';
import AdminProfile from './pages/admin/AdminProfile';
import AdminSettings from './pages/admin/AdminSettings';
import AdminMonitoring from './pages/admin/AdminMonitoring';
import AdminReports from './pages/admin/AdminReports';
import Profile from './pages/user/Profile';
import ReviewsPage from './pages/user/ReviewsPage';
import RecommendationsPage from './pages/RecommendationsPage';
import ProductReviews from './components/products/ProductReviews';
import CustomerDashboard from './pages/user/CustomerDashboard';
import ChatPage from './pages/ChatPage';

const MOCK_PRODUCTS = [
  {
    id: 1, name: 'Wireless Headphones', price: 199.99, category: 'Electronics', rating: 4.5, image: '/products/headphones.svg',
    description: 'Premium over-ear headphones designed to make music, calls, and travel more enjoyable.',
    features: ['Active noise cancellation for more focused listening', 'Wireless Bluetooth connection', 'Cushioned over-ear design for comfortable extended wear'],
    specifications: { Type: 'Over-ear wireless headphones', Connectivity: 'Bluetooth', Features: 'Noise cancellation, built-in microphone', BestFor: 'Music, calls, commuting' },
  },
  {
    id: 2, name: 'Smart Watch', price: 149.99, category: 'Electronics', rating: 4.3, image: '/products/smart-watch.svg',
    description: 'A versatile smartwatch for tracking everyday activity and keeping useful health information close at hand.',
    features: ['Heart-rate monitoring', 'Activity and workout tracking', 'At-a-glance notifications and time display'],
    specifications: { Type: 'Smartwatch and fitness tracker', Display: 'Digital touch display', Sensors: 'Heart-rate monitor, activity tracking', BestFor: 'Everyday activity and fitness' },
  },
  {
    id: 3, name: 'Running Shoes', price: 89.99, category: 'Fashion', rating: 4.7, image: '/products/running-shoes.svg',
    description: 'Lightweight running shoes made for comfortable movement on daily runs and active days.',
    features: ['Lightweight construction', 'Cushioned feel for everyday comfort', 'Versatile design for running and casual wear'],
    specifications: { Type: 'Running shoes', Category: 'Athletic footwear', Fit: 'Lace-up', BestFor: 'Running, walking, everyday wear' },
  },
  {
    id: 4, name: 'Coffee Maker', price: 59.99, category: 'Home', rating: 4.2, image: '/products/coffee-maker.svg',
    description: 'A compact countertop coffee maker for a convenient cup at home or in a small office.',
    features: ['Space-saving countertop design', 'Simple, convenient brewing', 'Suitable for everyday home use'],
    specifications: { Type: 'Drip coffee maker', Design: 'Compact countertop appliance', Use: 'Home or office', BestFor: 'Everyday coffee brewing' },
  },
  {
    id: 5, name: 'Programming Book', price: 39.99, category: 'Books', rating: 4.8, image: '/products/programming-book.svg',
    description: 'A practical learning resource covering the ideas and tools used to build modern full-stack web applications.',
    features: ['Introduces front-end and back-end development concepts', 'Practical, project-focused learning', 'Useful for learners building programming foundations'],
    specifications: { Format: 'Printed book', Subject: 'Full-stack web development', Level: 'Beginner to intermediate', BestFor: 'Students and aspiring developers' },
  },
  {
    id: 6, name: 'Yoga Mat', price: 29.99, category: 'Sports', rating: 4.4, image: '/products/yoga-mat.svg',
    description: 'A comfortable, non-slip exercise mat for yoga, stretching, and floor workouts.',
    features: ['Textured surface helps provide grip', 'Comfortable padded practice area', 'Easy to roll up for storage'],
    specifications: { Type: 'Exercise and yoga mat', Surface: 'Textured, non-slip design', Use: 'Yoga, stretching, floor exercise', Care: 'Wipe clean after use' },
  },
  {
    id: 7, name: 'Bluetooth Speaker', price: 79.99, category: 'Electronics', rating: 4.5, image: '/products/bluetooth-speaker.svg',
    description: 'A portable wireless speaker that brings your playlists and podcasts along wherever the day takes you.',
    features: ['Wireless Bluetooth audio playback', 'Portable design for listening on the go', 'Suitable for music, podcasts, and shared listening'],
    specifications: { Type: 'Portable wireless speaker', Connectivity: 'Bluetooth', Audio: 'Built-in stereo speakers', BestFor: 'Music and podcasts at home or on the go' },
  },
  {
    id: 8, name: 'Face Cream', price: 24.99, category: 'Beauty', rating: 4.6, image: '/products/face-cream.svg',
    description: 'A daily moisturizing face cream formulated to help leave skin feeling soft and hydrated.',
    features: ['Designed for daily facial moisturizing', 'Helps support soft, hydrated-feeling skin', 'Simple addition to a regular skincare routine'],
    specifications: { Type: 'Facial moisturizer', Use: 'Daily skincare', Application: 'Apply a small amount to clean skin', Category: 'Beauty and personal care' },
  },
  {
    id: 9, name: 'iPhone 16 Pro', price: 999.99, category: 'Electronics', rating: 4.8, image: '/products/iphone.svg',
    description: 'A premium smartphone combining a vivid display, advanced camera system, and powerful performance in a refined design.',
    features: ['Advanced multi-camera system for photos and video', 'Vivid, responsive display for apps and entertainment', 'Premium smartphone design with modern mobile features'],
    specifications: { Type: 'Smartphone', Model: 'iPhone 16 Pro', Display: 'Super Retina XDR display', Camera: 'Pro camera system', Connectivity: '5G, Wi-Fi, Bluetooth', OperatingSystem: 'iOS' },
  },
  {
    id: 10, name: 'Desktop PC', price: 1299.99, category: 'Computers', rating: 4.7, image: '/products/desktop-pc.svg',
    description: 'A high-performance desktop setup for productivity, creative projects, and immersive gaming.',
    features: ['Desktop tower and monitor setup', 'Designed for demanding work and entertainment', 'RGB-style lighting for a customizable gaming atmosphere'],
    specifications: { Type: 'Desktop computer setup', Included: 'Desktop tower, monitor, keyboard', Use: 'Productivity, creative work, gaming', Connectivity: 'USB and standard desktop connections' },
  },
];

const MOCK_CATEGORIES = [
  { id: 1, name: 'Electronics', icon: '📱' },
  { id: 2, name: 'Fashion', icon: '👕' },
  { id: 3, name: 'Home', icon: '🏠' },
  { id: 4, name: 'Books', icon: '📚' },
  { id: 5, name: 'Sports', icon: '⚽' },
  { id: 6, name: 'Beauty', icon: '💄' },
  { id: 7, name: 'Computers', icon: '🖥️' },
];

const getCategoryName = (category) => (
  typeof category === 'string' ? category : category?.name || 'Uncategorized'
);

const getKnownStock = (product) => {
  if (product?.stock === undefined || product?.stock === null || product.stock === '') return null;
  const stock = Number(product.stock);
  return Number.isFinite(stock) ? Math.max(0, stock) : null;
};

const ProductListing = ({ products, onAddToCart }) => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [availability, setAvailability] = useState('all');
  const [sort, setSort] = useState('featured');
  const categories = useMemo(
    () => [...new Set(products.map((product) => getCategoryName(product.category)).filter(Boolean))].sort(),
    [products]
  );
  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products
      .filter((product) => (
        !query
        || [product.name, product.description, getCategoryName(product.category)]
          .some((value) => String(value || '').toLowerCase().includes(query))
      ))
      .filter((product) => !category || getCategoryName(product.category) === category)
      .filter((product) => {
        const stockKnown = product.stock !== undefined && product.stock !== null;
        if (availability === 'in-stock') return !stockKnown || Number(product.stock) > 0;
        if (availability === 'out-of-stock') return stockKnown && Number(product.stock) <= 0;
        return true;
      })
      .sort((first, second) => {
        if (sort === 'price-low') return Number(first.price) - Number(second.price);
        if (sort === 'price-high') return Number(second.price) - Number(first.price);
        if (sort === 'rating') return Number(second.rating || 0) - Number(first.rating || 0);
        return 0;
      });
  }, [products, search, category, availability, sort]);

  return (
    <div className="page section">
      <h1 className="page-title">Browse and Search Products</h1>
      <div className="product-search-controls" aria-label="Search and filter products">
        <label className="form-group">
          <span>Search products</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, description, or category"
          />
        </label>
        <label className="form-group">
          <span>Category</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">All categories</option>
            {categories.map((name) => <option value={name} key={name}>{name}</option>)}
          </select>
        </label>
        <label className="form-group">
          <span>Availability</span>
          <select value={availability} onChange={(event) => setAvailability(event.target.value)}>
            <option value="all">All products</option>
            <option value="in-stock">In stock</option>
            <option value="out-of-stock">Out of stock</option>
          </select>
        </label>
        <label className="form-group">
          <span>Sort by</span>
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="featured">Featured</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
            <option value="rating">Top rated</option>
          </select>
        </label>
      </div>
      <p className="product-result-count" aria-live="polite">{filteredProducts.length} products found</p>
      {filteredProducts.length ? (
        <div className="product-grid">
          {filteredProducts.map((product) => {
            const stockKnown = product.stock !== undefined && product.stock !== null;
            const inStock = !stockKnown || Number(product.stock) > 0;
            return (
              <article className="product-card" key={product.id}>
                <img src={product.image} alt={product.name} loading="lazy" />
                <p className="product-card-category">{getCategoryName(product.category)}</p>
                <h2>{product.name}</h2>
                <p>{product.description}</p>
                <p className="product-price">${Number(product.price).toFixed(2)}</p>
                <p className={`product-stock-label${inStock ? '' : ' is-unavailable'}`}>
                  {stockKnown ? (inStock ? `${product.stock} in stock` : 'Out of stock') : 'Check availability on details'}
                </p>
                <div className="product-card-actions">
                  <Link to={`/products/${product.id}`} className="btn btn-outline">View Product</Link>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => onAddToCart(product)}
                    disabled={!inStock}
                  >
                    Add to Cart
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="cart-empty-state">
          <h2>No matching products</h2>
          <p>Try changing your search or filters.</p>
        </div>
      )}
    </div>
  );
};

const CartPage = ({ cart, products, onUpdateQuantity, onRemove, onClear }) => {
  const hasUnavailableStock = cart.some(({ product: cartProduct, quantity }) => {
    const currentProduct = products.find((item) => Number(item.id) === Number(cartProduct.id)) || cartProduct;
    const stock = getKnownStock(currentProduct);
    return stock !== null && (stock === 0 || quantity > stock);
  });

  return (
  <div className="page section cart-page">
    <div className="cart-page-heading">
      <div>
        <span className="cart-eyebrow">Your selection</span>
        <h1 className="page-title">Shopping Cart</h1>
      </div>
      {cart.length > 0 && (
        <button type="button" className="btn btn-outline" onClick={onClear}>Clear cart</button>
      )}
    </div>

    {cart.length === 0 ? (
      <div className="cart-empty-state">
        <span className="cart-empty-icon" aria-hidden="true">🛒</span>
        <h2>Your cart is waiting for something great</h2>
        <p>Explore the collection and add something you love.</p>
        <Link to="/products" className="btn btn-primary">Explore products</Link>
      </div>
    ) : (
      <div className="cart-layout">
        <div className="cart-items">
          {cart.map(({ product: cartProduct, quantity }) => {
            const product = products.find((item) => Number(item.id) === Number(cartProduct.id)) || cartProduct;
            const stock = getKnownStock(product);
            return (
            <article className="cart-item" key={product.id}>
              <img src={product.image} alt={product.name} />
              <div className="cart-item-details">
                <Link to={`/products/${product.id}`}><h2>{product.name}</h2></Link>
                <p>{getCategoryName(product.category)}</p>
                <strong>${Number(product.price).toFixed(2)}</strong>
                {stock !== null && (
                  <small className={stock === 0 || quantity > stock ? 'cart-stock-warning' : 'cart-stock-available'}>
                    {stock === 0 ? 'Out of stock' : quantity > stock ? `Only ${stock} available; update quantity` : `${stock} available`}
                  </small>
                )}
              </div>
              <div className="cart-quantity" aria-label={`Quantity for ${product.name}`}>
                <button type="button" onClick={() => onUpdateQuantity(product.id, quantity - 1)} aria-label={`Decrease ${product.name} quantity`}>−</button>
                <span>{quantity}</span>
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(product.id, quantity + 1)}
                  aria-label={`Increase ${product.name} quantity`}
                  disabled={stock !== null && (stock === 0 || quantity >= stock)}
                >+</button>
              </div>
              <button type="button" className="cart-remove" onClick={() => onRemove(product.id)}>Remove</button>
            </article>
          );})}
        </div>
        <aside className="cart-summary">
          <h2>Order summary</h2>
          <p><span>Items ({cart.reduce((total, item) => total + item.quantity, 0)})</span><strong>${cart.reduce((total, item) => total + item.product.price * item.quantity, 0).toFixed(2)}</strong></p>
          <p><span>Shipping</span><strong>Calculated at checkout</strong></p>
          {hasUnavailableStock ? (
            <p className="cart-stock-warning" role="alert">Update quantities to match current stock before checkout.</p>
          ) : (
            <Link to="/checkout" className="btn btn-primary">Proceed to checkout</Link>
          )}
          <Link to="/products" className="cart-continue-link">Continue shopping</Link>
        </aside>
      </div>
    )}
  </div>
  );
};

const ProductDetail = ({ products, onAddToCart, user }) => {
  const { id } = useParams();
  const product = products.find((item) => item.id === Number(id));
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    setQuantity(1);
    setActiveImageIndex(0);
  }, [id]);

  if (!product) {
    return <div className="page section"><h1>Product not found</h1></div>;
  }

  const galleryImages = [
    ...(Array.isArray(product.images) ? product.images : []),
    product.image,
  ].filter((image, index, images) => (
    typeof image === 'string' && image.trim() && images.indexOf(image) === index
  ));
  const activeImage = galleryImages[activeImageIndex] || galleryImages[0];
  const stockIsKnown = product.stock !== undefined
    && product.stock !== null
    && Number.isFinite(Number(product.stock));
  const stockCount = stockIsKnown ? Number(product.stock) : null;
  const canAddToCart = stockCount === null || stockCount > 0;
  const attributes = Object.entries(product.specifications || {
    Category: product.category,
    'Product ID': product.id,
    Availability: canAddToCart ? 'Available to order' : 'Out of stock',
  }).slice(0, 3);
  const features = product.features || [
    'Carefully selected for quality and everyday usefulness',
    'Available to order while stock lasts',
    'Payment methods preview available at checkout',
  ];
  return (
    <div className="page section product-detail-page">
      <nav className="product-breadcrumbs" aria-label="Breadcrumb">
        <Link to="/products">Products</Link>
        <span aria-hidden="true">›</span>
        <span>{product.category}</span>
        <span aria-hidden="true">›</span>
        <span aria-current="page">{product.name}</span>
      </nav>

      <div className="product-detail-marketplace">
        <section className="product-gallery" aria-label={`${product.name} images`}>
          <div className="product-gallery-thumbnails" role="list" aria-label="Product images">
            {galleryImages.map((image, index) => (
              <button
                type="button"
                className={`product-gallery-thumbnail${index === activeImageIndex ? ' is-active' : ''}`}
                key={image}
                onClick={() => setActiveImageIndex(index)}
                aria-label={`Show product image ${index + 1}`}
                aria-pressed={index === activeImageIndex}
              >
                <img src={image} alt="" />
              </button>
            ))}
          </div>
          <div className="product-detail-image-wrap">
            {activeImage ? (
              <img className="product-detail-image" src={activeImage} alt={product.name} />
            ) : (
              <span className="product-image-placeholder">No product image</span>
            )}
          </div>
        </section>

        <div className="product-detail-summary">
          <span className="product-detail-category">{product.category}</span>
          <h1>{product.name}</h1>
          <p className="product-detail-rating" aria-label={`Rated ${product.rating} out of 5`}>
            <span className="product-rating-stars" aria-hidden="true">
              {Array.from({ length: 5 }, (_, index) => (
                <span className={index < Math.round(Number(product.rating || 0)) ? 'is-filled' : ''} key={index}>★</span>
              ))}
            </span>
            <strong>{Number(product.rating || 0).toFixed(1)}</strong>
            <span>{product.rating_count ? `${product.rating_count} reviews` : 'Customer rating'}</span>
          </p>
          <p className="product-detail-description">{product.description}</p>

          <div className="product-order-card">
            <div className="product-price-row">
              <strong className="product-detail-price">${Number(product.price).toFixed(2)}</strong>
              <span>per item</span>
              <span className={`product-stock-status${canAddToCart ? '' : ' is-unavailable'}`}>
                {stockCount === null ? 'Available to order' : stockCount > 0 ? `${stockCount} in stock` : 'Out of stock'}
              </span>
            </div>
            <div className="product-order-divider" />
            <div className="product-quantity-row">
              <div>
                <strong>Quantity</strong>
                <span>Choose how many you need</span>
              </div>
              <div className="product-quantity-control" aria-label="Product quantity">
                <button
                  type="button"
                  onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                  aria-label="Decrease quantity"
                  disabled={quantity <= 1}
                >
                  −
                </button>
                <span aria-live="polite">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((current) => Math.min(stockCount ?? Infinity, current + 1))}
                  aria-label="Increase quantity"
                  disabled={stockCount !== null && quantity >= stockCount}
                >
                  +
                </button>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary product-detail-add"
              onClick={() => onAddToCart(product, quantity)}
              disabled={!canAddToCart}
            >
              Add to Cart
            </button>
            <p className="product-detail-delivery">Review available payment method options at checkout</p>
          </div>

          <section className="product-key-attributes" aria-labelledby="product-attributes-title">
            <h2 id="product-attributes-title">Key attributes</h2>
            <dl>
              {attributes.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <aside className="product-shipping-panel">
          <h2>Shipping</h2>
          <p>Delivery options and shipping fees are calculated at checkout for your order.</p>
          <div className="product-shipping-divider" />
          <h3>Order information</h3>
          <ul>
            <li><span aria-hidden="true">✓</span> Payment method options shown at checkout</li>
            <li><span aria-hidden="true">✓</span> Order details confirmed at checkout</li>
          </ul>
          <Link to={user ? '/chat' : '/contact'} className="btn btn-primary product-support-link">Chat with support</Link>
          <p className="product-shipping-note">Have a question about this item? Our team is here to help.</p>
        </aside>
      </div>

      <div className="product-detail-lower">
        <section className="product-seller-card">
          <span className="product-seller-mark" aria-hidden="true">A</span>
          <div>
            <h2>AI Store marketplace</h2>
            <p>Product ID: {product.id} · {product.category}</p>
          </div>
          <Link to="/products" className="product-seller-link">Browse products <span aria-hidden="true">›</span></Link>
        </section>

        <div className="product-information">
          <section className="product-information-panel">
            <h2>About this product</h2>
            <p>{product.description}</p>
            <h3>Key features</h3>
            <ul className="product-feature-list">
              {features.map((feature) => <li key={feature}>{feature}</li>)}
            </ul>
          </section>
          <section className="product-information-panel">
            <h2>Specifications</h2>
            <dl className="product-specifications">
              {Object.entries(product.specifications || {
                Category: product.category,
                'Product ID': product.id,
                Availability: canAddToCart ? 'Available to order' : 'Out of stock',
              }).map(([label, value]) => (
                <div className="product-specification" key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
        <p className="product-review-cta">
          Purchased this product? <Link to={`/reviews?productId=${product.id}`}>Review and rate it</Link>
        </p>
      </div>
      <ProductReviews productId={product.id} />
    </div>
  );
};

const NotFound = () => (
  <div className="page section" style={{ textAlign: 'center', padding: '100px 20px' }}>
    <h1 style={{ fontSize: '4rem', color: '#4f46e5' }}>404</h1>
    <h2>Page Not Found</h2>
    <p>Click "Home" in the navbar to go back.</p>
    <Link to="/" className="btn btn-primary" style={{ marginTop: '20px' }}>Go Home</Link>
  </div>
);

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [user, setUser] = useState(getStoredUser);
  const [products, setProducts] = useState(MOCK_PRODUCTS);
  const [categories, setCategories] = useState(MOCK_CATEGORIES);
  const [cart, setCart] = useState(() => {
    try {
      const storedCart = JSON.parse(localStorage.getItem('aiStoreCart') || '[]');
      return Array.isArray(storedCart) ? storedCart : [];
    } catch (error) {
      console.error('Unable to restore shopping cart', error);
      return [];
    }
  });

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const refreshCatalog = useCallback(() => (
    Promise.all([getProducts(), getCategories()])
      .then(([apiProducts, apiCategories]) => {
        setProducts(apiProducts.map((product) => {
          const template = MOCK_PRODUCTS.find((item) => item.name === product.name) || {};
          return {
            ...template,
            ...product,
            price: Number(product.price),
            rating: Number(product.rating || 0),
            category: product.category?.name || template.category || 'Uncategorized',
            image: product.image || template.image || '',
          };
        }));
        setCategories(apiCategories.map((category) => ({
          ...category,
          icon: category.icon || MOCK_CATEGORIES.find((item) => item.name === category.name)?.icon || '🛍️',
        })));
      })
      .catch((error) => {
        console.error('Unable to load store catalog from API', error);
        toast.error('Live catalog is unavailable. Showing the demo catalog instead.');
      })
  ), []);

  useEffect(() => {
    refreshCatalog();
    window.addEventListener('aiStoreCatalogChanged', refreshCatalog);
    return () => window.removeEventListener('aiStoreCatalogChanged', refreshCatalog);
  }, [refreshCatalog]);

  useEffect(() => {
    const handleAuthExpired = () => {
      logout();
      setUser(null);
      toast.info('Your session expired. Please log in again.');
    };
    window.addEventListener('aiStoreAuthExpired', handleAuthExpired);
    return () => window.removeEventListener('aiStoreAuthExpired', handleAuthExpired);
  }, []);

  useEffect(() => {
    const syncUser = () => setUser(getStoredUser());
    window.addEventListener('aiStoreUserUpdated', syncUser);
    return () => window.removeEventListener('aiStoreUserUpdated', syncUser);
  }, []);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);
  const handleLogout = async () => {
    let serverSessionInvalidated = false;
    try {
      await invalidateSession();
      serverSessionInvalidated = true;
    } catch (error) {
      console.error('Unable to invalidate the server session', error);
      logout();
    } finally {
      setUser(null);
      if (serverSessionInvalidated) {
        toast.success('You have been logged out.');
      } else {
        toast.warning('Logged out on this device, but the server session could not be revoked.');
      }
    }
  };
  const addToCart = (product, quantity = 1) => {
    const normalizedProduct = {
      ...product,
      category: getCategoryName(product.category),
    };
    const stock = getKnownStock(normalizedProduct);
    const existingQuantity = cart.find(
      (item) => Number(item.product.id) === Number(product.id)
    )?.quantity || 0;
    const acceptedQuantity = stock === null
      ? quantity
      : Math.min(quantity, Math.max(0, stock - existingQuantity));

    if (acceptedQuantity <= 0) {
      toast.warning(stock === 0 ? `${product.name} is out of stock.` : `Only ${stock} ${product.name} available.`);
      return;
    }
    if (acceptedQuantity < quantity) {
      toast.warning(`Cart quantity limited to ${stock} for ${product.name}.`);
    }

    setCart((currentCart) => {
      const existingItem = currentCart.find((item) => Number(item.product.id) === Number(product.id));
      const currentQuantity = existingItem?.quantity || 0;
      const safeQuantity = stock === null
        ? acceptedQuantity
        : Math.min(acceptedQuantity, Math.max(0, stock - currentQuantity));
      if (safeQuantity <= 0) return currentCart;
      if (existingItem) {
        return currentCart.map((item) => (
          Number(item.product.id) === Number(product.id)
            ? { product: normalizedProduct, quantity: item.quantity + safeQuantity }
            : item
        ));
      }
      return [...currentCart, { product: normalizedProduct, quantity: safeQuantity }];
    });
    toast.success(`${acceptedQuantity} × ${product.name} added to your cart.`);
  };

  useEffect(() => {
    try {
      localStorage.setItem('aiStoreCart', JSON.stringify(cart));
    } catch (error) {
      console.error('Unable to save shopping cart', error);
      toast.error('Your cart could not be saved on this device.');
    }
  }, [cart]);

  const updateCartQuantity = (productId, quantity) => {
    const cartItem = cart.find((item) => Number(item.product.id) === Number(productId));
    const catalogProduct = products.find((item) => Number(item.id) === Number(productId));
    const product = catalogProduct || cartItem?.product;
    const stock = getKnownStock(product);
    const nextQuantity = stock === null ? quantity : Math.min(quantity, stock);
    if (quantity > nextQuantity) {
      toast.warning(`Only ${stock} ${product.name} available.`);
    }
    setCart((currentCart) => {
      if (nextQuantity < 1) {
        return currentCart.filter((item) => Number(item.product.id) !== Number(productId));
      }
      return currentCart.map((item) => (
        Number(item.product.id) === Number(productId)
          ? {
            product: catalogProduct
              ? { ...catalogProduct, category: getCategoryName(catalogProduct.category) }
              : item.product,
            quantity: nextQuantity,
          }
          : item
      ));
    });
  };
  const isManager = user?.role === 'manager';
  const isAdmin = Boolean(user?.is_admin || user?.role === 'admin');
  const isCustomer = Boolean(user && !isAdmin && !isManager);

  return (
    <BrowserRouter>
      <div className="app-wrapper">
        <Navbar
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
          user={user}
          onLogout={handleLogout}
          cartCount={cart.reduce((count, item) => count + item.quantity, 0)}
        />
        
        <main className="main-content">
          <Routes>
            <Route
              path="/"
              element={isManager
                ? <Navigate to="/admin" replace />
                : isCustomer
                ? <CustomerDashboard user={user} products={products} cart={cart} onAddToCart={addToCart} onLogout={handleLogout} />
                : <Home products={products} categories={categories} onAddToCart={addToCart} />}
            />
            <Route
              path="/dashboard"
              element={isManager
                ? <Navigate to="/admin" replace />
                : isCustomer
                ? <CustomerDashboard user={user} products={products} cart={cart} onAddToCart={addToCart} onLogout={handleLogout} />
                : <Navigate to={user ? '/' : '/login'} replace state={user ? undefined : { from: '/dashboard' }} />}
            />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/products" element={<ProductListing products={products} onAddToCart={addToCart} />} />
            <Route path="/products/:id" element={<ProductDetail products={products} onAddToCart={addToCart} user={user} />} />
            <Route path="/categories/:slug" element={<CategoryPage />} />
            <Route path="/recommendations" element={<RecommendationsPage user={user} onAddToCart={addToCart} />} />
            <Route
              path="/cart"
              element={(
                <CartPage
                  cart={cart}
                  products={products}
                  onUpdateQuantity={updateCartQuantity}
                  onRemove={(productId) => setCart((currentCart) => currentCart.filter((item) => item.product.id !== productId))}
                  onClear={() => setCart([])}
                />
              )}
            />
            <Route path="/login" element={<Login onLogin={setUser} />} />
            <Route path="/admin/login" element={<Login onLogin={setUser} adminOnly />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/checkout"
              element={user ? (
                <CheckoutPage
                  cart={cart}
                  products={products}
                  user={user}
                  onOrderPlaced={() => { setCart([]); refreshCatalog(); }}
                />
              ) : (
                <Navigate to="/login" replace state={{ from: '/checkout' }} />
              )}
            />
            <Route
              path="/orders"
              element={user ? <OrderHistory /> : <Navigate to="/login" replace state={{ from: '/orders' }} />}
            />
            <Route
              path="/notifications"
              element={user ? <OrderNotificationsPage user={user} /> : <Navigate to="/login" replace state={{ from: '/notifications' }} />}
            />
            <Route
              path="/reviews"
              element={user ? (
                <ReviewsPage user={user} products={products} />
              ) : (
                <Navigate to="/login" replace state={{ from: '/reviews' }} />
              )}
            />
            <Route
              path="/profile"
              element={user ? (
                user.is_admin || user.role === 'admin'
                  ? <Navigate to="/admin/profile" replace />
                  : <Profile
                    user={user}
                    onUserUpdated={(updatedUser) => {
                      setUser(updatedUser);
                      updateStoredUser(updatedUser);
                    }}
                    onPasswordChanged={() => {
                      logout();
                      setUser(null);
                    }}
                  />
              ) : (
                <Navigate to="/login" replace state={{ from: '/profile' }} />
              )}
            />
            <Route
              path="/chat"
              element={user ? <ChatPage user={user} /> : <Navigate to="/login" replace state={{ from: '/chat' }} />}
            />
            <Route
              path="/orders/:id"
              element={user ? <OrderDetailPage products={products} /> : <Navigate to="/login" replace state={{ from: '/orders' }} />}
            />
            <Route
              path="/order-success/:id"
              element={user ? <OrderSuccess /> : <Navigate to="/login" replace state={{ from: '/orders' }} />}
            />
            <Route
              path="/admin"
              element={isAdmin || isManager ? <AdminLayout user={user} onLogout={handleLogout} /> : <Navigate to={user ? '/' : '/admin/login'} replace />}
            >
              <Route index element={<AdminDashboard user={user} />} />
              <Route path="functions" element={isManager ? <Navigate to="/admin" replace /> : <AdminFunctions />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="reports" element={<AdminReports user={user} />} />
              <Route path="ai-monitoring" element={isManager ? <Navigate to="/admin" replace /> : <AdminMonitoring />} />
              <Route path="products" element={<ManageProducts />} />
              <Route path="products/add" element={<AddProduct />} />
              <Route path="products/edit/:id" element={<EditProduct />} />
              <Route path="inventory" element={<ManageProducts inventoryMode />} />
              <Route path="categories" element={<ManageCategories />} />
              <Route path="orders" element={<ManageOrders />} />
              <Route path="notifications" element={<OrderNotificationsPage user={user} />} />
              <Route path="users" element={isManager ? <Navigate to="/admin" replace /> : <ManageUsers />} />
              <Route path="profile" element={isManager ? <Navigate to="/profile" replace /> : <AdminProfile />} />
              <Route path="settings" element={isManager ? <Navigate to="/admin" replace /> : <AdminSettings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        
        <Footer user={user} />
        <ToastContainer position="top-right" autoClose={2500} />
      </div>
    </BrowserRouter>
  );
}

export default App;