import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminService from '../../services/adminService';
import './Admin.css';

const ManageProducts = ({ inventoryMode = false }) => {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminService.getProducts();
      setProducts(data);
    } catch (error) {
      toast.error(error.response?.data?.detail || error.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await adminService.deleteProduct(id);
      setProducts((current) => current.filter((p) => p.id !== id));
      toast.success('Product deleted');
    } catch (error) {
      toast.error(error.response?.data?.detail || error.message || 'Delete failed');
    }
  };

  const filtered = products.filter((p) => (
    `${p.name} ${p.category?.name || ''}`.toLowerCase().includes(search.toLowerCase())
  ));

  return (
    <div className="admin-page">
      <div className="admin-header with-action">
        <div>
          <h1>{inventoryMode ? 'Inventory / Stock' : 'Manage Products'}</h1>
          <p>{inventoryMode ? 'Monitor stock levels and update product quantities.' : `${products.length} products in your store`}</p>
        </div>
        {!inventoryMode && (
          <Link to="/admin/products/add" className="btn btn-primary">
            ➕ Add Product
          </Link>
        )}
      </div>

      <div className="table-toolbar">
        <input
          className="search-input"
          placeholder={inventoryMode ? '🔍 Search inventory...' : '🔍 Search products...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="loading-text">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="empty-text">No products found.</p>
      ) : (
        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>{inventoryMode ? 'Stock action' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <img src={p.image} alt={p.name} className="table-thumb" />
                  </td>
                  <td>{p.name}</td>
                  <td>{p.category?.name || 'Uncategorized'}</td>
                  <td className="price-cell">${Number(p.price).toFixed(2)}</td>
                  <td>
                    <span className={`stock-badge ${p.stock < 10 ? 'low' : 'ok'}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <Link
                        to={`/admin/products/edit/${p.id}`}
                        className="btn-icon edit"
                        title={inventoryMode ? 'Update stock' : 'Edit product'}
                        aria-label={inventoryMode ? `Update stock for ${p.name}` : `Edit ${p.name}`}
                      >
                        {inventoryMode ? '📦' : '✏️'}
                      </Link>
                      {!inventoryMode && (
                        <button
                          type="button"
                          className="btn-icon delete"
                          onClick={() => handleDelete(p.id, p.name)}
                          title="Delete"
                          aria-label={`Delete ${p.name}`}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ManageProducts;