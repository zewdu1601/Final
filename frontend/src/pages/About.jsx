import React from 'react';
import { Link } from 'react-router-dom';
import './About.css';
import './About.css';

const About = () => {
  return (
    <div className="about-page">
      {/* ============ HERO ============ */}
      <section className="about-hero">
        <div className="about-hero-overlay">
          <h1>About AI Store</h1>
          <p>Smart shopping powered by Artificial Intelligence — personalized, secure, and fast.</p>
        </div>
      </section>

      {/* ============ WHO WE ARE ============ */}
      <section className="about-section container">
        <div className="about-grid">
          <div className="about-text">
            <h2>Who We Are</h2>
            <p>
              <strong>AI Store</strong> is an intelligent e-commerce platform that
              blends modern store management with AI-powered product
              recommendations. Our mission is to make online shopping
              smarter, faster, and more personal for every customer.
            </p>
            <p>
              Built with <strong>React.js</strong> on the frontend,
              <strong> Django REST Framework</strong> for the backend, and
              <strong> PostgreSQL</strong> for data storage, the platform brings
              shopping and store management together.
            </p>
          </div>

          <div className="about-image">
            <img
              src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
              alt="About AI Store"
            />
          </div>
        </div>
      </section>

      {/* ============ OUR MISSION ============ */}
      <section className="about-section mission-section">
        <div className="container">
          <h2>Our Mission</h2>
          <p className="mission-text">
            To revolutionize online shopping by delivering personalized,
            AI-driven experiences that connect customers with the products
            they truly love — while empowering businesses with intelligent
            store management tools.
          </p>
        </div>
      </section>

      {/* ============ WHY CHOOSE US ============ */}
      <section className="about-section container">
        <h2 className="section-title">Why Choose Us?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🤖</div>
            <h3>AI Recommendations</h3>
            <p>Our smart engine suggests products tailored to your taste and browsing behavior.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🚚</div>
            <h3>Fast Delivery</h3>
            <p>Get your orders delivered within 2–3 business days, anywhere.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <h3>Secure Payments</h3>
            <p>All transactions are encrypted and processed through trusted gateways.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💬</div>
            <h3>24/7 Support</h3>
            <p>Our support team is available round the clock to assist you.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📦</div>
            <h3>Wide Product Range</h3>
            <p>Thousands of products across multiple categories — all in one place.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💰</div>
            <h3>Best Prices</h3>
            <p>Competitive pricing with regular discounts and offers.</p>
          </div>
        </div>
      </section>

      {/* ============ OUR STATS ============ */}
      <section className="about-section stats-section">
        <div className="container">
          <h2 className="section-title">Our Numbers</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>10K+</h3>
              <p>Happy Customers</p>
            </div>
            <div className="stat-card">
              <h3>5K+</h3>
              <p>Products Listed</p>
            </div>
            <div className="stat-card">
              <h3>99%</h3>
              <p>Satisfaction Rate</p>
            </div>
            <div className="stat-card">
              <h3>24/7</h3>
              <p>Customer Support</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ OUR TECH STACK ============ */}
      <section className="about-section container">
        <h2 className="section-title">Built With</h2>
        <div className="tech-grid">
          <div className="tech-card">
            <span className="tech-icon">⚛️</span>
            <h4>React.js</h4>
            <p>Frontend</p>
          </div>
          <div className="tech-card">
            <span className="tech-icon">⚡</span>
            <h4>Django REST Framework</h4>
            <p>Backend API</p>
          </div>
          <div className="tech-card">
            <span className="tech-icon">🗃️</span>
            <h4>PostgreSQL</h4>
            <p>Database</p>
          </div>
          <div className="tech-card">
            <span className="tech-icon">🧠</span>
            <h4>Scikit-learn</h4>
            <p>AI Recommender</p>
          </div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="about-cta">
        <div className="container">
          <h2>Ready to Start Shopping Smarter?</h2>
          <p>Discover products picked just for you by our AI.</p>
          <Link to="/products" className="btn btn-primary">
            Explore Products
          </Link>
        </div>
      </section>
    </div>
  );
};

export default About;