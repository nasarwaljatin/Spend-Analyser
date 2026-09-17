import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IoMailOutline, IoLockClosedOutline, IoLogoGoogle, IoLogoGithub } from 'react-icons/io5';
import useAuthStore from '../store/authStore';
import useToastStore from '../store/toastStore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const { addToast } = useToastStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      addToast({ type: 'warning', message: 'Please enter both email and password' });
      return;
    }

    setLoading(true);
    try {
      await login({ email, password });
      addToast({ type: 'success', message: 'Logged in successfully! Welcome back.' });
      navigate('/');
    } catch (err) {
      addToast({
        type: 'error',
        message: err.response?.data?.error || 'Login failed. Please check your credentials.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setEmail('demo@spendanalyser.com');
    setPassword('Demo@1234');
    setLoading(true);
    try {
      await login({ email: 'demo@spendanalyser.com', password: 'Demo@1234' });
      addToast({ type: 'success', message: 'Logged in as Demo User!' });
      navigate('/');
    } catch (err) {
      addToast({
        type: 'error',
        message: err.response?.data?.error || 'Demo login failed. Make sure database is seeded.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = (provider) => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    window.location.href = `${apiUrl}/auth/${provider}`;
  };

  return (
    <div className="auth-container">
      <div className="card auth-card">
        <div className="auth-header">
          <div className="sidebar-logo-icon" style={{ margin: '0 auto 16px', width: 52, height: 52, fontSize: '1.8rem' }}>
            💳
          </div>
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">Sign in to manage your finances & smart analytics</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <div style={{ position: 'relative' }}>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ paddingLeft: '40px' }}
              />
              <IoMailOutline
                size={18}
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}
              />
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label className="form-label" htmlFor="password" style={{ marginBottom: 0 }}>Password</label>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingLeft: '40px' }}
              />
              <IoLockClosedOutline
                size={18}
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '8px' }}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <button
            type="button"
            onClick={handleDemoLogin}
            className="btn btn-secondary"
            style={{ width: '100%', marginTop: '10px' }}
            disabled={loading}
          >
            ⚡ One-Click Demo Login
          </button>
        </form>

        <div className="auth-divider">or continue with</div>

        <div className="oauth-buttons">
          <button
            type="button"
            className="oauth-btn"
            onClick={() => handleOAuth('google')}
          >
            <IoLogoGoogle size={18} color="#ea4335" />
            Google
          </button>
          <button
            type="button"
            className="oauth-btn"
            onClick={() => handleOAuth('github')}
          >
            <IoLogoGithub size={18} />
            GitHub
          </button>
        </div>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ fontWeight: 600, color: 'var(--primary-light)' }}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
