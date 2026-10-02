import { Info } from 'lucide-react';
import './CalculationNotes.css';

/**
 * Simple-English notes on the CEO dashboard: how each figure is made, where the data
 * comes from, and what changed from the earlier version. Keep it in step with the
 * backend (services/salesRecordsSql.js) and the Sales Breakdown table at the bottom.
 */
function HowCalculated() {
  return (
    <details className="calc-notes" open>
      <summary className="calc-notes-summary">
        <Info size={15} />
        <span>How these figures are calculated</span>
        <span className="calc-notes-hint">click to hide / show</span>
      </summary>

      <div className="calc-notes-grid">
        <section className="calc-notes-block">
          <h4>Net Sales (without GST)</h4>
          <p>
            Net Sales = <b>Sales invoices</b> + <b>Credit notes</b>. Credit notes are negative, so they reduce sales.
          </p>
          <p>
            It is the price <b>after discount</b> and <b>without GST</b>. It is the same as &quot;Sales&quot; in Tally&apos;s P&amp;L and
            in the Tally mobile app.
          </p>
        </section>

        <section className="calc-notes-block calc-notes-excluded">
          <h4>Not counted as sales</h4>
          <p>
            <b>Branch Transfer</b>: goods sent to our own branches (Tally group &quot;Branch Trf-Sales&quot;).
          </p>
          <p>
            <b>Sample</b>: sample and free-goods invoices.
          </p>
          <p>Both are shown in a separate table at the bottom of this page.</p>
        </section>

        <section className="calc-notes-block">
          <h4>Other figures</h4>
          <p>
            <b>Financial Year</b>: April to March. FY 25-26 means Apr 2025 to Mar 2026.
          </p>
          <p>
            <b>Active Dealers</b>: customers who have a sales invoice or credit note in the period.
          </p>
          <p>
            <b>Collection</b>: money received. It is the total of the month&apos;s Receipt vouchers.
          </p>
          <p>
            <b>Outstanding</b>: money customers still have to pay, from Tally&apos;s pending bills. Very old bills that are not in
            this system are not included yet.
          </p>
        </section>

        <section className="calc-notes-block">
          <h4>How to check</h4>
          <p>
            The <b>Sales Breakdown</b> table at the bottom shows every month: Sales Invoices, Credit Notes, Net Sales, Branch
            Transfer, Sample and Collection. Compare Net Sales and Collection with the Tally mobile app.
          </p>
        </section>
      </div>
    </details>
  );
}

function WhatChanged() {
  return (
    <details className="calc-notes" open>
      <summary className="calc-notes-summary">
        <Info size={15} />
        <span>Where the data comes from and what changed</span>
        <span className="calc-notes-hint">click to hide / show</span>
      </summary>

      <p className="calc-notes-flow">
        <b>Tally Prime</b> &rarr; sync service on the server (reads Tally every 10 minutes) &rarr; <b>database</b> &rarr;{' '}
        <b>this dashboard</b>. &quot;LIVE DATA&quot; means the numbers come from that database. Press <b>Sync</b> (top right) to
        reload them.
      </p>

      <div className="calc-notes-table-wrap">
        <table className="calc-notes-table">
          <thead>
            <tr>
              <th>Figure</th>
              <th>Before</th>
              <th>Now</th>
              <th>Why the number changed</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><b>Net Sales</b></td>
              <td>
                Added all item amounts of Sales and Credit Note vouchers. Credit notes were <b>added</b>. Branch Transfer, Sample
                and Sales Orders were counted as sales.
              </td>
              <td>
                Uses Tally&apos;s &quot;Sales Accounts&quot; amounts. Credit notes are <b>subtracted</b>. Branch Transfer, Sample and
                Sales Orders are left out.
              </td>
              <td>
                <b>Lower</b>, because credit notes now reduce sales and non-sales items are removed. FY 25-26 was ₹11.9 Cr and is now
                ₹9.27 Cr, the same as Tally.
              </td>
            </tr>
            <tr>
              <td><b>Active Dealers</b></td>
              <td>Counted every party on any sales voucher, including our own branches and sample receivers.</td>
              <td>Counts only real customers. Branch Transfer and Sample are not counted.</td>
              <td><b>Fewer</b> dealers.</td>
            </tr>
            <tr>
              <td><b>Year</b></td>
              <td>Calendar year (2024, 2025, 2026).</td>
              <td>Financial Year, April to March, like Tally.</td>
              <td>Same sales, grouped differently. Jan to Mar moved to the earlier year.</td>
            </tr>
            <tr>
              <td><b>Collection</b></td>
              <td>Not shown.</td>
              <td>Shown per month in the Sales Breakdown table.</td>
              <td>New. It matches the Tally mobile app.</td>
            </tr>
            <tr>
              <td><b>Outstanding</b></td>
              <td>Pending bills that match an invoice in this system.</td>
              <td>Same as before.</td>
              <td>No change yet. We are matching it with Tally&apos;s Receivables total.</td>
            </tr>
            <tr>
              <td><b>Missing data</b></td>
              <td>
                Tally starts voucher numbers again every year, so new vouchers replaced old ones with the same number. Some old
                invoices were saved without their sales amount.
              </td>
              <td>Vouchers are now kept separately for each Financial Year, and each year is read again from Tally.</td>
              <td>
                <b>Higher</b>. FY 25-26 Collection went from ₹6.2 Cr to ₹10.6 Cr (Tally: ₹10.63 Cr). FY 24-25 Net Sales is now
                ₹8.94 Cr (Tally: ₹8.94 Cr).
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  );
}

export default function CalculationNotes() {
  return (
    <>
      <HowCalculated />
      <WhatChanged />
    </>
  );
}
