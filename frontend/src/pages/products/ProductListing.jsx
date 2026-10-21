import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import productService from '../../services/productService';
import ProductGrid from '../../components/products/ProductGrid';
import ProductFilter from '../../components/products/ProductFilter';
import Pagination from '../../components/common/Pagination';
import Loader from '../../components/common/Loader';

const ProductListing = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = {
          page,
          search: searchParams.get('search') || '',
          category: searchParams.get('category') || '',
          ordering: searchParams.get('ordering') || '',
        };
        const data = await productService.getProducts(params);
        setProducts(data.results || []);
        setTotalPages(Math.ceil((data.count || 0) / 12));
      } catch (err) {
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [page, searchParams]);

  return (
    <div className="product-listing container">
      <aside className="filters">
        <ProductFilter />
      </aside>

      <main className="products">
        <h1>All Products</h1>
        {loading ? (
          <Loader />
        ) : (
          <>
            <ProductGrid products={products} />
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </>
        )}
      </main>
    </div>
  );
};

export default ProductListing;