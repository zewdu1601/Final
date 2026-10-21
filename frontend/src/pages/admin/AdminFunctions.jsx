import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import productService from '../../services/productService';
import './Admin.css';

const AdminFunctions = () => {
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await productService.getProducts();
        setProducts(data || []);
        if (data?.length) setSelectedProductId(String(data[0].id));
      } catch (requestError) {
        setError(requestError.response?.data?.detail || requestError.message || 'Could not load products for recommendation monitoring.');
      } finally {
        setLoadingProducts(false);
      }
    };
    loadProducts();
  }, []);

  useEffect(() => {
    if (!selectedProductId) {
      setRecommendations([]);
      return undefined;
    }

    let cancelled = false;
    const loadRecommendations = async () => {
      setLoadingRecommendations(true);
      setError('');
      try {
        const data = await productService.getSimilarProducts(selectedProductId);
        if (!cancelled) setRecommendations(data || []);
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.response?.data?.detail || requestError.message || 'Could not load recommendation results.');
        }
      } finally {
        if (!cancelled) setLoadingRecommendations(false);
      }
    };

    loadRecommendations();
    return () => { cancelled = true; };
  }, [selectedProductId]);

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Admin Functions</h1>
        <p>Administration tools for users, AI recommendations, system configuration, and reports.</p>
      </div>

      <section className="admin-section">
        <h2>Administration</h2>
        <div className="admin-function-grid">
          <article className="admin-function-card">
            <span className="admin-function-icon" aria-hidden="true">🔐</span>
            <div>
              <h3>Secure Admin Login</h3>
              <p>Admin pages require an authenticated administrator account.</p>
              <span className="admin-function-status is-active">Protected</span>
            </div>
          </article>
          <article className="admin-function-card">
            <span className="admin-function-icon" aria-hidden="true">👥</span>
            <div>
              <h3>Manage Users</h3>
              <p>Review registered accounts and enable or deactivate customer access.</p>
              <Link to="/admin/users" className="admin-function-link">Open user management →</Link>
            </div>
          </article>
          <article className="admin-function-card">
            <span className="admin-function-icon" aria-hidden="true">⚙️</span>
            <div>
              <h3>Store Contact Settings</h3>
              <p>Maintain the store name, public contact email, phone number, and address.</p>
              <Link to="/admin/settings" className="admin-function-link">Open system settings →</Link>
            </div>
          </article>
          <article className="admin-function-card">
            <span className="admin-function-icon" aria-hidden="true">📊</span>
            <div>
              <h3>View Reports</h3>
              <p>Review paid revenue, sales trends, order totals, and top-selling products.</p>
              <Link to="/admin/analytics" className="admin-function-link">Open reports →</Link>
            </div>
          </article>
        </div>
      </section>

      <section className="admin-section" aria-labelledby="recommendation-monitor-title">
        <div className="admin-section-heading">
          <div>
            <h2 id="recommendation-monitor-title">Monitor AI Recommendations</h2>
            <p className="admin-function-intro">Preview similar-product results generated for a catalog item.</p>
          </div>
          <Link to="/admin/products" className="btn btn-outline">Manage catalog</Link>
        </div>

        {loadingProducts ? (
          <p className="loading-text">Loading catalog...</p>
        ) : products.length === 0 ? (
          <p className="empty-text">Add products to the catalog to preview recommendations.</p>
        ) : (
          <>
            <label className="admin-function-select-label" htmlFor="recommendation-product">Base product</label>
            <select
              id="recommendation-product"
              className="admin-function-select"
              value={selectedProductId}
              onChange={(event) => setSelectedProductId(event.target.value)}
            >
              {products.map((product) => (
                <option value={product.id} key={product.id}>{product.name}</option>
              ))}
            </select>

            {error && <p className="admin-inline-error" role="alert">{error}</p>}
            {loadingRecommendations ? (
              <p className="loading-text">Generating recommendation preview...</p>
            ) : recommendations.length ? (
              <div className="admin-recommendation-list">
                {recommendations.map((product) => (
                  <article className="admin-recommendation-card" key={product.id}>
                    {product.image && <img src={product.image} alt="" loading="lazy" />}
                    <div>
                      <strong>{product.name}</strong>
                      <span>{product.category?.name || product.category || 'Product'} · Rating {Number(product.rating || 0).toFixed(1)} / 5</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              !error && <p className="empty-text">No similar products were returned for this item.</p>
            )}
          </>
        )}
      </section>
    </div>
  );
};

export default AdminFunctions;
