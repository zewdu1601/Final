import api from './api';

export const getProductReviews = async (productId) => {
  const response = await api.get(`/reviews/${productId}`);
  return response.data;
};

export const submitReview = async ({ productId, rating, comment }) => {
  const response = await api.post('/reviews/', {
    product_id: productId,
    rating,
    comment,
  });
  return response.data;
};