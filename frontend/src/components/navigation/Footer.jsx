import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import './Footer.css';

const Footer = ({ user }) => {
  const location = useLocation();
  const [email, setEmail] = useState('');
  const isManager = user?.role === 'manager';
  const isCustomer = user && !user.is_admin && user.role !== 'admin' && !isManager;
  if (location.pathname === '/chat') return null;
  if (isManager && location.pathname.startsWith('/admin')) return null;
  if (isCustomer && (location.pathname === '/' || location.pathname === '/dashboard')) return null;

  const handleSubscribe = (event) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      toast.error('Enter a valid email address.');
      return;
    }

    try {
      const subscribers = JSON.parse(localStorage.getItem('aiStoreNewsletterSubscribers') || '[]');
      if (subscribers.includes(normalizedEmail)) {
        toast.info('This email is already subscribed on this device.');
        return;
      }
      localStorage.setItem(
        'aiStoreNewsletterSubscribers',
        JSON.stringify([...subscribers, normalizedEmail])
      );
      setEmail('');
      toast.success('Subscription saved on this device.');
    } catch (error) {
      console.error('Unable to save newsletter subscription', error);
      toast.error('Unable to save your subscription. Please try again.');
    }
  };

  return (
    <footer className="footer">
      <div className="footer-container">
        
        {/* Column 1: About Store */}
        <div className="footer-col">
          <h3 className="footer-brand">🛒 AI Store</h3>
          <p className="footer-desc">
            An AI-based store management and online selling system that helps customers discover products through personalized recommendations.
          </p>
          <div className="footer-socials">
            <span>🌐</span> <span>📘</span> <span>🐦</span> <span>📸</span>
          </div>
        </div>

        {/* Column 2: Quick Links */}
        <div className="footer-col">
          <h4 className="footer-title">Quick Links</h4>
          <ul className="footer-list">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/products">Shop Products</Link></li>
            <li><Link to="/about">About Us</Link></li>
            <li><Link to="/contact">Contact Support</Link></li>
          </ul>
        </div>

        {/* Column 3: Customer Service */}
        <div className="footer-col">
          <h4 className="footer-title">Customer Service</h4>
          <ul className="footer-list">
            <li><a href="#faq">FAQs</a></li>
            <li><a href="#shipping">Shipping & Returns</a></li>
            <li><a href="#privacy">Privacy Policy</a></li>
            <li><a href="#terms">Terms of Service</a></li>
          </ul>
        </div>

        {/* Column 4: Contact Info & Newsletter */}
        <div className="footer-col">
          <h4 className="footer-title">Get in Touch</h4>
          <ul className="footer-contact">
            <li>📍 123 AI Street, Tech City</li>
            <li>📞 +251 900 000 000</li>
            <li>✉️ support@aistore.com</li>
            <li>🕐 Mon–Fri: 9:00 – 18:00</li>
          </ul>
          <form className="footer-newsletter" onSubmit={handleSubscribe}>
            <input
              id="footer-newsletter-email"
              type="email"
              placeholder="Enter your email"
              aria-label="Newsletter email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <button type="submit">Subscribe</button>
          </form>
        </div>

      </div>

      {/* Bottom Copyright Bar */}
      <div className="footer-bottom">
        <p>© 2026 AI Store. All rights reserved.</p>
        <p>Built for smart shopping.</p>
      </div>
    </footer>
  );
};

export default Footer;