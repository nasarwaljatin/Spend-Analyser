import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import useToastStore from '../store/toastStore';
import Loader from '../components/common/Loader';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { checkAuth } = useAuthStore();
  const { addToast } = useToastStore();
  const [statusMessage, setStatusMessage] = useState('Completing sign in...');
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    // Safety timeout: if auth takes longer than 8 seconds, redirect to login
    const timeoutId = setTimeout(() => {
      addToast({
        type: 'warning',
        message: 'Authentication took too long. Please try logging in again.',
      });
      navigate('/login', { replace: true });
    }, 8000);

    const handleAuth = async () => {
      try {
        // Look for token in query params or hash fragment
        let token = searchParams.get('token');
        let error = searchParams.get('error');

        if (!token && window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          token = hashParams.get('token') || hashParams.get('access_token');
          error = hashParams.get('error') || error;
        }

        if (error) {
          clearTimeout(timeoutId);
          addToast({
            type: 'error',
            message: decodeURIComponent(error) || 'Social authentication failed.',
          });
          navigate('/login', { replace: true });
          return;
        }

        if (token) {
          setStatusMessage('Setting up your session...');
          localStorage.setItem('accessToken', token);

          // Verify user session
          await checkAuth();

          clearTimeout(timeoutId);
          addToast({
            type: 'success',
            message: 'Signed in successfully! Welcome back.',
          });
          navigate('/', { replace: true });
        } else {
          clearTimeout(timeoutId);
          addToast({
            type: 'warning',
            message: 'No authentication token received.',
          });
          navigate('/login', { replace: true });
        }
      } catch (err) {
        clearTimeout(timeoutId);
        console.error('AuthCallback error:', err);
        localStorage.removeItem('accessToken');
        addToast({
          type: 'error',
          message: 'Failed to complete authentication. Please try again.',
        });
        navigate('/login', { replace: true });
      }
    };

    handleAuth();

    return () => clearTimeout(timeoutId);
  }, [searchParams, navigate, checkAuth, addToast]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        gap: '16px',
        padding: '24px',
        background: 'var(--bg-primary)',
      }}
    >
      <Loader size={48} />
      <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-base)', fontWeight: 500 }}>
        {statusMessage}
      </p>
    </div>
  );
}
