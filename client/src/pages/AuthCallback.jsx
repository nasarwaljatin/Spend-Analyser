import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import useToastStore from '../store/toastStore';
import Loader from '../components/common/Loader';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { checkAuth } = useAuthStore();
  const { addToast } = useToastStore();
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const handleAuth = async () => {
      const token = searchParams.get('token');
      const error = searchParams.get('error');

      if (error) {
        addToast({
          type: 'error',
          message: decodeURIComponent(error) || 'Social login failed. Please try again.',
        });
        navigate('/login', { replace: true });
        return;
      }

      if (token) {
        try {
          localStorage.setItem('accessToken', token);
          await checkAuth();
          addToast({
            type: 'success',
            message: 'Successfully logged in!',
          });
          navigate('/', { replace: true });
        } catch {
          localStorage.removeItem('accessToken');
          addToast({
            type: 'error',
            message: 'Failed to complete authentication.',
          });
          navigate('/login', { replace: true });
        }
      } else {
        navigate('/login', { replace: true });
      }
    };

    handleAuth();
  }, [searchParams, navigate, checkAuth, addToast]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', gap: '16px' }}>
      <Loader size={48} />
      <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-base)' }}>
        Completing sign in...
      </p>
    </div>
  );
}
