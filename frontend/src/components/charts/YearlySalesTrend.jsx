import { useState, useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import ChartCard from '../common/ChartCard';
import { abbreviateCurrency, formatMonthKey } from '../../utils/formatters';

function CustomTooltip({ active, payload, label, viewMode }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip" style={{
      background: 'var(--card-bg)',
      border: '1px solid var(--card-border)',
      padding: '8px 12px',
      borderRadius: '6px',
      boxShadow: 'var(--shadow-md)',
      fontSize: '12px'
    }}>
      <div className="custom-tooltip-label" style={{ fontWeight: '600', marginBottom: '4px', color: 'var(--text-main)' }}>
        {viewMode === 'yearly' ? `Year: ${label}` : `Month: ${label}`}
      </div>
      {payload.map((p, idx) => (
        <div key={idx} style={{ color: p.fill, margin: '2px 0', fontWeight: '500' }}>
          {p.name}: {abbreviateCurrency(p.value)}
        </div>
      ))}
    </div>
  );
}

export default function YearlySalesTrend({ data, selectedYear }) {
  const [viewMode, setViewMode] = useState('yearly');

  const yearlyData = useMemo(() => {
    const grouped = {};
    for (const row of data) {
      const year = row.date.slice(0, 4);
      if (!grouped[year]) {
        grouped[year] = { year, sales: 0, outstanding: 0 };
      }
      grouped[year].sales += row.amount;
      grouped[year].outstanding += row.finalOutstanding;
    }
    return Object.values(grouped).sort((a, b) => a.year.localeCompare(b.year));
  }, [data]);

  const monthlyData = useMemo(() => {
    const filtered = selectedYear === 'All'
      ? data
      : data.filter(d => d.date.startsWith(selectedYear));
    const grouped = {};
    for (const row of filtered) {
      const month = row.date.slice(0, 7);
      if (!grouped[month]) {
        grouped[month] = { month, label: formatMonthKey(month), sales: 0, outstanding: 0 };
      }
      grouped[month].sales += row.amount;
      grouped[month].outstanding += row.finalOutstanding;
    }
    return Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month));
  }, [data, selectedYear]);

  const chartData = viewMode === 'yearly' ? yearlyData : monthlyData;
  const xAxisKey = viewMode === 'yearly' ? 'year' : 'label';

  const headerAction = (
    <div style={{
      display: 'flex',
      gap: '4px',
      background: 'var(--bg-main)',
      padding: '2px',
      borderRadius: '6px',
      border: '1px solid var(--card-border)'
    }}>
      <button
        onClick={() => setViewMode('yearly')}
        style={{
          padding: '4px 10px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: '600',
          border: 'none',
          cursor: 'pointer',
          background: viewMode === 'yearly' ? 'var(--accent-primary)' : 'transparent',
          color: viewMode === 'yearly' ? '#fff' : 'var(--text-secondary)',
          transition: 'all 0.2s ease',
        }}
      >
        Yearly
      </button>
      <button
        onClick={() => setViewMode('monthly')}
        style={{
          padding: '4px 10px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: '600',
          border: 'none',
          cursor: 'pointer',
          background: viewMode === 'monthly' ? 'var(--accent-primary)' : 'transparent',
          color: viewMode === 'monthly' ? '#fff' : 'var(--text-secondary)',
          transition: 'all 0.2s ease',
        }}
      >
        Monthly
      </button>
    </div>
  );

  return (
    <ChartCard 
      title={viewMode === 'yearly' ? "Yearly Sales & Outstanding Trend" : "Monthly Sales & Outstanding Trend"} 
      subtitle={viewMode === 'yearly' ? "Total Sales and Outstanding aggregated by year" : `Total Sales and Outstanding aggregated by month (${selectedYear === 'All' ? 'All Years' : selectedYear})`}
      action={headerAction}
    >
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--card-border)"
            vertical={false}
          />
          <XAxis
            dataKey={xAxisKey}
            tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
            axisLine={{ stroke: 'var(--card-border)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => abbreviateCurrency(v)}
            width={65}
          />
          <Tooltip content={<CustomTooltip viewMode={viewMode} />} />
          <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: 'var(--text-secondary)' }} />
          <Bar
            dataKey="sales"
            name="Total Sales"
            fill="var(--accent-primary)"
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
          />
          <Bar
            dataKey="outstanding"
            name="Outstanding"
            fill="var(--accent-secondary)"
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
