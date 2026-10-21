import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import productService from '../../services/productService';
import ProductDetail from '../../components/products/ProductDetail';
import SimilarProducts from '../../components/recommendations/SimilarProducts';
import Loader from '../../components/common/Loader';

const ProductDetailPage = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const data = await productService.getProductById(id);
        setProduct(data);
      } catch (err) {
        console.error('Error fetching product:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  if (loading) return <Loader />;
  if (!product) return <p>Product not found</p>;

  return (
    <div className="product-detail-page container">
      <ProductDetail product={product} />
      <SimilarProducts productId={id} />
    </div>
  );
};

export default ProductDetailPage;codex