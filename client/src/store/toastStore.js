import { create } from 'zustand';

const useToastStore = create((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = Date.now();
    const newToast = { id, duration: 4000, ...toast };
    set((state) => ({ toasts: [...state.toasts, newToast] }));

    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, newToast.duration);

    return id;
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  success: (message) => {
    const id = Date.now();
    set((state) => ({
      toasts: [...state.toasts, { id, type: 'success', message, duration: 4000 }],
    }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },

  error: (message) => {
    const id = Date.now();
    set((state) => ({
      toasts: [...state.toasts, { id, type: 'error', message, duration: 5000 }],
    }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 5000);
  },
}));

export default useToastStore;
