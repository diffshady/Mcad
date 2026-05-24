import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import CalendarPicker from '../components/CalendarPicker';
import AppIcon from '../components/AppIcon';

const EVENT_TYPES = ['iftar', 'taraweeh', 'charity', 'prayer', 'announcement', 'other'];
const STATUS_LIST = ['upcoming', 'ongoing', 'completed', 'cancelled'];

const typeBadge = (t) => ({ iftar: 'badge-gold', taraweeh: 'badge-green', charity: 'badge-blue', prayer: 'badge-blue', announcement: 'badge-gray', other: 'badge-gray' }[t] || 'badge-gray');
const statusBadge = (s) => ({ upcoming: 'badge-blue', ongoing: 'badge-green', completed: 'badge-gray', cancelled: 'badge-red' }[s] || 'badge-gray');

const emptyForm = { title: '', description: '', type: 'other', venue: '', organizer: '', startDate: '', endDate: '', status: 'upcoming' };

export default function Events() {
  const { user, canManage, isAdmin } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // list | calendar
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [calDate, setCalDate] = useState(new Date());

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterType) params.type = filterType;
      if (filterStatus) params.status = filterStatus;
      const { data } = await api.get('/events', { params });
      setEvents(data);
    } catch (e) {
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvents(); }, [filterType, filterStatus]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (ev) => {
    setEditing(ev._id);
    setForm({
      title: ev.title, description: ev.description || '', type: ev.type,
      venue: ev.venue || '', organizer: ev.organizer || '',
      startDate: ev.startDate?.slice(0, 16), endDate: ev.endDate?.slice(0, 16) || '',
      status: ev.status,
    });
    setShowModal(true);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.startDate) {
      toast.error('Start date is required.');
      return;
    }
    if (form.endDate && new Date(form.endDate) < new Date(form.startDate)) {
      toast.error('End date cannot be before the start date.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/events/${editing}`, form);
        toast.success('Event updated');
      } else {
        await api.post('/events', form);
        toast.success('Event created');
      }
      setShowModal(false);
      fetchEvents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.put(`/events/${id}/approve`);
      toast.success('Event approved');
      fetchEvents();
    } catch { toast.error('Failed to approve'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    try {
      await api.delete(`/events/${id}`);
      toast.success('Event deleted');
      fetchEvents();
    } catch { toast.error('Failed to delete'); }
  };

  const filtered = events.filter((ev) =>
    ev.title.toLowerCase().includes(search.toLowerCase()) ||
    (ev.venue || '').toLowerCase().includes(search.toLowerCase())
  );

  // Events on selected calendar date
  const calEvents = events.filter((ev) => {
    const d = new Date(ev.startDate);
    return d.getFullYear() === calDate.getFullYear() &&
           d.getMonth() === calDate.getMonth() &&
           d.getDate() === calDate.getDate();
  });

  const tileContent = ({ date }) => {
    const has = events.some((ev) => {
      const d = new Date(ev.startDate);
      return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth() && d.getDate() === date.getDate();
    });
    return has ? <div style={{ width: 5, height: 5, background: 'var(--accent)', borderRadius: '50%', margin: '1px auto 0' }}></div> : null;
  };

  return (
    <Layout title="Events">
      <div className="page-header">
        <div>
          <div className="page-title"><AppIcon name="events" size={18} className="inline-icon" /> Events & Schedules</div>
          <div className="page-subtitle">Manage Ramadan events, Iftar programs, Taraweeh schedules, and charity drives</div>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={openCreate}>+ Add Event</button>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}><AppIcon name="list" size={14} className="inline-icon" /> List View</button>
        <button className={`tab-btn ${view === 'calendar' ? 'active' : ''}`} onClick={() => setView('calendar')}><AppIcon name="calendar" size={14} className="inline-icon" /> Calendar View</button>
      </div>

      {view === 'list' ? (
        <>
          <div className="filters-bar">
            <div className="search-input-wrapper">
              <span className="search-icon"><AppIcon name="search" size={14} /></span>
              <input className="form-input search-input" placeholder="Search events..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="form-select" style={{ width: 150 }} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">All Types</option>
              {EVENT_TYPES.map((t) => <option key={t} value={t} style={{ textTransform: 'capitalize' }}>{t}</option>)}
            </select>
            <select className="form-select" style={{ width: 150 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All Status</option>
              {STATUS_LIST.map((s) => <option key={s} value={s} style={{ textTransform: 'capitalize' }}>{s}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="loader"><div className="spinner"></div></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><div className="empty-icon"><AppIcon name="empty" size={42} /></div><p>No events found</p></div>
          ) : (
            <div className="events-grid">
              {filtered.map((ev) => (
                <div key={ev._id} className="event-card">
                  <div className={`event-card-header ${ev.type}`}></div>
                  <div className="event-card-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span className={`badge ${typeBadge(ev.type)}`}>{ev.type}</span>
                      <span className={`badge ${statusBadge(ev.status)}`}>{ev.status}</span>
                    </div>
                    <div className="event-card-title">{ev.title}</div>
                    <div className="event-card-meta">
                      <span><AppIcon name="events" size={13} className="inline-icon" /> {format(new Date(ev.startDate), 'MMM d, yyyy h:mm a')}</span>
                      {ev.venue && <span><AppIcon name="location" size={13} className="inline-icon" /> {ev.venue}</span>}
                      {ev.organizer && <span><AppIcon name="organizer" size={13} className="inline-icon" /> {ev.organizer}</span>}
                      {ev.description && <span style={{ color: 'var(--text-mid)', marginTop: 4 }}>{ev.description.slice(0, 80)}{ev.description.length > 80 ? '...' : ''}</span>}
                    </div>
                  </div>
                  <div className="event-card-footer">
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      {!ev.isApproved && <span className="badge badge-yellow">Pending Approval</span>}
                      {ev.isApproved && <span className="badge badge-green"><AppIcon name="approved" size={12} className="inline-icon" /> Approved</span>}
                      <span style={{ fontSize: '0.73rem', color: 'var(--text-light)' }}>
                        <AppIcon name="attendees" size={12} className="inline-icon" /> {ev.attendanceCount}
                      </span>
                    </div>
                    <div className="table-actions">
                      {isAdmin && !ev.isApproved && (
                        <button className="btn btn-sm btn-accent" onClick={() => handleApprove(ev._id)}>Approve</button>
                      )}
                      {canManage && (ev.createdBy?._id === user._id || isAdmin) && (
                        <>
                          <button className="btn btn-sm btn-outline" onClick={() => openEdit(ev)}>Edit</button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(ev._id)}>Del</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="grid-2" style={{ alignItems: 'start' }}>
          <div className="card">
            <CalendarPicker
              onChange={(d) => d && setCalDate(d)}
              value={calDate}
              tileContent={tileContent}
            />
          </div>
          <div className="card">
            <div className="card-title">Events on {format(calDate, 'MMMM d, yyyy')}</div>
            {calEvents.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px 0' }}><p>No events on this date</p></div>
            ) : (
              calEvents.map((ev) => (
                <div key={ev._id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 700 }}>{ev.title}</div>
                    <span className={`badge ${statusBadge(ev.status)}`}>{ev.status}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-light)', marginTop: 3 }}>
                    {format(new Date(ev.startDate), 'h:mm a')} {ev.venue ? `· ${ev.venue}` : ''}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal modal-lg">
            <div className="modal-header">
              <span className="modal-title">{editing ? 'Edit Event' : 'Add New Event'}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Event Title *</label>
                  <input name="title" className="form-input" value={form.title} onChange={handleChange} required placeholder="e.g. Iftar Gathering – Brgy. Lagao" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Type *</label>
                    <select name="type" className="form-select" value={form.type} onChange={handleChange}>
                      {EVENT_TYPES.map((t) => <option key={t} value={t} style={{ textTransform: 'capitalize' }}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select name="status" className="form-select" value={form.status} onChange={handleChange}>
                      {STATUS_LIST.map((s) => <option key={s} value={s} style={{ textTransform: 'capitalize' }}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Start Date & Time *</label>
                    <input name="startDate" type="datetime-local" className="form-input" value={form.startDate} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date & Time</label>
                    <input name="endDate" type="datetime-local" className="form-input" value={form.endDate} onChange={handleChange} min={form.startDate || undefined} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Venue</label>
                    <input name="venue" className="form-input" value={form.venue} onChange={handleChange} placeholder="e.g. Masjid Al-Nour" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Organizer</label>
                    <input name="organizer" className="form-input" value={form.organizer} onChange={handleChange} placeholder="e.g. Barangay Lagao" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea name="description" className="form-textarea" value={form.description} onChange={handleChange} placeholder="Optional event description..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update Event' : 'Create Event'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
