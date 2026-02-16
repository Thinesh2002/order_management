import axios from 'axios';

export const API_BASE_URL = "http://localhost:2000";

const API = axios.create({
  baseURL: 'http://localhost:2000/api' 
});


API.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export default API;
