import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import BrandLogo from '../components/BrandLogo';
import AppIcon from '../components/AppIcon';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentTime = now.toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const currentDate = now.toLocaleDateString('en-PH', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
      toast.success('Reset link sent!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-shell">
      <div className="portal-topbar">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div className="portal-topbar-brand">
            <BrandLogo size={44} variant="dark" />
            <div>
              <div className="portal-topbar-title">Republic of the Philippines</div>
              <div className="portal-topbar-sub">City Mayor's Office - General Santos City</div>
            </div>
          </div>
          <div className="portal-topbar-right" aria-live="polite">
            <div className="portal-clock-time">{currentTime}</div>
            <div className="portal-clock-date">{currentDate}</div>
          </div>
        </div>
      </div>

      <div className="portal-hero">
        <div className="portal-overlay" />
        <div className="portal-content">
          <div className="portal-login-wrap" style={{ maxWidth: 520 }}>
            <Link to="/login" className="portal-back" style={{ textDecoration: 'none' }}>
              {'<'} Back to Sign In
            </Link>

            <div className="portal-login-card">
              <div className="portal-login-icon">
                <AppIcon name="lock" size={22} />
              </div>
              <h2>Forgot Password</h2>
              <p>Enter your email and we'll send you a reset link</p>

              {sent ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <div style={{ marginBottom: 12 }}><AppIcon name="mail" size={44} /></div>
                  <p style={{ fontWeight: 600, marginBottom: 8 }}>Check your email!</p>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-mid)', marginBottom: 20 }}>
                    If <strong>{email}</strong> is registered, a password reset link has been sent. Check your inbox (and spam folder).
                  </p>
                  <Link to="/login" className="btn btn-primary" style={{ display: 'inline-block' }}>Back to Sign In</Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="form-group" style={{ marginTop: 16 }}>
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                  <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.88rem', color: 'var(--text-mid)' }}>
                    <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>← Back to Sign In</Link>
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
