import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import BrandLogo from '../components/BrandLogo';
import AppIcon from '../components/AppIcon';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (form.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await api.post(`/auth/reset-password/${token}`, { newPassword: form.newPassword });
      setDone(true);
      toast.success('Password reset successfully!');
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed. Link may be expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <BrandLogo className="org-logo" size={92} variant="light" />
        <h1>MCAD</h1>
        <p style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 6, color: 'var(--accent-light)' }}>
          Muslim Concerns and Affairs Division
        </p>
        <p>City Mayor's Office — General Santos City</p>
      </div>
      <div className="auth-right">
        <div className="auth-form-box">
          <h2>Reset Password</h2>
          <p>Enter your new password below</p>

          {done ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ marginBottom: 12 }}><AppIcon name="approved" size={44} /></div>
              <p style={{ fontWeight: 600, marginBottom: 8 }}>Password reset!</p>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-mid)', marginBottom: 20 }}>Redirecting to sign in...</p>
              <Link to="/login" className="btn btn-primary" style={{ display: 'inline-block' }}>Sign In Now</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginTop: 16 }}>
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Minimum 6 characters"
                  value={form.newPassword}
                  onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                  required
                  autoComplete="new-password"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Repeat new password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  required
                  autoComplete="new-password"
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
              <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.88rem', color: 'var(--text-mid)' }}>
                <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>← Back to Sign In</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
