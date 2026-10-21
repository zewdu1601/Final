import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json' },
});

export const adminApi = axios.create({
  baseURL: process.env.REACT_APP_DJANGO_API_URL || 'http://localhost:8001/api',
  headers: { 'Content-Type': 'application/json' },
});

const configureInterceptors = (client) => {
  client.interceptors.request.use((config) => {
    const token = localStorage.getItem('aiStoreToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      const isAuthSessionRequest = /\/auth\/(login|logout)$/.test(error.config?.url || '');
      if (error.response?.status === 401 && !isAuthSessionRequest) {
        window.dispatchEvent(new Event('aiStoreAuthExpired'));
      }
      return Promise.reject(error);
    },
  );
};

configureInterceptors(api);
configureInterceptors(adminApi);

export const getApiErrorMessage = (error) => {
  const responseData = error.response?.data;
  const detail = responseData?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((item) => item.msg).join(', ');
  if (responseData && typeof responseData === 'object') {
    const fieldErrors = Object.entries(responseData).flatMap(([field, messages]) => {
      const errors = Array.isArray(messages) ? messages : [messages];
      return errors
        .filter((message) => typeof message === 'string')
        .map((message) => `${field === 'non_field_errors' ? '' : `${field}: `}${message}`);
    });
    if (fieldErrors.length) return fieldErrors.join(', ');
  }
  return error.message || 'The request could not be completed.';
};

export default api;