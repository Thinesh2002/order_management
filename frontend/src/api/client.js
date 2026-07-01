import axios from 'axios';
import { clearSession, getToken } from '../auth/authStorage';

const api = axios.create({
  baseURL: 'https://orders.api.teckvora.com/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const currentPath = window.location.pathname;

    if (status === 401 && currentPath !== '/login') {
      clearSession();
      const redirect = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
      window.location.replace(`/login?redirect=${redirect}`);
    }

    return Promise.reject(error);
  }
);

export function unwrap(response) {
  return response.data;
}

export default api;
