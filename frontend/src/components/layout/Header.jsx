import { Bell, Calendar } from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import './Header.css';

export default function Header() {
  const { roleConfig } = useRole();

  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <header className="header" id="main-header">
      <div className="header-left">
        <div>
          <h1 className="header-title">Sales Dashboard</h1>
          <div className="header-breadcrumb">
            <span>Wallnut</span>
            <span className="header-breadcrumb-sep">/</span>
            <span className="header-breadcrumb-current">{roleConfig.label}</span>
            <span className="header-breadcrumb-sep">/</span>
            <span className="header-breadcrumb-current">{roleConfig.description}</span>
          </div>
        </div>
      </div>

      <div className="header-right">
        <div className="header-role-badge">
          <span className="header-role-dot" />
          <span>{roleConfig.label}: {roleConfig.scope}</span>
        </div>
        <span className="header-date">
          <Calendar size={13} style={{ marginRight: 4, verticalAlign: 'middle', opacity: 0.6 }} />
          {today}
        </span>
        <button className="header-icon-btn" id="notifications-btn" title="Notifications">
          <Bell size={18} />
          <span className="header-notification-dot" />
        </button>
      </div>
    </header>
  );
}
