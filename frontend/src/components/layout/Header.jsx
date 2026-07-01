import { Bell, Calendar, RefreshCw, Zap, Database, Menu } from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import './Header.css';

export default function Header({ onMenuClick }) {
  const { roleConfig, dataSource, dataLoading, syncing, lastSync, syncFromTally } = useRole();

  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const isLive  = dataSource === 'tally';
  const isSyncing = syncing;

  // Format last sync time
  const syncLabel = (() => {
    if (!lastSync) return null;
    try {
      const d = new Date(lastSync);
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return null;
    }
  })();

  return (
    <header className="header" id="main-header">
      <div className="header-left">
        <button className="header-menu-btn" onClick={onMenuClick} title="Open Menu">
          <Menu size={20} />
        </button>
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

        {/* Data source badge */}
        {!dataLoading && (
          <span
            className={`header-data-badge ${isLive ? 'tally' : 'local'}`}
            title={isLive
              ? `Live data from Tally Prime${syncLabel ? ` · Last synced ${syncLabel}` : ''}`
              : 'Demo data — Tally unavailable or no vouchers found'}
          >
            {isLive
              ? <><Zap size={11} /> Tally Live</>
              : <><Database size={11} /> Demo Data</>}
          </span>
        )}

        {/* Sync button */}
        <button
          className={`header-sync-btn ${isSyncing ? 'spinning' : ''}`}
          id="sync-tally-btn"
          title={isSyncing ? 'Syncing from Tally…' : 'Sync data from Tally'}
          onClick={() => syncFromTally(false)}
          disabled={isSyncing}
        >
          <RefreshCw size={15} />
          <span>{isSyncing ? 'Syncing…' : 'Sync'}</span>
        </button>

        <button className="header-icon-btn" id="notifications-btn" title="Notifications">
          <Bell size={18} />
          <span className="header-notification-dot" />
        </button>
      </div>
    </header>
  );
}
