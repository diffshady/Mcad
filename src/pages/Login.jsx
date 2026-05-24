import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import BrandLogo from '../components/BrandLogo';
import AppIcon from '../components/AppIcon';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null); // { type, message }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setNotice(null); // clear notice when user edits
  };

  const parseError = (err) => {
    const status = err.response?.status;
    const msg = err.response?.data?.message || '';
    if (status === 401 || msg.toLowerCase().includes('invalid email or password')) {
      return { type: 'error', message: 'Incorrect email or password. Please check your credentials and try again.' };
    }
    if (msg.toLowerCase().includes('suspended')) {
      return { type: 'warning', message: 'Your account has been suspended. Please contact the administrator.' };
    }
    if (msg.toLowerCase().includes('pending')) {
      return { type: 'warning', message: 'Your account is pending approval. Please wait for an administrator to activate it.' };
    }
    if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('no user')) {
      return { type: 'error', message: 'No account found with that email address.' };
    }
    if (status === 500) {
      return { type: 'error', message: 'Server error. Please try again later.' };
    }
    return { type: 'error', message: msg || 'Login failed. Please try again.' };
  };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setNotice(null);
    if (!emailRegex.test(form.email)) {
      setNotice({ type: 'error', message: 'Please enter a valid email address (e.g. name@gmail.com).' });
      return;
    }
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      setNotice(parseError(err));
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
        <div style={{ marginTop: 32, padding: '20px', background: 'rgba(255,255,255,0.08)', borderRadius: 10, maxWidth: 300 }}>
          <p style={{ fontSize: '0.82rem', opacity: 0.85, fontStyle: 'italic' }}>
            "Centralized event management and community coordination for Ramadan programs and Muslim community services."
          </p>
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-form-box">
          <h2>Sign In</h2>
          <p>Access your MCAD account</p>

          {notice && (
            <div className={`alert alert-${notice.type}`} style={{ marginTop: 4 }}>
              {notice.message}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                name="email"
                type="email"
                className="form-input"
                placeholder="your@email.com"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">Password</label>
                <Link to="/forgot-password" style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 600 }}>Forgot password?</Link>
              </div>
              <input
                name="password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '11px', fontSize: '0.92rem', marginTop: 4 }}
              disabled={loading}
            >
              {loading ? 'Signing in...' : (<><AppIcon name="lock" size={14} className="inline-icon" /> Sign In</>)}
            </button>
          </form>

          <div className="auth-divider">— or —</div>
          <p style={{ textAlign: 'center', fontSize: '0.84rem', color: 'var(--text-mid)' }}>
            Don't have an account?{' '}
            <Link to="/register" className="auth-link">Register here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
