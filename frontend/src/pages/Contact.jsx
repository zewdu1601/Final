import React, { useState } from 'react';
import { toast } from 'react-toastify';
import './Contact.css';
import './Contact.css';

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  subject: '',
  message: '',
};

const Contact = () => {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);

  const validateField = (name, value) => {
    if (name === 'name' && !value.trim()) return 'Name is required';
    if (name === 'email') {
      if (!value.trim()) return 'Email is required';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email';
    }
    if (name === 'phone' && value && !/^[0-9+\-\s]{7,15}$/.test(value)) {
      return 'Enter a valid phone number';
    }
    if (name === 'message') {
      if (!value.trim()) return 'Message is required';
      if (value.trim().length < 10) return 'Message must be at least 10 characters';
    }
    return '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
    if (touched[name]) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        [name]: validateField(name, value),
      }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((currentTouched) => ({ ...currentTouched, [name]: true }));
    setErrors((currentErrors) => ({
      ...currentErrors,
      [name]: validateField(name, value),
    }));
  };

  const validate = () => {
    const newErrors = {};
    Object.entries(form).forEach(([name, value]) => {
      const error = validateField(name, value);
      if (error) newErrors[name] = error;
    });
    setErrors(newErrors);
    setTouched({ name: true, email: true, phone: true, subject: true, message: true });
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success('Message sent successfully! We will get back to you soon.');
      setForm(emptyForm);
      setErrors({});
      setTouched({});
    } catch (err) {
      toast.error('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm(emptyForm);
    setErrors({});
    setTouched({});
    toast.info('Form cleared');
  };

  return (
    <div className="contact-page">
      {/* ============ HERO ============ */}
      <section className="contact-hero">
        <div className="contact-hero-overlay">
          <h1>Get in Touch</h1>
          <p>We'd love to hear from you. Send us a message and we'll respond as soon as possible.</p>
        </div>
      </section>

      {/* ============ CONTACT INFO CARDS ============ */}
      <section className="contact-info-section container">
        <div className="info-grid">
          <div className="info-card">
            <div className="info-icon">📍</div>
            <h3>Our Location</h3>
            <p><a href="https://maps.google.com/?q=Addis+Ababa+Ethiopia" target="_blank" rel="noopener noreferrer">123 AI Street, Tech Park</a></p>
            <p>Addis Ababa, Ethiopia</p>
          </div>
          <div className="info-card">
            <div className="info-icon">📞</div>
            <h3>Phone</h3>
            <p><a href="tel:+251900000000">+251 900 000 000</a></p>
            <p><a href="tel:+251911111111">+251 911 111 111</a></p>
          </div>
          <div className="info-card">
            <div className="info-icon">✉️</div>
            <h3>Email</h3>
            <p><a href="mailto:support@aistore.com">support@aistore.com</a></p>
            <p><a href="mailto:info@aistore.com">info@aistore.com</a></p>
          </div>
          <div className="info-card">
            <div className="info-icon">🕐</div>
            <h3>Working Hours</h3>
            <p>Mon – Fri: 9:00 – 18:00</p>
            <p>Sat: 10:00 – 16:00</p>
          </div>
        </div>
      </section>

      {/* ============ CONTACT FORM + MAP ============ */}
      <section className="contact-main container">
        <div className="contact-grid">
          {/* -------- Form -------- */}
          <div className="contact-form-wrapper">
            <h2>Send Us a Message</h2>
            <p className="form-subtitle">Fill out the form below and our team will get back to you within 24 hours.</p>

            <form onSubmit={handleSubmit} className="contact-form" noValidate>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">Full Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    placeholder="John Doe"
                    value={form.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={errors.name ? 'error' : ''}
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? 'name-error' : undefined}
                  />
                  {errors.name && <span id="name-error" className="error-text">{errors.name}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email Address *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="john@example.com"
                    value={form.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={errors.email ? 'error' : ''}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                  />
                  {errors.email && <span id="email-error" className="error-text">{errors.email}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="phone">Phone (Optional)</label>
                  <input
                    type="text"
                    id="phone"
                    name="phone"
                    placeholder="+251 900 000 000"
                    value={form.phone}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={errors.phone ? 'error' : ''}
                    aria-invalid={Boolean(errors.phone)}
                    aria-describedby={errors.phone ? 'phone-error' : undefined}
                  />
                  {errors.phone && <span id="phone-error" className="error-text">{errors.phone}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="subject">Subject (Optional)</label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    placeholder="How can we help?"
                    value={form.subject}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="message">Message *</label>
                <textarea
                  id="message"
                  name="message"
                  rows="6"
                  placeholder="Write your message here..."
                  value={form.message}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={errors.message ? 'error' : ''}
                  aria-invalid={Boolean(errors.message)}
                  aria-describedby={errors.message ? 'message-error' : undefined}
                />
                {errors.message && <span id="message-error" className="error-text">{errors.message}</span>}
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Sending...' : 'Send Message'}
                </button>
                <button type="button" className="btn btn-outline" onClick={handleReset} disabled={loading}>
                  Reset
                </button>
              </div>
            </form>
          </div>

          {/* -------- Map / Extra Info -------- */}
          <div className="contact-side">
            <h2>Visit Our Office</h2>
            <div className="map-box">
              <iframe
                title="AI Store Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3153.019!2d38.7578!3d9.0192!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zOcKwMDEnMDkuMSJOIDM4wrA0NSc0OC4xIkU!5e0!3m2!1sen!2set!4v1600000000000"
                width="100%"
                height="300"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
              ></iframe>
            </div>

            <div className="social-box">
              <h3>Follow Us</h3>
              <div className="social-icons">
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">📘</a>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">🐦</a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">📷</a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">💼</a>
              </div>
            </div>

            <div className="faq-box">
              <h3>Quick Help</h3>
              <ul>
                <li><details><summary>🚚 Track your order</summary><p>Email <a href="mailto:support@aistore.com?subject=Order%20tracking">support</a> with your order number.</p></details></li>
                <li><details><summary>↩️ Return &amp; refund policy</summary><p><a href="mailto:support@aistore.com?subject=Returns%20and%20refunds">Contact support</a> for help with a return or refund.</p></details></li>
                <li><details><summary>💳 Payment methods</summary><p>Available payment options are shown during checkout. <a href="/products">Browse products</a>.</p></details></li>
                <li><details><summary>📦 Shipping information</summary><p>Email <a href="mailto:support@aistore.com?subject=Shipping%20information">support</a> for shipping questions.</p></details></li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="contact-cta">
        <div className="container">
          <h2>Need Immediate Assistance?</h2>
          <p>Call us directly at <a href="tel:+251900000000"><strong>+251 900 000 000</strong></a> or email <a href="mailto:support@aistore.com">our support team</a>.</p>
        </div>
      </section>
    </div>
  );
};

export default Contact;