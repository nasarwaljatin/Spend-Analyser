import api from './api';

export const goalService = {
  getAll: () => api.get('/goals'),
  create: (data) => api.post('/goals', data),
  update: (id, data) => api.put(`/goals/${id}`, data),
  contribute: (id, amount) => api.post(`/goals/${id}/contribute`, { amount }),
  delete: (id) => api.delete(`/goals/${id}`),
};
