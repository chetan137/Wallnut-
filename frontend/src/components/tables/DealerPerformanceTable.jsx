import DataTable from '../common/DataTable';
import { formatCurrency } from '../../utils/formatters';

const columns = [
  {
    header: 'Dealer',
    accessor: 'dealer',
  },
  {
    header: 'Sales Officer',
    accessor: 'salesMan',
  },
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
    header: 'Outstanding',
    accessor: 'outstanding',
    numeric: true,
    render: (val) => (
      <span style={{ color: val > 100000 ? 'var(--danger)' : 'var(--text-primary)' }}>
        {formatCurrency(val)}
      </span>
    ),
  },
  {
    header: 'Txns',
    accessor: 'transactions',
    numeric: true,
  },
];

export default function DealerPerformanceTable({ data }) {
  return (
    <DataTable
      title="Dealer Performance Summary"
      columns={columns}
      data={data}
      searchable={true}
      id="dealer-performance-table"
    />
  );
}
