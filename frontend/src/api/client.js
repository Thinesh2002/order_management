import axios from 'axios';

const api = axios.create({
  baseURL: 'https://orders.api.teckvora.com/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export function unwrap(response) {
  return response.data;
}

export default api;