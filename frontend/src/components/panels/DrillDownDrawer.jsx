import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, X, Search, Calendar } from 'lucide-react';
import { formatCurrency, formatNumber, formatDate } from '../../utils/formatters';
import { invoiceList, dealerList, billList, invoiceLines } from '../../utils/ceoFilters';
import './DrillDownDrawer.css';

const MAX_ROWS = 1000;

const addDays = (iso, n) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const money = (v) => <span className="dd-money">{formatCurrency(v)}</span>;
const dealerButton = (open) => (v) => (
  <button type="button" className="dd-link" onClick={() => open(v)}>{v}</button>
);

/**
 * Side drawer opened from the CEO cards. `rows` are the dashboard's rows with every filter
 * already applied, so the list always adds up to the number on the card.
 *   kind 'sales'       -> invoices        (row click: the items of the invoice)
 *   kind 'dealers'     -> dealers         (row click: that dealer's invoices)
 *   kind 'outstanding' -> pending bills   (row click: the items of the invoice)
 */
export default function DrillDownDrawer({ kind, rows: allRows, dealerIndex, periodLabel, onClose }) {
  // Stack of views: [root, ...deeper]. Back goes one level up.
  const [stack, setStack] = useState([{ type: 'root' }]);
  const [search, setSearch] = useState('');
  const view = stack[stack.length - 1];

  // Date filter inside the drawer, to look at recent days only. The presets count back from the
  // newest date that has data in this list (not from today), so "Latest day" is always a real day.
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { minDate, maxDate } = useMemo(() => {
    let lo = '', hi = '';
    for (const r of allRows) {
      if (!r.date) continue;
      if (!lo || r.date < lo) lo = r.date;
      if (r.date > hi) hi = r.date;
    }
    return { minDate: lo, maxDate: hi };
  }, [allRows]);
  const rows = useMemo(
    () => (from || to ? allRows.filter((r) => (!from || r.date >= from) && (!to || r.date <= to)) : allRows),
    [allRows, from, to]
  );
  const preset = (days) => {
    setSearch('');
    setStack([{ type: 'root' }]);
    if (days == null) { setFrom(''); setTo(''); return; }
    setFrom(addDays(maxDate, -(days - 1)));
    setTo(maxDate);
  };
  const dateFiltered = Boolean(from || to);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const push = (v) => { setSearch(''); setStack((s) => [...s, v]); };
  const back = () => { setSearch(''); setStack((s) => s.slice(0, -1)); };

  const { title, subtitle, columns, data, totals, onRow, rowKey } = useMemo(() => {
    const invoiceCols = [
      { h: 'Date', k: 'date', f: (v) => formatDate(v) },
      { h: 'Invoice No', k: 'vchNo' },
      { h: 'Dealer', k: 'dealer' },
      { h: 'State', k: 'state' }, { h: 'District', k: 'district' }, { h: 'City', k: 'city' },
      { h: 'Sales Officer', k: 'officer', f: (v) => v || '—' },
      { h: 'Quantity', k: 'quantity', num: true, f: (v) => formatNumber(Math.round(v * 100) / 100) },
      { h: 'Value (Excl. GST)', k: 'value', num: true, f: money },
    ];

    if (view.type === 'invoice') {
      const lines = invoiceLines(rows, view.key);
      const first = lines[0] || {};
      return {
        title: `Invoice ${first.vchNo || ''}`,
        subtitle: `${first.partyName || ''} · ${first.date ? formatDate(first.date) : ''} · ${first.vchType || ''}`,
        columns: [
          { h: 'Item', k: 'itemName', f: (v) => v || '—' },
          { h: 'Quantity', k: 'quantity', num: true, f: (v) => formatNumber(Math.round(v * 100) / 100) },
          { h: 'Unit', k: 'units', f: (v) => v || '' },
          { h: 'Rate', k: 'rate', num: true, f: (v) => formatCurrency(v, true) },
          { h: 'Value (Excl. GST)', k: 'amount', num: true, f: money },
        ],
        data: lines,
        totals: [['Items', formatNumber(lines.length)], ['Value', formatCurrency(lines.reduce((s, r) => s + (Number(r.amount) || 0), 0))]],
        rowKey: (r, i) => i,
      };
    }

    if (view.type === 'dealer') {
      const list = invoiceList(rows.filter((r) => r.partyName === view.name), dealerIndex);
      return {
        title: view.name,
        subtitle: 'Invoices of this dealer',
        columns: invoiceCols.filter((c) => c.k !== 'dealer'),
        data: list,
        totals: [['Invoices', formatNumber(list.length)], ['Net Sales', formatCurrency(list.reduce((s, r) => s + r.value, 0))]],
        onRow: (r) => push({ type: 'invoice', key: r.key }),
        rowKey: (r) => r.key,
      };
    }

    if (kind === 'dealers') {
      const list = dealerList(rows, dealerIndex);
      return {
        title: 'Active Dealers',
        subtitle: periodLabel,
        columns: [
          { h: 'Sr', k: '_sr', f: (_v, _r, i) => i + 1 },
          { h: 'Dealer', k: 'dealer', f: dealerButton((name) => push({ type: 'dealer', name })) },
          { h: 'State', k: 'state' }, { h: 'District', k: 'district' }, { h: 'City', k: 'city' },
          { h: 'Sales Officer', k: 'officer', f: (v) => v || '—' },
          { h: 'Quantity', k: 'quantity', num: true, f: (v) => formatNumber(Math.round(v * 100) / 100) },
          { h: 'Value (Excl. GST)', k: 'value', num: true, f: money },
          { h: 'Last Invoice', k: 'lastInvoice', f: (v) => (v ? formatDate(v) : '—') },
        ],
        data: list,
        totals: [['Dealers', formatNumber(list.length)], ['Net Sales', formatCurrency(list.reduce((s, r) => s + r.value, 0))]],
        onRow: (r) => push({ type: 'dealer', name: r.dealer }),
        rowKey: (r) => r.dealer,
      };
    }

    if (kind === 'outstanding') {
      const list = billList(rows, dealerIndex);
      return {
        title: 'Outstanding Bills',
        subtitle: periodLabel,
        columns: [
          { h: 'Dealer', k: 'dealer' },
          { h: 'Bill No', k: 'billNo' },
          { h: 'Bill Date', k: 'billDate', f: (v) => formatDate(v) },
          { h: 'Due Date', k: 'dueDate', f: (v) => (v ? formatDate(v) : '—') },
          { h: 'Overdue Days', k: 'overdueDays', num: true, f: (v) => (v == null ? '—' : v > 0 ? <span className="dd-overdue">{v}</span> : '0') },
          { h: 'Amount', k: 'amount', num: true, f: money },
        ],
        data: list,
        totals: [['Bills', formatNumber(list.length)], ['Outstanding', formatCurrency(list.reduce((s, r) => s + r.amount, 0))]],
        onRow: (r) => push({ type: 'invoice', key: r.key }),
        rowKey: (r) => r.key,
      };
    }

    const list = invoiceList(rows, dealerIndex);
    return {
      title: 'Net Sales — Invoices',
      subtitle: periodLabel,
      columns: invoiceCols,
      data: list,
      totals: [['Invoices', formatNumber(list.length)], ['Net Sales', formatCurrency(list.reduce((s, r) => s + r.value, 0))]],
      onRow: (r) => push({ type: 'invoice', key: r.key }),
      rowKey: (r) => r.key,
    };
  }, [kind, rows, dealerIndex, view, periodLabel]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? data.filter((r) => Object.values(r).some((v) => typeof v === 'string' && v.toLowerCase().includes(q))) : data;
    return list;
  }, [data, search]);

  return (
    <div className="dd-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="dd-drawer" role="dialog" aria-label={title}>
        <header className="dd-head">
          {stack.length > 1 && (
            <button type="button" className="dd-icon-btn" onClick={back} aria-label="Back"><ArrowLeft size={16} /></button>
          )}
          <div className="dd-head-text">
            <h3>{title}</h3>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="dd-icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </header>

        <div className="dd-totals">
          {totals.map(([label, value]) => (
            <div key={label} className="dd-total"><span>{label}</span><b>{value}</b></div>
          ))}
          <label className="dd-search"><Search size={13} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search in this list…" />
          </label>
        </div>

        <div className="dd-datebar">
          <Calendar size={13} />
          <span className="dd-datebar-label">Dates</span>
          {[['Latest day', 1], ['Last 7 days', 7], ['Last 30 days', 30], ['All', null]].map(([label, days]) => (
            <button
              key={label}
              type="button"
              className={`dd-chip${(days == null ? !dateFiltered : (to === maxDate && from === addDays(maxDate, -(days - 1)))) ? ' active' : ''}`}
              onClick={() => preset(days)}
              disabled={!maxDate}
            >
              {label}
            </button>
          ))}
          <input type="date" value={from} min={minDate} max={to || maxDate} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
          <span className="dd-datebar-to">to</span>
          <input type="date" value={to} min={from || minDate} max={maxDate} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
          {dateFiltered && <span className="dd-datebar-note">Part of the card total: only the dates chosen.</span>}
        </div>

        <div className="dd-table-wrap">
          <table className="dd-table">
            <thead>
              <tr>{columns.map((c) => <th key={c.h} className={c.num ? 'num' : ''}>{c.h}</th>)}</tr>
            </thead>
            <tbody>
              {shown.slice(0, MAX_ROWS).map((r, i) => (
                <tr key={rowKey(r, i)} className={onRow ? 'clickable' : ''} onClick={onRow ? () => onRow(r) : undefined}>
                  {columns.map((c) => {
                    const raw = c.k === '_sr' ? null : r[c.k];
                    return <td key={c.h} className={c.num ? 'num' : ''}>{c.f ? c.f(raw, r, i) : (raw ?? '')}</td>;
                  })}
                </tr>
              ))}
              {shown.length === 0 && <tr><td colSpan={columns.length} className="dd-empty">Nothing to show for the selected filters.</td></tr>}
            </tbody>
          </table>
          {shown.length > MAX_ROWS && <p className="dd-more">Showing the first {MAX_ROWS} of {formatNumber(shown.length)}. Use search or a filter to narrow the list.</p>}
        </div>
        {onRow && <p className="dd-hint">Click a row for more detail.</p>}
      </aside>
    </div>
  );
}
