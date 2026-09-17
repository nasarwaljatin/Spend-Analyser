import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import Toast from './components/common/Toast';
import useAuthStore from './store/authStore';
import useThemeStore from './store/themeStore';

export default function App() {
  const { checkAuth } = useAuthStore();
  const { theme } = useThemeStore();

  useEffect(() => {
    // Sync theme on HTML document
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    // Verify existing token or session
    checkAuth();
  }, [checkAuth]);

  return (
    <>
      <RouterProvider router={router} />
      <Toast />
    </>
  );
}
