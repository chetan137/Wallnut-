import { useEffect } from 'react';
import { Bell, Calendar, RefreshCw, Zap, Database, Menu, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import './Header.css';

const SOURCE_LABELS = { db: 'PostgreSQL (Tally sync)', tally: 'Tally Prime', local: 'Demo data' };

export default function Header({ onMenuClick }) {
  const {
    roleConfig, dataSource, dataLoading, syncing, lastSync, syncFromTally,
    syncResult, dismissSyncResult,
  } = useRole();

  // Auto-dismiss the confirmation a few seconds after it appears — it's a
  // "yes, this actually happened" note, not something to leave on screen.
  useEffect(() => {
    if (!syncResult) return;
    const timer = setTimeout(dismissSyncResult, 8000);
    return () => clearTimeout(timer);
  }, [syncResult, dismissSyncResult]);

  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const isLive  = dataSource === 'tally' || dataSource === 'db';
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
              ? `Live data from ${dataSource === 'db' ? 'PostgreSQL' : 'Tally Prime'}${syncLabel ? ` · Last synced ${syncLabel}` : ''}`
              : 'Demo data — backend unavailable or no records found'}
          >
            {isLive
              ? <><Zap size={11} /> Live Data</>
              : <><Database size={11} /> Demo Data</>}
          </span>
        )}

        {/* Sync button + confirmation log */}
        <div className="header-sync-wrap">
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

          {syncResult && (
            <div className="sync-result-toast" id="sync-result-toast" role="status">
              <button className="sync-result-close" onClick={dismissSyncResult} title="Dismiss">
                <X size={13} />
              </button>
              {syncResult.ok ? (
                <>
                  <div className="sync-result-title success">
                    <CheckCircle2 size={14} />
                    <span>{syncResult.recordCount.toLocaleString('en-IN')} records synced</span>
                  </div>
                  <div className="sync-result-line">Source: {SOURCE_LABELS[syncResult.source] || syncResult.source}</div>
                  {Object.keys(syncResult.byYear).length > 0 && (
                    <div className="sync-result-line">
                      {Object.entries(syncResult.byYear)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([year, count]) => `${year}: ${count.toLocaleString('en-IN')}`)
                        .join('  ·  ')}
                    </div>
                  )}
                </>
              ) : (
                <div className="sync-result-title error">
                  <AlertCircle size={14} />
                  <span>{syncResult.error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <button className="header-icon-btn" id="notifications-btn" title="Notifications">
          <Bell size={18} />
          <span className="header-notification-dot" />
        </button>
      </div>
    </header>
  );
}
