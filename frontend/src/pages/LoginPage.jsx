import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, ChevronRight } from 'lucide-react';
import wallnutHero from '../assets/W.avif';
import wallnutLogo from '../assets/logo.png';
import './LoginPage.css';

const STATS = [
  { value: '2017', label: 'Founded' },
  { value: '2', label: 'Factories' },
  { value: '7+', label: 'States' },
  { value: '200+', label: 'Dealers' },
];

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Load saved credentials if user previously chose to save them
  useEffect(() => {
    try {
      const saved = localStorage.getItem('wallnut_saved_login');
      if (saved) {
        const { u, p } = JSON.parse(saved);
        if (u) setUsername(u);
        if (p) setPassword(p);
        setRememberMe(true);
      }
    } catch (e) {
      console.warn('Could not read saved credentials', e);
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setTimeout(() => {
      const result = login(username, password);
      setLoading(false);
      if (result.success) {
        if (rememberMe) {
          try {
            localStorage.setItem('wallnut_saved_login', JSON.stringify({ u: username, p: password }));
          } catch (e) { /* ignore */ }
        } else {
          localStorage.removeItem('wallnut_saved_login');
        }
        navigate('/dashboard', { replace: true });
      } else {
        setError(result.error);
      }
    }, 400);
  };

  return (
    <div className="login-page" id="login-page">

      {/* LEFT — Hero Image Panel */}
      <div className="login-hero-panel">
        <img src={wallnutHero} alt="Wallnut Building Materials" className="login-hero-img" />
        <div className="login-hero-overlay" />
        <div className="login-hero-content">
          <div className="login-hero-badge">Eco-Industrial Professional</div>
          <div className="login-hero-brand">
            WALLNUT <span className="login-hero-brand-accent">ANALYTICS</span>
          </div>
          <div className="login-hero-tagline">
            Building Modern India through science-backed construction chemicals
          </div>

          <div className="login-hero-stats">
            {STATS.map(s => (
              <div key={s.label} className="login-stat">
                <span className="login-stat-value">{s.value}</span>
                <span className="login-stat-label">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="login-hero-pills">
            <span className="login-pill">🔬 In-House R&amp;D</span>
            <span className="login-pill">🏭 Vadodara &amp; Kolhapur</span>
            <span className="login-pill">🌱 Low-VOC Products</span>
          </div>
        </div>
      </div>

      {/* RIGHT — Form Panel */}
      <div className="login-form-panel">
        <div className="login-form-container">

          {/* Logo + Header */}
          <div className="login-form-header">
            <img src={wallnutLogo} alt="Wallnut Logo" className="login-form-logo-img" />
            <div className="login-form-header-text">
              <h1 className="login-form-title">Welcome back</h1>
              <p className="login-form-subtitle">Sign in to your Sales Intelligence Dashboard</p>
            </div>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            {error && (
              <div className="login-error">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div className="login-field">
              <label className="login-label" htmlFor="login-username">Username</label>
              <input
                id="login-username"
                className="login-input"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <div className="login-field">
              <label className="login-label" htmlFor="login-password">Password</label>
              <input
                id="login-password"
                className="login-input"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <div className="login-remember-row">
              <label className="login-remember-label" htmlFor="login-remember">
                <input
                  id="login-remember"
                  type="checkbox"
                  className="login-remember-checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="login-remember-text">Remember / Save Credentials</span>
              </label>
            </div>

            <button
              type="submit"
              className="login-btn"
              id="login-submit"
              disabled={loading || !username || !password}
            >
              {loading ? 'Signing in...' : 'Sign In'}
              {!loading && <ChevronRight size={16} />}
            </button>
          </form>

          {/* Professional Footer */}
          <footer className="login-footer">
            <div className="login-footer-divider"></div>
            <div className="login-footer-content">
              <span>© 2026 Wallnut Building Materials Pvt. Ltd.</span>
              <span>All rights reserved.</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
