import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import AppIcon from '../components/AppIcon';

const CATEGORIES = ['prayer_schedule', 'event_reminder', 'charity_drive', 'community_advisory', 'general'];
const catLabel = (c) => ({ prayer_schedule: 'Prayer Schedule', event_reminder: 'Event Reminder', charity_drive: 'Charity Drive', community_advisory: 'Community Advisory', general: 'General' }[c] || c);
const catBadge = (c) => ({ prayer_schedule: 'badge-blue', event_reminder: 'badge-gold', charity_drive: 'badge-green', community_advisory: 'badge-yellow', general: 'badge-gray' }[c] || 'badge-gray');

const emptyForm = { title: '', content: '', category: 'general', expiresAt: '' };

export default function Announcements() {
  const { user, isAdmin } = useAuth();
  const canPost = ['admin', 'imam'].includes(user?.role);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const toggleExpand = (id) => setExpandedId((prev) => (prev === id ? null : id));

  const fetchAnn = async () => {
    setLoading(true);
    try {
      const endpoint = isAdmin ? '/announcements/all' : '/announcements';
      const params = {};
      if (filterCat) params.category = filterCat;
      const { data } = await api.get(endpoint, { params });
      setItems(data);
    } catch { toast.error('Failed to load announcements'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAnn(); }, [filterCat]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (a) => {
    setEditing(a._id);
    setForm({ title: a.title, content: a.content, category: a.category, expiresAt: a.expiresAt?.slice(0, 16) || '', isPublished: a.isPublished });
    setShowModal(true);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.expiresAt && new Date(form.expiresAt) <= new Date()) {
      toast.error('Expiry date is in the past — viewers will not see this announcement.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/announcements/${editing}`, form);
        toast.success('Announcement updated');
      } else {
        await api.post('/announcements', form);
        toast.success('Announcement posted');
      }
      setShowModal(false);
      fetchAnn();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await api.delete(`/announcements/${id}`);
      toast.success('Deleted');
      fetchAnn();
    } catch { toast.error('Delete failed'); }
  };

  const filtered = items.filter((a) =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout title="Announcements">
      <div className="page-header">
        <div>
          <div className="page-title"><AppIcon name="announcements" size={18} className="inline-icon" /> Announcements</div>
          <div className="page-subtitle">Community notices, prayer schedules, charity updates, and advisories</div>
        </div>
        {canPost && <button className="btn btn-primary" onClick={openCreate}>+ Post Announcement</button>}
      </div>

      <div className="filters-bar">
        <div className="search-input-wrapper">
          <span className="search-icon"><AppIcon name="search" size={14} /></span>
          <input className="form-input search-input" placeholder="Search announcements..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ width: 180 }} value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{catLabel(c)}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="loader"><div className="spinner"></div></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><div className="empty-icon"><AppIcon name="empty" size={42} /></div><p>No announcements found</p></div>
      ) : (
        <div>
          {filtered.map((ann) => {
            const isExpanded = expandedId === ann._id;
            const isLong = ann.content.length > 160;
            const isExpired = ann.expiresAt && new Date(ann.expiresAt) <= new Date();
            return (
            <div key={ann._id} className={`ann-card ${ann.category}`} style={{ cursor: isLong ? 'pointer' : 'default', opacity: isExpired ? 0.6 : 1 }} onClick={() => isLong && toggleExpand(ann._id)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span className="ann-card-title">{ann.title}</span>
                    <span className={`badge ${catBadge(ann.category)}`}>{catLabel(ann.category)}</span>
                    {!ann.isPublished && <span className="badge badge-red">Unpublished</span>}
                    {isExpired && <span className="badge badge-gray"><AppIcon name="expired" size={12} className="inline-icon" /> Expired</span>}
                  </div>
                  <div className="ann-card-content" style={{ whiteSpace: 'pre-wrap' }}>
                    {isExpanded || !isLong ? ann.content : ann.content.slice(0, 160) + '…'}
                  </div>
                  {isLong && (
                    <button
                      className="btn btn-ghost"
                      style={{ marginTop: 6, padding: '2px 0', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}
                      onClick={(e) => { e.stopPropagation(); toggleExpand(ann._id); }}
                    >
                      {isExpanded ? '▲ Show less' : '▼ Read more'}
                    </button>
                  )}
                </div>
                {canPost && (ann.postedBy?._id === user._id || isAdmin) && (
                  <div style={{ display: 'flex', gap: 6, marginLeft: 12, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn-sm btn-outline" onClick={() => openEdit(ann)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(ann._id)}>Del</button>
                  </div>
                )}
              </div>
              <div className="ann-card-footer">
                <span className="ann-card-meta">
                  <AppIcon name="profile" size={12} className="inline-icon" /> {ann.postedBy?.name || 'Unknown'} &nbsp;•&nbsp; {format(new Date(ann.createdAt), 'MMM d, yyyy h:mm a')}
                </span>
                {ann.expiresAt && (
                  <span className="ann-card-meta" style={{ color: isExpired ? 'var(--danger)' : 'inherit' }}>
                    {isExpired ? 'Expired' : 'Expires'}: {format(new Date(ann.expiresAt), 'MMM d, yyyy')}
                  </span>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal modal-lg">
            <div className="modal-header">
              <span className="modal-title">{editing ? 'Edit Announcement' : 'Post Announcement'}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input name="title" className="form-input" value={form.title} onChange={handleChange} required placeholder="Announcement title" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select name="category" className="form-select" value={form.category} onChange={handleChange}>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{catLabel(c)}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Expires At</label>
                    <input name="expiresAt" type="datetime-local" className="form-input" value={form.expiresAt} onChange={handleChange} />
                    <div className="form-hint">Leave empty if no expiry</div>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Content *</label>
                  <textarea name="content" className="form-textarea" style={{ minHeight: 130 }} value={form.content} onChange={handleChange} required placeholder="Enter announcement content here..." />
                </div>
                {isAdmin && (
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" checked={form.isPublished !== false} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} />
                      <span className="form-label" style={{ margin: 0 }}>Published (visible to all users)</span>
                    </label>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Posting...' : editing ? 'Update' : 'Post'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
