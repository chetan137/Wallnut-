import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import ChartCard from '../common/ChartCard';
import { abbreviateCurrency, formatPercent } from '../../utils/formatters';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="custom-tooltip">
      <div className="custom-tooltip-label">{label}</div>
      <div className="custom-tooltip-value">{abbreviateCurrency(data.amount)}</div>
      <div style={{ color: 'var(--text-on-dark)', fontSize: 'var(--text-xs)', marginTop: 4 }}>
        {data.dealers} dealers · Target: {formatPercent(data.targetPct)}
      </div>
    </div>
  );
}

export default function TopSalesOfficers({ data }) {
  return (
    <ChartCard title="Top Sales Officers" subtitle="Ranking by sales amount">
      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--card-border)"
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
            axisLine={{ stroke: 'var(--card-border)' }}
            tickLine={false}
            tickFormatter={(v) => abbreviateCurrency(v)}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}
            axisLine={false}
            tickLine={false}
            width={120}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="amount"
            radius={[0, 4, 4, 0]}
            maxBarSize={24}
          >
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.targetPct >= 100 ? 'var(--accent-primary)' : entry.targetPct >= 80 ? 'var(--warning)' : 'var(--accent-secondary)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
