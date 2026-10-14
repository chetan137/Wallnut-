import { TrendingDown, AlertTriangle, MessageSquare } from 'lucide-react';
import { abbreviateCurrency, formatPercent } from '../../utils/formatters';
import { getComplaintSummary } from '../../data/complaintsData';
import HelpTip from '../common/HelpTip';
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
            <HelpTip title="Falling Sales" lines={['Dealers who bought less this Financial Year than in the same period last year. Example: for Apr to Oct, this year is compared with Apr to Oct of last year, not with the whole of last year.', '% = (sales this year - sales same period last year) / sales same period last year x 100. -100% means the dealer has bought nothing so far. Worst first.', 'Only dealers with sales in that period last year are listed. Credit notes count as negative sales.']} />
          </span>
          <span className="alert-section-count red">{fallingAlerts.length}</span>
        </div>
        <div className="alert-list">
          {fallingAlerts.slice(0, 8).map((alert, i) => (
            <div key={i} className="alert-item">
              <span
                className="alert-item-name"
                title={`${alert.dealer}: ${abbreviateCurrency(alert.previousSales)} in the same period last year, ${abbreviateCurrency(alert.currentSales)} this year`}
              >
                {alert.dealer}
                <small style={{ display: 'block', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                  {abbreviateCurrency(alert.previousSales)} last year &rarr; {abbreviateCurrency(alert.currentSales)} this year
                </small>
              </span>
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
          {highOutstanding.length === 0 && (
            <div className="alert-item">
              <span className="alert-item-name" style={{ color: 'var(--text-muted)' }}>No high outstanding alerts</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
