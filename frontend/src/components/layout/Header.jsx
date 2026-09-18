import { useEffect, useState } from 'react';
import { Bell, Calendar, RefreshCw, Zap, Database, Menu, X, CheckCircle2, AlertCircle, Download, Laptop, Smartphone } from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import './Header.css';

const SOURCE_LABELS = { db: 'PostgreSQL (Tally sync)', tally: 'Tally Prime', local: 'Demo data' };

export default function Header({ onMenuClick }) {
  const {
    roleConfig, dataSource, dataLoading, syncing, lastSync, syncFromTally,
    syncResult, dismissSyncResult,
  } = useRole();

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setIsStandalone(true);
    }
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
    });
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      setShowInstallGuide(true);
    }
  };

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
                    <span>
                      {syncResult.newRecordCount > 0
                        ? `${syncResult.newRecordCount.toLocaleString('en-IN')} new record${syncResult.newRecordCount === 1 ? '' : 's'} synced`
                        : 'No new records — already up to date'}
                    </span>
                  </div>
                  <div className="sync-result-line">
                    {syncResult.recordCount.toLocaleString('en-IN')} total · Source: {SOURCE_LABELS[syncResult.source] || syncResult.source}
                  </div>
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

        {/* Install App Button */}
        {!isStandalone && (
          <button
            className="header-install-btn"
            id="install-pwa-btn"
            title="Install Wallnut Analytics on your device"
            onClick={handleInstallClick}
          >
            <Download size={14} />
            <span>Install App</span>
          </button>
        )}

        <button className="header-icon-btn" id="notifications-btn" title="Notifications">
          <Bell size={18} />
          <span className="header-notification-dot" />
        </button>
      </div>

      {/* Install Guide Modal */}
      {showInstallGuide && (
        <div className="install-guide-overlay" onClick={() => setShowInstallGuide(false)}>
          <div className="install-guide-modal" onClick={(e) => e.stopPropagation()}>
            <div className="install-guide-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Download size={18} color="var(--accent-primary)" />
                <h3 className="install-guide-title">Install Wallnut Analytics</h3>
              </div>
              <button className="install-guide-close" onClick={() => setShowInstallGuide(false)}>
                <X size={16} />
              </button>
            </div>

            <p className="install-guide-sub">
              Wallnut Analytics ko apne laptop ya mobile par as an app install karne ke steps:
            </p>

            <div className="install-guide-card">
              <div className="install-guide-card-icon"><Laptop size={20} /></div>
              <div className="install-guide-card-content">
                <strong>Google Chrome / Edge (Laptop / PC):</strong>
                <ol>
                  <li>Chrome me top-right corner par <strong>3 dots (⋮)</strong> click karein.</li>
                  <li><strong>"Save and share"</strong> ➡️ <strong>"Install Wallnut Analytics..."</strong> par click karein.</li>
                  <li>Ya address bar ke right side par <strong>Install (monitor with arrow icon)</strong> par click karein.</li>
                </ol>
              </div>
            </div>

            <div className="install-guide-card">
              <div className="install-guide-card-icon"><Smartphone size={20} /></div>
              <div className="install-guide-card-content">
                <strong>Mobile Phone (Android / iPhone):</strong>
                <ol>
                  <li><strong>Android Chrome</strong>: Top-right 3 dots (⋮) ➡️ <strong>"Install app"</strong> ya <strong>"Add to Home screen"</strong>.</li>
                  <li><strong>iPhone Safari</strong>: Bottom bar me <strong>Share icon</strong> ➡️ <strong>"Add to Home Screen"</strong>.</li>
                </ol>
              </div>
            </div>

            <div style={{ textAlign: 'right', marginTop: '16px' }}>
              <button className="install-guide-ok-btn" onClick={() => setShowInstallGuide(false)}>
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
