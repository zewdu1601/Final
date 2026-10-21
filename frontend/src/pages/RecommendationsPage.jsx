import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getApiErrorMessage } from '../services/api';
import { getPersonalizedRecommendations, getTrendingProducts } from '../services/recommendationService';
import './RecommendationsPage.css';

const RecommendationsPage = ({ user, onAddToCart }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const loadRecommendations = user
      ? getPersonalizedRecommendations()
      : getTrendingProducts();

    loadRecommendations
      .then((items) => {
        if (active) setProducts(items);
      })
      .catch((requestError) => {
        if (active) setError(getApiErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  return (
    <section className="page section recommendations-page">
      <header className="recommendations-heading">
        <p className="user-page-eyebrow">{user ? 'PERSONALIZED FOR YOU' : 'POPULAR PICKS'}</p>
        <h1 className="page-title">AI Product Recommendations</h1>
        <p>
          {user
            ? 'Suggestions are informed by your order history and similar products.'
            : 'Explore customer favorites. Log in to receive personalized suggestions.'}
        </p>
      </header>

      {loading && <p role="status">Finding products for you…</p>}
      {!loading && error && <p role="alert">{error}</p>}
      {!loading && !error && products.length === 0 && (
        <p className="recommendations-empty">There are no recommendations available yet.</p>
      )}
      {!loading && !error && products.length > 0 && (
        <div className="recommendations-grid">
          {products.map((product) => (
            <article className="recommendation-card" key={product.id}>
              <Link to={`/products/${product.id}`} className="recommendation-image">
                {product.image ? <img src={product.image} alt={product.name} /> : <span>No image</span>}
              </Link>
              <div className="recommendation-card-body">
                <span>{product.category?.name || product.category || 'Recommended'}</span>
                <h2><Link to={`/products/${product.id}`}>{product.name}</Link></h2>
                <p>{product.description || 'Discover more about this recommended product.'}</p>
                <strong>${Number(product.price).toFixed(2)}</strong>
                <div className="recommendation-actions">
                  <Link to={`/products/${product.id}`} className="btn btn-outline">View details</Link>
                  <button type="button" className="btn btn-primary" onClick={() => onAddToCart(product)}>
                    Add to cart
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default RecommendationsPage;
