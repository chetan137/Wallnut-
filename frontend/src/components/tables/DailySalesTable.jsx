import React from 'react';
import DataTable from '../common/DataTable';
import { formatCurrency, formatNumber, formatDate } from '../../utils/formatters';

const columns = [
  {
    header: 'Date',
    accessor: 'date',
    render: (val) => formatDate(val),
  },
  {
    header: 'Invoices',
    accessor: 'invoiceCount',
    numeric: true,
    render: (val) => `${formatNumber(val)} Bills`,
  },
  {
    header: 'Active Dealers',
    accessor: 'dealerCount',
    numeric: true,
    render: (val) => `${formatNumber(val)} Parties`,
  },
  {
    header: 'Quantity',
    accessor: 'totalQuantity',
    numeric: true,
    render: (val) => formatNumber(val),
  },
  {
    header: 'Top Billing Dealer',
    accessor: 'topDealer',
  },
  {
    header: 'Net Sales (Excl. GST)',
    accessor: 'totalAmount',
    numeric: true,
    render: (val) => (
      <span style={{ fontWeight: '600', color: 'var(--accent-primary)' }}>
        {formatCurrency(val)}
      </span>
    ),
  },
];

export default function DailySalesTable({ data, title = 'Daily Sales Register (Excl. GST)' }) {
  return (
    <DataTable
      title={title}
      subtitle="Day-by-day sales breakdown without GST"
      columns={columns}
      data={data || []}
      id="daily-sales-table"
      searchable={true}
    />
  );
}
