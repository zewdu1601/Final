import React, { useEffect, useState } from 'react';
import { getApiErrorMessage } from '../../services/api';
import { getProductReviews } from '../../services/reviewService';

const ProductReviews = ({ productId }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getProductReviews(productId)
      .then((items) => {
        if (active) setReviews(items);
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
  }, [productId]);

  return (
    <section className="customer-product-reviews" aria-labelledby="customer-product-reviews-title">
      <h2 id="customer-product-reviews-title">Customer reviews</h2>
      {loading && <p role="status">Loading reviews…</p>}
      {!loading && error && <p role="alert">{error}</p>}
      {!loading && !error && reviews.length === 0 && <p>No reviews yet. Be the first to share feedback after your purchase.</p>}
      {!loading && !error && reviews.map((review) => (
        <article className="customer-product-review" key={review.id}>
          <p className="customer-product-review-rating" aria-label={`${review.rating} out of 5 stars`}>
            {'★'.repeat(Math.round(review.rating))}{'☆'.repeat(5 - Math.round(review.rating))}
            <strong>{Number(review.rating).toFixed(1)} / 5</strong>
          </p>
          {review.comment && <p>{review.comment}</p>}
          <small>{review.created_at ? new Date(review.created_at).toLocaleDateString() : 'Customer review'}</small>
        </article>
      ))}
    </section>
  );
};

export default ProductReviews;
