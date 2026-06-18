import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import ChartCard from '../common/ChartCard';
import { abbreviateCurrency } from '../../utils/formatters';

const COLORS = ['#82B22C', '#6F9A24', '#5C8220', '#C8742C', '#B5672A'];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <div className="custom-tooltip-label">{label}</div>
      <div className="custom-tooltip-value">{abbreviateCurrency(payload[0].value)}</div>
    </div>
  );
}

export default function DistrictPerformance({ data }) {
  return (
    <ChartCard title="District-wise Performance" subtitle="Sales amount by Area/City">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--card-border)"
            vertical={false}
          />
          <XAxis
            dataKey="district"
            tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}
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
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="totalSales"
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
          >
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
