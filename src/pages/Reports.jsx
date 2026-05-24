import { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import api from '../api/axios';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import BrandLogo from '../components/BrandLogo';
import AppIcon from '../components/AppIcon';
import { useAuth } from '../context/AuthContext';

export default function Reports() {
  const { user, isAdmin } = useAuth();
  const [reportType, setReportType] = useState('events');
  const [events, setEvents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const printRef = useRef();

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [evRes, attRes, donRes] = await Promise.all([
        api.get('/events', { params: { approved: 'true' } }),
        api.get('/attendance'),
        api.get('/donations'),
      ]);
      setEvents(evRes.data);
      setAttendance(attRes.data);
      setDonations(donRes.data);
    } catch { toast.error('Failed to load report data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const filterByDate = (items, dateField) => {
    return items.filter((item) => {
      const d = new Date(item[dateField]);
      if (fromDate && d < new Date(fromDate)) return false;
      if (toDate && d > new Date(toDate + 'T23:59:59')) return false;
      return true;
    });
  };

  const filteredEvents = filterByDate(events, 'startDate');
  const filteredAttendance = filterByDate(attendance, 'createdAt');
  const filteredDonations = filterByDate(donations, 'dateReceived');

  const totalAttendance = filteredAttendance.reduce((s, r) => s + r.totalAttendees, 0);
  const totalCash = filteredDonations.filter((d) => d.donationType === 'cash').reduce((s, d) => s + (d.amount || 0), 0);

  const canDeleteEvent = (event) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return event?.createdBy?._id === user._id;
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Delete this event from reports?')) return;
    try {
      await api.delete(`/events/${id}`);
      setEvents((prev) => prev.filter((e) => e._id !== id));
      toast.success('Event deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete event');
    }
  };

  const handleDeleteAttendance = async (id) => {
    if (!window.confirm('Delete this attendance record?')) return;
    try {
      await api.delete(`/attendance/${id}`);
      setAttendance((prev) => prev.filter((r) => r._id !== id));
      toast.success('Attendance record deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete attendance record');
    }
  };

  const handleDeleteDonation = async (id) => {
    if (!window.confirm('Delete this donation record?')) return;
    try {
      await api.delete(`/donations/${id}`);
      setDonations((prev) => prev.filter((d) => d._id !== id));
      toast.success('Donation record deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete donation record');
    }
  };

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`
      <html>
        <head>
          <title>MCAD Report – ${reportType.toUpperCase()}</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 20px; }
            h1 { color: #1a5c3a; font-size: 18px; }
            h2 { color: #1a5c3a; font-size: 14px; margin-top: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #1a5c3a; color: white; padding: 6px 10px; text-align: left; font-size: 11px; }
            td { padding: 6px 10px; border-bottom: 1px solid #ddd; font-size: 11px; }
            tr:nth-child(even) { background: #f5f5f5; }
            .badge { display: inline-block; padding: 2px 7px; border-radius: 10px; font-size: 10px; background: #eee; }
            .summary { display: flex; gap: 20px; margin: 14px 0; flex-wrap: wrap; }
            .sum-box { background: #f0faf4; border: 1px solid #1a5c3a; border-radius: 6px; padding: 10px 16px; }
            .sum-val { font-size: 18px; font-weight: 700; color: #1a5c3a; }
            .sum-label { font-size: 11px; color: #555; }
            .footer { margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px; font-size: 10px; color: #888; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  const today = format(new Date(), 'MMMM d, yyyy');

  const renderContent = () => {
    if (reportType === 'events') {
      return (
        <>
          <h2>Ramadan Event Schedule Report</h2>
          <div className="summary" style={{ display: 'flex', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
            <div className="stat-card green" style={{ padding: '12px 16px', flex: 1 }}>
              <div className="stat-value">{filteredEvents.length}</div>
              <div className="stat-label">Total Events</div>
            </div>
            <div className="stat-card blue" style={{ padding: '12px 16px', flex: 1 }}>
              <div className="stat-value">{filteredEvents.filter((e) => e.status === 'upcoming').length}</div>
              <div className="stat-label">Upcoming</div>
            </div>
            <div className="stat-card orange" style={{ padding: '12px 16px', flex: 1 }}>
              <div className="stat-value">{filteredEvents.filter((e) => e.status === 'ongoing').length}</div>
              <div className="stat-label">Ongoing</div>
            </div>
            <div className="stat-card gold" style={{ padding: '12px 16px', flex: 1 }}>
              <div className="stat-value">{filteredEvents.filter((e) => e.status === 'completed').length}</div>
              <div className="stat-label">Completed</div>
            </div>
          </div>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>#</th><th>Event Title</th><th>Type</th><th>Date</th><th>Venue</th><th>Organizer</th><th>Status</th><th>Attendance</th><th>Actions</th></tr></thead>
              <tbody>
                {filteredEvents.map((ev, i) => (
                  <tr key={ev._id}>
                    <td>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{ev.title}</td>
                    <td><span className="badge badge-gold" style={{ textTransform: 'capitalize' }}>{ev.type}</span></td>
                    <td>{format(new Date(ev.startDate), 'MMM d, yyyy h:mm a')}</td>
                    <td>{ev.venue || '—'}</td>
                    <td>{ev.organizer || '—'}</td>
                    <td><span className={`badge ${{ upcoming: 'badge-blue', ongoing: 'badge-green', completed: 'badge-gray', cancelled: 'badge-red' }[ev.status]}`}>{ev.status}</span></td>
                    <td>{ev.attendanceCount}</td>
                    <td>
                      {canDeleteEvent(ev) ? (
                        <button className="btn btn-sm btn-danger" onClick={() => handleDeleteEvent(ev._id)}>
                          Delete
                        </button>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      );
    }
    if (reportType === 'attendance') {
      return (
        <>
          <h2>Attendance Summary Report</h2>
          <div className="stats-grid" style={{ marginBottom: 14 }}>
            <div className="stat-card green" style={{ padding: '12px 16px' }}>
              <div className="stat-value">{filteredAttendance.length}</div>
              <div className="stat-label">Event Records</div>
            </div>
            <div className="stat-card blue" style={{ padding: '12px 16px' }}>
              <div className="stat-value">{totalAttendance}</div>
              <div className="stat-label">Total Attendees (Present)</div>
            </div>
          </div>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>#</th><th>Event</th><th>Event Date</th><th>Present</th><th>Total Listed</th><th>Recorded By</th><th>Record Date</th><th>Actions</th></tr></thead>
              <tbody>
                {filteredAttendance.map((rec, i) => (
                  <tr key={rec._id}>
                    <td>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{rec.event?.title || '—'}</td>
                    <td>{rec.event?.startDate ? format(new Date(rec.event.startDate), 'MMM d, yyyy') : '—'}</td>
                    <td><span className="badge badge-green">{rec.totalAttendees}</span></td>
                    <td>{rec.attendees?.length}</td>
                    <td>{rec.recordedBy?.name || '—'}</td>
                    <td>{format(new Date(rec.createdAt), 'MMM d, yyyy')}</td>
                    <td>
                      {isAdmin ? (
                        <button className="btn btn-sm btn-danger" onClick={() => handleDeleteAttendance(rec._id)}>
                          Delete
                        </button>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      );
    }
    if (reportType === 'donations') {
      return (
        <>
          <h2>Donation & Distribution Records</h2>
          <div className="stats-grid" style={{ marginBottom: 14 }}>
            <div className="stat-card green" style={{ padding: '12px 16px' }}>
              <div className="stat-value">₱{totalCash.toLocaleString()}</div>
              <div className="stat-label">Total Cash</div>
            </div>
            <div className="stat-card gold" style={{ padding: '12px 16px' }}>
              <div className="stat-value">{filteredDonations.length}</div>
              <div className="stat-label">Total Records</div>
            </div>
            <div className="stat-card blue" style={{ padding: '12px 16px' }}>
              <div className="stat-value">{filteredDonations.filter((d) => d.donationType === 'food').length}</div>
              <div className="stat-label">Food Donations</div>
            </div>
            <div className="stat-card orange" style={{ padding: '12px 16px' }}>
              <div className="stat-value">{filteredDonations.filter((d) => d.donationType === 'supplies').length}</div>
              <div className="stat-label">Supplies Donations</div>
            </div>
          </div>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>#</th><th>Donor</th><th>Type</th><th>Amount / Qty</th><th>Description</th><th>Event</th><th>Date Received</th><th>Actions</th></tr></thead>
              <tbody>
                {filteredDonations.map((d, i) => (
                  <tr key={d._id}>
                    <td>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{d.donorName || 'Anonymous'}</td>
                    <td><span className={`badge ${{ cash: 'badge-green', food: 'badge-gold', supplies: 'badge-blue' }[d.donationType]}`}>{d.donationType}</span></td>
                    <td>{d.donationType === 'cash' ? `₱${(d.amount || 0).toLocaleString()}` : d.quantity || '—'}</td>
                    <td>{d.description || '—'}</td>
                    <td>{d.event?.title || '—'}</td>
                    <td>{format(new Date(d.dateReceived), 'MMM d, yyyy')}</td>
                    <td>
                      {isAdmin ? (
                        <button className="btn btn-sm btn-danger" onClick={() => handleDeleteDonation(d._id)}>
                          Delete
                        </button>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      );
    }
  };

  return (
    <Layout title="Reports">
      <div className="page-header">
        <div>
          <div className="page-title"><AppIcon name="reports" size={18} className="inline-icon" /> Reports</div>
          <div className="page-subtitle">Generate and print event schedules, attendance summaries, and donation records</div>
        </div>
        <button className="btn btn-accent" onClick={handlePrint}><AppIcon name="print" size={14} className="inline-icon" /> Print / Export</button>
      </div>

      {/* Controls */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">Report Options</div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Report Type</label>
            <select className="form-select" style={{ width: 200 }} value={reportType} onChange={(e) => setReportType(e.target.value)}>
              <option value="events">Event Schedule Report</option>
              <option value="attendance">Attendance Summary</option>
              <option value="donations">Donation Records</option>
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">From Date</label>
            <input type="date" className="form-input" style={{ width: 160 }} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">To Date</label>
            <input type="date" className="form-input" style={{ width: 160 }} value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => { setFromDate(''); setToDate(''); }}>Clear Dates</button>
        </div>
      </div>

      {/* Printable Report */}
      <div className="card" ref={printRef}>
        {/* Header (shown in print) */}
        <div style={{ borderBottom: '2px solid var(--primary)', paddingBottom: 12, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <BrandLogo size={42} variant="dark" />
              <div>
                <div style={{ fontFamily: 'Amiri, serif', fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary-dark)' }}>MCAD - Muslim Concerns and Affairs Division</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>City Mayor's Office, General Santos City</div>
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.78rem', color: 'var(--text-light)' }}>
              <div>Generated: {today}</div>
              {fromDate && <div>From: {fromDate}</div>}
              {toDate && <div>To: {toDate}</div>}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loader"><div className="spinner"></div></div>
        ) : renderContent()}

        <div style={{ marginTop: 24, paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: '0.74rem', color: 'var(--text-light)', textAlign: 'center' }}>
          MCAD Web-Based Event Management System | Generated on {today} | Confidential
        </div>
      </div>
    </Layout>
  );
}
