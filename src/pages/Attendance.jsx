import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import AppIcon from '../components/AppIcon';

export default function Attendance() {
  const { canManage, isAdmin } = useAuth();
  const [records, setRecords] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ event: '', attendees: [] });
  const [newAttendee, setNewAttendee] = useState({ name: '', barangay: '', contactNumber: '', present: true });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recRes, evRes] = await Promise.all([
        api.get('/attendance', { params: selectedEvent ? { event: selectedEvent } : {} }),
        api.get('/events', { params: { approved: 'true' } }),
      ]);
      setRecords(recRes.data);
      setEvents(evRes.data);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [selectedEvent]);

  const openCreate = () => {
    setEditing(null);
    setForm({ event: '', attendees: [] });
    setNewAttendee({ name: '', barangay: '', contactNumber: '', present: true });
    setShowModal(true);
  };

  const openEdit = (rec) => {
    setEditing(rec._id);
    setForm({ event: rec.event?._id || rec.event, attendees: [...rec.attendees] });
    setNewAttendee({ name: '', barangay: '', contactNumber: '', present: true });
    setShowModal(true);
  };

  const addAttendee = () => {
    if (!newAttendee.name.trim()) return toast.error('Name is required');
    setForm({ ...form, attendees: [...form.attendees, { ...newAttendee }] });
    setNewAttendee({ name: '', barangay: '', contactNumber: '', present: true });
  };

  const removeAttendee = (idx) => {
    setForm({ ...form, attendees: form.attendees.filter((_, i) => i !== idx) });
  };

  const togglePresent = (idx) => {
    const updated = [...form.attendees];
    updated[idx] = { ...updated[idx], present: !updated[idx].present };
    setForm({ ...form, attendees: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.event) return toast.error('Please select an event');
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/attendance/${editing}`, form);
        toast.success('Attendance updated');
      } else {
        await api.post('/attendance', form);
        toast.success('Attendance recorded');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this attendance record?')) return;
    try {
      await api.delete(`/attendance/${id}`);
      toast.success('Deleted');
      fetchData();
    } catch { toast.error('Delete failed'); }
  };

  const totalPresent = form.attendees.filter((a) => a.present).length;

  return (
    <Layout title="Attendance">
      <div className="page-header">
        <div>
          <div className="page-title"><AppIcon name="attendance" size={18} className="inline-icon" /> Attendance Tracking</div>
          <div className="page-subtitle">Record and monitor participant attendance per event</div>
        </div>
        {canManage && <button className="btn btn-primary" onClick={openCreate}>+ Record Attendance</button>}
      </div>

      <div className="filters-bar">
        <select className="form-select" style={{ maxWidth: 280 }} value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)}>
          <option value="">All Events</option>
          {events.map((ev) => <option key={ev._id} value={ev._id}>{ev.title}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="loader"><div className="spinner"></div></div>
      ) : records.length === 0 ? (
        <div className="empty-state"><div className="empty-icon"><AppIcon name="file" size={42} /></div><p>No attendance records found</p></div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>Date</th>
                <th>Total Attendees</th>
                <th>Recorded By</th>
                <th>Recorded On</th>
                {canManage && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {records.map((rec) => (
                <tr key={rec._id}>
                  <td style={{ fontWeight: 600 }}>{rec.event?.title || '—'}</td>
                  <td>{rec.event?.startDate ? format(new Date(rec.event.startDate), 'MMM d, yyyy') : '—'}</td>
                  <td>
                    <span className="badge badge-green">{rec.totalAttendees} present</span>
                    <span style={{ marginLeft: 6, fontSize: '0.75rem', color: 'var(--text-light)' }}>/ {rec.attendees?.length} total</span>
                  </td>
                  <td>{rec.recordedBy?.name || '—'}</td>
                  <td>{format(new Date(rec.createdAt), 'MMM d, yyyy')}</td>
                  {canManage && (
                    <td>
                      <div className="table-actions">
                        <button className="btn btn-sm btn-outline" onClick={() => openEdit(rec)}>Edit</button>
                        {isAdmin && <button className="btn btn-sm btn-danger" onClick={() => handleDelete(rec._id)}>Del</button>}
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
          <div className="modal modal-lg">
            <div className="modal-header">
              <span className="modal-title">{editing ? 'Edit Attendance' : 'Record Attendance'}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Event *</label>
                  <select
                    className="form-select"
                    value={form.event}
                    onChange={(e) => setForm({ ...form, event: e.target.value })}
                    required
                    disabled={!!editing}
                  >
                    <option value="">Select Event</option>
                    {events.map((ev) => <option key={ev._id} value={ev._id}>{ev.title} — {format(new Date(ev.startDate), 'MMM d, yyyy')}</option>)}
                  </select>
                </div>

                <div className="card" style={{ marginBottom: 14 }}>
                  <div className="card-title">Add Attendee</div>
                  <div className="form-row">
                    <div className="form-group" style={{ margin: 0 }}>
                      <input className="form-input" placeholder="Full Name *" value={newAttendee.name} onChange={(e) => setNewAttendee({ ...newAttendee, name: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <input className="form-input" placeholder="Barangay" value={newAttendee.barangay} onChange={(e) => setNewAttendee({ ...newAttendee, barangay: e.target.value })} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'center' }}>
                    <input className="form-input" placeholder="Contact Number" value={newAttendee.contactNumber} onChange={(e) => setNewAttendee({ ...newAttendee, contactNumber: e.target.value })} style={{ flex: 1 }} />
                    <label style={{ display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', fontSize: '0.84rem' }}>
                      <input type="checkbox" checked={newAttendee.present} onChange={(e) => setNewAttendee({ ...newAttendee, present: e.target.checked })} />
                      Present
                    </label>
                    <button type="button" className="btn btn-accent btn-sm" onClick={addAttendee}>Add</button>
                  </div>
                </div>

                <div style={{ marginBottom: 6, fontWeight: 600, fontSize: '0.85rem', color: 'var(--primary-dark)' }}>
                  Attendees List ({totalPresent} present / {form.attendees.length} total)
                </div>
                {form.attendees.length === 0 ? (
                  <div style={{ color: 'var(--text-light)', fontSize: '0.83rem', padding: '10px 0' }}>No attendees added yet.</div>
                ) : (
                  <div className="table-wrapper" style={{ maxHeight: 200, overflowY: 'auto' }}>
                    <table>
                      <thead><tr><th>Name</th><th>Barangay</th><th>Contact</th><th>Present</th><th></th></tr></thead>
                      <tbody>
                        {form.attendees.map((att, idx) => (
                          <tr key={idx}>
                            <td>{att.name}</td>
                            <td>{att.barangay || '—'}</td>
                            <td>{att.contactNumber || '—'}</td>
                            <td>
                              <input type="checkbox" checked={att.present} onChange={() => togglePresent(idx)} />
                            </td>
                            <td><button type="button" className="btn btn-sm btn-danger" onClick={() => removeAttendee(idx)}>×</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Save Record'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
