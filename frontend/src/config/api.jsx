import axios from 'axios';

const API = axios.create({
  baseURL: 'https://orders.api.teckvora.com/api' 
});


API.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export default API;
