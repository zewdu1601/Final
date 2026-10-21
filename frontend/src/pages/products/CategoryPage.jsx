import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import productService from '../../services/productService';
import ProductGrid from '../../components/products/ProductGrid';
import Loader from '../../components/common/Loader';

const CategoryPage = () => {
  const { slug } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchByCategory = async () => {
      setLoading(true);
      try {
        const data = await productService.getProducts({ category: slug });
        setProducts(data.results || []);
      } catch (err) {
        console.error('Error fetching category products:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchByCategory();
  }, [slug]);

  return (
    <div className="category-page container">
      <h1>Category: {slug}</h1>
      {loading ? <Loader /> : <ProductGrid products={products} />}
    </div>
  );
};

export default CategoryPage;