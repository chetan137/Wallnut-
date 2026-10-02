/**
 * Wallnut — Indian Financial Year helpers (FY runs April → March).
 *
 * Labels are "YY-YY": 2025-04-01 … 2026-03-31 → "25-26". This is the same
 * year split Tally's own mobile dashboard uses (its "2025" row = Apr-2025 →
 * Mar-2026 = FY 25-26, its "2026" row = Apr-2026 onwards = FY 26-27), so the
 * dashboard's year-wise totals line up with Tally's.
 */

/** "2026-09-03" → "26-27". Returns '' for a missing/invalid date. */
export function fiscalYearOfDate(dateStr) {
  const [y, m] = String(dateStr || '').split('-').map(Number);
  if (!y || !m) return '';
  const start = m >= 4 ? y : y - 1;
  return `${String(start).slice(2)}-${String(start + 1).slice(2)}`;
}

/** "26-27" → "25-26". */
export function previousFiscalYear(fy) {
  const start = Number(String(fy).slice(0, 2));
  if (Number.isNaN(start)) return '';
  const prev = start - 1;
  return `${String(prev).padStart(2, '0')}-${String(prev + 1).padStart(2, '0')}`;
}

/** True for a "YY-YY" label (and not 'All', or a stale calendar year like '2026'). */
export function isFiscalYear(value) {
  return /^\d{2}-\d{2}$/.test(String(value || ''));
}

/**
 * Financial Years to offer in a year dropdown, newest first: every FY that
 * appears in `rows`, plus FY 25-26 and FY 24-25 which are always listed.
 */
export function fiscalYearOptions(rows) {
  const years = new Set(['25-26', '24-25']);
  for (const r of rows) {
    const fy = fiscalYearOfDate(r.date);
    if (fy) years.add(fy);
  }
  return [...years].sort((a, b) => b.localeCompare(a));
}
