import axios from 'axios';
import { APP_URL } from '../api';

const api = axios.create({
  baseURL: APP_URL,
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// A way for non-React code (this file) to trigger navigation/logout
// without importing react-router hooks directly here.
let onUnauthorized = () => { window.location.href = '/login'; };
let onForbidden = () => { window.location.href = '/unauthorized'; };

export const setAuthHandlers = (handlers) => {
  if (handlers.onUnauthorized) onUnauthorized = handlers.onUnauthorized;
  if (handlers.onForbidden) onForbidden = handlers.onForbidden;
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.config?.skipAuthHandlers) {
      return Promise.reject(error);
    }

    const status = error.response?.status;

    if (status === 401) {
      // Token missing/invalid/expired — real logout
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userType');
      localStorage.removeItem('role');
      onUnauthorized();
    }

    if (status === 403) {
      // Valid session, wrong role/ownership — do NOT clear token
      onForbidden();
    }

    return Promise.reject(error);
  }
);

export default api;
