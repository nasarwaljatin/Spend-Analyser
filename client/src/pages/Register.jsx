import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IoMailOutline, IoLockClosedOutline, IoPersonOutline, IoLogoGoogle, IoLogoGithub } from 'react-icons/io5';
import useAuthStore from '../store/authStore';
import useToastStore from '../store/toastStore';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [preferredCurrency, setPreferredCurrency] = useState('INR');
  const [loading, setLoading] = useState(false);

  const { register } = useAuthStore();
  const { addToast } = useToastStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      addToast({ type: 'warning', message: 'Passwords do not match' });
      return;
    }

    if (password.length < 8) {
      addToast({ type: 'warning', message: 'Password must be at least 8 characters long' });
      return;
    }

    setLoading(true);
    try {
      await register({ name, email, password, preferredCurrency });
      addToast({ type: 'success', message: 'Account created successfully! Welcome to Spend Analyser.' });
      navigate('/');
    } catch (err) {
      addToast({
        type: 'error',
        message: err.response?.data?.error || 'Registration failed. Please try again.',
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
            ✨
          </div>
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Take control of your financial freedom today</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="name">Full Name</label>
            <div style={{ position: 'relative' }}>
              <input
                id="name"
                type="text"
                className="form-input"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{ paddingLeft: '40px' }}
              />
              <IoPersonOutline
                size={18}
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}
              />
            </div>
          </div>

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
            <label className="form-label" htmlFor="currency">Preferred Currency</label>
            <select
              id="currency"
              className="form-input form-select"
              value={preferredCurrency}
              onChange={(e) => setPreferredCurrency(e.target.value)}
            >
              <option value="INR">₹ INR - Indian Rupee</option>
              <option value="USD">$ USD - US Dollar</option>
              <option value="EUR">€ EUR - Euro</option>
              <option value="GBP">£ GBP - British Pound</option>
              <option value="AED">د.إ AED - UAE Dirham</option>
              <option value="CAD">CA$ CAD - Canadian Dollar</option>
              <option value="AUD">A$ AUD - Australian Dollar</option>
              <option value="SGD">S$ SGD - Singapore Dollar</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                style={{ paddingLeft: '40px' }}
              />
              <IoLockClosedOutline
                size={18}
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="confirmPassword"
                type="password"
                className="form-input"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
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
            {loading ? 'Creating account...' : 'Create Account'}
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
          Already have an account?{' '}
          <Link to="/login" style={{ fontWeight: 600, color: 'var(--primary-light)' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
