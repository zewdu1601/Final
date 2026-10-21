import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminService from '../../services/adminService';
import './Admin.css';

const emptyProduct = {
  name: '',
  description: '',
  price: '',
  stock: '',
  image: '',
  category_id: '',
};

const ProductEditor = ({ productId }) => {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyProduct);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(Boolean(productId));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      adminService.getCategories(),
      productId ? adminService.getProductById(productId) : Promise.resolve(null),
    ])
      .then(([availableCategories, product]) => {
        if (!active) return;
        setCategories(availableCategories);
        if (product) {
          setForm({
            name: product.name || '',
            description: product.description || '',
            price: String(product.price ?? ''),
            stock: String(product.stock ?? 0),
            image: product.image || '',
            category_id: product.category_id ? String(product.category_id) : '',
          });
        }
      })
      .catch((error) => toast.error(error.response?.data?.detail || error.message || 'Could not load product form data'))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [productId]);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    const product = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      stock: Number(form.stock),
      image: form.image.trim() || null,
      category_id: form.category_id ? Number(form.category_id) : null,
    };

    try {
      if (productId) {
        await adminService.updateProduct(productId, product);
        toast.success('Product updated successfully');
      } else {
        await adminService.createProduct(product);
        toast.success('Product added successfully');
      }
      navigate('/admin/products');
    } catch (error) {
      toast.error(error.response?.data?.detail || error.message || 'Could not save product');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="admin-page"><p className="loading-text">Loading product...</p></div>;

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>{productId ? 'Edit Product' : 'Add Product'}</h1>
        <p>Manage catalog information, pricing, category, image, and inventory.</p>
      </div>
      <form className="product-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-left">
            <div className="form-group">
              <label htmlFor="product-name">Product name</label>
              <input id="product-name" name="name" value={form.name} onChange={handleChange} required maxLength={255} />
            </div>
            <div className="form-group">
              <label htmlFor="product-description">Description</label>
              <textarea id="product-description" name="description" rows="5" value={form.description} onChange={handleChange} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="product-price">Price ($)</label>
                <input id="product-price" type="number" name="price" min="0.01" step="0.01" value={form.price} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="product-stock">Stock quantity</label>
                <input id="product-stock" type="number" name="stock" min="0" step="1" value={form.stock} onChange={handleChange} required />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="product-category">Category</label>
              <select id="product-category" name="category_id" value={form.category_id} onChange={handleChange}>
                <option value="">Uncategorized</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="product-image">Image URL</label>
              <input id="product-image" type="text" name="image" value={form.image} onChange={handleChange} placeholder="https://... or /products/image.svg" />
            </div>
          </div>
          <div className="form-right">
            <label className="image-label">Image preview</label>
            <div className="image-upload-box">
              {form.image ? <img src={form.image} alt="Product preview" className="image-preview" /> : <div className="image-placeholder"><span>🖼️</span><p>Enter an image URL to preview</p></div>}
            </div>
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-outline" onClick={() => navigate('/admin/products')}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : productId ? 'Save Changes' : 'Create Product'}</button>
        </div>
      </form>
    </div>
  );
};

export default ProductEditor;
