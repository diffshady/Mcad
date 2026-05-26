import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BrandLogo from './BrandLogo';
import AppIcon from './AppIcon';

const navItems = [
  { to: '/dashboard', icon: 'dashboard', label: 'Dashboard', roles: ['admin', 'barangay_admin', 'imam', 'leader', 'viewer'] },
  { to: '/events', icon: 'events', label: 'Events', roles: ['admin', 'barangay_admin', 'imam', 'leader', 'viewer'] },
  { to: '/announcements', icon: 'announcements', label: 'Announcements', roles: ['admin', 'barangay_admin', 'imam', 'leader', 'viewer'] },
  { to: '/appointments', icon: 'appointments', label: 'Appointments', roles: ['admin', 'barangay_admin', 'imam', 'leader', 'viewer'] },
  { to: '/attendance', icon: 'attendance', label: 'Attendance', roles: ['admin', 'barangay_admin', 'imam', 'leader'] },
  { to: '/donations', icon: 'donations', label: 'Donations', roles: ['admin', 'barangay_admin', 'imam', 'leader', 'viewer'] },
  { to: '/reports', icon: 'reports', label: 'Reports', roles: ['admin', 'barangay_admin', 'imam', 'leader'] },
  { to: '/users', icon: 'users', label: 'User Management', roles: ['admin'] },
];

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const visible = navItems.filter((n) => n.roles.includes(user?.role));

  return (
    <>
      {open && <div className="sidebar-backdrop" onClick={onClose} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:99 }} />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <BrandLogo className="sidebar-org-logo" size={64} variant="light" />
          <div className="org-name">MCAD</div>
          <div className="org-sub">Muslim Concerns & Affairs Division<br/>City Mayor's Office — General Santos City</div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Navigation</div>
          {visible.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <span className="nav-icon"><AppIcon name={item.icon} size={16} /></span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <NavLink to="/profile" className={({ isActive }) => `sidebar-user ${isActive ? 'active' : ''}`} onClick={onClose} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="sidebar-avatar">{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sidebar-user-name">{user?.name}</div>
              <div className="sidebar-user-role">
                 {user?.role === 'admin' ? 'Admin' :
                  user?.role === 'barangay_admin' ? 'Barangay Admin' :
                 user?.role === 'imam' ? 'Imam / Mosque Admin' :
                 user?.role === 'leader' ? 'Community Leader' : 'Community Viewer'}
              </div>
            </div>
          </NavLink>
          <button className="btn-logout" onClick={handleLogout}><AppIcon name="logout" size={14} /> Sign Out</button>
        </div>
      </aside>
    </>
  );
}
