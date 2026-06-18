import { TrendingUp, TrendingDown } from 'lucide-react';
import './KPICard.css';

export default function KPICard({ icon: Icon, label, value, trend, trendLabel, color = 'green' }) {
  const isPositive = trend >= 0;

  return (
    <div className="kpi-card" id={`kpi-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="kpi-card-header">
        <div className={`kpi-card-icon ${color}`}>
          <Icon size={20} />
        </div>
        {trend != null && (
          <div className={`kpi-card-trend ${isPositive ? 'up' : 'down'}`}>
            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span>{isPositive ? '+' : ''}{trend.toFixed(1)}%</span>
          </div>
        )}
      </div>
      <div className="kpi-card-value">{value}</div>
      <div className="kpi-card-label">{label}</div>
      {trendLabel && (
        <div className="kpi-card-label" style={{ fontSize: 'var(--text-xs)', marginTop: '-4px' }}>
          {trendLabel}
        </div>
      )}
      <div className={`kpi-card-accent-line ${color}`} />
    </div>
  );
}
