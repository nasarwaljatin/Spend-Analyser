import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import Toast from './components/common/Toast';
import useAuthStore from './store/authStore';
import useThemeStore from './store/themeStore';
import { App as CapApp } from '@capacitor/app';

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

  useEffect(() => {
    // Listen for deep link events (e.g. spendwise://auth/callback?token=...)
    let listenerHandle = null;

    const setupDeepLinks = async () => {
      try {
        listenerHandle = await CapApp.addListener('appUrlOpen', async (event) => {
          const urlStr = event.url;
          if (urlStr && urlStr.includes('auth/callback')) {
            try {
              const url = new URL(urlStr);
              const token = url.searchParams.get('token');
              if (token) {
                localStorage.setItem('accessToken', token);
                await checkAuth();
                router.navigate('/');
              }
            } catch (err) {
              console.error('Failed to parse deep link URL:', err);
            }
          }
        });
      } catch {
        // Not in Capacitor environment
      }
    };

    setupDeepLinks();

    return () => {
      if (listenerHandle && listenerHandle.remove) {
        listenerHandle.remove();
      }
    };
  }, [checkAuth]);

  return (
    <>
      <RouterProvider router={router} />
      <Toast />
    </>
  );
}
