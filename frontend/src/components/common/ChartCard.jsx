import './ChartCard.css';

export default function ChartCard({ title, subtitle, children, action, style, className = '' }) {
  return (
    <div className={`chart-card ${className}`} style={style}>
      <div className="chart-card-header">
        <div>
          <div className="chart-card-title">{title}</div>
          {subtitle && <div className="chart-card-subtitle">{subtitle}</div>}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="chart-card-body">
        {children}
      </div>
    </div>
  );
}
