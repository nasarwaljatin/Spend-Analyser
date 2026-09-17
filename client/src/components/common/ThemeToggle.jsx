import { IoSunny, IoMoon } from 'react-icons/io5';
import useThemeStore from '../../store/themeStore';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      className="btn btn-ghost btn-icon"
      onClick={toggleTheme}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      style={{ fontSize: '1.2rem' }}
    >
      {theme === 'dark' ? <IoSunny /> : <IoMoon />}
    </button>
  );
}
