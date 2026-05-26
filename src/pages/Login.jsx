import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import BrandLogo from '../components/BrandLogo';
import AppIcon from '../components/AppIcon';

export default function Login() {
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const [portal, setPortal] = useState(null); // null | admin | viewer
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null); // { type, message }
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
    if (!portal) {
      setNotice({ type: 'warning', message: 'Please choose Admin Portal or Viewer Portal first.' });
      return;
    }
    if (!emailRegex.test(form.email)) {
      setNotice({ type: 'error', message: 'Please enter a valid email address (e.g. name@gmail.com).' });
      return;
    }
    setLoading(true);
    try {
      const user = await login(form.email, form.password);

      const isViewer = user?.role === 'viewer';
      const isAdminSide = user?.role && user.role !== 'viewer';

      if (portal === 'admin' && !isAdminSide) {
        logout();
        setNotice({ type: 'warning', message: 'This account is for Viewer Portal. Please use Viewer Portal login.' });
        return;
      }

      if (portal === 'viewer' && !isViewer) {
        logout();
        setNotice({ type: 'warning', message: 'This account is for Admin Portal. Please use Admin Portal login.' });
        return;
      }

      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      setNotice(parseError(err));
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
          <BrandLogo className="portal-center-logo" size={108} variant="light" />
          <h1 className="portal-heading">Muslim Concerns and Affairs Division (MCAD)</h1>
          <p className="portal-subheading">Secure portal for administrators and community viewers</p>

          {!portal ? (
            <div className="portal-actions">
              <button type="button" className="portal-btn portal-btn-admin" onClick={() => setPortal('admin')}>
                <AppIcon name="profile" size={16} className="inline-icon" /> Admin Portal
              </button>
              <button type="button" className="portal-btn portal-btn-viewer" onClick={() => setPortal('viewer')}>
                <AppIcon name="users" size={16} className="inline-icon" /> Viewer Portal
              </button>
            </div>
          ) : (
            <div className="portal-login-wrap">
              <button type="button" className="portal-back" onClick={() => setPortal(null)}>
                {'<'} Back to portal selection
              </button>

              <div className="portal-login-card">
                <div className="portal-login-icon">
                  <AppIcon name={portal === 'admin' ? 'profile' : 'users'} size={22} />
                </div>
                <h2>{portal === 'admin' ? 'Admin Login' : 'Viewer Login'}</h2>
                <p>{portal === 'admin' ? 'Secure access for staff and administrators' : 'Resident and public information access'}</p>

                {notice && (
                  <div className={`alert alert-${notice.type}`} style={{ marginTop: 4, marginBottom: 12 }}>
                    {notice.message}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <input
                      name="email"
                      type="email"
                      className="form-input"
                      placeholder="Enter your email address"
                      value={form.email}
                      onChange={handleChange}
                      required
                      autoComplete="email"
                    />
                  </div>
                  <div className="form-group">
                    <input
                      name="password"
                      type="password"
                      className="form-input"
                      placeholder="Enter your password"
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
                    {loading ? 'Signing in...' : (<><AppIcon name="lock" size={14} className="inline-icon" /> Login</>)}
                  </button>
                </form>

                <div className="portal-login-links">
                  <Link to="/forgot-password">Forgot password?</Link>
                  <span>•</span>
                  <Link to={portal === 'viewer' ? '/register?portal=viewer' : '/register?portal=admin'}>
                    Create account
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
