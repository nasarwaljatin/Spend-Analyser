import { create } from 'zustand';
import { authService } from '../services/authService';

const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),

  login: async (credentials) => {
    const { data } = await authService.login(credentials);
    localStorage.setItem('accessToken', data.accessToken);
    set({ user: data.user, isAuthenticated: true, isLoading: false });
    return data;
  },

  register: async (userData) => {
    const { data } = await authService.register(userData);
    localStorage.setItem('accessToken', data.accessToken);
    set({ user: data.user, isAuthenticated: true, isLoading: false });
    return data;
  },

  logout: async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore errors on logout
    }
    localStorage.removeItem('accessToken');
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }
    try {
      const { data } = await authService.getMe();
      set({ user: data, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem('accessToken');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  updateProfile: async (profileData) => {
    const { data } = await authService.updateMe(profileData);
    set({ user: data });
    return data;
  },
}));

export default useAuthStore;
