import { IoMenuOutline, IoLogOutOutline, IoPersonCircleOutline } from 'react-icons/io5';
import ThemeToggle from '../common/ThemeToggle';
import useAuthStore from '../../store/authStore';

export default function Header({ onMenuToggle }) {
  const { user, logout } = useAuthStore();

  return (
    <header className="app-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        <button
          className="btn btn-ghost btn-icon mobile-menu-btn"
          onClick={onMenuToggle}
          style={{ display: 'none' }}
        >
          <IoMenuOutline size={22} />
        </button>
        <div>
          <h1 style={{
            fontSize: 'var(--font-size-lg)',
            fontWeight: 700,
            letterSpacing: '-0.01em',
          }}>
            Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''} 👋
          </h1>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <ThemeToggle />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          padding: 'var(--space-2) var(--space-3)',
          borderRadius: 'var(--radius-full)',
          background: 'var(--glass)',
          border: '1px solid var(--border)',
        }}>
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              style={{ width: 28, height: 28, borderRadius: '50%' }}
            />
          ) : (
            <IoPersonCircleOutline size={28} style={{ color: 'var(--text-secondary)' }} />
          )}
          <span style={{
            fontSize: 'var(--font-size-sm)',
            fontWeight: 600,
            maxWidth: 120,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {user?.name || 'User'}
          </span>
        </div>
        <button
          className="btn btn-ghost btn-icon"
          onClick={logout}
          title="Logout"
        >
          <IoLogOutOutline size={20} />
        </button>
      </div>
    </header>
  );
}
