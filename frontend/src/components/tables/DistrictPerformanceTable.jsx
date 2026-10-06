import DataTable from '../common/DataTable';
import { formatCurrency, formatPercent, formatNumber } from '../../utils/formatters';

function TargetBar({ value }) {
  const tier = value >= 100 ? 'high' : value >= 80 ? 'mid' : 'low';
  return (
    <div className="target-bar-cell">
      <div className="target-bar-bg">
        <div
          className={`target-bar-fill ${tier}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <span className={`target-pct-label ${tier}`}>{formatPercent(value, 0)}</span>
    </div>
  );
}

const buildColumns = (label, accessor, showTarget) => [
  {
    header: label,
    accessor,
    render: (val) => (val && val.trim() ? val : 'Unassigned'),
  },
  {
    header: 'Total Sales (Excl. GST)',
    accessor: 'totalSales',
    numeric: true,
    render: (val) => formatCurrency(val),
  },
  {
    header: 'Quantity',
    accessor: 'quantity',
    numeric: true,
    render: (val) => formatNumber(Math.round(val || 0)),
  },
  {
    header: 'Dealers',
    accessor: 'dealers',
    numeric: true,
    render: (val) => formatNumber(val),
  },
  {
    header: 'Outstanding',
    accessor: 'outstanding',
    numeric: true,
    render: (val) => formatCurrency(val),
  },
  {
    header: 'Target %',
    help: ["Average monthly sales of the district / its monthly target x 100.","No real sales targets are set up yet. A few districts (e.g. Kolhapur, Mumbai, Pune, Ahmedabad, Surat, Indore) use a sample target stored in the app. Every other district uses an assumed target of 110% of its own average monthly sales, so it always comes out near 91%.","Treat this as an indicator only, not a real target achievement."],
    accessor: 'targetPct',
    numeric: false,
    render: (val) => <TargetBar value={val} />,
  },
].filter((c) => showTarget || c.accessor !== 'targetPct');

export default function DistrictPerformanceTable({ data, title = 'District Performance', label = 'District', accessor = 'district', showTarget = true }) {
  return (
    <DataTable
      title={title}
      columns={buildColumns(label, accessor, showTarget)}
      data={data}
      searchable={false}
      id={`${accessor}-performance-table`}
    />
  );
}
