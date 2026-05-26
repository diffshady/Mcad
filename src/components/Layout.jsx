import { useState } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';

export default function Layout({ title, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className="layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className="btn btn-ghost btn-icon"
              style={{ display: 'none' }}
              id="sidebar-toggle"
              onClick={() => setSidebarOpen(true)}
            >
              ☰
            </button>
            <span className="topbar-title">{title}</span>
          </div>
          <div className="topbar-right">
            <span className="topbar-date">{today}</span>
            <span style={{ fontSize: '0.78rem', background: 'rgba(26,92,58,0.1)', color: 'var(--primary)', padding: '3px 10px', borderRadius: 20, fontWeight: 600, textTransform: 'capitalize' }}>
              {user?.role === 'admin' ? 'Admin' :
              user?.role === 'barangay_admin' ? 'Barangay Admin' :
               user?.role === 'imam' ? 'Imam' :
               user?.role === 'leader' ? 'Community Leader' : 'Viewer'}
            </span>
          </div>
        </header>
        <main className="page-content">
          {children}
        </main>
      </div>

      <style>{`
        @media (max-width: 900px) {
          #sidebar-toggle { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
