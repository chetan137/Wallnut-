import { TrendingUp, TrendingDown } from 'lucide-react';
import './KPICard.css';

export default function KPICard({ icon: Icon, label, value, trend, trendLabel, trends, color = 'green' }) {
  const isPositive = trend >= 0;

  return (
    <div className="kpi-card" id={`kpi-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="kpi-card-header">
        <div className={`kpi-card-icon ${color}`}>
          <Icon size={20} />
        </div>
        {!trends && trend != null && (
          <div className={`kpi-card-trend ${isPositive ? 'up' : 'down'}`}>
            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span>{isPositive ? '+' : ''}{trend.toFixed(1)}%</span>
          </div>
        )}
      </div>
      <div className="kpi-card-value">{value}</div>
      <div className="kpi-card-label">{label}</div>
      
      {trends ? (
        <div className="kpi-card-trends-list" style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '6px', 
          marginTop: '8px',
          borderTop: '1px dashed var(--card-border)',
          paddingTop: '8px'
        }}>
          {trends.map((t, idx) => {
            if (t.value == null) return null;
            const isPos = t.value >= 0;
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '11px' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: '500' }}>{t.label}</span>
                <span style={{
                  color: isPos ? 'var(--success)' : 'var(--danger)',
                  background: isPos ? 'var(--success-bg)' : 'var(--danger-bg)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: '600',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  {isPos ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                  {isPos ? '+' : ''}{t.value.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        trendLabel && (
          <div className="kpi-card-label" style={{ fontSize: 'var(--text-xs)', marginTop: '-4px' }}>
            {trendLabel}
          </div>
        )
      )}
      <div className={`kpi-card-accent-line ${color}`} />
    </div>
  );
}
