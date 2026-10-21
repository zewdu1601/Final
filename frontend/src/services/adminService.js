import api, { adminApi } from './api';

const notifyCatalogChanged = () => window.dispatchEvent(new Event('aiStoreCatalogChanged'));

export const getAdminMediaUrl = (path) => {
  if (!path) return '';
  const apiBase = new URL(adminApi.defaults.baseURL, window.location.origin);
  apiBase.pathname = apiBase.pathname.replace(/\/api\/?$/, '');
  return new URL(path, apiBase).toString();
};

const adminService = {
  async getDashboardStats() {
    return (await api.get('/admin/stats')).data;
  },
  async getAnalytics(params) {
    return (await api.get('/admin/analytics', { params })).data;
  },
  async getReports(params) {
    return (await api.get('/admin/reports', { params })).data;
  },
  async getRecommendationMonitoring() {
    return (await api.get('/admin/recommendations')).data;
  },
  async getProducts() {
    return (await api.get('/products/', { params: { limit: 1000 } })).data;
  },
  async getProductById(id) {
    return (await api.get(`/products/${id}`)).data;
  },
  async createProduct(product) {
    const response = await api.post('/products/', product);
    notifyCatalogChanged();
    return response.data;
  },
  async updateProduct(id, product) {
    const response = await api.patch(`/products/${id}`, product);
    notifyCatalogChanged();
    return response.data;
  },
  async deleteProduct(id) {
    const response = await api.delete(`/products/${id}`);
    notifyCatalogChanged();
    return response;
  },
  async getCategories() {
    return (await api.get('/categories/')).data;
  },
  async createCategory(category) {
    const response = await api.post('/categories/', category);
    notifyCatalogChanged();
    return response.data;
  },
  async updateCategory(id, category) {
    const response = await api.patch(`/categories/${id}`, category);
    notifyCatalogChanged();
    return response.data;
  },
  async deleteCategory(id) {
    const response = await api.delete(`/categories/${id}`);
    notifyCatalogChanged();
    return response;
  },
  async getOrders() {
    return (await api.get('/admin/orders')).data;
  },
  async updateOrder(id, update) {
    return (await api.patch(`/admin/orders/${id}`, update)).data;
  },
  async getUsers(params) {
    return (await adminApi.get('/admin/users', { params })).data;
  },
  async getUser(id) {
    return (await adminApi.get(`/admin/users/${id}`)).data;
  },
  async createUser(user) {
    return (await adminApi.post('/admin/users', user)).data;
  },
  async updateUser(id, user) {
    return (await adminApi.patch(`/admin/users/${id}`, user)).data;
  },
  async deleteUser(id) {
    return adminApi.delete(`/admin/users/${id}`);
  },
  async setUserActive(id, isActive) {
    return (await adminApi.patch(`/admin/users/${id}/active`, null, { params: { is_active: isActive } })).data;
  },
  async uploadUserPhoto(id, file) {
    const data = new FormData();
    data.append('photo', file);
    return (await adminApi.post(`/admin/users/${id}/photo`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })).data;
  },
  async getProfile() {
    return (await adminApi.get('/admin/profile')).data;
  },
  async updateProfile(profile) {
    return (await adminApi.patch('/admin/profile', profile)).data;
  },
  async uploadProfilePhoto(file) {
    const data = new FormData();
    data.append('photo', file);
    return (await adminApi.post('/admin/profile/photo', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })).data;
  },
  async changePassword(passwords) {
    return adminApi.post('/auth/change-password', passwords);
  },
  async getSettings() {
    return (await api.get('/admin/settings')).data;
  },
  async updateSettings(settings) {
    return (await api.put('/admin/settings', settings)).data;
  },
};

export default adminService;