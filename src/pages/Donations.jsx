import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import AppIcon from '../components/AppIcon';

const TYPES = ['cash', 'food', 'supplies'];
const typeBadge = (t) => ({ cash: 'badge-green', food: 'badge-gold', supplies: 'badge-blue' }[t] || 'badge-gray');

const formatPeso = (n) => {
  if (n >= 1_000_000_000) return `₱${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000)     return `₱${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)         return `₱${(n / 1_000).toFixed(1)}K`;
  return `₱${n.toLocaleString()}`;
};

const emptyForm = { donorName: '', donationType: 'cash', amount: '', quantity: '', description: '', dateReceived: '', event: '' };

export default function Donations() {
  const { isAdmin } = useAuth();
  const { user } = useAuth();
  const canRecord = ['admin', 'leader'].includes(user?.role);
  const canDonate = true; // all authenticated users can donate
  const [donations, setDonations] = useState([]);
  const [events, setEvents] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [filterEvent, setFilterEvent] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterType) params.type = filterType;
      if (filterEvent) params.event = filterEvent;
      const [donRes, evRes, sumRes] = await Promise.all([
        api.get('/donations', { params }),
        api.get('/events', { params: { approved: 'true' } }),
        api.get('/donations/summary'),
      ]);
      setDonations(donRes.data);
      setEvents(evRes.data);
      setSummary(sumRes.data);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [filterType, filterEvent]);

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm, dateReceived: format(new Date(), "yyyy-MM-dd'T'HH:mm") }); setShowModal(true); };
  const openEdit = (d) => {
    setEditing(d._id);
    setForm({
      donorName: d.donorName || '',
      donationType: d.donationType,
      amount: d.amount || '',
      quantity: d.quantity || '',
      description: d.description || '',
      dateReceived: d.dateReceived?.slice(0, 16) || '',
      event: d.event?._id || d.event || '',
    });
    setShowModal(true);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (payload.event === '') delete payload.event;
      if (editing) {
        await api.put(`/donations/${editing}`, payload);
        toast.success('Donation updated');
      } else {
        await api.post('/donations', payload);
        toast.success('Donation recorded');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this donation record?')) return;
    try {
      await api.delete(`/donations/${id}`);
      toast.success('Deleted');
      fetchData();
    } catch { toast.error('Delete failed'); }
  };

  return (
    <Layout title="Donations">
      <div className="page-header">
        <div>
          <div className="page-title"><AppIcon name="donations" size={18} className="inline-icon" /> Donations & Distributions</div>
          <div className="page-subtitle">Track donations received and resource distributions during Ramadan programs</div>
        </div>
        {canRecord && <button className="btn btn-primary" onClick={openCreate}>+ Record Donation</button>}
        {!canRecord && <button className="btn btn-primary" onClick={openCreate}><AppIcon name="donation" size={14} className="inline-icon" /> Make a Donation</button>}
      </div>

      {/* Summary */}
      {summary && (
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card green">
            <div className="stat-icon"><AppIcon name="cash" size={30} /></div>
            <div className="stat-value" style={{ fontSize: 'clamp(1rem, 2.5vw, 1.6rem)', wordBreak: 'break-all' }}>{formatPeso(summary.cashTotal || 0)}</div>
            <div className="stat-label">Total Cash Donations</div>
          </div>
          {summary.byType?.map((b) => (
            <div key={b._id} className="stat-card gold">
              <div className="stat-icon">
                {b._id === 'food' ? <AppIcon name="food" size={30} /> : b._id === 'supplies' ? <AppIcon name="supplies" size={30} /> : <AppIcon name="money" size={30} />}
              </div>
              <div className="stat-value">{b.count}</div>
              <div className="stat-label">{b._id.charAt(0).toUpperCase() + b._id.slice(1)} Records</div>
            </div>
          ))}
        </div>
      )}

      <div className="filters-bar">
        <select className="form-select" style={{ width: 150 }} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {TYPES.map((t) => <option key={t} value={t} style={{ textTransform: 'capitalize' }}>{t}</option>)}
        </select>
        <select className="form-select" style={{ maxWidth: 260 }} value={filterEvent} onChange={(e) => setFilterEvent(e.target.value)}>
          <option value="">All Events</option>
          {events.map((ev) => <option key={ev._id} value={ev._id}>{ev.title}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="loader"><div className="spinner"></div></div>
      ) : donations.length === 0 ? (
        <div className="empty-state"><div className="empty-icon"><AppIcon name="donations" size={42} /></div><p>No donation records found</p></div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Donor</th>
                <th>Type</th>
                <th>Amount / Qty</th>
                <th>Description</th>
                <th>Event</th>
                <th>Date Received</th>
                {canRecord && <th>Recorded By</th>}
                {canRecord && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {donations.map((d) => (
                <tr key={d._id}>
                  <td style={{ fontWeight: 600 }}>{d.donorName || 'Anonymous'}</td>
                  <td><span className={`badge ${typeBadge(d.donationType)}`}>{d.donationType}</span></td>
                  <td>
                    {d.donationType === 'cash' ? `₱${(d.amount || 0).toLocaleString()}` : d.quantity || '—'}
                  </td>
                  <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.description || '—'}</td>
                  <td>{d.event?.title || '—'}</td>
                  <td>{format(new Date(d.dateReceived), 'MMM d, yyyy')}</td>
                  {canRecord && <td>{d.recordedBy?.name || '—'}</td>}
                  {canRecord && (
                    <td>
                      <div className="table-actions">
                        <button className="btn btn-sm btn-outline" onClick={() => openEdit(d)}>Edit</button>
                        {isAdmin && <button className="btn btn-sm btn-danger" onClick={() => handleDelete(d._id)}>Del</button>}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{editing ? 'Edit Donation' : 'Record Donation'}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Donor Name <span style={{ fontWeight: 400, color: 'var(--text-light)' }}>(optional — leave blank to donate anonymously)</span></label>
                  <input name="donorName" className="form-input" placeholder="Anonymous" value={form.donorName} onChange={handleChange} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Donation Type *</label>
                    <select name="donationType" className="form-select" value={form.donationType} onChange={handleChange} required>
                      {TYPES.map((t) => <option key={t} value={t} style={{ textTransform: 'capitalize' }}>{t}</option>)}
                    </select>
                  </div>
                </div>

                {form.donationType === 'cash' ? (
                  <div className="form-group">
                    <label className="form-label">Amount (₱)</label>
                    <input name="amount" type="number" min="0" className="form-input" placeholder="0.00" value={form.amount} onChange={handleChange} />
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label">Quantity / Description</label>
                    <input name="quantity" className="form-input" placeholder="e.g. 50 bags of rice" value={form.quantity} onChange={handleChange} />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea name="description" className="form-textarea" style={{ minHeight: 70 }} placeholder="Optional notes..." value={form.description} onChange={handleChange} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Date Received</label>
                    <input name="dateReceived" type="datetime-local" className="form-input" value={form.dateReceived} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Related Event</label>
                    <select name="event" className="form-select" value={form.event} onChange={handleChange}>
                      <option value="">None</option>
                      {events.map((ev) => <option key={ev._id} value={ev._id}>{ev.title}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Record Donation'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
