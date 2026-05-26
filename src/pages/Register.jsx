import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import BrandLogo from '../components/BrandLogo';
import AppIcon from '../components/AppIcon';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const portalType = searchParams.get('portal') === 'viewer' ? 'viewer' : 'admin';
  const isViewerPortal = portalType === 'viewer';
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    role: 'viewer', barangay: '', phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
    let { name, value } = e.target;
    if (name === 'name') value = value.replace(/[0-9]/g, ''); // no numbers in name
    if (name === 'phone') value = value.replace(/\D/g, '').slice(0, 11); // digits only, max 11
    if (name === 'role' && isViewerPortal) value = 'viewer';
    setForm({ ...form, [name]: value });
    setError(''); // clear error when user edits
  };

  useEffect(() => {
    if (!isViewerPortal) return;
    setForm((prev) => ({ ...prev, role: 'viewer' }));
  }, [isViewerPortal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!form.name.trim()) {
      setError('\u274c Full name is required.');
      return;
    }
    if (/[0-9]/.test(form.name)) {
      setError('\u274c Name must not contain numbers.');
      return;
    }
    if (form.name.trim().split(/\s+/).filter(Boolean).length < 2) {
      setError('\u274c Please enter your first and last name.');
      return;
    }
    if (!emailRegex.test(form.email)) {
      setError('Please enter a valid email address (e.g. name@gmail.com).');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 6) {
      setError('\u274c Password must be at least 6 characters.');
      return;
    }
    if (form.phone && !/^09\d{9}$/.test(form.phone)) {
      setError('\u274c Phone number must be 11 digits and start with 09 (e.g. 09XXXXXXXXX).');
      return;
    }
    setLoading(true);
    try {
      const { confirmPassword, ...data } = form;
      if (isViewerPortal) data.role = 'viewer';
      data.portal = portalType;
      const result = await register(data);
      if (result.user?.status === 'active') {
        toast.success('Registration successful!');
        navigate('/dashboard');
      } else {
        toast.success(result.message || 'Registration submitted. Awaiting admin approval.');
        navigate('/login');
      }
    } catch (err) {
      const msg = err.response?.data?.message || '';
      const validationErrors = err.response?.data?.errors;
      if (validationErrors?.length) {
        setError(validationErrors.map((e) => e.msg).join(' • '));
      } else if (msg.toLowerCase().includes('phone number already')) {
        setError('This phone number is already registered. Please use a different number.');
      } else if (msg.toLowerCase().includes('name already exists')) {
        setError('An account with this name already exists. Please use your full name or contact the administrator.');
      } else if (msg.toLowerCase().includes('email already') || msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('e11000')) {
        setError('An account with this email already exists. Try logging in instead.');
      } else if (err.response?.status === 500) {
        setError('Server error. Please try again later.');
      } else {
        setError(msg || 'Registration failed. Please try again.');
      }
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
              <div className="portal-topbar-sub">MCAD Access Gateway</div>
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
        <div className="portal-content" style={{ paddingTop: 90, paddingBottom: 90 }}>
          <div className="portal-login-wrap" style={{ maxWidth: 560 }}>
            <Link to="/login" className="portal-back" style={{ textDecoration: 'none' }}>
              {'<'} Back to Sign In
            </Link>

            <div className="portal-login-card">
              <div className="portal-login-icon">
                <AppIcon name="approved" size={22} />
              </div>
              <h2>Create Account</h2>
              <p>Register to access the MCAD system</p>

              {error && <div className="alert alert-error"><AppIcon name="alert" size={14} className="inline-icon" /> {error}</div>}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input name="name" className="form-input" placeholder="First name and last name" value={form.name} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input name="email" type="email" className="form-input" placeholder="email@example.com" value={form.email} onChange={handleChange} required autoComplete="email" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Password *</label>
                    <input name="password" type="password" className="form-input" placeholder="Min. 6 characters" value={form.password} onChange={handleChange} required autoComplete="new-password" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Confirm Password *</label>
                    <input name="confirmPassword" type="password" className="form-input" placeholder="Repeat password" value={form.confirmPassword} onChange={handleChange} required autoComplete="new-password" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Role *</label>
                  <select name="role" className="form-select" value={form.role} onChange={handleChange} disabled={isViewerPortal}>
                    <option value="viewer">Community Viewer (Resident)</option>
                    {!isViewerPortal && <option value="leader">Community Leader / Organizer</option>}
                    {!isViewerPortal && <option value="imam">Imam / Mosque Administrator</option>}
                    {!isViewerPortal && <option value="barangay_admin">Barangay Administrator</option>}
                    {!isViewerPortal && <option value="admin">System Administrator (Higher Access)</option>}
                  </select>
                  {isViewerPortal ? (
                    <div className="form-hint"><AppIcon name="info" size={12} className="inline-icon" /> Viewer Portal accounts are limited to Community Viewer role.</div>
                  ) : form.role !== 'viewer' ? (
                    <div className="form-hint"><AppIcon name="alert" size={12} className="inline-icon" /> Non-viewer roles require admin approval before access is granted.</div>
                  ) : null}
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Barangay</label>
                    <input name="barangay" className="form-input" placeholder="e.g. Brgy. Lagao" value={form.barangay} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input name="phone" className="form-input" placeholder="09XXXXXXXXX" value={form.phone} onChange={handleChange} />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '11px', marginTop: 4 }} disabled={loading}>
                  {loading ? 'Registering...' : (<><AppIcon name="approved" size={14} className="inline-icon" /> Create Account</>)}
                </button>
              </form>

              <div className="portal-login-links">
                <span>Already have an account?</span>
                <Link to="/login">Sign in</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
