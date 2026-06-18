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

const columns = [
  {
    header: 'District',
    accessor: 'district',
  },
  {
    header: 'Total Sales',
    accessor: 'totalSales',
    numeric: true,
    render: (val) => formatCurrency(val),
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
];

export default function DistrictPerformanceTable({ data }) {
  return (
    <DataTable
      title="District Performance"
      columns={columns}
      data={data}
      searchable={false}
      id="district-performance-table"
    />
  );
}
