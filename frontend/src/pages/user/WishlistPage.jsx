import React from 'react';
import { Link } from 'react-router-dom';
import { useWishlist } from '../../hooks/useCart';
import ProductGrid from '../../components/products/ProductGrid';
import EmptyState from '../../components/common/EmptyState';
import './User.css';

const WishlistPage = () => {
  const { wishlist, clearWishlist } = useWishlist();

  return (
    <div className="user-page container">
      <div className="page-header">
        <h1>My Wishlist</h1>
        {wishlist.length > 0 && (
          <button className="btn btn-outline" onClick={clearWishlist}>
            Clear Wishlist
          </button>
        )}
      </div>

      {wishlist.length === 0 ? (
        <div className="empty-wishlist">
          <EmptyState message="Your wishlist is empty." />
          <Link to="/products" className="btn btn-primary">
            Explore Products
          </Link>
        </div>
      ) : (
        <ProductGrid products={wishlist} />
      )}
    </div>
  );
};

export default WishlistPage;