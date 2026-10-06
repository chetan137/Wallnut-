import { useEffect, useState, useMemo, useRef } from 'react';
import {
  Bell, Calendar, RefreshCw, Zap, Database, Menu, X, CheckCircle2,
  AlertCircle, Download, Laptop, Smartphone, FileText, MapPin,
  Filter, ChevronDown, ChevronUp, Users, Sparkles
} from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import { formatCurrency } from '../../utils/formatters';
import './Header.css';

const SOURCE_LABELS = { db: 'PostgreSQL (Tally sync)', tally: 'Tally Prime', local: 'Demo data' };

export default function Header({ onMenuClick }) {
  const {
    roleConfig, dataSource, dataLoading, syncing, lastSync, syncFromTally,
    syncResult, dismissSyncResult, filteredSales, filteredVisits, filters, setFilters,
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

  const [showNotifications, setShowNotifications] = useState(false);
  const [expandedVoucher, setExpandedVoucher] = useState(null);
  const notificationsRef = useRef(null);

  // Close notifications on outside click or Escape key
  useEffect(() => {
    if (!showNotifications) return;
    const handleClickOutside = (e) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setShowNotifications(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showNotifications]);

  // Today date formatted for comparisons and UI
  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString('en-IN', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, []);

  // Today's records from filteredSales
  const todayRecords = useMemo(() => {
    return (filteredSales || []).filter((r) => r.date === todayStr);
  }, [filteredSales, todayStr]);

  // Group today's voucher line items into distinct vouchers
  const todayVouchers = useMemo(() => {
    const map = new Map();
    for (const r of todayRecords) {
      const key = r.vchNo || `${r.partyName}-${r.date}`;
      if (!map.has(key)) {
        map.set(key, {
          vchNo: r.vchNo || 'Invoice',
          vchType: r.vchType || 'Sales',
          partyName: r.partyName || 'Unknown Party',
          date: r.date,
          state: r.state,
          district: r.district,
          city: r.city,
          salesMan: r.salesMan,
          totalAmount: 0,
          totalQty: 0,
          itemLines: [],
        });
      }
      const vch = map.get(key);
      vch.totalAmount += Number(r.amount) || 0;
      vch.totalQty += Number(r.quantity) || 0;
      if (r.itemName) {
        vch.itemLines.push({
          name: r.itemName,
          qty: r.quantity,
          units: r.units,
          rate: r.rate,
          amount: r.amount,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [todayRecords]);

  // Today's visits
  const todayVisits = useMemo(() => {
    return (filteredVisits || []).filter((v) => (v.date || '').startsWith(todayStr));
  }, [filteredVisits, todayStr]);

  // Totals
  const todaySalesTotal = useMemo(() => {
    return todayVouchers.reduce((sum, v) => sum + v.totalAmount, 0);
  }, [todayVouchers]);

  const uniqueDealersToday = useMemo(() => {
    return new Set(todayVouchers.map((v) => v.partyName)).size;
  }, [todayVouchers]);

  const todayUpdatesCount = todayVouchers.length + todayVisits.length;

  const isFilteredToToday = filters?.fromDate === todayStr && filters?.toDate === todayStr;

  const toggleTodayFilter = () => {
    if (isFilteredToToday) {
      setFilters((prev) => ({ ...prev, fromDate: '', toDate: '' }));
    } else {
      setFilters((prev) => ({ ...prev, fromDate: todayStr, toDate: todayStr }));
    }
    setShowNotifications(false);
  };

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

        {/* Notifications Button & Dropdown */}
        <div className="header-notification-wrap" ref={notificationsRef}>
          <button
            className={`header-icon-btn ${showNotifications ? 'active' : ''}`}
            id="notifications-btn"
            title="Today's Updates & Activity"
            onClick={() => setShowNotifications((prev) => !prev)}
            aria-expanded={showNotifications}
          >
            <Bell size={18} />
            {todayUpdatesCount > 0 ? (
              <span className="header-notification-badge" title={`${todayUpdatesCount} updates today`}>
                {todayUpdatesCount}
              </span>
            ) : (
              <span className="header-notification-dot" />
            )}
          </button>

          {showNotifications && (
            <div className="header-notifications-dropdown" id="notifications-panel">
              {/* Header */}
              <div className="notifications-header">
                <div className="notifications-header-left">
                  <div className="notifications-title-row">
                    <Bell size={15} className="notifications-bell-icon" />
                    <span className="notifications-title">Today's Updates</span>
                    <span className={`notifications-count-pill ${todayUpdatesCount > 0 ? 'active' : ''}`}>
                      {todayUpdatesCount > 0 ? `${todayUpdatesCount} New` : '0 New'}
                    </span>
                  </div>
                  <div className="notifications-subtitle">
                    <Calendar size={12} />
                    <span>{todayFormatted}</span>
                  </div>
                </div>
                <button
                  className="notifications-close-btn"
                  onClick={() => setShowNotifications(false)}
                  title="Close notifications"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Today's KPI Bar */}
              <div className="notifications-stats-grid">
                <div className="notif-stat-card">
                  <div className="notif-stat-label">Sales Today</div>
                  <div className="notif-stat-val sales">{formatCurrency(todaySalesTotal)}</div>
                </div>
                <div className="notif-stat-card">
                  <div className="notif-stat-label">Invoices</div>
                  <div className="notif-stat-val">{todayVouchers.length}</div>
                </div>
                <div className="notif-stat-card">
                  <div className="notif-stat-label">Dealers</div>
                  <div className="notif-stat-val">{uniqueDealersToday}</div>
                </div>
                <div className="notif-stat-card">
                  <div className="notif-stat-label">Visits</div>
                  <div className="notif-stat-val">{todayVisits.length}</div>
                </div>
              </div>

              {/* Action Banner: Filter dashboard to today */}
              {todayVouchers.length > 0 && (
                <div className="notifications-action-bar">
                  <button
                    className={`notifications-filter-btn ${isFilteredToToday ? 'active' : ''}`}
                    onClick={toggleTodayFilter}
                    title={isFilteredToToday ? 'Clear Today filter' : 'Filter entire dashboard to Today'}
                  >
                    <Filter size={12} />
                    <span>{isFilteredToToday ? 'Dashboard filtered to Today (Click to reset)' : 'Filter Dashboard to Today'}</span>
                  </button>
                </div>
              )}

              {/* Notification Items List */}
              <div className="notifications-list">
                {todayUpdatesCount === 0 ? (
                  <div className="notifications-empty">
                    <CheckCircle2 size={32} className="notifications-empty-icon" />
                    <div className="notifications-empty-title">All caught up for today</div>
                    <div className="notifications-empty-desc">
                      No new billing or field visits recorded for today ({todayFormatted}) yet.
                    </div>
                  </div>
                ) : (
                  <>
                    {todayVouchers.length > 0 && (
                      <div className="notifications-section">
                        <div className="notifications-section-header">
                          <FileText size={13} />
                          <span>Billed Invoices Today ({todayVouchers.length})</span>
                        </div>
                        {todayVouchers.map((vch) => {
                          const isExpanded = expandedVoucher === vch.vchNo;
                          const locationText = [vch.city, vch.district, vch.state].filter(Boolean).join(', ');
                          return (
                            <div key={vch.vchNo} className="notification-card">
                              <div className="notif-card-top">
                                <div className="notif-card-dealer">{vch.partyName}</div>
                                <div className="notif-card-amount">{formatCurrency(vch.totalAmount)}</div>
                              </div>
                              <div className="notif-card-meta">
                                <span className="notif-badge vch-no">{vch.vchNo}</span>
                                {vch.vchType && <span className="notif-badge vch-type">{vch.vchType}</span>}
                                {locationText && (
                                  <span className="notif-location">
                                    <MapPin size={10} />
                                    <span>{locationText}</span>
                                  </span>
                                )}
                              </div>
                              {vch.salesMan && (
                                <div className="notif-card-salesman">
                                  <span>SO: {vch.salesMan}</span>
                                </div>
                              )}
                              {vch.itemLines.length > 0 && (
                                <div className="notif-card-items">
                                  <button
                                    className="notif-expand-btn"
                                    onClick={() => setExpandedVoucher(isExpanded ? null : vch.vchNo)}
                                  >
                                    <span>{vch.itemLines.length} item line{vch.itemLines.length > 1 ? 's' : ''}</span>
                                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                  </button>
                                  {isExpanded ? (
                                    <div className="notif-items-expanded-list">
                                      {vch.itemLines.map((item, idx) => (
                                        <div key={idx} className="notif-item-row">
                                          <span className="notif-item-name">{item.name}</span>
                                          <span className="notif-item-qty">{item.qty} {item.units || ''}</span>
                                          <span className="notif-item-price">{formatCurrency(item.amount)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="notif-items-summary">
                                      {vch.itemLines.map((i) => i.name).slice(0, 2).join(', ')}
                                      {vch.itemLines.length > 2 ? ` +${vch.itemLines.length - 2} more` : ''}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {todayVisits.length > 0 && (
                      <div className="notifications-section">
                        <div className="notifications-section-header">
                          <Users size={13} />
                          <span>Field Visits Today ({todayVisits.length})</span>
                        </div>
                        {todayVisits.map((visit, idx) => (
                          <div key={visit.id || idx} className="notification-card visit">
                            <div className="notif-card-top">
                              <div className="notif-card-dealer">{visit.dealerName || visit.partyName}</div>
                              <span className="notif-badge visit-status">{visit.status || 'Completed'}</span>
                            </div>
                            <div className="notif-card-meta">
                              <span>SO: {visit.salesOfficer || visit.salesMan}</span>
                              {visit.area && <span>· {visit.area}</span>}
                            </div>
                            {visit.notes && <div className="notif-visit-notes">{visit.notes}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="notifications-footer">
                <div className="notif-footer-sync">
                  <span className="notif-live-dot" />
                  <span>{SOURCE_LABELS[dataSource] || 'Live Database'}</span>
                  {lastSync && <span>· {new Date(lastSync).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>}
                </div>
                <button
                  className="notif-sync-now-btn"
                  onClick={() => {
                    syncFromTally(false);
                    setShowNotifications(false);
                  }}
                  disabled={syncing}
                >
                  <RefreshCw size={11} className={syncing ? 'spinning' : ''} />
                  <span>{syncing ? 'Syncing…' : 'Sync Now'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

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
