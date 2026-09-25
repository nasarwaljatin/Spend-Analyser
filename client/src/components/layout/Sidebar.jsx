import { NavLink } from 'react-router-dom';
import {
  IoGridOutline,
  IoSwapHorizontalOutline,
  IoFolderOutline,
  IoBarChartOutline,
  IoWalletOutline,
  IoRepeatOutline,
  IoSettingsOutline,
  IoCloseOutline,
  IoLogoAndroid,
} from 'react-icons/io5';

const navItems = [
  { label: 'Dashboard', path: '/', icon: <IoGridOutline /> },
  { label: 'Transactions', path: '/transactions', icon: <IoSwapHorizontalOutline /> },
  { label: 'Categories', path: '/categories', icon: <IoFolderOutline /> },
  { label: 'Reports', path: '/reports', icon: <IoBarChartOutline /> },
  { label: 'Budgets', path: '/budgets', icon: <IoWalletOutline /> },
  { label: 'Recurring', path: '/recurring', icon: <IoRepeatOutline /> },
];

export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? 'show' : ''}`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />
      <aside className={`app-sidebar ${isOpen ? 'open' : ''}`} aria-label="Sidebar Navigation">
        <div className="sidebar-logo">
          <div className="sidebar-logo-brand">
            <div className="sidebar-logo-icon">💰</div>
            <span className="sidebar-logo-text">SpendWise</span>
          </div>
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <IoCloseOutline size={22} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Main Menu</div>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
              end={item.path === '/'}
              onClick={onClose}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}

          <div className="sidebar-section-label" style={{ marginTop: 'var(--space-4)' }}>Account & More</div>
          <NavLink
            to="/settings"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <span className="sidebar-link-icon"><IoSettingsOutline /></span>
            <span>Settings</span>
          </NavLink>

          <NavLink
            to="/download"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <span className="sidebar-link-icon"><IoLogoAndroid /></span>
            <span>Download APK</span>
          </NavLink>
        </nav>
      </aside>
    </>
  );
}

