import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import ChartCard from '../common/ChartCard';
import { abbreviateCurrency, truncateLabel } from '../../utils/formatters';

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="custom-tooltip">
      <div className="custom-tooltip-label">{data.name}</div>
      <div className="custom-tooltip-value">{abbreviateCurrency(data.amount)}</div>
      <div style={{ color: 'var(--text-on-dark)', fontSize: 'var(--text-xs)', marginTop: 4 }}>
        {data.dealers} dealers
      </div>
    </div>
  );
}

export default function TopSalesOfficers({ data }) {
  const chartData = data.map((d) => ({ ...d, shortName: truncateLabel(d.name, 20) }));

  return (
    <ChartCard
      title="Top Sales Officers"
      subtitle="Which salesperson's real sales added up to the most revenue, and how many different dealers they sold to — use this to see who is driving sales, and whose deals are spread across few vs. many dealers."
    >
      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={chartData}
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
            dataKey="shortName"
            tick={{ fontSize: 11, fill: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}
            axisLine={false}
            tickLine={false}
            width={120}
          />
          <Tooltip content={<CustomTooltip />} />
          {/* Magnitude comparison across named officers — one hue for every
              bar (no real target data exists to color-code against; see
              getTopSalesOfficers doc for why the old fake target % was removed). */}
          <Bar
            dataKey="amount"
            radius={[0, 4, 4, 0]}
            maxBarSize={24}
            fill="var(--accent-primary)"
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
