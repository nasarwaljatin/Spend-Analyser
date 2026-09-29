import { create } from 'zustand';
import { authService } from '../services/authService';

const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),

  login: async (credentials) => {
    const { data } = await authService.login(credentials);
    if (data.accessToken) {
      localStorage.setItem('accessToken', data.accessToken);
    }
    if (data.refreshToken) {
      localStorage.setItem('refreshToken', data.refreshToken);
    }
    set({ user: data.user, isAuthenticated: true, isLoading: false });
    return data;
  },

  register: async (userData) => {
    const { data } = await authService.register(userData);
    if (data.accessToken) {
      localStorage.setItem('accessToken', data.accessToken);
    }
    if (data.refreshToken) {
      localStorage.setItem('refreshToken', data.refreshToken);
    }
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
    localStorage.removeItem('refreshToken');
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    if (!token && !refreshToken) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }
    try {
      const { data } = await authService.getMe();
      set({ user: data, isAuthenticated: true, isLoading: false });
    } catch {
      // If token expired, try silent refresh
      if (refreshToken) {
        try {
          const { data: refreshData } = await authService.refresh(refreshToken);
          if (refreshData?.accessToken) {
            localStorage.setItem('accessToken', refreshData.accessToken);
            if (refreshData.refreshToken) {
              localStorage.setItem('refreshToken', refreshData.refreshToken);
            }
            const { data: userData } = await authService.getMe();
            set({ user: userData, isAuthenticated: true, isLoading: false });
            return;
          }
        } catch {
          // Refresh also failed
        }
      }
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
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
