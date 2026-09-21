import api from './api';

export const categoryService = {
  getAll: (params = {}) => {
    const queryParams = typeof params === 'string' ? { type: params } : params;
    return api.get('/categories', { params: queryParams });
  },
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  toggleHide: (id, isHidden) => api.put(`/categories/${id}`, { isHidden }),
  delete: (id, reassignCategoryId) =>
    api.delete(`/categories/${id}`, { params: reassignCategoryId ? { reassignCategoryId } : {} }),
};
