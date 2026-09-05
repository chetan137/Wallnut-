import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import ChartCard from '../common/ChartCard';
import { abbreviateCurrency, formatPercent } from '../../utils/formatters';

// Categorical palette: the app's own chart hues, re-ordered and validated
// (node scripts/validate_palette.js) so every adjacent pair clears the
// colorblind-separation floor — the previous cycle order put the two
// greens next to red, ΔE 4.0 under deuteranopia (functionally identical
// to a red/green-blind viewer). "Other" (the folded long tail — see
// getStockCategoryBreakdown) is deliberately a neutral gray, not a 7th
// competing hue.
const COLORS = ['#4A90D9', '#82B22C', '#D94545', '#7C5CBF', '#C8742C', '#2CAAC8'];
const OTHER_COLOR = '#ADA898';

function sliceColor(entry, index) {
  return entry.isOther ? OTHER_COLOR : COLORS[index % COLORS.length];
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value, payload: data } = payload[0];
  return (
    <div className="custom-tooltip">
      <div className="custom-tooltip-label">{name}</div>
      <div className="custom-tooltip-value">{abbreviateCurrency(value)}</div>
      {data.group && !data.isOther && (
        <div style={{ color: 'var(--text-on-dark)', fontSize: 'var(--text-xs)', marginTop: 2 }}>
          {data.group}
        </div>
      )}
    </div>
  );
}

// Direct-labels the share % beside each swatch — the "relief" a sub-3:1
// fill needs (the lighter slices, e.g. the green, don't clear 3:1 contrast
// on their own; a visible value alongside the swatch means identity never
// depends on color alone).
function CustomLegend({ payload, total }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      fontSize: 'var(--text-xs)',
      maxHeight: 220,
      overflowY: 'auto',
    }}>
      {payload.map((entry, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 8, height: 8, borderRadius: 2,
            background: entry.color, flexShrink: 0
          }} />
          <span style={{ color: 'var(--text-secondary)', lineHeight: 1.2, flex: 1 }}>
            {entry.value.replace('Finished Goods ', '')}
          </span>
          <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
            {formatPercent(total > 0 ? (entry.amount / total) * 100 : 0, 0)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function StockGroupBreakdown({ data }) {
  const total = data.reduce((s, d) => s + d.amount, 0);

  return (
    <ChartCard title="Stock Category Breakdown" subtitle="By product category (top 5 + Other)">
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
              {data.map((entry, index) => (
                <Cell key={index} fill={sliceColor(entry, index)} />
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
          <CustomLegend
            total={total}
            payload={data.map((d, i) => ({
              value: d.name,
              amount: d.amount,
              color: sliceColor(d, i),
            }))}
          />
        </div>
      </div>
    </ChartCard>
  );
}
