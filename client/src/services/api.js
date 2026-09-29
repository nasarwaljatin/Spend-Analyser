import axios from 'axios';

const rawApiUrl = import.meta.env.VITE_API_URL || 'https://spend-analyser-8id9.onrender.com/api';
// Normalize: strip trailing slash and ensure /api prefix
const cleanUrl = rawApiUrl.replace(/\/+$/, '');
const API_URL = cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export { API_URL };

// Request interceptor — attach access token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      config.headers['x-refresh-token'] = refreshToken;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Avoid infinite loop on auth routes
    const isAuthRoute =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/register') ||
      originalRequest?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true;

      try {
        const storedRefreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post(
          `${API_URL}/auth/refresh`,
          { refreshToken: storedRefreshToken },
          {
            withCredentials: true,
            headers: {
              'Content-Type': 'application/json',
              ...(storedRefreshToken ? { 'x-refresh-token': storedRefreshToken } : {}),
            },
          }
        );

        if (data?.accessToken) {
          localStorage.setItem('accessToken', data.accessToken);
          if (data.refreshToken) {
            localStorage.setItem('refreshToken', data.refreshToken);
          }
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshErr) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        if (
          typeof window !== 'undefined' &&
          !window.location.pathname.startsWith('/login') &&
          !window.location.pathname.startsWith('/register') &&
          !window.location.pathname.startsWith('/auth/callback')
        ) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
