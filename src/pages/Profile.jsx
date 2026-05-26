import { useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import AppIcon from '../components/AppIcon';

const roleLabel = (r) => ({ admin: 'Admin', barangay_admin: 'Barangay Admin', imam: 'Imam / Mosque Admin', leader: 'Community Leader', viewer: 'Community Viewer' }[r] || r);
const roleBadge = (r) => ({ admin: 'badge-red', barangay_admin: 'badge-red', imam: 'badge-blue', leader: 'badge-green', viewer: 'badge-gray' }[r] || 'badge-gray');

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState('');
  const [photoInputKey, setPhotoInputKey] = useState(0);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error('Image must be 3MB or smaller');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPendingPhoto(reader.result);
      toast.success('Photo selected. Click Save Photo to apply.');
    };
    reader.readAsDataURL(file);
  };

  const handleSavePhoto = async () => {
    if (!pendingPhoto) return;
    setPhotoSaving(true);
    try {
      const { data } = await api.put('/auth/profile-photo', { profilePhoto: pendingPhoto });
      updateUser(data);
      setPendingPhoto('');
      setPhotoInputKey((k) => k + 1);
      toast.success('Profile photo updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload photo');
    } finally {
      setPhotoSaving(false);
    }
  };

  const handleCancelPendingPhoto = () => {
    setPendingPhoto('');
    setPhotoInputKey((k) => k + 1);
  };

  const handleRemovePhoto = async () => {
    if (!window.confirm('Remove your profile photo?')) return;
    setPhotoSaving(true);
    try {
      const { data } = await api.delete('/auth/profile-photo');
      updateUser(data);
      setPendingPhoto('');
      setPhotoInputKey((k) => k + 1);
      toast.success('Profile photo removed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove photo');
    } finally {
      setPhotoSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (form.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    setSaving(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      toast.success('Password changed successfully!');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout title="My Profile">
      <div className="page-header">
        <div>
          <div className="page-title"><AppIcon name="profile" size={18} className="inline-icon" /> My Profile</div>
          <div className="page-subtitle">View your account details and change your password</div>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* ── Account Info ── */}
        <div className="card">
          <div className="card-title">Account Information</div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            {(pendingPhoto || user?.profilePhoto) ? (
              <img
                src={pendingPhoto || user.profilePhoto}
                alt="Profile"
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid var(--border)',
                  flexShrink: 0,
                }}
              />
            ) : (
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'var(--primary)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.6rem', fontWeight: 700, flexShrink: 0,
              }}>
                {user?.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{user?.name}</div>
              <div style={{ color: 'var(--text-mid)', fontSize: '0.85rem' }}>{user?.email}</div>
              <span className={`badge ${roleBadge(user?.role)}`} style={{ marginTop: 4 }}>{roleLabel(user?.role)}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <label className="btn btn-outline btn-sm" style={{ position: 'relative', overflow: 'hidden' }}>
              Choose Photo
              <input
                key={photoInputKey}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                disabled={photoSaving}
                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
              />
            </label>
            {pendingPhoto && (
              <button type="button" className="btn btn-primary btn-sm" onClick={handleSavePhoto} disabled={photoSaving}>
                {photoSaving ? 'Saving...' : 'Save Photo'}
              </button>
            )}
            {pendingPhoto && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleCancelPendingPhoto} disabled={photoSaving}>
                Cancel
              </button>
            )}
            {!pendingPhoto && user?.profilePhoto && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleRemovePhoto} disabled={photoSaving}>
                Remove Photo
              </button>
            )}
          </div>

          {[
            { label: 'Full Name', value: user?.name },
            { label: 'Email', value: user?.email },
            { label: 'Role', value: roleLabel(user?.role) },
            { label: 'Barangay', value: user?.barangay || '—' },
            { label: 'Phone', value: user?.phone || '—' },
            { label: 'Account Status', value: user?.status },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-light)', width: 130, flexShrink: 0 }}>{label}</div>
              <div style={{ fontSize: '0.88rem', textTransform: label === 'Account Status' || label === 'Role' ? 'capitalize' : 'none' }}>{value}</div>
            </div>
          ))}

          <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(26,92,58,0.06)', borderRadius: 8, fontSize: '0.78rem', color: 'var(--text-mid)' }}>
            <AppIcon name="info" size={14} className="inline-icon" /> To update your name, email, or barangay, contact the system administrator. You can upload your own profile photo above.
          </div>
        </div>

        {/* ── Change Password ── */}
        <div className="card">
          <div className="card-title"><AppIcon name="lock" size={16} className="inline-icon" /> Change Password</div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-mid)', marginBottom: 20 }}>
            Update your password. You'll need to enter your current password to confirm.
          </p>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Current Password *</label>
              <input
                name="currentPassword"
                type="password"
                className="form-input"
                placeholder="Enter current password"
                value={form.currentPassword}
                onChange={handleChange}
                required
                autoComplete="current-password"
              />
            </div>
            <div className="form-group">
              <label className="form-label">New Password *</label>
              <input
                name="newPassword"
                type="password"
                className="form-input"
                placeholder="Minimum 6 characters"
                value={form.newPassword}
                onChange={handleChange}
                required
                autoComplete="new-password"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password *</label>
              <input
                name="confirmPassword"
                type="password"
                className="form-input"
                placeholder="Repeat new password"
                value={form.confirmPassword}
                onChange={handleChange}
                required
                autoComplete="new-password"
              />
              {form.confirmPassword && form.newPassword !== form.confirmPassword && (
                <div style={{ fontSize: '0.77rem', color: 'var(--danger)', marginTop: 4 }}>Passwords do not match</div>
              )}
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={saving || (form.confirmPassword && form.newPassword !== form.confirmPassword)}
            >
              {saving ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
