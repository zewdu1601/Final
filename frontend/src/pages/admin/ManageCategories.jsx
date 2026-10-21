import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import adminService from '../../services/adminService';
import './Admin.css';

const ManageCategories = () => {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ name: '', slug: '', description: '', icon: '' });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [categoryData, productData] = await Promise.all([
        adminService.getCategories(),
        adminService.getProducts(),
      ]);
      setCategories(categoryData);
      setProducts(productData);
    } catch (error) {
      toast.error(error.response?.data?.detail || error.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({ name: '', slug: '', description: '', icon: '' });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const category = {
      ...form,
      name: form.name.trim(),
      slug: form.slug.trim() || form.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      description: form.description.trim() || null,
      icon: form.icon.trim() || null,
    };
    try {
      if (editingId) {
        const updated = await adminService.updateCategory(editingId, category);
        setCategories((current) => current.map((entry) => entry.id === editingId ? updated : entry));
        toast.success('Category updated');
      } else {
        const created = await adminService.createCategory(category);
        setCategories((current) => [...current, created]);
        toast.success('Category added');
      }
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || error.message || 'Could not save category');
    }
  };

  const handleDelete = async (id, catName) => {
    if (!window.confirm(`Delete "${catName}"?`)) return;
    try {
      await adminService.deleteCategory(id);
      setCategories((current) => current.filter((c) => c.id !== id));
      toast.success('Category deleted');
    } catch (error) {
      toast.error(error.response?.data?.detail || error.message || 'Delete failed');
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Manage Categories</h1>
        <p>Organize your products into categories</p>
      </div>

      <div className="category-layout">
        {/* Add Form */}
        <form className="category-form" onSubmit={handleSubmit}>
          <h2>{editingId ? 'Edit Category' : 'Add New Category'}</h2>
          <div className="form-group">
            <label htmlFor="category-name">Category Name</label>
            <input
              id="category-name"
              value={form.name}
              onChange={(e) => setForm((current) => ({ ...current, name: e.target.value, slug: editingId ? current.slug : e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }))}
              placeholder="e.g. Electronics"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="category-slug">URL slug</label>
            <input id="category-slug" value={form.slug} onChange={(e) => setForm((current) => ({ ...current, slug: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label htmlFor="category-description">Description</label>
            <textarea id="category-description" rows="3" value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} />
          </div>
          <div className="form-group">
            <label htmlFor="category-icon">Icon (emoji)</label>
            <input id="category-icon" value={form.icon} onChange={(e) => setForm((current) => ({ ...current, icon: e.target.value }))} maxLength={50} />
          </div>
          <button type="submit" className="btn btn-primary">
            {editingId ? 'Save Category' : '➕ Add Category'}
          </button>
          {editingId && <button type="button" className="btn btn-outline" onClick={resetForm}>Cancel edit</button>}
        </form>

        {/* Category List */}
        <div className="category-list">
          <h2>Existing Categories ({categories.length})</h2>
          {loading ? (
            <p className="loading-text">Loading...</p>
          ) : categories.length === 0 ? (
            <p className="empty-text">No categories yet.</p>
          ) : (
            <div className="category-items">
              {categories.map((c) => (
                <div key={c.id} className="category-item">
                  <span className="category-name">{c.name}</span>
                  <span className="category-count">
                    {products.filter((product) => product.category_id === c.id).length} products
                  </span>
                  <button className="btn-icon edit" type="button" title="Edit category" onClick={() => { setEditingId(c.id); setForm({ name: c.name, slug: c.slug, description: c.description || '', icon: c.icon || '' }); }}>✏️</button>
                  <button
                    className="btn-icon delete"
                    onClick={() => handleDelete(c.id, c.name)}
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageCategories;