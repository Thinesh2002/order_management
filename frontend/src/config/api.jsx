import axios from 'axios';

export const SKU_IMAGE_API_BASE_URL ="https://backend.teckvora.com/";

const API = axios.create({
  baseURL: 'https://orders.api.teckvora.com/api' 
});


API.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export default API;
