import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

const FLASH_SALE_DURATION = 12 * 60 * 60;

const readSavedUser = () => {
  try {
    return Boolean(localStorage.getItem('aiStoreUser'));
  } catch (error) {
    console.error('Unable to read saved user state', error);
    return false;
  }
};

const ProductCard = ({ product, onAddToCart }) => (
  <article className="home-product-card">
    <Link
      to={`/products/${product.id}`}
      className="home-product-image-link"
      onClick={() => localStorage.setItem('aiStoreLastCategory', product.category)}
    >
      <img src={product.image} alt={product.name} />
    </Link>
    <div className="home-product-info">
      <h3><Link to={`/products/${product.id}`}>{product.name}</Link></h3>
      <p className="home-product-rating">⭐ {product.rating} / 5</p>
      <p className="home-product-price">${Number(product.price).toFixed(2)}</p>
      <div className="home-product-actions">
        <Link to={`/products/${product.id}`} className="btn btn-outline">View</Link>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onAddToCart(product)}
        >
          Add to Cart
        </button>
      </div>
    </div>
  </article>
);

const ProductSection = ({ title, products, link, onAddToCart, carousel = false }) => (
  <section className="home-section container">
    <div className="home-section-heading">
      <h2>{title}</h2>
      <Link to={link} className="see-all">View all →</Link>
    </div>
    {products.length ? (
      <div className={carousel ? 'home-products-grid product-carousel' : 'home-products-grid'}>
        {products.map((product) => <ProductCard key={product.id} product={product} onAddToCart={onAddToCart} />)}
      </div>
    ) : (
      <p className="home-empty-state">Products will be available soon.</p>
    )}
  </section>
);

const getCategoryRoute = (category) => {
  const slug = category?.slug || category?.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || '';
  return slug ? `/categories/${slug}` : '/products';
};

const Home = ({ products = [], categories = [], onAddToCart }) => {
  const [isSignedIn, setIsSignedIn] = useState(readSavedUser);
  const [preferredCategory] = useState(() => {
    try {
      return localStorage.getItem('aiStoreLastCategory') || '';
    } catch (error) {
      console.error('Unable to read browsing preferences', error);
      return '';
    }
  });
  const [secondsLeft, setSecondsLeft] = useState(FLASH_SALE_DURATION);

  const bestRated = useMemo(
    () => [...products].sort((a, b) => b.rating - a.rating),
    [products]
  );
  const personalizedProducts = useMemo(() => {
    if (!preferredCategory) return bestRated.slice(0, 4);
    const matches = bestRated.filter((product) => product.category === preferredCategory);
    return (matches.length ? matches : bestRated).slice(0, 4);
  }, [bestRated, preferredCategory]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setSecondsLeft((remaining) => Math.max(remaining - 1, 0));
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const syncSignIn = () => setIsSignedIn(readSavedUser());
    window.addEventListener('storage', syncSignIn);
    return () => window.removeEventListener('storage', syncSignIn);
  }, []);

  const hours = String(Math.floor(secondsLeft / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((secondsLeft % 3600) / 60)).padStart(2, '0');
  const seconds = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-hero-shape home-hero-shape-one" />
        <div className="home-hero-shape home-hero-shape-two" />
        <div className="home-hero-content">
          <span className="home-hero-badge">AI-based store management &amp; online selling</span>
          <h1>Smarter store management. Better online shopping.</h1>
          <p>Sell with confidence and help every customer discover the right products through intelligent recommendations.</p>
          <div className="home-hero-highlights" aria-label="Platform features">
            <span><i aria-hidden="true">✦</i> Product recommendations</span>
            <span><i aria-hidden="true">✦</i> Modern online storefront</span>
            <span><i aria-hidden="true">✦</i> Simplified store management</span>
          </div>
          <div className="home-hero-actions">
            <Link to="/products" className="btn btn-primary">Shop Now</Link>
            <Link to="/about" className="btn btn-outline home-hero-secondary">Learn More</Link>
          </div>
        </div>
      </section>

      <section className="container home-trust-wrap" aria-label="Shopping benefits">
        <div className="trust-badges-grid">
          <div className="trust-badge"><span className="badge-icon">🚚</span><div><h3>Free Shipping</h3><p>On orders over $100</p></div></div>
          <div className="trust-badge"><span className="badge-icon">🔒</span><div><h3>Secure Payment</h3><p>Protected checkout</p></div></div>
          <div className="trust-badge"><span className="badge-icon">↩️</span><div><h3>30-Day Returns</h3><p>Shop with confidence</p></div></div>
          <div className="trust-badge"><span className="badge-icon">🎧</span><div><h3>24/7 Support</h3><p>We're here to help</p></div></div>
        </div>
      </section>

      <section className="home-section container">
        <div className="home-section-heading">
          <h2>Shop by Category</h2>
          <Link to="/products" className="see-all">Browse all →</Link>
        </div>
        <div className="home-categories-grid">
          {categories.map((category) => (
            <Link key={category.id} to={getCategoryRoute(category)} className="home-category-card">
              <span>{category.icon || '🛍️'}</span>
              <h3>{category.name}</h3>
            </Link>
          ))}
        </div>
      </section>

      <section className="container home-flash-wrap">
        <div className="flash-sale-banner">
          <div className="flash-sale-content">
            <span className="flash-sale-kicker">Limited-time offers</span>
            <h2>⚡ Flash Sale</h2>
            <p>Save up to 50% on selected items.</p>
            <div className="countdown-timer" aria-label={`Sale ends in ${hours} hours, ${minutes} minutes, ${seconds} seconds`}>
              <div className="time-box"><span>{hours}</span><small>Hours</small></div>
              <div className="time-box"><span>{minutes}</span><small>Minutes</small></div>
              <div className="time-box"><span>{seconds}</span><small>Seconds</small></div>
            </div>
          </div>
          <Link to="/products" className="btn btn-light">Shop Flash Sale</Link>
        </div>
      </section>

      {isSignedIn && (
        <section className="home-section container">
          <div className="home-section-heading">
            <h2>✨ Recommended For You</h2>
            <span className="ai-tag">Based on your browsing</span>
          </div>
          <p className="recommendation-note">Recommendations update based on the product categories you explore.</p>
          <div className="home-products-grid">
            {personalizedProducts.map((product) => <ProductCard key={product.id} product={product} onAddToCart={onAddToCart} />)}
          </div>
        </section>
      )}

      <ProductSection title="Featured Products" products={bestRated.slice(0, 4)} link="/products" onAddToCart={onAddToCart} />

      <section className="home-promo container">
        <div>
          <span className="home-promo-label">A welcome gift for you</span>
          <h2>Get 20% off your first order</h2>
          <p>Use code <strong>WELCOME20</strong> at checkout.</p>
        </div>
        <Link to="/products" className="btn btn-primary">Grab the Deal</Link>
      </section>

      <ProductSection title="🔥 Trending Now" products={bestRated.slice(0, 4)} link="/products" onAddToCart={onAddToCart} carousel />
      <ProductSection title="New Arrivals" products={[...products].reverse().slice(0, 4)} link="/products" onAddToCart={onAddToCart} />

      <section className="home-section container">
        <div className="home-section-heading home-centered-heading"><h2>Trusted by Top Brands</h2></div>
        <div className="brands-grid" aria-label="Featured brands">
          {['Apple', 'Samsung', 'Sony', 'Nike', 'Adidas'].map((brand) => <span key={brand} className="brand-logo">{brand}</span>)}
        </div>
      </section>

      <section className="home-benefits">
        <div className="container">
          <div className="home-section-heading home-centered-heading"><h2>Why Choose AI Store?</h2></div>
          <div className="home-benefits-grid">
            <article><span>🤖</span><h3>AI Recommendations</h3><p>Discover products that fit your interests.</p></article>
            <article><span>🚚</span><h3>Fast Delivery</h3><p>Get your orders delivered in 2–3 business days.</p></article>
            <article><span>🔒</span><h3>Secure Payments</h3><p>Shop with confidence at every step.</p></article>
            <article><span>💬</span><h3>24/7 Support</h3><p>Our team is ready whenever you need help.</p></article>
          </div>
        </div>
      </section>

      <section className="home-section container">
        <div className="home-section-heading home-centered-heading"><h2>What Our Customers Say</h2></div>
        <div className="testimonials-grid">
          <article className="testimonial-card"><div className="stars" aria-label="5 out of 5 stars">★★★★★</div><p>“The recommendations helped me find exactly what I needed. Shopping was quick and easy.”</p><div className="user-info"><span className="avatar">JD</span><div><h3>Jordan D.</h3><small>Verified Buyer</small></div></div></article>
          <article className="testimonial-card"><div className="stars" aria-label="5 out of 5 stars">★★★★★</div><p>“My order arrived quickly and the product was exactly as described. I'll shop here again.”</p><div className="user-info"><span className="avatar">SM</span><div><h3>Sam M.</h3><small>Verified Buyer</small></div></div></article>
          <article className="testimonial-card"><div className="stars" aria-label="5 out of 5 stars">★★★★★</div><p>“Support was helpful and responsive. The whole experience was straightforward.”</p><div className="user-info"><span className="avatar">AK</span><div><h3>Alex K.</h3><small>Verified Buyer</small></div></div></article>
        </div>
      </section>

      <section className="container home-app-wrap">
        <div className="app-download-banner">
          <div className="app-content">
            <span className="home-promo-label">Shopping on the go</span>
            <h2>Shop Anywhere, Anytime</h2>
            <p>Our mobile app is coming soon. Check back for faster checkout and exclusive deals.</p>
            <div className="app-buttons">
              <button className="store-btn" type="button" disabled>🍎 App Store · Coming soon</button>
              <button className="store-btn" type="button" disabled>▶ Google Play · Coming soon</button>
            </div>
          </div>
          <div className="app-image" aria-hidden="true">📱</div>
        </div>
      </section>

    </div>
  );
};

export default Home;
