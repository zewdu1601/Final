import api from './api';

export const createOrder = async ({ shippingAddress, paymentMethod, items }) => {
  const response = await api.post('/orders/', {
    shipping_address: shippingAddress,
    payment_method: paymentMethod,
    items: items.map(({ product, quantity }) => ({
      product_id: product.id,
      quantity,
    })),
  });
  return response.data;
};

export const getOrders = async () => {
  const response = await api.get('/orders/');
  return response.data;
};

export const getOrderById = async (id) => {
  const response = await api.get(`/orders/${id}`);
  return response.data;
};

export const getOrderNotifications = async () => {
  const response = await api.get('/orders/notifications');
  return response.data;
};

export const markOrderNotificationsRead = async () => {
  await api.patch('/orders/notifications/read');
};