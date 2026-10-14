import { useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import './DrillDownDrawer.css';

/**
 * Pop-up for the cards of the Financials "P&L / Balance Sheet" tab. Shows what is behind a card:
 * how the number is made, the Tally lines it comes from (highlighted), and for balance-sheet cards the
 * value on each of the last days. `company` is one entry of /api/tally/financials.
 */

const BS_GROUPS = {
  currentAssets:      ['Current Assets'],
  currentLiabilities: ['Current Liabilities'],
  fixedAssets:        ['Fixed Assets'],
  loansCapital:       ['Loans (Liability)', 'Capital Account'],
};

const HOW = {
  revenue: 'Revenue is the "Sales Accounts" total of the Profit & Loss report in Tally, for the period shown. It is after discount and without GST, and credit notes are already taken off.',
  costOfSales: 'Cost of Sales is the "Cost of Sales" total of the Profit & Loss report in Tally (purchases and direct costs, adjusted for stock), for the period shown.',
  grossProfit: 'Gross Profit = Revenue - Cost of Sales.',
  netProfit: 'Net Profit = every income line of the Profit & Loss report minus every expense line, for the period shown. All the lines are listed below and add up to the card.',
  currentAssets: "Current Assets is the \"Current Assets\" total of Tally's Balance Sheet report (debtors, closing stock, bank, cash, deposits, TDS receivable and so on). The Balance Sheet includes the calculated closing stock.",
  currentLiabilities: 'Current Liabilities is the "Current Liabilities" total from Tally (creditors, duties and taxes, provisions).',
  fixedAssets: 'Fixed Assets is the "Fixed Assets" total from Tally (after depreciation).',
  loansCapital: 'Loans + Capital = "Loans (Liability)" + "Capital Account" from Tally.',
};

const TITLE = {
  revenue: 'Revenue', costOfSales: 'Cost of Sales', grossProfit: 'Gross Profit', netProfit: 'Net Profit',
  currentAssets: 'Current Assets', currentLiabilities: 'Current Liabilities', fixedAssets: 'Fixed Assets', loansCapital: 'Loans + Capital',
};

const money = (v) => <span className="dd-money">{formatCurrency(v)}</span>;
const drCr = (v) => (v < 0 ? 'Dr' : 'Cr');

export default function FinancialDetailDrawer({ card, company, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isPl = ['revenue', 'costOfSales', 'grossProfit', 'netProfit'].includes(card);
  const bs = company.balanceSheet;
  const value = {
    revenue: company.pl.revenue,
    costOfSales: Math.abs(company.pl.costOfSales),
    grossProfit: company.pl.grossProfit,
    netProfit: company.pl.netProfit,
    currentAssets: bs.currentAssets,
    currentLiabilities: bs.currentLiabilities,
    fixedAssets: bs.fixedAssets,
    loansCapital: bs.loans + bs.capitalAccount,
  }[card];

  const highlight = useMemo(() => {
    if (card === 'revenue') return ['Sales Accounts'];
    if (card === 'costOfSales') return ['Cost of Sales :'];
    if (card === 'grossProfit') return ['Sales Accounts', 'Cost of Sales :'];
    return BS_GROUPS[card] || [];
  }, [card]);

  // Lines behind the number
  const lines = useMemo(() => {
    if (isPl) {
      const all = [...(company.pl.lineItems || [])].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
      const shown = card === 'netProfit' ? all : all.filter((l) => highlight.includes(l.groupName));
      return shown.map((l) => ({ name: l.groupName, amount: l.amount, kind: l.amount >= 0 ? 'Income' : 'Expense', main: highlight.includes(l.groupName) }));
    }
    if (company.balanceSheetLines && company.balanceSheetLines.length) {
      return [...company.balanceSheetLines]
        .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
        .map((l) => ({ name: l.groupName, amount: l.amount, kind: drCr(l.amount), main: highlight.includes(l.groupName) }));
    }
    // No Balance Sheet report stored for this company (e.g. a closed year): show the figures the page has.
    return [
      { name: 'Current Assets', amount: -bs.currentAssets }, { name: 'Fixed Assets', amount: -bs.fixedAssets },
      { name: 'Current Liabilities', amount: bs.currentLiabilities }, { name: 'Loans (Liability)', amount: bs.loans },
      { name: 'Capital Account', amount: bs.capitalAccount },
    ].map((l) => ({ ...l, kind: drCr(l.amount), main: highlight.includes(l.name) }));
  }, [isPl, card, company, highlight, bs]);

  // Value of the card on each of the last days (balance-sheet cards only)
  const history = useMemo(() => {
    if (isPl) return [];
    const pick = (h) => {
      if (card === 'currentAssets') return h.currentAssets;
      if (card === 'currentLiabilities') return h.currentLiabilities;
      if (card === 'fixedAssets') return h.fixedAssets;
      return h.loans == null || h.capitalAccount == null ? null : h.loans + h.capitalAccount;
    };
    const days = (company.history || []).map((h) => ({ date: h.date, value: pick(h) })).filter((h) => h.value != null);
    return days.map((d, i) => ({ ...d, change: i + 1 < days.length ? d.value - days[i + 1].value : null }));
  }, [isPl, card, company]);

  const lineTotal = lines.reduce((s, l) => s + (l.main || card === 'netProfit' ? l.amount : 0), 0);

  return (
    <div className="dd-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="dd-drawer" role="dialog" aria-label={TITLE[card]}>
        <header className="dd-head">
          <div className="dd-head-text">
            <h3>{TITLE[card]}</h3>
            <p>{company.companyName} · {formatDate(company.periodFrom)} to {formatDate(company.periodTo)}</p>
          </div>
          <button type="button" className="dd-icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </header>

        <div className="dd-totals">
          <div className="dd-total"><span>{TITLE[card]}</span><b>{formatCurrency(value)}</b></div>
        </div>

        <div className="dd-table-wrap">
          <p className="dd-note"><b>How this is made.</b> {HOW[card]}</p>

          <h4 className="dd-section">{isPl ? 'Profit & Loss lines (Tally)' : `Balance Sheet lines (Tally${company.balanceSheetDate ? `, ${formatDate(company.balanceSheetDate)}` : ''})`}</h4>
          <table className="dd-table">
            <thead><tr><th>Line</th><th>{isPl ? 'Type' : 'Dr / Cr'}</th><th className="num">Amount</th></tr></thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.name} className={l.main ? 'dd-row-main' : ''}>
                  <td>{l.name}</td>
                  <td>{l.kind}</td>
                  <td className="num">{money(isPl ? l.amount : Math.abs(l.amount))}</td>
                </tr>
              ))}
              {lines.length === 0 && <tr><td colSpan={3} className="dd-empty">No lines stored yet.</td></tr>}
              {isPl && card === 'netProfit' && (
                <tr className="dd-row-total"><td>Net Profit</td><td /><td className="num">{money(lineTotal)}</td></tr>
              )}
            </tbody>
          </table>
          {isPl && card !== 'netProfit' && (
            <p className="dd-hint" style={{ marginLeft: 0 }}>Highlighted lines make this card. Expenses are shown as negative amounts.</p>
          )}

          {!isPl && (
            <>
              <h4 className="dd-section">Last days</h4>
              {history.length ? (
                <table className="dd-table">
                  <thead><tr><th>Date</th><th className="num">{TITLE[card]}</th><th className="num">Change from the day before</th></tr></thead>
                  <tbody>
                    {history.map((h) => (
                      <tr key={h.date}>
                        <td>{formatDate(h.date)}</td>
                        <td className="num">{money(h.value)}</td>
                        <td className="num">{h.change == null ? '—' : <span className={h.change < 0 ? 'dd-overdue' : ''}>{h.change > 0 ? '+' : ''}{formatCurrency(h.change)}</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="dd-hint" style={{ marginLeft: 0 }}>
                  {card === 'currentAssets'
                    ? "The daily history of Current Assets starts from the day Tally's Balance Sheet report was first stored."
                    : 'No earlier days stored for this company.'}
                </p>
              )}
              <p className="dd-hint" style={{ marginLeft: 0 }}>
                The ledgers inside these groups (for example each bank or debtor) are not stored here yet, so this pop-up shows the groups of the Balance Sheet.
              </p>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
