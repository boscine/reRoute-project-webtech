import React from 'react';
import { NavLink } from 'react-router-dom';
import api from '../api';

export default function Sidebar({ currentAdmin }) {
  const navItems = [
    { label: 'Dashboard', icon: 'dashboard', to: '/' },
    { label: 'Admins', icon: 'manage_accounts', to: '/admins' },
    { label: 'Network', icon: 'lan', to: '/network' },
  ];

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error(e);
    } finally {
      window.location.href = 'http://localhost:5173/login';
    }
  };

  return (
    <aside className="w-64 bg-primary-container min-h-screen flex flex-col fixed left-0 top-0 bottom-0 z-30">
      {/* Brand Header */}
      <div className="flex items-center gap-sm px-md py-lg border-b border-white/10">
        <div className="h-9 w-9 bg-secondary rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-on-secondary" style={{ fontSize: '20px' }}>router</span>
        </div>
        <div>
          <p className="font-sans text-body-lg font-semibold text-on-primary">ReRoute</p>
          <p className="font-sans text-label-sm text-on-primary-container">Admin Portal</p>
        </div>
      </div>

      {/* Current Admin Badge */}
      {currentAdmin && (
        <div className="mx-sm mt-sm p-xs bg-white/5 rounded-lg border border-white/10">
          <p className="text-label-sm text-on-primary-container uppercase tracking-wider">Logged In As</p>
          <p className="text-body-md text-white font-medium truncate">{currentAdmin.name}</p>
          <p className="text-label-sm text-on-primary-container capitalize">{currentAdmin.role?.replace('_', ' ')}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-md space-y-1">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-sm px-md py-xs font-sans text-body-md rounded-lg mx-sm transition-colors ${
                isActive ? 'bg-secondary text-on-secondary' : 'text-on-primary-container hover:bg-white/10'
              }`
            }
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Logout button */}
      <div className="border-t border-white/10 p-md">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-sm px-md py-xs font-sans text-body-md text-red-300 hover:text-red-100 hover:bg-red-900/30 rounded-lg transition-colors text-left"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>logout</span>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
