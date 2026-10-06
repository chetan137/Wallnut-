import React, { useState } from 'react';
import DataTable from '../common/DataTable';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { Package, TrendingUp, TrendingDown } from 'lucide-react';
import DealerProductDrilldownModal from './DealerProductDrilldownModal';

export default function DealerPerformanceTable({ data }) {
  const [selectedDealer, setSelectedDealer] = useState(null);

  const columns = [
    {
      header: 'Dealer',
      accessor: 'dealer',
      render: (val, row) => (
        <button
          onClick={() => setSelectedDealer(row)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: 'var(--accent-primary)',
            fontWeight: 600,
            cursor: 'pointer',
            textAlign: 'left',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
          title="Click to view product drill-down"
        >
          <span>{val}</span>
          <Package size={13} style={{ opacity: 0.7 }} />
        </button>
      ),
    },
    {
      header: 'Sales Officer',
      accessor: 'salesMan',
      render: (val) => val || '—',
    },
    {
      header: 'District',
      accessor: 'district',
      render: (val) => val || '—',
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
      header: 'Growth (PY)',
      help: "Compares this dealer's latest month of sales with the same month last year: (this month - same month last year) / same month last year x 100. If the dealer had no sales in that month last year, it is compared with the previous month instead, so the % is then a month-on-month change, not a year-on-year one.",
      accessor: 'pyGrowth',
      numeric: true,
      render: (val) => {
        if (val === null || val === undefined) {
          return <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>;
        }
        return val >= 0 ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
              color: 'var(--success)',
              fontWeight: 600,
              fontSize: '0.8rem',
            }}
          >
            <TrendingUp size={12} /> +{val}%
          </span>
        ) : (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
              color: 'var(--danger)',
              fontWeight: 600,
              fontSize: '0.8rem',
            }}
          >
            <TrendingDown size={12} /> {val}%
          </span>
        );
      },
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
    {
      header: 'Action',
      accessor: 'actions',
      numeric: false,
      render: (_, row) => (
        <button
          onClick={() => setSelectedDealer(row)}
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--card-border)',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
          title="Drill-down products"
        >
          <Package size={12} color="var(--accent-primary)" />
          <span>Products</span>
        </button>
      ),
    },
  ];

  return (
    <>
      <DataTable
        title="Dealer Performance Summary"
        subtitle="Click any dealer or action button to view party-wise product purchase drill-down (Excl. GST)"
        columns={columns}
        data={data}
        searchable={true}
        id="dealer-performance-table"
      />

      <DealerProductDrilldownModal
        isOpen={Boolean(selectedDealer)}
        onClose={() => setSelectedDealer(null)}
        dealer={selectedDealer}
      />
    </>
  );
}
