import api from './api';

export const reportService = {
  getMonthly: (year, month) => api.get('/reports/monthly', { params: { year, month } }),
  getYearly: (year) => api.get('/reports/yearly', { params: { year } }),
  getTrends: (months = 12) => api.get('/reports/trends', { params: { months } }),
  getNetSummary: (year) => api.get('/reports/net-summary', { params: { year } }),
};

export const budgetService = {
  getAll: () => api.get('/budgets'),
  getAlerts: () => api.get('/budgets/alerts'),
  create: (data) => api.post('/budgets', data),
  update: (id, data) => api.put(`/budgets/${id}`, data),
  delete: (id) => api.delete(`/budgets/${id}`),
};

export const recurringService = {
  getAll: () => api.get('/recurring'),
  create: (data) => api.post('/recurring', data),
  update: (id, data) => api.put(`/recurring/${id}`, data),
  delete: (id) => api.delete(`/recurring/${id}`),
  pause: (id) => api.post(`/recurring/${id}/pause`),
  resume: (id) => api.post(`/recurring/${id}/resume`),
};

export const exportService = {
  exportCSV: (params) => api.get('/export/csv', { params, responseType: 'blob' }),
  exportExcel: (params) => api.get('/export/excel', { params }),
};
