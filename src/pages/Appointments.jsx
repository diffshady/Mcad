import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import AppIcon from '../components/AppIcon';

const PURPOSES = [
  { value: 'consultation', label: 'Consultation' },
  { value: 'event_coordination', label: 'Event Coordination' },
  { value: 'donation', label: 'Donation' },
  { value: 'community_concern', label: 'Community Concern' },
  { value: 'prayer_schedule', label: 'Prayer Schedule' },
  { value: 'other', label: 'Other' },
];

const HOURS = Array.from({ length: 12 }, (_, index) => String(index + 1));
const MINUTES = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));
const PERIODS = ['AM', 'PM'];

const statusBadge = (s) =>
  ({ pending: 'badge-yellow', approved: 'badge-green', rejected: 'badge-red', completed: 'badge-gray', cancelled: 'badge-red' }[s] || 'badge-gray');

const statusIcon = (s) =>
  ({ pending: 'pending', approved: 'approved', rejected: 'rejected', completed: 'completed', cancelled: 'cancelled' }[s] || 'status');

const formatTicketNumber = (appt, fallback) => appt?.ticketNumber || `ticket-${String(appt?.appointmentNumber ?? fallback).padStart(5, '0')}`;

const ticketRank = (appt, indexFallback = 999999) => {
  if (Number.isFinite(appt?.appointmentNumber)) return appt.appointmentNumber;
  const match = (appt?.ticketNumber || '').match(/(\d+)$/);
  if (match) return Number(match[1]);
  return indexFallback;
};

const defaultTimeFields = {
  appointmentHour: '9',
  appointmentMinute: '00',
  appointmentPeriod: 'AM',
};

const getLocalDateFieldValue = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return format(parsed, 'yyyy-MM-dd');
};

const getTimeFieldValues = (value) => {
  if (!value) return defaultTimeFields;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return defaultTimeFields;

  const hour24 = parsed.getHours();
  return {
    appointmentHour: String(hour24 % 12 || 12),
    appointmentMinute: String(parsed.getMinutes()).padStart(2, '0'),
    appointmentPeriod: hour24 >= 12 ? 'PM' : 'AM',
  };
};

const buildAppointmentDate = ({ appointmentDate, appointmentHour, appointmentMinute, appointmentPeriod }) => {
  if (!appointmentDate) return null;

  const [year, month, day] = appointmentDate.split('-').map(Number);
  if (!year || !month || !day) return null;

  const minute = Number(appointmentMinute);
  let hour = Number(appointmentHour);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;

  hour %= 12;
  if (appointmentPeriod === 'PM') hour += 12;

  const parsed = new Date(year, month - 1, day, hour, minute, 0, 0);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const emptyForm = {
  title: '', description: '', appointmentDate: '',
  ...defaultTimeFields,
  venue: '', appointedWith: '', purpose: 'other',
};

export default function Appointments() {
  const { user, isAdmin } = useAuth();
  const isManager = ['admin', 'barangay_admin', 'imam'].includes(user?.role);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // all | mine
  const [showModal, setShowModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [reviewForm, setReviewForm] = useState({ status: 'approved', notes: '', rejectionReason: '' });
  const [saving, setSaving] = useState(false);
  const [nextTicket, setNextTicket] = useState('');

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      const { data } = await api.get('/appointments', { params });
      setItems(data);
    } catch {
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAppointments(); }, [filterStatus]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, appointmentDate: '' });
    setNextTicket('');

    api.get('/appointments/next-ticket')
      .then((res) => setNextTicket(res.data?.ticketNumber || ''))
      .catch(() => setNextTicket(''));

    setShowModal(true);
  };

  const openEdit = (appt) => {
    const timeFields = getTimeFieldValues(appt.appointmentDate);
    setEditing(appt._id);
    setForm({
      title: appt.title,
      description: appt.description || '',
      appointmentDate: getLocalDateFieldValue(appt.appointmentDate),
      ...timeFields,
      venue: appt.venue || '',
      appointedWith: appt.appointedWith || '',
      purpose: appt.purpose,
    });
    setShowModal(true);
  };

  const openDetail = (appt) => { setSelected(appt); setShowDetailModal(true); };

  const openReview = (appt) => {
    setSelected(appt);
    setReviewForm({ status: 'approved', notes: '', rejectionReason: '' });
    setShowReviewModal(true);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const parsedAppointmentDate = buildAppointmentDate(form);
      if (!parsedAppointmentDate) {
        toast.error('Appointment date and time are required');
        return;
      }

      if (parsedAppointmentDate.getTime() < Date.now()) {
        toast.error('Appointment date must be in the future');
        return;
      }

      const payload = {
        title: form.title,
        description: form.description,
        appointmentDate: parsedAppointmentDate.toISOString(),
        venue: form.venue,
        appointedWith: form.appointedWith,
        purpose: form.purpose,
      };

      if (editing) {
        await api.put(`/appointments/${editing}`, payload);
        toast.success('Appointment updated');
      } else {
        const { data } = await api.post('/appointments', payload);
        toast.success(`Appointment submitted. Your ticket is ${formatTicketNumber(data, 1)}`);
      }
      setShowModal(false);
      fetchAppointments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleReview = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/appointments/${selected._id}/review`, reviewForm);
      toast.success(`Appointment ${reviewForm.status}`);
      setShowReviewModal(false);
      fetchAppointments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Review failed');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this appointment?')) return;
    try {
      await api.put(`/appointments/${id}/cancel`);
      toast.success('Appointment cancelled');
      fetchAppointments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Permanently delete this appointment?')) return;
    try {
      await api.delete(`/appointments/${id}`);
      toast.success('Deleted');
      fetchAppointments();
    } catch {
      toast.error('Delete failed');
    }
  };

  const displayed = items.filter((a) => {
    if (activeTab === 'mine') return a.requestedBy?._id === user._id || a.requestedBy === user._id;
    return true;
  }).sort((a, b) => ticketRank(a) - ticketRank(b));

  const pendingCount = items.filter((a) => a.status === 'pending').length;

  return (
    <Layout title="Appointments">
      <div className="page-header">
        <div>
          <div className="page-title"><AppIcon name="appointments" size={18} className="inline-icon" /> Appointments</div>
          <div className="page-subtitle">Request and manage appointments with barangay officials, Imams, and community leaders</div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Request Appointment</button>
      </div>

      {isManager && pendingCount > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: 16 }}>
          <AppIcon name="pending" size={14} className="inline-icon" /> <strong>{pendingCount} appointment{pendingCount > 1 ? 's' : ''} awaiting review.</strong>
        </div>
      )}

      {/* Tabs (managers see all; others only see theirs) */}
      {isManager && (
        <div className="tabs">
          <button className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>All Appointments</button>
          <button className={`tab-btn ${activeTab === 'mine' ? 'active' : ''}`} onClick={() => setActiveTab('mine')}>My Requests</button>
        </div>
      )}

      <div className="filters-bar">
        <select className="form-select" style={{ width: 180 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="loader"><div className="spinner"></div></div>
      ) : displayed.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><AppIcon name="appointments" size={42} /></div>
          <p>No appointments found</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Ticket No.</th>
                <th>Title / Purpose</th>
                <th>Date & Time</th>
                <th>Venue</th>
                <th>With</th>
                {isManager && <th>Requested By</th>}
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((appt, i) => {
                const isOwner = appt.requestedBy?._id === user._id || appt.requestedBy === user._id;
                return (
                  <tr key={appt._id}>
                    <td style={{ fontWeight: 700 }}>{appt.appointmentNumber ?? i + 1}</td>
                    <td style={{ fontWeight: 700 }}>{formatTicketNumber(appt, i + 1)}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{appt.title}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-light)', textTransform: 'capitalize' }}>
                        {PURPOSES.find((p) => p.value === appt.purpose)?.label || appt.purpose}
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {format(new Date(appt.appointmentDate), 'MMM d, yyyy')}<br />
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-light)' }}>
                        {format(new Date(appt.appointmentDate), 'h:mm a')}
                      </span>
                    </td>
                    <td>{appt.venue || '—'}</td>
                    <td>{appt.appointedWith || '—'}</td>
                    {isManager && (
                      <td>
                        <div style={{ fontWeight: 500 }}>{appt.requestedBy?.name || '—'}</div>
                        <div style={{ fontSize: '0.73rem', color: 'var(--text-light)', textTransform: 'capitalize' }}>{appt.requestedBy?.role}</div>
                      </td>
                    )}
                    <td>
                      <span className={`badge ${statusBadge(appt.status)}`}>
                        <AppIcon name={statusIcon(appt.status)} size={12} className="inline-icon" /> {appt.status}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="btn btn-sm btn-ghost" onClick={() => openDetail(appt)}>View</button>
                        {isManager && appt.status === 'pending' && (
                          <button className="btn btn-sm btn-accent" onClick={() => openReview(appt)}>Review</button>
                        )}
                        {(isOwner || isAdmin) && appt.status === 'pending' && (
                          <button className="btn btn-sm btn-outline" onClick={() => openEdit(appt)}>Edit</button>
                        )}
                        {(isOwner || isManager) && ['pending', 'approved'].includes(appt.status) && (
                          <button className="btn btn-sm btn-ghost" onClick={() => handleCancel(appt._id)}>Cancel</button>
                        )}
                        {isAdmin && (
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(appt._id)}>Del</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{editing ? 'Edit Appointment Request' : 'Request Appointment'}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {!editing && (
                  <div className="alert alert-info" style={{ marginBottom: 12 }}>
                    <AppIcon name="appointments" size={14} className="inline-icon" />
                    {nextTicket ? ` Your ticket number will be ${nextTicket}.` : ' Ticket number will be assigned after submission.'}
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Appointment Title *</label>
                  <input
                    name="title" className="form-input" required
                    placeholder="e.g. Meeting with Barangay Captain"
                    value={form.title} onChange={handleChange}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Appointment Date *</label>
                    <input
                      name="appointmentDate" type="date" className="form-input"
                      min={format(new Date(), 'yyyy-MM-dd')}
                      required value={form.appointmentDate} onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Appointment Time *</label>
                    <div className="form-row" style={{ gap: 8 }}>
                      <select name="appointmentPeriod" className="form-select" value={form.appointmentPeriod} onChange={handleChange} style={{ flex: '0 0 92px' }}>
                        {PERIODS.map((period) => <option key={period} value={period}>{period}</option>)}
                      </select>
                      <select name="appointmentHour" className="form-select" value={form.appointmentHour} onChange={handleChange} style={{ flex: 1 }}>
                        {HOURS.map((hour) => <option key={hour} value={hour}>{hour}</option>)}
                      </select>
                      <select name="appointmentMinute" className="form-select" value={form.appointmentMinute} onChange={handleChange} style={{ flex: 1 }}>
                        {MINUTES.map((minute) => <option key={minute} value={minute}>{minute}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Purpose</label>
                    <select name="purpose" className="form-select" value={form.purpose} onChange={handleChange}>
                      {PURPOSES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Appointment Date & Time *</label>
                    <input
                      name="appointmentDate" type="datetime-local" className="form-input"
                      required value={form.appointmentDate} onChange={handleChange}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Venue / Location</label>
                    <input
                      name="venue" className="form-input"
                      placeholder="e.g. Barangay Hall Room 2"
                      value={form.venue} onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Appointment With</label>
                    <input
                      name="appointedWith" className="form-input"
                      placeholder="e.g. Barangay Captain / Imam"
                      value={form.appointedWith} onChange={handleChange}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description / Notes</label>
                  <textarea
                    name="description" className="form-textarea"
                    placeholder="Briefly describe the purpose of this appointment..."
                    value={form.description} onChange={handleChange}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Submitting...' : editing ? 'Update Request' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Review Modal (admin/imam) ── */}
      {showReviewModal && selected && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Review Appointment</span>
              <button className="modal-close" onClick={() => setShowReviewModal(false)}>×</button>
            </div>
            <form onSubmit={handleReview}>
              <div className="modal-body">
                <div className="card" style={{ marginBottom: 14, background: 'var(--bg)', borderRadius: 8 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{selected.title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-mid)' }}>
                    Requested by: <strong>{selected.requestedBy?.name}</strong> ({selected.requestedBy?.role})
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                    <AppIcon name="appointments" size={12} className="inline-icon" /> {format(new Date(selected.appointmentDate), 'MMMM d, yyyy – h:mm a')}
                    {selected.venue && ` · ${selected.venue}`}
                  </div>
                  {selected.description && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-mid)', marginTop: 6 }}>{selected.description}</div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Decision *</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {['approved', 'rejected', 'completed'].map((s) => (
                      <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: '0.88rem', textTransform: 'capitalize', fontWeight: reviewForm.status === s ? 700 : 400, color: reviewForm.status === s ? 'var(--primary)' : 'var(--text-mid)' }}>
                        <input
                          type="radio" name="status" value={s}
                          checked={reviewForm.status === s}
                          onChange={(e) => setReviewForm({ ...reviewForm, status: e.target.value })}
                        />
                        <AppIcon name={statusIcon(s)} size={12} className="inline-icon" /> {s}
                      </label>
                    ))}
                  </div>
                </div>
                {reviewForm.status === 'rejected' && (
                  <div className="form-group">
                    <label className="form-label">Rejection Reason</label>
                    <textarea
                      className="form-textarea" style={{ minHeight: 70 }}
                      placeholder="State the reason for rejection..."
                      value={reviewForm.rejectionReason}
                      onChange={(e) => setReviewForm({ ...reviewForm, rejectionReason: e.target.value })}
                    />
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Admin Notes / Remarks</label>
                  <textarea
                    className="form-textarea" style={{ minHeight: 70 }}
                    placeholder="Optional notes for the requester..."
                    value={reviewForm.notes}
                    onChange={(e) => setReviewForm({ ...reviewForm, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowReviewModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Submit Review'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Detail View Modal ── */}
      {showDetailModal && selected && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Appointment Details</span>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, alignItems: 'flex-start' }}>
                <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{selected.title}</div>
                <span className={`badge ${statusBadge(selected.status)}`}><AppIcon name={statusIcon(selected.status)} size={12} className="inline-icon" /> {selected.status}</span>
              </div>

              {[
                { label: 'Appointment No.', value: selected.appointmentNumber || '—' },
                { label: 'Ticket No.', value: formatTicketNumber(selected, selected.appointmentNumber || 1) },
                { label: 'Purpose', value: PURPOSES.find((p) => p.value === selected.purpose)?.label },
                { label: 'Date & Time', value: format(new Date(selected.appointmentDate), 'MMMM d, yyyy – h:mm a') },
                { label: 'Venue', value: selected.venue || '—' },
                { label: 'Appointment With', value: selected.appointedWith || '—' },
                { label: 'Requested By', value: `${selected.requestedBy?.name} (${selected.requestedBy?.role})` },
                { label: 'Barangay', value: selected.requestedBy?.barangay || '—' },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-light)', minWidth: 130 }}>{label}</div>
                  <div style={{ fontSize: '0.85rem' }}>{value}</div>
                </div>
              ))}

              {selected.description && (
                <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--bg)', borderRadius: 7 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-light)', marginBottom: 4 }}>DESCRIPTION</div>
                  <div style={{ fontSize: '0.85rem' }}>{selected.description}</div>
                </div>
              )}

              {selected.notes && (
                <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--info-light)', borderRadius: 7 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--info)', marginBottom: 4 }}>ADMIN NOTES</div>
                  <div style={{ fontSize: '0.85rem' }}>{selected.notes}</div>
                </div>
              )}

              {selected.rejectionReason && (
                <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--danger-light)', borderRadius: 7 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--danger)', marginBottom: 4 }}>REJECTION REASON</div>
                  <div style={{ fontSize: '0.85rem' }}>{selected.rejectionReason}</div>
                </div>
              )}

              {selected.reviewedBy && (
                <div style={{ marginTop: 12, fontSize: '0.76rem', color: 'var(--text-light)' }}>
                  Reviewed by: {selected.reviewedBy?.name} · {format(new Date(selected.updatedAt), 'MMM d, yyyy')}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowDetailModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
