import { useMemo, useState } from 'react';
import DataTable from '../common/DataTable';
import { useRole } from '../../context/RoleContext';
import { fiscalYearOfDate } from '../../utils/fiscalYear';
import { formatCurrency, formatNumber, formatDate } from '../../utils/formatters';
import './NonSalesInvoicesTable.css';

const CATEGORY_LABEL = {
  branch_transfer: 'Branch Transfer',
  sample: 'Sample',
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'branch_transfer', label: 'Branch Transfer' },
  { key: 'sample', label: 'Sample' },
];

// The synced rows are one per (voucher x line item); fold them back into one
// row per invoice so the table lists invoices, not line items.
function groupInvoices(rows) {
  const byInvoice = new Map();
  for (const r of rows) {
    const key = `${r.vchNo}|${r.date}|${r.partyName}|${r.invoiceCategory}`;
    let inv = byInvoice.get(key);
    if (!inv) {
      inv = {
        vchNo: r.vchNo,
        date: r.date,
        invoiceCategory: r.invoiceCategory,
        categoryLabel: CATEGORY_LABEL[r.invoiceCategory] || r.invoiceCategory,
        vchType: r.vchType || '',
        partyName: r.partyName || '',
        items: new Set(),
        quantity: 0,
        amount: 0,
      };
      byInvoice.set(key, inv);
    }
    if (r.itemName) inv.items.add(r.itemName);
    inv.quantity += Number(r.quantity) || 0;
    inv.amount += Number(r.amount) || 0;
  }
  return [...byInvoice.values()].map((inv) => {
    const items = [...inv.items];
    return {
      ...inv,
      itemsLabel: items.length === 0 ? '—' : items.length === 1 ? items[0] : `${items[0]} +${items.length - 1} more`,
    };
  });
}

const columns = [
  { header: 'Date', accessor: 'date', render: (val) => formatDate(val) },
  { header: 'Voucher No', accessor: 'vchNo' },
  {
    header: 'Category',
    accessor: 'categoryLabel',
    render: (val, row) => (
      <span className={`non-sales-badge non-sales-badge--${row.invoiceCategory}`}>{val}</span>
    ),
  },
  { header: 'Voucher Type', accessor: 'vchType' },
  { header: 'Party', accessor: 'partyName' },
  { header: 'Items', accessor: 'itemsLabel' },
  { header: 'Quantity', accessor: 'quantity', numeric: true, render: (val) => formatNumber(val) },
  {
    header: 'Amount (Excl. GST)',
    accessor: 'amount',
    numeric: true,
    render: (val) => <span style={{ fontWeight: 600 }}>{formatCurrency(val)}</span>,
  },
];

/**
 * Branch Transfer + Sample invoices. These are Sales-type vouchers in Tally
 * but not real customer sales, so they are kept out of every sales total and
 * listed here instead. Reads the role/filter-scoped list from RoleContext;
 * `selectedYear` is the dashboard's Financial Year control ("25-26", or 'All' = no limit).
 */
export default function NonSalesInvoicesTable({ selectedYear = 'All', title = 'Branch Transfer & Sample Invoices' }) {
  const { filteredNonSalesInvoices } = useRole();
  const [category, setCategory] = useState('all');

  const invoices = useMemo(() => {
    const rows = selectedYear === 'All'
      ? filteredNonSalesInvoices
      : filteredNonSalesInvoices.filter((r) => fiscalYearOfDate(r.date) === selectedYear);
    return groupInvoices(rows);
  }, [filteredNonSalesInvoices, selectedYear]);

  const summary = useMemo(() => {
    const out = { branch_transfer: { count: 0, amount: 0 }, sample: { count: 0, amount: 0 } };
    for (const inv of invoices) {
      if (out[inv.invoiceCategory]) {
        out[inv.invoiceCategory].count += 1;
        out[inv.invoiceCategory].amount += inv.amount;
      }
    }
    return out;
  }, [invoices]);

  const visible = useMemo(
    () => (category === 'all' ? invoices : invoices.filter((inv) => inv.invoiceCategory === category)),
    [invoices, category]
  );

  const toolbar = (
    <div className="non-sales-toolbar">
      <div className="non-sales-summary">
        {['branch_transfer', 'sample'].map((key) => (
          <div key={key} className={`non-sales-stat non-sales-stat--${key}`}>
            <span className="non-sales-stat-label">{CATEGORY_LABEL[key]}</span>
            <span className="non-sales-stat-value">{formatCurrency(summary[key].amount)}</span>
            <span className="non-sales-stat-sub">{formatNumber(summary[key].count)} invoices</span>
          </div>
        ))}
      </div>
      <div className="non-sales-filters" role="group" aria-label="Invoice category">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`non-sales-filter-btn ${category === f.key ? 'active' : ''}`}
            onClick={() => setCategory(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <DataTable
      title={title}
      subtitle="Not counted in sales — shown separately for reference"
      columns={columns}
      data={visible}
      id="non-sales-invoices-table"
      searchable={true}
      toolbar={toolbar}
    />
  );
}
