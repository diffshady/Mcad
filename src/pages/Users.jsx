import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../api/axios';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import AppIcon from '../components/AppIcon';

const ROLES = ['admin', 'barangay_admin', 'imam', 'leader', 'viewer'];
const STATUSES = ['active', 'pending', 'suspended'];
const roleBadge = (r) => ({ admin: 'badge-red', barangay_admin: 'badge-red', imam: 'badge-blue', leader: 'badge-green', viewer: 'badge-gray' }[r] || 'badge-gray');
const statusBadge = (s) => ({ active: 'badge-green', pending: 'badge-yellow', suspended: 'badge-red' }[s] || 'badge-gray');
const roleLabel = (r) => ({ admin: 'Admin', barangay_admin: 'Barangay Admin', imam: 'Imam / Mosque Admin', leader: 'Community Leader', viewer: 'Community Viewer' }[r] || r);

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [search, setSearch] = useState('');
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterRole) params.role = filterRole;
      const { data } = await api.get('/users', { params });
      setUsers(data);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, [filterStatus, filterRole]);

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/users/${id}/status`, { status });
      toast.success(`User ${status}`);
      fetchUsers();
    } catch { toast.error('Update failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Permanently delete this user?')) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success('User deleted');
      fetchUsers();
    } catch { toast.error('Delete failed'); }
  };

  const openEdit = (u) => {
    setEditUser(u);
    setEditForm({ name: u.name, email: u.email, role: u.role, barangay: u.barangay || '', phone: u.phone || '', password: '' });
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...editForm };
      if (!payload.password) delete payload.password;
      await api.put(`/users/${editUser._id}`, payload);
      toast.success('User updated');
      setEditUser(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.barangay || '').toLowerCase().includes(search.toLowerCase())
  );

  const pending = users.filter((u) => u.status === 'pending');

  return (
    <Layout title="User Management">
      <div className="page-header">
        <div>
          <div className="page-title"><AppIcon name="users" size={18} className="inline-icon" /> User Management</div>
          <div className="page-subtitle">Manage system users, approve accounts, and control access</div>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: 20 }}>
          <AppIcon name="pending" size={14} className="inline-icon" /> <strong>{pending.length} account{pending.length > 1 ? 's' : ''} pending approval.</strong> Review and activate or suspend below.
        </div>
      )}

      <div className="filters-bar">
        <div className="search-input-wrapper">
          <span className="search-icon"><AppIcon name="search" size={14} /></span>
          <input className="form-input search-input" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ width: 160 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s} style={{ textTransform: 'capitalize' }}>{s}</option>)}
        </select>
        <select className="form-select" style={{ width: 180 }} value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
          <option value="">All Roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="loader"><div className="spinner"></div></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><div className="empty-icon"><AppIcon name="profile" size={42} /></div><p>No users found</p></div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Barangay</th>
                <th>Status</th>
                <th>Registered</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u._id}>
                  <td style={{ fontWeight: 600 }}>{u.name}</td>
                  <td style={{ color: 'var(--text-mid)' }}>{u.email}</td>
                  <td><span className={`badge ${roleBadge(u.role)}`}>{roleLabel(u.role)}</span></td>
                  <td>{u.barangay || '—'}</td>
                  <td><span className={`badge ${statusBadge(u.status)}`}>{u.status}</span></td>
                  <td>{format(new Date(u.createdAt), 'MMM d, yyyy')}</td>
                  <td>
                    <div className="table-actions">
                      {u.status !== 'active' && (
                        <button className="btn btn-sm btn-accent" onClick={() => updateStatus(u._id, 'active')}>Approve</button>
                      )}
                      {u.status === 'active' && (
                        <button className="btn btn-sm btn-outline" onClick={() => updateStatus(u._id, 'suspended')}>Suspend</button>
                      )}
                      {u.status === 'suspended' && (
                        <button className="btn btn-sm btn-ghost" onClick={() => updateStatus(u._id, 'pending')}>Reset</button>
                      )}
                      <button className="btn btn-sm btn-outline" onClick={() => openEdit(u)}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(u._id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Edit User Modal ── */}
      {editUser && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Edit User — {editUser.name}</span>
              <button className="modal-close" onClick={() => setEditUser(null)}>×</button>
            </div>
            <form onSubmit={handleEditSave}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input className="form-input" required value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input className="form-input" type="email" required value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <select className="form-select" value={editForm.role}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                      {ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Barangay</label>
                    <input className="form-input" value={editForm.barangay}
                      onChange={(e) => setEditForm({ ...editForm, barangay: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="form-input" value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">New Password <span style={{ fontWeight: 400, color: 'var(--text-light)' }}>(leave blank to keep current)</span></label>
                    <input className="form-input" type="password" placeholder="••••••••" value={editForm.password}
                      onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                      autoComplete="new-password" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setEditUser(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
