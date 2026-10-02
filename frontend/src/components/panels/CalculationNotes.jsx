import { Info } from 'lucide-react';
import './CalculationNotes.css';

/**
 * Plain-language statement of how the CEO dashboard's figures are built — what is
 * counted, what is left out and where each number comes from — so anyone can check
 * them against Tally. Keep this in step with the backend (services/salesRecordsSql.js)
 * and the Sales Breakdown table at the bottom of the page.
 */
export default function CalculationNotes() {
  return (
    <details className="calc-notes" open>
      <summary className="calc-notes-summary">
        <Info size={15} />
        <span>How these figures are calculated</span>
        <span className="calc-notes-hint">click to hide / show</span>
      </summary>

      <div className="calc-notes-grid">
        <section className="calc-notes-block">
          <h4>Net Sales (Excl. GST)</h4>
          <p>
            = <b>Sales invoices</b> + <b>Credit Notes</b> (credit notes are negative, so they reduce sales).
          </p>
          <p>
            Taken from Tally&apos;s <b>&quot;Sales Accounts&quot;</b> ledger postings, i.e. the price <b>after discount</b>,
            <b> without GST</b> — the same figure as Tally&apos;s P&amp;L / mobile app &quot;Sales&quot;.
          </p>
        </section>

        <section className="calc-notes-block calc-notes-excluded">
          <h4>Not counted as sales</h4>
          <p>
            <b>Branch Transfer</b> — invoices where goods move to the company&apos;s own branches
            (posted to Tally&apos;s &quot;Branch Trf-Sales&quot; group).
          </p>
          <p>
            <b>Sample</b> — &quot;Promotional Invoice&quot; vouchers and free-goods ledgers (Free Gift, Free Promotional Item,
            Sample Sale, Free Sample, Free Samples-Customer).
          </p>
          <p>Both are listed separately in the table at the bottom of this page.</p>
        </section>

        <section className="calc-notes-block">
          <h4>Other figures</h4>
          <p>
            <b>Financial Year</b> = April to March (FY 25-26 = Apr 2025 – Mar 2026), as in Tally&apos;s yearly view.
          </p>
          <p>
            <b>Active Dealers</b> = customers with a sales invoice or credit note in the period (Branch Transfer and
            Sample are not counted).
          </p>
          <p>
            <b>Collection</b> = money received: the month&apos;s Receipt vouchers (Sales Breakdown table).
          </p>
          <p>
            <b>Outstanding</b> = pending amount of Tally&apos;s bills for invoices raised in the period. Old bills that have no
            invoice in this system are not included yet.
          </p>
        </section>

        <section className="calc-notes-block">
          <h4>How to verify</h4>
          <p>
            The <b>Sales Breakdown</b> table (bottom of the page) lists, month by month, Sales Invoices, Credit Notes,
            Net Sales, Branch Transfer, Sample and Collection. Compare Net Sales and Collection with Tally&apos;s mobile
            app (Turnover) or Tally&apos;s P&amp;L &quot;Sales Accounts&quot;.
          </p>
        </section>
      </div>
    </details>
  );
}
