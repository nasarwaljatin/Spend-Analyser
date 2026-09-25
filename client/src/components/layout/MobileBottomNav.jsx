import { NavLink } from 'react-router-dom';
import {
  IoGridOutline,
  IoSwapHorizontalOutline,
  IoWalletOutline,
  IoBarChartOutline,
  IoMenuOutline,
} from 'react-icons/io5';

export default function MobileBottomNav({ onMenuToggle }) {
  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      <NavLink
        to="/"
        className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
        end
      >
        <span className="mobile-nav-icon"><IoGridOutline /></span>
        <span className="mobile-nav-label">Dashboard</span>
      </NavLink>

      <NavLink
        to="/transactions"
        className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
      >
        <span className="mobile-nav-icon"><IoSwapHorizontalOutline /></span>
        <span className="mobile-nav-label">Spends</span>
      </NavLink>

      <NavLink
        to="/budgets"
        className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
      >
        <span className="mobile-nav-icon"><IoWalletOutline /></span>
        <span className="mobile-nav-label">Budgets</span>
      </NavLink>

      <NavLink
        to="/reports"
        className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
      >
        <span className="mobile-nav-icon"><IoBarChartOutline /></span>
        <span className="mobile-nav-label">Reports</span>
      </NavLink>

      <button
        type="button"
        className="mobile-nav-item mobile-nav-menu-btn"
        onClick={onMenuToggle}
        aria-label="Open Full Menu"
      >
        <span className="mobile-nav-icon"><IoMenuOutline /></span>
        <span className="mobile-nav-label">Menu</span>
      </button>
    </nav>
  );
}
