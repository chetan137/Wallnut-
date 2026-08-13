import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import ChartCard from '../common/ChartCard';
import { abbreviateCurrency, truncateLabel } from '../../utils/formatters';

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  // Full untruncated name from the data point, not the (possibly cut-off) axis label
  const fullName = payload[0].payload.product;
  return (
    <div className="custom-tooltip">
      <div className="custom-tooltip-label">{fullName}</div>
      <div className="custom-tooltip-value">{abbreviateCurrency(payload[0].value)}</div>
    </div>
  );
}

function shortenName(name) {
  // Remove 'Wallnut ' prefix and size suffixes for readability
  return name
    .replace('Wallnut ', '')
    .replace(/\s+\d+\w*$/, '');
}

export default function TopProducts({ data }) {
  const chartData = data.map(d => ({
    ...d,
    // Real product names (and the occasional stray narration text synced as
    // an item name) run much longer than the demo dataset's — truncate so
    // labels never wrap and overlap the row above/below.
    shortName: truncateLabel(shortenName(d.product), 24),
  }));

  return (
    <ChartCard title="Top Products" subtitle="By sales amount">
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
            width={130}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="amount"
            radius={[0, 4, 4, 0]}
            maxBarSize={24}
          >
            {chartData.map((_, index) => (
              <Cell
                key={index}
                fill={index < 3 ? 'var(--accent-primary)' : 'var(--accent-secondary)'}
                fillOpacity={1 - (index * 0.06)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
