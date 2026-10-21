import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getApiErrorMessage } from '../../services/api';
import { getOrders } from '../../services/orderService';
import { getProductReviews, submitReview } from '../../services/reviewService';
import '../checkout/Checkout.css';
import './User.css';

const ReviewsPage = ({ user, products = [] }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [purchasedProducts, setPurchasedProducts] = useState([]);
  const [reviews, setReviews] = useState({});
  const [rating, setRating] = useState('5');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const productId = Number(searchParams.get('productId'));
  const selectedProduct = useMemo(
    () => purchasedProducts.find((product) => product.id === productId) || purchasedProducts[0],
    [productId, purchasedProducts]
  );
  const myReview = selectedProduct ? reviews[selectedProduct.id] : null;

  useEffect(() => {
    let active = true;
    const loadReviewOptions = async () => {
      try {
        const orders = await getOrders();
        const purchasedIds = [...new Set(
          orders
            .filter((order) => order.status !== 'Cancelled')
            .flatMap((order) => order.items.map((item) => item.product_id))
        )];
        const availableProducts = purchasedIds.map((id) => (
          products.find((product) => Number(product.id) === Number(id))
          || { id, name: `Product #${id}`, price: 0 }
        ));
        const productReviews = await Promise.all(
          purchasedIds.map(async (id) => [id, await getProductReviews(id)])
        );

        if (!active) return;
        setPurchasedProducts(availableProducts);
        setReviews(Object.fromEntries(productReviews.map(([id, items]) => [
          id,
          items.find((review) => review.user_id === user.id) || null,
        ])));
      } catch (requestError) {
        if (active) setError(getApiErrorMessage(requestError));
      } finally {
        if (active) setLoading(false);
      }
    };
    loadReviewOptions();
    return () => {
      active = false;
    };
  }, [products, user.id]);

  useEffect(() => {
    if (selectedProduct && productId !== selectedProduct.id) {
      setSearchParams({ productId: String(selectedProduct.id) }, { replace: true });
    }
    setRating(String(myReview?.rating || 5));
    setComment(myReview?.comment || '');
  }, [selectedProduct, productId, myReview, setSearchParams]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedProduct) return;
    setSubmitting(true);
    try {
      const savedReview = await submitReview({
        productId: selectedProduct.id,
        rating: Number(rating),
        comment: comment.trim(),
      });
      setReviews((current) => ({ ...current, [selectedProduct.id]: savedReview }));
      toast.success('Your product review has been saved.');
    } catch (requestError) {
      toast.error(getApiErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="page section order-history">
      <header className="user-page-heading">
        <div>
          <p className="user-page-eyebrow">YOUR FEEDBACK</p>
          <h1>Product Reviews and Ratings</h1>
          <p>Rate items from your order history and share feedback with other customers.</p>
        </div>
        <Link to="/orders" className="btn btn-outline">View my orders</Link>
      </header>
      {loading && <p role="status">Loading products from your orders…</p>}
      {!loading && error && <p role="alert">{error}</p>}
      {!loading && !error && purchasedProducts.length === 0 && (
        <div className="cart-empty-state">
          <h2>No purchased products to review</h2>
          <p>After placing an order, you can leave a rating and review here.</p>
          <Link to="/products" className="btn btn-primary">Browse products</Link>
        </div>
      )}
      {!loading && !error && purchasedProducts.length > 0 && (
        <div className="review-page-layout">
          <div className="review-product-list" aria-label="Products from your orders">
            {purchasedProducts.map((product) => (
              <button
                type="button"
                key={product.id}
                className={`review-product-option${product.id === selectedProduct?.id ? ' is-selected' : ''}`}
                onClick={() => setSearchParams({ productId: String(product.id) })}
              >
                <span>{product.name}</span>
                <small>{reviews[product.id] ? `Your rating: ${reviews[product.id].rating}/5` : 'Not reviewed yet'}</small>
              </button>
            ))}
          </div>
          {selectedProduct && (
            <form className="profile-form review-form" onSubmit={handleSubmit}>
              <h2>{myReview ? 'Update your review' : 'Review this product'}</h2>
              <h3>{selectedProduct.name}</h3>
              <div className="form-group">
                <label htmlFor="product-rating">Rating</label>
                <select id="product-rating" value={rating} onChange={(event) => setRating(event.target.value)}>
                  {[5, 4, 3, 2, 1].map((value) => (
                    <option value={value} key={value}>{value} out of 5</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="product-review-comment">Feedback (optional)</label>
                <textarea
                  id="product-review-comment"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  maxLength={2000}
                  rows={5}
                  placeholder="Share your experience with this product"
                />
                <small>{comment.length}/2000 characters</small>
              </div>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Saving…' : myReview ? 'Update review' : 'Submit review'}
              </button>
            </form>
          )}
        </div>
      )}
    </section>
  );
};

export default ReviewsPage;
