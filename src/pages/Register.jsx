import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import BrandLogo from '../components/BrandLogo';
import AppIcon from '../components/AppIcon';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    role: 'viewer', barangay: '', phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    let { name, value } = e.target;
    if (name === 'name') value = value.replace(/[0-9]/g, ''); // no numbers in name
    if (name === 'phone') value = value.replace(/\D/g, '').slice(0, 11); // digits only, max 11
    setForm({ ...form, [name]: value });
    setError(''); // clear error when user edits
  };

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
    <div className="auth-page">
      <div className="auth-left">
        <BrandLogo className="org-logo" size={92} variant="light" />
        <h1>MCAD</h1>
        <p style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 6, color: 'var(--accent-light)' }}>
          Muslim Concerns and Affairs Division
        </p>
        <p>City Mayor's Office — General Santos City</p>
      </div>
      <div className="auth-right" style={{ overflowY: 'auto' }}>
        <div className="auth-form-box">
          <h2>Create Account</h2>
          <p>Register to access the MCAD system</p>

          {error && <div className="alert alert-error"><AppIcon name="alert" size={14} className="inline-icon" /> {error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input name="name" className="form-input" placeholder="Juan Dela Cruz" value={form.name} onChange={handleChange} required />
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
              <select name="role" className="form-select" value={form.role} onChange={handleChange}>
                <option value="viewer">Community Viewer (Resident)</option>
                <option value="leader">Community Leader / Organizer</option>
                <option value="imam">Imam / Mosque Administrator</option>
                <option value="admin">LGU / Barangay Administrator</option>
              </select>
              {form.role !== 'viewer' && (
                <div className="form-hint"><AppIcon name="alert" size={12} className="inline-icon" /> Non-viewer roles require admin approval before access is granted.</div>
              )}
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
          <div className="auth-divider">— or —</div>
          <p style={{ textAlign: 'center', fontSize: '0.84rem', color: 'var(--text-mid)' }}>
            Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
