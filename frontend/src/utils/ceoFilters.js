/**
 * CEO dashboard filters + drill-down lists.
 *
 * Filters (all combine with AND): date range, State -> District -> City, Sales Officer, Dealer.
 * A dealer's place comes from the pincode on its Tally ledger (the API puts it on every
 * row as state / district / city). Rows of dealers with no pincode have an empty district /
 * city; they show as "Unknown" so they can still be picked.
 * A dealer's Sales Officer is the officer with the most sales on that dealer's rows.
 */

export const EMPTY_CEO_FILTERS = { fromDate: '', toDate: '', state: '', district: '', city: '', officer: '', dealer: '' };

export const UNKNOWN = 'Unknown';
const place = (v) => v || UNKNOWN;

/** "Mr. Vaibhav Pawar" and "Vaibhav Pawar" are the same officer. */
export const officerKey = (name) => (name || '').replace(/^M[rs]\.\s+/i, '').trim().toLowerCase();
const NOT_AN_OFFICER = /branch|godown|warehouse|location/i;

/** One entry per dealer: place + main sales officer. */
export function buildDealerIndex(rows) {
  const dealers = new Map();
  const officerSales = new Map(); // dealer -> Map(officerKey -> { name, amount })
  for (const r of rows) {
    const name = (r.partyName || '').trim();
    if (!name) continue;
    let d = dealers.get(name);
    if (!d) {
      d = { name, state: '', district: '', city: '', pincode: '', officer: '', officerKey: '' };
      dealers.set(name, d);
    }
    if (!d.state && r.state) d.state = r.state;
    if (!d.district && r.district) d.district = r.district;
    if (!d.city && r.city) d.city = r.city;
    if (!d.pincode && r.pincode) d.pincode = r.pincode;
    const raw = (r.salesMan || '').trim();
    if (raw && !NOT_AN_OFFICER.test(raw)) {
      const key = officerKey(raw);
      let m = officerSales.get(name);
      if (!m) { m = new Map(); officerSales.set(name, m); }
      const o = m.get(key) || { name: raw, amount: 0 };
      if (!o.name.startsWith('M') && raw.startsWith('M')) o.name = raw; // prefer "Mr. X"
      o.amount += Math.abs(Number(r.amount) || 0);
      m.set(key, o);
    }
  }
  for (const [name, m] of officerSales) {
    const [key, best] = [...m.entries()].sort((a, b) => b[1].amount - a[1].amount)[0];
    const d = dealers.get(name);
    d.officer = best.name;
    d.officerKey = key;
  }
  return dealers;
}

const placeMatches = (d, f) =>
  (!f.state || place(d.state) === f.state) &&
  (!f.district || place(d.district) === f.district) &&
  (!f.city || place(d.city) === f.city);

/** Dropdown options. Each list only holds what is left after the filters before it. */
export function buildOptions(dealerIndex, f) {
  const all = [...dealerIndex.values()];
  const sorted = (set) => [...set].sort((a, b) => (a === UNKNOWN ? 1 : b === UNKNOWN ? -1 : a.localeCompare(b)));

  const states = sorted(new Set(all.map((d) => place(d.state))));
  const districts = sorted(new Set(all.filter((d) => !f.state || place(d.state) === f.state).map((d) => place(d.district))));
  const cities = sorted(new Set(
    all.filter((d) => (!f.state || place(d.state) === f.state) && (!f.district || place(d.district) === f.district)).map((d) => place(d.city))
  ));

  const inPlace = all.filter((d) => placeMatches(d, f));
  const officerMap = new Map();
  inPlace.forEach((d) => { if (d.officerKey && !officerMap.has(d.officerKey)) officerMap.set(d.officerKey, d.officer); });
  const officers = [...officerMap.entries()].map(([key, name]) => ({ key, name })).sort((a, b) => a.name.localeCompare(b.name));

  const dealers = inPlace.filter((d) => !f.officer || d.officerKey === f.officer).map((d) => d.name).sort((a, b) => a.localeCompare(b));
  return { states, districts, cities, officers, dealers };
}

/**
 * Change one filter and keep the rest consistent:
 *  - a bigger place resets the smaller ones (State -> District -> City),
 *  - officer / dealer that no longer fit the place are cleared,
 *  - picking a dealer fills State, District, City and Officer from that dealer.
 */
export function updateCeoFilter(prev, key, value, dealerIndex) {
  let next = { ...prev, [key]: value };
  if (key === 'state') next = { ...next, district: '', city: '' };
  if (key === 'district') next = { ...next, city: '' };

  if (key === 'dealer') {
    const d = value ? dealerIndex.get(value) : null;
    if (d) next = { ...next, state: place(d.state), district: place(d.district), city: place(d.city), officer: d.officerKey };
    return next;
  }

  const opts = buildOptions(dealerIndex, next);
  if (next.officer && !opts.officers.some((o) => o.key === next.officer)) next.officer = '';
  if (next.dealer && !opts.dealers.includes(next.dealer)) next.dealer = '';
  return next;
}

export function hasCeoFilters(f) {
  return Object.values(f).some(Boolean);
}

export function applyCeoFilters(rows, f, dealerIndex) {
  if (!hasCeoFilters(f)) return rows;
  const needsDealer = f.state || f.district || f.city || f.officer || f.dealer;
  return rows.filter((r) => {
    if (f.fromDate && r.date < f.fromDate) return false;
    if (f.toDate && r.date > f.toDate) return false;
    if (!needsDealer) return true;
    const d = dealerIndex.get((r.partyName || '').trim());
    if (!d) return false;
    if (!placeMatches(d, f)) return false;
    if (f.officer && d.officerKey !== f.officer) return false;
    if (f.dealer && d.name !== f.dealer) return false;
    return true;
  });
}

// ── Drill-down lists ────────────────────────────────────────────────────────

const invoiceKey = (r) => `${r.vchNo}|${r.vchType}|${r.date}|${r.partyName}`;

/** Rows are one per (voucher x item line); fold them into one row per invoice. */
export function invoiceList(rows, dealerIndex) {
  const map = new Map();
  for (const r of rows) {
    const key = invoiceKey(r);
    let inv = map.get(key);
    if (!inv) {
      const d = dealerIndex.get((r.partyName || '').trim());
      inv = {
        key, date: r.date, vchNo: r.vchNo, vchType: r.vchType || '', dealer: r.partyName || '',
        state: place(d ? d.state : r.state), district: place(d ? d.district : r.district), city: place(d ? d.city : r.city),
        officer: (d && d.officer) || r.salesMan || '', quantity: 0, value: 0,
      };
      map.set(key, inv);
    }
    inv.quantity += Number(r.quantity) || 0;
    inv.value += Number(r.amount) || 0;
  }
  return [...map.values()].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function dealerList(rows, dealerIndex) {
  const map = new Map();
  for (const r of rows) {
    const name = (r.partyName || '').trim();
    if (!name) continue;
    let x = map.get(name);
    if (!x) {
      const d = dealerIndex.get(name);
      x = {
        dealer: name, state: place(d ? d.state : r.state), district: place(d ? d.district : r.district), city: place(d ? d.city : r.city),
        officer: (d && d.officer) || '', quantity: 0, value: 0, lastInvoice: '',
      };
      map.set(name, x);
    }
    x.quantity += Number(r.quantity) || 0;
    x.value += Number(r.amount) || 0;
    if (r.date > x.lastInvoice) x.lastInvoice = r.date;
  }
  return [...map.values()].sort((a, b) => b.value - a.value);
}

const daysBetween = (fromIso, to) => Math.floor((to - new Date(`${fromIso}T00:00:00`)) / 86400000);

/** Pending bills: the invoices that still carry an outstanding amount (the same figure as the card). */
export function billList(rows, dealerIndex, today = new Date()) {
  const map = new Map();
  for (const r of rows) {
    const out = Number(r.finalOutstanding) || 0;
    if (!out) continue;
    const key = invoiceKey(r);
    let b = map.get(key);
    if (!b) {
      const d = dealerIndex.get((r.partyName || '').trim());
      b = {
        key, dealer: r.partyName || '', billNo: r.vchNo, billDate: r.date, dueDate: r.billDueDate || '', overdueDays: null, amount: 0,
        state: place(d ? d.state : r.state), district: place(d ? d.district : r.district), city: place(d ? d.city : r.city),
      };
      map.set(key, b);
    }
    b.amount += out;
  }
  const list = [...map.values()];
  list.forEach((b) => { b.overdueDays = b.dueDate ? Math.max(0, daysBetween(b.dueDate, today)) : null; });
  return list.sort((a, b) => b.amount - a.amount);
}

export function invoiceLines(rows, key) {
  return rows.filter((r) => invoiceKey(r) === key);
}
