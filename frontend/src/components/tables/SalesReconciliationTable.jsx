import { useMemo } from 'react';
import DataTable from '../common/DataTable';
import { useRole } from '../../context/RoleContext';
import { fiscalYearOfDate } from '../../utils/fiscalYear';
import { formatCurrency, formatMonthKey } from '../../utils/formatters';
import './NonSalesInvoicesTable.css';

const isCreditNote = (row) => /^credit note/i.test(row.vchType || '');

const columns = [
  { header: 'Month', accessor: 'month', render: (val) => formatMonthKey(val) },
  { header: 'Sales Invoices', accessor: 'sales', numeric: true, render: (val) => formatCurrency(val) },
  { header: 'Credit Notes', accessor: 'creditNotes', numeric: true, render: (val) => formatCurrency(val) },
  {
    header: 'Net Sales (Tally "Sales")',
    accessor: 'netSales',
    numeric: true,
    render: (val) => <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{formatCurrency(val)}</span>,
  },
  { header: 'Branch Transfer (not in sales)', accessor: 'branchTransfer', numeric: true, render: (val) => formatCurrency(val) },
  { header: 'Sample (not in sales)', accessor: 'sample', numeric: true, render: (val) => formatCurrency(val) },
];

/**
 * Month-by-month split of what the "Net Sales" card is made of, so it can be
 * compared line by line with Tally's own monthly Sales (its mobile dashboard /
 * P&L "Sales Accounts"). Every figure is excl. GST.
 *
 *   Sales Invoices        Sales vouchers (Sales-Kolhapur, Sales-Gujarat, …)
 *   Credit Notes          Credit Note vouchers — negative, they reduce sales
 *   Net Sales             Sales Invoices + Credit Notes = the Net Sales card
 *                         (the net of Tally's "Sales Accounts" ledgers)
 *   Branch Transfer       invoices to the company's own branches — Tally keeps
 *                         these out of "Sales Accounts", so they are NOT sales
 *   Sample                sample / free-goods invoices — NOT sales
 *
 * `salesRows` is the already year/role/filter-scoped sales array of the
 * dashboard; Branch Transfer / Sample come from RoleContext, scoped the same way.
 */
export default function SalesReconciliationTable({ salesRows, selectedYear = 'All', title = 'Sales Breakdown (compare with Tally)' }) {
  const { filteredNonSalesInvoices } = useRole();

  const { months, totals } = useMemo(() => {
    const byMonth = {};
    const bucket = (date) => {
      const key = String(date || '').slice(0, 7);
      if (key.length !== 7) return null;
      if (!byMonth[key]) byMonth[key] = { month: key, sales: 0, creditNotes: 0, branchTransfer: 0, sample: 0 };
      return byMonth[key];
    };

    for (const r of salesRows) {
      const b = bucket(r.date);
      if (!b) continue;
      if (isCreditNote(r)) b.creditNotes += Number(r.amount) || 0;
      else b.sales += Number(r.amount) || 0;
    }
    for (const r of filteredNonSalesInvoices) {
      if (selectedYear !== 'All' && fiscalYearOfDate(r.date) !== selectedYear) continue;
      const b = bucket(r.date);
      if (!b) continue;
      if (r.invoiceCategory === 'branch_transfer') b.branchTransfer += Number(r.amount) || 0;
      else if (r.invoiceCategory === 'sample') b.sample += Number(r.amount) || 0;
    }

    const rows = Object.values(byMonth)
      .map((b) => ({ ...b, netSales: b.sales + b.creditNotes }))
      .sort((a, b) => b.month.localeCompare(a.month));

    const sum = (k) => rows.reduce((s, r) => s + r[k], 0);
    return {
      months: rows,
      totals: { sales: sum('sales'), creditNotes: sum('creditNotes'), branchTransfer: sum('branchTransfer'), sample: sum('sample') },
    };
  }, [salesRows, filteredNonSalesInvoices, selectedYear]);

  const toolbar = (
    <div className="non-sales-toolbar">
      <div className="non-sales-summary">
        <div className="non-sales-stat non-sales-stat--branch_transfer">
          <span className="non-sales-stat-label">Sales Invoices</span>
          <span className="non-sales-stat-value">{formatCurrency(totals.sales)}</span>
          <span className="non-sales-stat-sub">Sales vouchers, excl. GST</span>
        </div>
        <div className="non-sales-stat non-sales-stat--sample">
          <span className="non-sales-stat-label">Credit Notes</span>
          <span className="non-sales-stat-value">{formatCurrency(totals.creditNotes)}</span>
          <span className="non-sales-stat-sub">negative — they reduce sales</span>
        </div>
        <div className="non-sales-stat non-sales-stat--sample">
          <span className="non-sales-stat-label">Branch Transfer + Sample</span>
          <span className="non-sales-stat-value">{formatCurrency(totals.branchTransfer + totals.sample)}</span>
          <span className="non-sales-stat-sub">kept out of sales</span>
        </div>
      </div>
    </div>
  );

  return (
    <DataTable
      title={title}
      subtitle="What the Net Sales card is made of, month by month: Sales Invoices + Credit Notes (negative). Same as Tally's Sales; Branch Transfer and Sample are left out."
      columns={columns}
      data={months}
      id="sales-breakdown-table"
      searchable={false}
      toolbar={toolbar}
    />
  );
}
