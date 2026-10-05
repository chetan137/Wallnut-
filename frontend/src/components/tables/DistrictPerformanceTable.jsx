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
