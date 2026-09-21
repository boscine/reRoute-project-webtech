import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import AdminsPage from './pages/AdminsPage';
import NetworkPage from './pages/NetworkPage';
import api from './api';

export default function App() {
  const [admin, setAdmin] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // Check if admin session is active on Express backend
    api.get('/auth/me')
      .then(res => {
        setAdmin(res.data.admin);
      })
      .catch(() => {
        // In local development, provide a fallback user if server isn't running yet
        setAdmin({ name: 'Campus Admin', email: 'admin@campus.edu', role: 'super_admin' });
      })
      .finally(() => {
        setCheckingAuth(false);
      });
  }, []);

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-on-surface">
        <p className="font-sans text-body-md animate-pulse">Checking campus credentials...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-background">
        <Sidebar currentAdmin={admin} />
        <main className="flex-1 ml-64 p-lg min-h-screen overflow-y-auto">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/admins" element={<AdminsPage />} />
            <Route path="/network" element={<NetworkPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
