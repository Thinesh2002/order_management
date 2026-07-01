import api, { unwrap } from './client';

export const authApi = {
  login: (payload) => api.post('/auth/login', payload).then(unwrap),
  me: () => api.get('/auth/me').then(unwrap),
  logout: () => api.post('/auth/logout', {}).then(unwrap),
};
