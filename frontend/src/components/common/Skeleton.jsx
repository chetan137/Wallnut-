import './Skeleton.css';

/** Base shimmering placeholder block — compose the others below from this. */
export function SkeletonBlock({ width = '100%', height = '1rem', radius, style, className = '' }) {
  return (
    <div
      className={`skeleton-block ${className}`}
      style={{ width, height, borderRadius: radius ?? 'var(--radius-sm)', ...style }}
    />
  );
}

/** One placeholder KPI card, matching KPICard's icon + value + label shape. */
function SkeletonKPICard() {
  return (
    <div className="kpi-card skeleton-kpi-card">
      <div className="kpi-card-header">
        <SkeletonBlock width="36px" height="36px" radius="var(--radius-md)" />
      </div>
      <SkeletonBlock width="70%" height="1.5rem" style={{ marginBottom: 'var(--space-2)' }} />
      <SkeletonBlock width="45%" height="0.75rem" />
    </div>
  );
}

/** A row of placeholder KPI cards — drop-in for the real kpi-row while loading. */
export function SkeletonKPIRow({ count = 4 }) {
  return (
    <div className="kpi-row">
      {Array.from({ length: count }).map((_, i) => <SkeletonKPICard key={i} />)}
    </div>
  );
}

/** A placeholder chart card — title bar + a chart-shaped block. */
export function SkeletonChartCard({ height = 260 }) {
  return (
    <div className="chart-card skeleton-chart-card">
      <div className="chart-card-header">
        <SkeletonBlock width="40%" height="1rem" />
      </div>
      <SkeletonBlock width="100%" height={`${height}px`} radius="var(--radius-md)" />
    </div>
  );
}

/** A placeholder data table — title bar + a few placeholder rows. */
export function SkeletonTable({ rows = 5 }) {
  return (
    <div className="data-table-wrapper skeleton-table">
      <div className="data-table-header">
        <SkeletonBlock width="35%" height="1rem" />
      </div>
      <div className="skeleton-table-rows">
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonBlock key={i} width="100%" height="1.75rem" />
        ))}
      </div>
    </div>
  );
}
