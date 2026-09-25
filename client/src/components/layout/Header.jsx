import { IoMenuOutline, IoLogOutOutline, IoPersonCircleOutline } from 'react-icons/io5';
import ThemeToggle from '../common/ThemeToggle';
import useAuthStore from '../../store/authStore';

export default function Header({ onMenuToggle }) {
  const { user, logout } = useAuthStore();

  return (
    <header className="app-header">
      <div className="header-left">
        <button
          type="button"
          className="btn btn-ghost btn-icon mobile-menu-btn"
          onClick={onMenuToggle}
          aria-label="Open navigation menu"
        >
          <IoMenuOutline size={24} />
        </button>
        <div className="header-title-container">
          <h1 className="header-greeting">
            Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''} <span className="header-greeting-wave">👋</span>
          </h1>
        </div>
      </div>

      <div className="header-right">
        <ThemeToggle />
        <div className="header-user-badge" title={user?.name || 'User Profile'}>
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="header-avatar-img"
            />
          ) : (
            <IoPersonCircleOutline size={26} className="header-avatar-icon" />
          )}
          <span className="header-user-name">
            {user?.name || 'User'}
          </span>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-icon header-logout-btn"
          onClick={logout}
          title="Logout"
          aria-label="Logout"
        >
          <IoLogOutOutline size={20} />
        </button>
      </div>
    </header>
  );
}

