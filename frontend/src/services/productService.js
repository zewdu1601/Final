import api from './api';

const normalizeParams = (params = {}) => ({
  limit: 1000,
  ...params,
});

export const getProducts = async (params = {}) => {
  const response = await api.get('/products/', { params: normalizeParams(params) });
  return response.data;
};

export const getProductById = async (id) => {
  const response = await api.get(`/products/${id}`);
  return response.data;
};

export const getSimilarProducts = async (id, limit = 4) => {
  const response = await api.get(`/recommendations/similar/${id}`, {
    params: { top_n: limit },
  });
  return response.data;
};

export const getCategories = async () => {
  const response = await api.get('/categories/');
  return response.data;
};

const productService = {
  getProducts,
  getProductById,
  getSimilarProducts,
  getCategories,
};

export default productService;