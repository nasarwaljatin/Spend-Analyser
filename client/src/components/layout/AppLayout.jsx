import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileBottomNav from './MobileBottomNav';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="app-main">
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="app-content-wrapper">
          <Outlet />
        </main>
        <MobileBottomNav onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      </div>
    </div>
  );
}

