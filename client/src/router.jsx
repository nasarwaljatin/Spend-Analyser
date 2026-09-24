import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/common/ProtectedRoute';

import Login from './pages/Login';
import Register from './pages/Register';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Categories from './pages/Categories';
import Reports from './pages/Reports';
import Budgets from './pages/Budgets';
import Recurring from './pages/Recurring';
import Settings from './pages/Settings';
import DownloadApp from './pages/DownloadApp';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    path: '/download',
    element: <DownloadApp />,
  },
  {
    path: '/auth/callback',
    element: <AuthCallback />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'transactions',
        element: <Transactions />,
      },
      {
        path: 'categories',
        element: <Categories />,
      },
      {
        path: 'reports',
        element: <Reports />,
      },
      {
        path: 'budgets',
        element: <Budgets />,
      },
      {
        path: 'recurring',
        element: <Recurring />,
      },
      {
        path: 'settings',
        element: <Settings />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
