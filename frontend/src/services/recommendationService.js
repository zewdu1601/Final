import api from './api';

export const getPersonalizedRecommendations = async () => {
  const response = await api.get('/recommendations/personalized');
  return response.data.products;
};

export const getTrendingProducts = async () => {
  const response = await api.get('/recommendations/trending');
  return response.data;
};