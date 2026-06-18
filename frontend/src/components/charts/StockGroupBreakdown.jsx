import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import ChartCard from '../common/ChartCard';
import { abbreviateCurrency, formatPercent } from '../../utils/formatters';

const COLORS = ['#82B22C', '#C8742C', '#4A90D9', '#E6A817', '#7C5CBF', '#3DA855', '#D94545', '#2CAAC8'];

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value, payload: data } = payload[0];
  return (
    <div className="custom-tooltip">
      <div className="custom-tooltip-label">{name}</div>
      <div className="custom-tooltip-value">{abbreviateCurrency(value)}</div>
      {data.group && (
        <div style={{ color: 'var(--text-on-dark)', fontSize: 'var(--text-xs)', marginTop: 2 }}>
          {data.group}
        </div>
      )}
    </div>
  );
}

function CustomLegend({ payload }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      fontSize: 'var(--text-xs)',
      maxHeight: 200,
      overflowY: 'auto',
    }}>
      {payload.map((entry, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 8, height: 8, borderRadius: 2,
            background: entry.color, flexShrink: 0
          }} />
          <span style={{ color: 'var(--text-secondary)', lineHeight: 1.2 }}>
            {entry.value.replace('Finished Goods ', '')}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function StockGroupBreakdown({ data }) {
  const total = data.reduce((s, d) => s + d.amount, 0);

  return (
    <ChartCard title="Stock Category Breakdown" subtitle="By product category">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        <ResponsiveContainer width="55%" height={250}>
          <PieChart>
            <Pie
              data={data}
              dataKey="amount"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={95}
              paddingAngle={2}
              stroke="var(--card-bg)"
              strokeWidth={2}
            >
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <text
              x="50%"
              y="48%"
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ fontSize: 'var(--text-xs)', fill: 'var(--text-muted)' }}
            >
              Total
            </text>
            <text
              x="50%"
              y="56%"
              textAnchor="middle"
              dominantBaseline="middle"
              style={{
                fontSize: 'var(--text-md)',
                fill: 'var(--text-primary)',
                fontFamily: 'var(--font-heading)',
                fontWeight: 700,
              }}
            >
              {abbreviateCurrency(total)}
            </text>
          </PieChart>
        </ResponsiveContainer>
        <div style={{ width: '45%' }}>
          <CustomLegend payload={data.map((d, i) => ({
            value: d.name,
            color: COLORS[i % COLORS.length],
          }))} />
        </div>
      </div>
    </ChartCard>
  );
}
