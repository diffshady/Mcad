import { useEffect, useMemo, useState } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import AppIcon from './AppIcon';

export default function Layout({ title, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [showAllNotifs, setShowAllNotifs] = useState(false);
  const [notifications, setNotifications] = useState({ total: 0, items: [] });
  const [readMap, setReadMap] = useState({});
  const { user } = useAuth();

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const relativeTime = (value) => {
    if (!value) return '';
    const diffMin = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d ago`;
  };

  const readStorageKey = useMemo(
    () => (user?._id ? `mcad_notif_read_${user._id}` : null),
    [user?._id]
  );

  useEffect(() => {
    if (!readStorageKey) return;
    try {
      const raw = localStorage.getItem(readStorageKey);
      setReadMap(raw ? JSON.parse(raw) : {});
    } catch {
      setReadMap({});
    }
  }, [readStorageKey]);

  const persistReadMap = (nextMap) => {
    setReadMap(nextMap);
    if (!readStorageKey) return;
    try {
      localStorage.setItem(readStorageKey, JSON.stringify(nextMap));
    } catch {
      // ignore localStorage write errors
    }
  };

  const isUnread = (item) => {
    const readAt = readMap[item.id];
    if (!readAt) return true;
    return new Date(item.createdAt).getTime() > new Date(readAt).getTime();
  };

  const unreadCount = useMemo(
    () => (notifications?.items || []).filter(isUnread).length,
    [notifications, readMap]
  );

  const visibleItems = useMemo(
    () => (showAllNotifs ? (notifications?.items || []) : (notifications?.items || []).slice(0, 5)),
    [notifications, showAllNotifs]
  );

  const markAsRead = (itemId) => {
    const nextMap = { ...readMap, [itemId]: new Date().toISOString() };
    persistReadMap(nextMap);
  };

  useEffect(() => {
    let mounted = true;
    const fetchNotifications = async () => {
      setNotifLoading(true);
      try {
        const { data } = await api.get('/dashboard/notifications');
        if (mounted) setNotifications(data || { total: 0, items: [] });
      } catch {
        if (mounted) setNotifications({ total: 0, items: [] });
      } finally {
        if (mounted) setNotifLoading(false);
      }
    };

    fetchNotifications();
    const timer = setInterval(fetchNotifications, 60000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

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
            <div className="notif-wrap">
              <button className="notif-btn" onClick={() => setNotifOpen((v) => !v)}>
                <AppIcon name="publish" size={15} />
                {unreadCount > 0 && <span className="notif-count">{Math.min(unreadCount, 9)}+</span>}
              </button>

              {notifOpen && (
                <div className="notif-menu">
                  <div className="notif-header">Notifications</div>
                  {notifLoading ? (
                    <div className="notif-empty">Loading...</div>
                  ) : notifications.items?.length ? (
                    visibleItems.map((item) => (
                      <a
                        key={item.id}
                        href={item.link}
                        className={`notif-item ${isUnread(item) ? 'notif-item-unread' : ''}`}
                        onClick={() => {
                          markAsRead(item.id);
                          setNotifOpen(false);
                        }}
                      >
                        <div className="notif-title">{item.title}</div>
                        <div className="notif-message">{item.message}</div>
                        <div className="notif-time">{relativeTime(item.createdAt)}</div>
                      </a>
                    ))
                  ) : (
                    <div className="notif-empty">No new notifications</div>
                  )}

                  {!notifLoading && (notifications.items?.length || 0) > 5 && (
                    <button
                      type="button"
                      className="notif-see-more"
                      onClick={() => setShowAllNotifs((v) => !v)}
                    >
                      {showAllNotifs ? 'Show less' : 'See more'}
                    </button>
                  )}
                </div>
              )}
            </div>
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
          .notif-menu { right: -32px; width: min(86vw, 320px); }
        }
      `}</style>
    </div>
  );
}
