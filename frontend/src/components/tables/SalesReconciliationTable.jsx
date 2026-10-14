import { useMemo } from 'react';
import DataTable from '../common/DataTable';
import { useRole } from '../../context/RoleContext';
import { fiscalYearOfDate } from '../../utils/fiscalYear';
import { formatCurrency, formatMonthKey } from '../../utils/formatters';
import './NonSalesInvoicesTable.css';

const isCreditNote = (row) => /^credit note/i.test(row.vchType || '');

const columns = [
  { header: 'Month', accessor: 'month', render: (val) => formatMonthKey(val) },
  {
    header: 'Sales Invoices',
    help: 'Total of the month\u2019s Sales invoices (Sales-Kolhapur, Sales-Gujarat, Sales-Bhiwandi\u2026), without GST and after discount. Branch Transfer and Sample invoices are not in this figure.',
    accessor: 'sales',
    numeric: true,
    render: (val) => formatCurrency(val),
  },
  {
    header: 'Credit Notes',
    help: [
      'Why the minus? A credit note is money given back to a customer (returns, rate difference, discount after billing). It reduces sales, so it is shown as a negative number.',
      'It is taken from the same Sales ledger postings as in Tally, so Sales Invoices + Credit Notes = Net Sales.',
    ],
    accessor: 'creditNotes',
    numeric: true,
    render: (val) => <span style={{ color: val < 0 ? 'var(--danger)' : undefined }}>{formatCurrency(val)}</span>,
  },
  {
    header: 'Net Sales (Tally "Sales")',
    help: 'Sales Invoices + Credit Notes (credit notes are negative). This is the same figure as the Net Sales card and as "Sales" in Tally\u2019s P&L / mobile app for that month.',
    accessor: 'netSales',
    numeric: true,
    render: (val) => <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{formatCurrency(val)}</span>,
  },
  { header: 'Branch Transfer (not in sales)', help: 'Invoices to Wallnut\u2019s own branches. Tally keeps these out of Sales, so they are shown here for information only and are not added to Net Sales.', accessor: 'branchTransfer', numeric: true, render: (val) => formatCurrency(val) },
  { header: 'Sample (not in sales)', help: 'Sample / free-goods invoices (e.g. Promotional Invoice). They are not sales, so they are left out of Net Sales.', accessor: 'sample', numeric: true, render: (val) => formatCurrency(val) },
  {
    header: 'Collection (receipts)',
    help: 'Money received in the month: the total of that month\u2019s Receipt vouchers (same as "Collection" in Tally mobile). It covers the whole company, so it does not change with the State / District / Dealer filters.',
    accessor: 'collection',
    numeric: true,
    render: (val) => <span style={{ fontWeight: 600 }}>{formatCurrency(val)}</span>,
  },
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
 *   Collection            money received — the month's Receipt vouchers (Tally mobile's
 *                         "Collection"); company-wide, so it ignores the area / officer /
 *                         dealer filters, unlike the columns above
 *
 * `salesRows` is the already year/role/filter-scoped sales array of the
 * dashboard; Branch Transfer / Sample come from RoleContext, scoped the same way.
 */
export default function SalesReconciliationTable({ salesRows, selectedYear = 'All', title = 'Sales Breakdown (compare with Tally)' }) {
  const { filteredNonSalesInvoices, collections } = useRole();

  const { months, totals } = useMemo(() => {
    const byMonth = {};
    const bucket = (date) => {
      const key = String(date || '').slice(0, 7);
      if (key.length !== 7) return null;
      if (!byMonth[key]) byMonth[key] = { month: key, sales: 0, creditNotes: 0, branchTransfer: 0, sample: 0, collection: 0 };
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

    for (const c of collections || []) {
      if (selectedYear !== 'All' && fiscalYearOfDate(`${c.month}-01`) !== selectedYear) continue;
      const b = bucket(`${c.month}-01`);
      if (b) b.collection += Number(c.amount) || 0;
    }

    const rows = Object.values(byMonth)
      .map((b) => ({ ...b, netSales: b.sales + b.creditNotes }))
      .sort((a, b) => b.month.localeCompare(a.month));

    const sum = (k) => rows.reduce((s, r) => s + r[k], 0);
    return {
      months: rows,
      totals: { sales: sum('sales'), creditNotes: sum('creditNotes'), branchTransfer: sum('branchTransfer'), sample: sum('sample'), collection: sum('collection') },
    };
  }, [salesRows, filteredNonSalesInvoices, collections, selectedYear]);

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
        <div className="non-sales-stat non-sales-stat--branch_transfer">
          <span className="non-sales-stat-label">Collection</span>
          <span className="non-sales-stat-value">{formatCurrency(totals.collection)}</span>
          <span className="non-sales-stat-sub">receipts, company-wide</span>
        </div>
      </div>
    </div>
  );

  return (
    <DataTable
      title={title}
      subtitle="Month by month, like Tally's mobile app: Net Sales = Sales Invoices + Credit Notes (negative), Branch Transfer and Sample left out; Collection = receipts."
      columns={columns}
      data={months}
      id="sales-breakdown-table"
      searchable={false}
      toolbar={toolbar}
    />
  );
}
