import { useState, useEffect } from 'react';
import {
  IoPersonOutline,
  IoColorPaletteOutline,
  IoCashOutline,
  IoSaveOutline,
  IoShieldCheckmarkOutline,
} from 'react-icons/io5';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';
import useToastStore from '../store/toastStore';
import api from '../services/api';

const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
];

export default function Settings() {
  const { user, setUser } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const { addToast } = useToastStore();

  const [name, setName] = useState(user?.name || '');
  const [preferredCurrency, setPreferredCurrency] = useState(user?.preferredCurrency || 'INR');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPreferredCurrency(user.preferredCurrency || 'INR');
    }
  }, [user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.put('/auth/profile', { name, preferredCurrency, theme });
      setUser(res.data.user || { ...user, name, preferredCurrency, theme });
      addToast({ type: 'success', message: 'Preferences updated successfully!' });
    } catch (err) {
      addToast({
        type: 'error',
        message: err.response?.data?.error || 'Failed to update preferences',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content" style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, margin: 0 }}>Account & Preferences</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: '4px' }}>
          Personalize your appearance, base currency, and profile information
        </p>
      </div>

      <form onSubmit={handleSaveProfile}>
        {/* Profile Card */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div className="summary-card-icon" style={{ margin: 0, width: 40, height: 40 }}>
              <IoPersonOutline size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, margin: 0 }}>Profile Details</h2>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                Your personal account credentials
              </span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="settingsName">Full Name</label>
            <input
              id="settingsName"
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="settingsEmail">Email Address</label>
            <input
              id="settingsEmail"
              type="email"
              className="form-input"
              value={user?.email || ''}
              disabled
              style={{ opacity: 0.7, cursor: 'not-allowed' }}
            />
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
              Email address cannot be modified once registered.
            </span>
          </div>
        </div>

        {/* Currency Card */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div className="summary-card-icon" style={{ margin: 0, width: 40, height: 40 }}>
              <IoCashOutline size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, margin: 0 }}>Base Currency</h2>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                Preferred currency for displaying reports and totals
              </span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="settingsCurrency">Preferred Currency</label>
            <select
              id="settingsCurrency"
              className="form-input form-select"
              value={preferredCurrency}
              onChange={(e) => setPreferredCurrency(e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Appearance Card */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div className="summary-card-icon" style={{ margin: 0, width: 40, height: 40 }}>
              <IoColorPaletteOutline size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, margin: 0 }}>Theme & Appearance</h2>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                Switch between modern Dark mode and clean Light mode
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <button
              type="button"
              className="card"
              onClick={() => setTheme('dark')}
              style={{
                cursor: 'pointer',
                textAlign: 'center',
                padding: '20px',
                border: theme === 'dark' ? '2px solid var(--primary)' : '1px solid var(--border)',
                backgroundColor: '#0a0a1a',
                color: '#e2e8f0',
              }}
            >
              <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>🌙</div>
              <strong style={{ display: 'block', fontSize: 'var(--font-size-base)' }}>Dark Glassmorphism</strong>
              <span style={{ fontSize: 'var(--font-size-xs)', color: '#94a3b8' }}>
                Deep indigo night palette (Default)
              </span>
            </button>

            <button
              type="button"
              className="card"
              onClick={() => setTheme('light')}
              style={{
                cursor: 'pointer',
                textAlign: 'center',
                padding: '20px',
                border: theme === 'light' ? '2px solid var(--primary)' : '1px solid var(--border)',
                backgroundColor: '#ffffff',
                color: '#1e293b',
              }}
            >
              <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>☀️</div>
              <strong style={{ display: 'block', fontSize: 'var(--font-size-base)', color: '#1e293b' }}>Clean Light</strong>
              <span style={{ fontSize: 'var(--font-size-xs)', color: '#64748b' }}>
                Crisp daylight high-contrast palette
              </span>
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-lg"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center' }}
          disabled={loading}
        >
          <IoSaveOutline size={20} />
          <span>{loading ? 'Saving Changes...' : 'Save All Preferences'}</span>
        </button>
      </form>
    </div>
  );
}
