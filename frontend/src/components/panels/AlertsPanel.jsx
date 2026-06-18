import { TrendingDown, AlertTriangle, MessageSquare } from 'lucide-react';
import { abbreviateCurrency, formatPercent } from '../../utils/formatters';
import { getComplaintSummary } from '../../data/complaintsData';
import './AlertsPanel.css';

export default function AlertsPanel({ fallingAlerts, highOutstanding, complaints: rawComplaints }) {
  const complaints = getComplaintSummary(rawComplaints);

  return (
    <div className="alerts-panel" id="alerts-panel">
      {/* Falling Sales Alerts */}
      <div className="alert-section">
        <div className="alert-section-header">
          <span className="alert-section-title">
            <TrendingDown size={15} style={{ color: 'var(--danger)' }} />
            Falling Sales
          </span>
          <span className="alert-section-count red">{fallingAlerts.length}</span>
        </div>
        <div className="alert-list">
          {fallingAlerts.slice(0, 8).map((alert, i) => (
            <div key={i} className="alert-item">
              <span className="alert-item-name" title={alert.dealer}>{alert.dealer}</span>
              <span className="alert-item-value negative">{alert.change.toFixed(0)}%</span>
            </div>
          ))}
          {fallingAlerts.length === 0 && (
            <div className="alert-item">
              <span className="alert-item-name" style={{ color: 'var(--text-muted)' }}>No alerts</span>
            </div>
          )}
        </div>
      </div>

      {/* High Outstanding */}
      <div className="alert-section">
        <div className="alert-section-header">
          <span className="alert-section-title">
            <AlertTriangle size={15} style={{ color: 'var(--accent-secondary)' }} />
            High Outstanding
          </span>
          <span className="alert-section-count orange">{highOutstanding.length}</span>
        </div>
        <div className="alert-list">
          {highOutstanding.slice(0, 8).map((item, i) => (
            <div key={i} className="alert-item">
              <span className="alert-item-name" title={item.dealer}>{item.dealer}</span>
              <span className="alert-item-value outstanding">{abbreviateCurrency(item.outstanding)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Complaint Summary */}
      <div className="alert-section">
        <div className="alert-section-header">
          <span className="alert-section-title">
            <MessageSquare size={15} style={{ color: 'var(--info)' }} />
            Complaints
          </span>
          <span className="alert-section-count blue">{complaints.open} open</span>
        </div>
        <div className="alert-list">
          {complaints.recent.map((c, i) => (
            <div key={i} className="complaint-item">
              <div className="complaint-item-header">
                <span className="complaint-item-dealer">{c.dealer}</span>
                <span className={`complaint-status ${c.status.toLowerCase().replace(/\s/g, '-')}`}>
                  {c.status}
                </span>
              </div>
              <div className="complaint-item-desc">{c.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
