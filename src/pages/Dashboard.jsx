import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { format } from 'date-fns';
import AppIcon from '../components/AppIcon';

const eventTypeBadge = (type) => {
  const map = { iftar: 'badge-gold', taraweeh: 'badge-green', charity: 'badge-blue', prayer: 'badge-blue', other: 'badge-gray' };
  return map[type] || 'badge-gray';
};

const formatPeso = (n) => {
  if (n >= 1_000_000_000) return `₱${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000)     return `₱${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)         return `₱${(n / 1_000).toFixed(1)}K`;
  return `₱${n.toLocaleString()}`;
};

const statusBadge = (status) => {
  const map = { upcoming: 'badge-blue', ongoing: 'badge-green', completed: 'badge-gray', cancelled: 'badge-red' };
  return map[status] || 'badge-gray';
};

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/stats')
      .then((res) => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <Layout title="Dashboard">
      <div className="loader"><div className="spinner"></div><span>Loading dashboard...</span></div>
    </Layout>
  );

  return (
    <Layout title="Dashboard">
      <div className="page-header">
        <div>
          <div className="page-title">
            Assalamu Alaikum, {user?.name?.split(' ')[0]} <AppIcon name="greeting" size={18} className="inline-icon" />
          </div>
          <div className="page-subtitle">Here's an overview of MCAD community programs</div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card green">
          <div className="stat-icon"><AppIcon name="events" size={30} /></div>
          <div className="stat-value">{stats?.totalEvents ?? 0}</div>
          <div className="stat-label">Total Events</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon"><AppIcon name="upcoming" size={30} /></div>
          <div className="stat-value">{stats?.upcomingEvents ?? 0}</div>
          <div className="stat-label">Upcoming Events</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon"><AppIcon name="ongoing" size={30} /></div>
          <div className="stat-value">{stats?.ongoingEvents ?? 0}</div>
          <div className="stat-label">Ongoing Events</div>
        </div>
        <div className="stat-card gold">
          <div className="stat-icon"><AppIcon name="completed" size={30} /></div>
          <div className="stat-value">{stats?.completedEvents ?? 0}</div>
          <div className="stat-label">Completed Events</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon"><AppIcon name="attendees" size={30} /></div>
          <div className="stat-value">{stats?.totalAttendance ?? 0}</div>
          <div className="stat-label">Total Attendance</div>
        </div>
        <div className="stat-card gold">
          <div className="stat-icon"><AppIcon name="cash" size={30} /></div>
          <div className="stat-value" style={{ fontSize: 'clamp(1rem, 2.5vw, 1.6rem)', wordBreak: 'break-all' }}>{formatPeso(stats?.totalCash ?? 0)}</div>
          <div className="stat-label">Total Cash Donations</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon"><AppIcon name="donation" size={30} /></div>
          <div className="stat-value">{stats?.totalDonations ?? 0}</div>
          <div className="stat-label">Donation Records</div>
        </div>
        {isAdmin && (
          <div className="stat-card orange">
            <div className="stat-icon"><AppIcon name="pending" size={30} /></div>
            <div className="stat-value">{stats?.pendingUsers ?? 0}</div>
            <div className="stat-label">Pending Approvals</div>
          </div>
        )}
      </div>

      <div className="grid-2" style={{ alignItems: 'stretch' }}>
        {/* Upcoming Events */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="card-title" style={{ margin: 0 }}><AppIcon name="events" size={16} className="inline-icon" /> Upcoming Events</div>
            <Link to="/events" style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>View all →</Link>
          </div>
          {stats?.upcomingEventsList?.length === 0 ? (
            <div className="empty-state" style={{ padding: '20px 0' }}>
              <div className="empty-icon"><AppIcon name="empty" size={42} /></div>
              <p>No upcoming events</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {stats?.upcomingEventsList?.map((ev) => (
                <Link key={ev._id} to="/events" style={{ display: 'block', padding: '10px 0', borderBottom: '1px solid var(--border)', textDecoration: 'none', color: 'inherit', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(26,92,58,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: 2, flex: 1 }}>{ev.title}</div>
                    <span style={{ color: 'var(--primary)', fontSize: '0.85rem', marginLeft: 8, flexShrink: 0 }}>›</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-mid)', marginBottom: 2 }}>{ev.venue || 'TBD'}</div>
                  <div style={{ fontSize: '0.73rem', color: 'var(--text-light)' }}>
                    {ev.organizer || 'MCAD'} • {format(new Date(ev.startDate), 'MMM d, yyyy')}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Announcements */}
        <div className="card" style={{ overflow: 'hidden', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="card-title" style={{ margin: 0 }}><AppIcon name="announcements" size={16} className="inline-icon" /> Recent Announcements</div>
            <Link to="/announcements" style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>View all →</Link>
          </div>
          {stats?.recentAnnouncements?.length === 0 ? (
            <div className="empty-state" style={{ padding: '20px 0' }}>
              <div className="empty-icon"><AppIcon name="empty" size={42} /></div>
              <p>No announcements yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {stats?.recentAnnouncements?.map((ann) => (
                <Link key={ann._id} to="/announcements" style={{ display: 'block', padding: '10px 0', borderBottom: '1px solid var(--border)', minWidth: 0, textDecoration: 'none', color: 'inherit', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(26,92,58,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: 2, wordBreak: 'break-word', flex: 1 }}>{ann.title}</div>
                    <span style={{ color: 'var(--primary)', fontSize: '0.85rem', marginLeft: 8, flexShrink: 0 }}>›</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-mid)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', wordBreak: 'break-word' }}>{ann.content}</div>
                  <div style={{ fontSize: '0.73rem', color: 'var(--text-light)', marginTop: 4 }}>
                    {ann.postedBy?.name} • {format(new Date(ann.createdAt), 'MMM d, yyyy')}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Islamic Quote */}
      <div style={{ marginTop: 24, padding: '20px', background: 'linear-gradient(135deg, var(--primary-dark), var(--primary))', borderRadius: 12, color: 'white', textAlign: 'center' }}>
        <div style={{ fontFamily: 'Amiri, serif', fontSize: '1.2rem', color: 'var(--accent-light)', marginBottom: 4 }}>
          "Indeed, Allah is with those who are patient."
        </div>
        <div style={{ fontSize: '0.78rem', opacity: 0.7 }}>— Quran 2:153 | MCAD Web-Based Event Management System</div>
      </div>
    </Layout>
  );
}
