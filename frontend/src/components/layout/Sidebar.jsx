import { LayoutDashboard, Users, Network, LogOut, Info, X } from 'lucide-react';
import { useRole, ROLES } from '../../context/RoleContext';
import { useAuth } from '../../context/AuthContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.png';
import './Sidebar.css';

export default function Sidebar({ isOpen, onClose }) {
  const {
    currentRole,
    setRole,
    selectedState,
    setSelectedState,
    selectedDistrict,
    setSelectedDistrict,
    selectedSalesMan,
    setSelectedSalesMan,
    roleConfig,
    allRoles,
    allStates,
    allDistricts,
    allSalesOfficers
  } = useRole();

  const { currentUser, logout, canManageUsers } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const currentPath = location.pathname;

  const handleLogout = () => {
    logout();
    navigate('/login');
    if (onClose) onClose();
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`} id="main-sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <img src={logo} alt="Wallnut Logo" className="sidebar-logo-img" />
        <button className="sidebar-close-btn" onClick={onClose} title="Close Menu">
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <span className="sidebar-section-label">Menu</span>
        
        <Link
          to="/dashboard"
          className={`sidebar-item-link ${currentPath === '/dashboard' ? 'active' : ''}`}
          id="nav-dashboard"
          onClick={onClose}
        >
          <LayoutDashboard className="sidebar-item-icon" size={16} />
          <span>Dashboard</span>
        </Link>

        {canManageUsers && (
          <Link
            to="/users"
            className={`sidebar-item-link ${currentPath === '/users' ? 'active' : ''}`}
            id="nav-users"
            onClick={onClose}
          >
            <Users className="sidebar-item-icon" size={16} />
            <span>User Management</span>
          </Link>
        )}

        <Link
          to="/workflow"
          className={`sidebar-item-link ${currentPath === '/workflow' ? 'active' : ''}`}
          id="nav-workflow"
          onClick={onClose}
        >
          <Network className="sidebar-item-icon" size={16} />
          <span>System Workflow</span>
        </Link>

        <Link
          to="/about"
          className={`sidebar-item-link ${currentPath === '/about' ? 'active' : ''}`}
          id="nav-about"
          onClick={onClose}
        >
          <Info className="sidebar-item-icon" size={16} />
          <span>About Wallnut</span>
        </Link>
      </nav>

      {/* View Scoping Controls */}
      <div className="sidebar-role-section">
        <span className="sidebar-section-label">Scope Control</span>
        
        <div className="sidebar-control-group">
          <label className="sidebar-control-label" htmlFor="role-selector">View As Role</label>
          <select
            className="sidebar-role-select"
            value={currentRole}
            onChange={(e) => setRole(e.target.value)}
            id="role-selector"
          >
            {allRoles.map(role => (
              <option key={role.key} value={role.key}>
                {role.label}
              </option>
            ))}
          </select>
        </div>

        {/* State Selector (Visible only for State Sales Head role) */}
        {currentRole === ROLES.STATE_SALES_HEAD && (
          <div className="sidebar-control-group">
            <label className="sidebar-control-label" htmlFor="state-selector">State Scope</label>
            <select
              className="sidebar-role-select"
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              id="state-selector"
            >
              {allStates.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}

        {/* District Selector (Visible only for District Manager role) */}
        {currentRole === ROLES.DISTRICT_MANAGER && (
          <div className="sidebar-control-group">
            <label className="sidebar-control-label" htmlFor="district-selector">District Scope</label>
            <select
              className="sidebar-role-select"
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              id="district-selector"
            >
              {allDistricts.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        )}

        {/* Sales Officer Selector (Visible only for Sales Officer role) */}
        {currentRole === ROLES.SALES_OFFICER && (
          <div className="sidebar-control-group">
            <label className="sidebar-control-label" htmlFor="officer-selector">Officer Scope</label>
            <select
              className="sidebar-role-select"
              value={selectedSalesMan}
              onChange={(e) => setSelectedSalesMan(e.target.value)}
              id="officer-selector"
            >
              {allSalesOfficers.map(o => (
                <option key={o.name} value={o.name}>{o.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="sidebar-scope-badge" style={{ marginTop: 'var(--space-2)' }}>
          Active: {roleConfig.scope}
        </div>
      </div>

      {/* User Session Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user-info">
          <div className="sidebar-user-avatar">
            {currentUser?.name?.charAt(0) || 'U'}
          </div>
          <div className="sidebar-user-text">
            <span className="sidebar-user-name" title={currentUser?.name}>{currentUser?.name || 'User'}</span>
            <span className="sidebar-user-role">{currentUser?.role?.replace(/_/g, ' ').toUpperCase() || 'Guest'}</span>
          </div>
        </div>
        <button className="sidebar-logout-btn" onClick={handleLogout} title="Log Out">
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
