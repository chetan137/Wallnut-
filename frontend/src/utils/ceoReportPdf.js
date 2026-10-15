import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { loadLogoAsDataUrl, drawLetterhead, stampFooter, drawSection } from './pdfLetterhead';
import { invoiceList, dealerList, billList } from './ceoFilters';
import { getTopProducts, getTopSalesOfficers } from './dataProcessors';

/**
 * CEO "Download PDF report": everything the dashboard shows for the filters that are chosen, as one document
 * -  which filters / dates / period the report is for (first page),
 * -  the totals (Net Sales, invoices, dealers, outstanding, Branch Transfer / Sample),
 * -  diagrams (monthly sales, outstanding by age, top states / products / officers / dealers),
 * -  the details behind every card: month-wise, place-wise, all dealers, all pending bills, all invoices.
 *
 * `rows` are the dashboard's rows with every filter already applied (the same rows the cards and the pop-ups use),
 * so the PDF always adds up to what is on screen. The standard PDF font has no rupee sign, so amounts say "Rs.".
 */

const GREEN = [61, 168, 85];
const ORANGE = [214, 124, 52];
const BLUE = [64, 130, 200];
const GREY = [120, 120, 120];
const MAX_INVOICE_ROWS = 4000;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = (iso) => {
  if (!iso) return '-';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}-${MONTHS[Number(m) - 1]}-${y}`;
};
const inr = (n) => Math.round(Number(n || 0)).toLocaleString('en-IN');
const rs = (n) => `${Number(n) < 0 ? '-' : ''}Rs. ${inr(Math.abs(n))}`;
const rsShort = (v) => {
  const a = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (a >= 1e7) return `${sign}Rs.${(a / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `${sign}Rs.${(a / 1e5).toFixed(2)} L`;
  if (a >= 1e3) return `${sign}Rs.${(a / 1e3).toFixed(1)} K`;
  return `${sign}Rs.${a.toFixed(0)}`;
};
const qty = (v) => (Math.round(Number(v || 0) * 100) / 100).toLocaleString('en-IN');
const cut = (s, n) => (String(s || '').length > n ? `${String(s).slice(0, n - 3)}...` : String(s || ''));

// ── diagrams (drawn with PDF shapes, so they stay sharp) ─────────────────────────────────────────

/** Horizontal bars: label on the left, value at the end of the bar. Returns the Y below the chart. */
function hBarChart(doc, { x, y, w, title, items, color = GREEN, valueFmt = rsShort, maxItems = 10 }) {
  const list = items.slice(0, maxItems);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(30);
  doc.text(title, x, y);
  let cy = y + 4;
  if (!list.length) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GREY);
    doc.text('No data for the chosen filters.', x, cy + 4);
    return cy + 10;
  }
  const labelW = w * 0.36;
  const valueW = 26;
  const barMax = w - labelW - valueW - 2;
  const max = Math.max(...list.map((i) => Math.abs(i.value)), 1);
  const rowH = 6;
  list.forEach((it) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(60);
    doc.text(cut(it.label, 30), x + labelW - 1.5, cy + 3.8, { align: 'right' });
    const bw = Math.max((Math.abs(it.value) / max) * barMax, 0.4);
    doc.setFillColor(...(it.value < 0 ? [200, 70, 60] : color));
    doc.roundedRect(x + labelW, cy + 0.8, bw, rowH - 2, 0.6, 0.6, 'F');
    doc.setTextColor(30);
    doc.text(valueFmt(it.value), x + labelW + bw + 1.5, cy + 3.8);
    cy += rowH;
  });
  return cy + 3;
}

/** Vertical bars (e.g. months). Returns the Y below the chart. */
function vBarChart(doc, { x, y, w, h, title, items, color = GREEN, valueFmt = rsShort }) {
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(30);
  doc.text(title, x, y);
  if (!items.length) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GREY);
    doc.text('No data for the chosen filters.', x, y + 8);
    return y + 14;
  }
  const top = y + 8;
  const base = y + h - 8;
  const plotH = base - top;
  const gap = 1.6;
  const bw = Math.max((w - gap * (items.length + 1)) / items.length, 1.2);
  const max = Math.max(...items.map((i) => Math.max(i.value, 0)), 1);
  doc.setDrawColor(210); doc.setLineWidth(0.2);
  doc.line(x, base, x + w, base);
  const every = items.length > 18 ? 2 : 1;
  items.forEach((it, i) => {
    const bx = x + gap + i * (bw + gap);
    const bh = (Math.max(it.value, 0) / max) * plotH;
    doc.setFillColor(...color);
    doc.rect(bx, base - bh, bw, bh, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(items.length > 14 ? 5.5 : 6.5);
    doc.setTextColor(40);
    if (i % every === 0) doc.text(it.label, bx + bw / 2, base + 4, { align: 'center' });
    if (bh > 0) doc.text(valueFmt(it.value), bx + bw / 2, base - bh - 1.2, { align: 'center' });
  });
  return y + h;
}

// ── helpers ───────────────────────────────────────────────────────────────────────────────────

function band(doc, marginX, pageWidth, y, text) {
  doc.setFillColor(...GREEN);
  doc.rect(marginX, y, pageWidth - marginX * 2, 7, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(255);
  doc.text(text, marginX + 3, y + 5);
  return y + 9;
}

/** Starts a new page when fewer than `need` mm are left. */
function room(doc, y, need) {
  if (y + need > doc.internal.pageSize.getHeight() - 16) { doc.addPage(); return 18; }
  return y;
}

function tile(doc, x, y, w, label, value, sub, color) {
  doc.setDrawColor(225); doc.setFillColor(250, 250, 247);
  doc.roundedRect(x, y, w, 22, 2, 2, 'FD');
  doc.setFillColor(...color); doc.rect(x, y + 2, 1.4, 18, 'F');
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...GREY);
  doc.text(label, x + 4, y + 6);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(30);
  doc.text(value, x + 4, y + 13.5);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(...GREY);
  doc.text(sub, x + 4, y + 18.5);
}

function monthlyBreakdown(invoices) {
  const byMonth = new Map();
  for (const inv of invoices) {
    const key = inv.date.slice(0, 7);
    const m = byMonth.get(key) || { month: key, invoices: 0, sales: 0, credits: 0 };
    if (/credit note/i.test(inv.vchType) || inv.value < 0) m.credits += inv.value; else { m.sales += inv.value; m.invoices += 1; }
    byMonth.set(key, m);
  }
  return [...byMonth.values()].sort((a, b) => (a.month < b.month ? -1 : 1)).map((m) => ({
    ...m, net: m.sales + m.credits, label: `${MONTHS[Number(m.month.slice(5, 7)) - 1]} ${m.month.slice(2, 4)}`,
  }));
}

// right-aligned heading cell (a column's own alignment does not reach its heading)
const R = (t) => ({ content: t, styles: { halign: 'right' } });

const tableDefaults = (marginX) => ({
  margin: { top: 18, left: marginX, right: marginX, bottom: 16 },
  styles: { fontSize: 7.5, cellPadding: 1.6, overflow: 'linebreak' },
  headStyles: { fillColor: [235, 240, 232], textColor: 40, fontStyle: 'bold' },
  alternateRowStyles: { fillColor: [250, 250, 247] },
});

/**
 * @param {object} o
 * @param {string}   o.title        report title
 * @param {string}   o.section      'full' (default) or one card: 'sales' | 'dealers' | 'outstanding'
 * @param {string}   o.scopeLabel   e.g. "All-India" or the state(s) of a State Head
 * @param {string}   o.yearLabel    "All years" / "FY 26-27"
 * @param {object}   o.filters      the CEO filter values (fromDate, toDate, state, district, city, officer, dealer)
 * @param {string}   o.officerName  display name of the chosen officer ('' = all)
 * @param {Array}    o.rows         sales rows with every filter applied
 * @param {Array}    o.nonSalesRows Branch Transfer / Sample rows with the same filters
 * @param {Map}      o.dealerIndex  see buildDealerIndex
 * @param {object}   o.metrics      KPI figures of the dashboard (totalSales, activeDealers, totalOutstanding)
 * @param {string}   o.lastSync     when the data was last read from Tally (ISO) or ''
 * @param {string}   o.preparedBy   name of the person downloading
 * @returns {Promise<{blob: Blob, fileName: string}>}
 */
export async function buildCeoReport(o) {
  const { rows, nonSalesRows = [], dealerIndex, filters } = o;
  const section = ['sales', 'dealers', 'outstanding'].includes(o.section) ? o.section : 'full';
  const now = new Date();
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  let logo = null;
  try { logo = await loadLogoAsDataUrl(); } catch { /* the report works without the logo */ }

  const invoices = invoiceList(rows, dealerIndex);
  const dealers = dealerList(rows, dealerIndex);
  const bills = billList(rows, dealerIndex, now);
  const months = monthlyBreakdown(invoices);
  const net = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const invoiceCount = invoices.filter((i) => !(/credit note/i.test(i.vchType) || i.value < 0)).length;
  const outstanding = bills.reduce((s, b) => s + b.amount, 0);
  const nonSalesTotal = nonSalesRows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const dates = rows.map((r) => r.date).filter(Boolean).sort();
  const firstDate = dates[0] || '';
  const lastDate = dates[dates.length - 1] || '';

  const generated = `${fmtDate(now.toISOString())} ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
  const { marginX, pageWidth, contentStartY } = drawLetterhead(doc, logo, o.title, `Generated ${generated}`);
  const pageW = pageWidth - marginX * 2;

  // 1. What this report is for
  const chosen = (v) => v || 'All';
  const dateRange = filters.fromDate || filters.toDate
    ? `${filters.fromDate ? fmtDate(filters.fromDate) : 'start of the year'}  to  ${filters.toDate ? fmtDate(filters.toDate) : 'end of the year'}`
    : `Whole period of ${o.yearLabel}`;
  let y = drawSection(doc, marginX, pageWidth, contentStartY, 'Report filters (what this report covers)', [
    ['Scope', o.scopeLabel],
    ['Financial Year', o.yearLabel],
    ['Date range chosen', dateRange],
    ['Data in this report', rows.length ? `invoices from ${fmtDate(firstDate)} to ${fmtDate(lastDate)}` : 'no invoices match these filters'],
    ['State / District / City', `${chosen(filters.state)}  /  ${chosen(filters.district)}  /  ${chosen(filters.city)}`],
    ['Sales Officer', o.officerName || 'All officers'],
    ['Dealer', filters.dealer || 'All dealers'],
    ['Data last read from Tally', o.lastSync ? `${fmtDate(o.lastSync)} ${new Date(o.lastSync).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : 'not available'],
    ['Prepared by', o.preparedBy || '-'],
  ]);

  // 2. Totals: the tiles of the card(s) this report is about
  const want = (k) => section === 'full' || section === k;
  const overdueBills = bills.filter((b) => (b.overdueDays || 0) > 0);
  const overdueAmount = overdueBills.reduce((sum, b) => sum + b.amount, 0);
  y = band(doc, marginX, pageWidth, y, 'Summary');
  const tiles = [];
  if (want('sales')) {
    tiles.push(['NET SALES (excl. GST)', rs(net), 'after discount, credit notes taken off', GREEN]);
    tiles.push(['SALES INVOICES', inr(invoiceCount), `${inr(invoices.length - invoiceCount)} credit notes`, BLUE]);
  }
  if (want('dealers')) {
    tiles.push(['ACTIVE DEALERS', inr(dealers.length), 'with an invoice in this report', BLUE]);
    if (section === 'dealers') tiles.push(['NET SALES (excl. GST)', rs(net), 'of these dealers', GREEN], ['AVERAGE PER DEALER', rs(dealers.length ? net / dealers.length : 0), 'Net Sales / active dealers', GREY]);
  }
  if (want('outstanding')) {
    tiles.push(['OUTSTANDING', rs(outstanding), `${inr(bills.length)} pending bills of these invoices`, ORANGE]);
    if (section === 'outstanding') {
      tiles.push(['OVERDUE (past due date)', rs(overdueAmount), `${inr(overdueBills.length)} bills`, [200, 70, 60]]);
      tiles.push(['NOT YET DUE', rs(outstanding - overdueAmount), `${inr(bills.length - overdueBills.length)} bills`, GREEN]);
    }
  }
  if (section === 'full' || section === 'sales') tiles.push(['BRANCH TRANSFER + SAMPLE', rs(nonSalesTotal), 'not counted in Net Sales', GREY]);
  const gap = 3;
  const tw = (pageW - gap * (tiles.length - 1)) / tiles.length;
  tiles.forEach((t, k) => tile(doc, marginX + k * (tw + gap), y, tw, t[0], t[1], t[2], t[3]));
  y += 26;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...GREY);
  const note = doc.splitTextToSize(
    'How to read: Net Sales is as in Tally (after discount, without GST, credit notes subtracted; Branch Transfer, Sample and Sales Orders are not included). '
    + 'Outstanding is the money still pending on the invoices of this report, as on the day the report was generated; very old bills with no invoice here are not included. '
    + 'All figures follow the filters above, exactly like the cards and pop-ups on the dashboard. Amounts are in rupees (Rs.).', pageW);
  doc.text(note, marginX, y);

  // 3. Diagrams
  const byState = new Map();
  dealers.forEach((d) => byState.set(d.state, (byState.get(d.state) || 0) + d.value));
  const toItems = (map) => [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  const byOutDealer = new Map();
  bills.forEach((b) => byOutDealer.set(b.dealer, (byOutDealer.get(b.dealer) || 0) + b.amount));
  const ageing = [['Not due', 0, 0], ['1-30 days', 1, 30], ['31-60 days', 31, 60], ['61-90 days', 61, 90], ['90+ days', 91, Infinity]].map(([label, lo, hi]) => ({
    label, value: bills.filter((b) => (b.overdueDays || 0) >= lo && (b.overdueDays || 0) <= hi).reduce((sum, b) => sum + b.amount, 0),
  }));
  const C = {
    month:     { kind: 'v', title: 'Net Sales by month', items: months.map((m) => ({ label: m.label, value: m.net })) },
    ageing:    { kind: 'h', title: 'Outstanding by age (days past due date)', items: ageing, color: ORANGE, maxItems: 5 },
    state:     { kind: 'h', title: 'Net Sales by state', items: toItems(byState) },
    dealers:   { kind: 'h', title: 'Top 10 dealers', items: dealers.slice(0, 10).map((d) => ({ label: d.dealer, value: d.value })) },
    outDealer: { kind: 'h', title: 'Top 10 dealers by outstanding', items: toItems(byOutDealer), color: ORANGE },
    products:  { kind: 'h', title: 'Top 10 products', items: getTopProducts(rows, 10).map((x) => ({ label: x.product, value: x.amount })) },
    officers:  { kind: 'h', title: 'Top 10 sales officers (only sales that carry an officer in Tally)', items: getTopSalesOfficers(rows, 10).map((x) => ({ label: x.name, value: x.amount })) },
  };
  const chartRows = {
    full:        [[C.month, C.ageing], [C.state, C.dealers], [C.products, C.officers]],
    sales:       [[C.month, C.state], [C.products, C.officers], [C.dealers]],
    dealers:     [[C.dealers, C.state]],
    outstanding: [[C.ageing, C.outDealer]],
  }[section];

  doc.addPage(); y = 18;
  y = band(doc, marginX, pageWidth, y, 'Diagrams') + 2;
  const half = (pageW - 8) / 2;
  chartRows.forEach((pair) => {
    y = room(doc, y, pair.some((c) => c.kind === 'v') ? 68 : 75);
    const bottoms = pair.map((c, k) => (c.kind === 'v'
      ? vBarChart(doc, { x: marginX + k * (half + 8), y, w: half, h: 62, title: c.title, items: c.items })
      : hBarChart(doc, { x: marginX + k * (half + 8), y, w: half, title: c.title, items: c.items, color: c.color, maxItems: c.maxItems || 10 })));
    y = Math.max(...bottoms) + 4;
  });

  // 4. Tables
  const common = tableDefaults(marginX);
  const begin = () => { doc.addPage(); y = 18; };

  const tableMonths = () => {
    y = band(doc, marginX, pageWidth, y, 'Month-wise sales');
    autoTable(doc, {
      ...common, startY: y,
      head: [['Month', R('Sales invoices'), R('Sales (excl. GST)'), R('Credit notes'), R('Net Sales')]],
      body: [
        ...months.map((m) => [m.label, inr(m.invoices), rs(m.sales), rs(m.credits), rs(m.net)]),
        [{ content: 'Total', styles: { fontStyle: 'bold' } }, inr(months.reduce((sum, m) => sum + m.invoices, 0)), rs(months.reduce((sum, m) => sum + m.sales, 0)), rs(months.reduce((sum, m) => sum + m.credits, 0)), { content: rs(net), styles: { fontStyle: 'bold' } }],
      ],
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
    });
    y = doc.lastAutoTable.finalY + 8;
  };

  const tablePlaces = () => {
    const byPlace = new Map();
    dealers.forEach((d) => {
      const k = `${d.state}|${d.district}`;
      const pl = byPlace.get(k) || { state: d.state, district: d.district, dealers: 0, value: 0 };
      pl.dealers += 1; pl.value += d.value;
      byPlace.set(k, pl);
    });
    const places = [...byPlace.values()].sort((a, b) => b.value - a.value);
    y = room(doc, y, 30);
    y = band(doc, marginX, pageWidth, y, 'Place-wise sales (state and district of the dealer, from the pincode on its Tally ledger)');
    autoTable(doc, {
      ...common, startY: y,
      head: [['State', 'District', R('Dealers'), R('Net Sales')]],
      body: places.map((pl) => [pl.state, pl.district, inr(pl.dealers), rs(pl.value)]),
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' } },
    });
  };

  const tableDealers = () => {
    y = band(doc, marginX, pageWidth, y, `Dealers (${inr(dealers.length)})`);
    autoTable(doc, {
      ...common, startY: y,
      head: [['#', 'Dealer', 'State', 'District', 'City', 'Sales officer', R('Quantity'), R('Net Sales'), 'Last invoice']],
      body: dealers.map((d, k) => [k + 1, d.dealer, d.state, d.district, d.city, d.officer || '-', qty(d.quantity), rs(d.value), fmtDate(d.lastInvoice)]),
      columnStyles: { 0: { cellWidth: 9 }, 6: { halign: 'right' }, 7: { halign: 'right' } },
    });
  };

  const tableOutstandingByDealer = () => {
    const m = new Map();
    bills.forEach((b) => {
      const e = m.get(b.dealer) || { dealer: b.dealer, bills: 0, amount: 0, overdue: 0, maxDays: 0, state: b.state, district: b.district };
      e.bills += 1; e.amount += b.amount;
      if ((b.overdueDays || 0) > 0) e.overdue += b.amount;
      e.maxDays = Math.max(e.maxDays, b.overdueDays || 0);
      m.set(b.dealer, e);
    });
    const list = [...m.values()].sort((a, b) => b.amount - a.amount);
    y = band(doc, marginX, pageWidth, y, `Outstanding by dealer (${inr(list.length)})`);
    autoTable(doc, {
      ...common, startY: y,
      head: [['#', 'Dealer', 'State', 'District', R('Pending bills'), R('Outstanding'), R('Of which overdue'), R('Oldest overdue (days)')]],
      body: list.map((e, k) => [k + 1, e.dealer, e.state, e.district, inr(e.bills), rs(e.amount), rs(e.overdue), inr(e.maxDays)]),
      columnStyles: { 0: { cellWidth: 9 }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' } },
    });
  };

  const tableBills = () => {
    y = band(doc, marginX, pageWidth, y, `Outstanding bills (${inr(bills.length)}) - total ${rs(outstanding)}`);
    autoTable(doc, {
      ...common, startY: y,
      head: [['Dealer', 'Bill no', 'Bill date', 'Due date', R('Overdue days'), R('Amount')]],
      body: bills.map((b) => [b.dealer, b.billNo, fmtDate(b.billDate), fmtDate(b.dueDate), b.overdueDays == null ? '-' : b.overdueDays, rs(b.amount)]),
      columnStyles: { 4: { halign: 'right' }, 5: { halign: 'right' } },
    });
  };

  const tableInvoices = () => {
    const shown = invoices.slice(0, MAX_INVOICE_ROWS);
    y = band(doc, marginX, pageWidth, y, `Invoices (${inr(invoices.length)}) - Net Sales ${rs(net)}`);
    autoTable(doc, {
      ...common, startY: y,
      head: [['Date', 'Invoice no', 'Type', 'Dealer', 'State', 'District', 'City', 'Sales officer', R('Quantity'), R('Value (excl. GST)')]],
      body: shown.map((i) => [fmtDate(i.date), i.vchNo, i.vchType, i.dealer, i.state, i.district, i.city, i.officer || '-', qty(i.quantity), rs(i.value)]),
      columnStyles: { 8: { halign: 'right' }, 9: { halign: 'right' } },
    });
    if (invoices.length > shown.length) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GREY);
      doc.text(`Showing the first ${inr(shown.length)} of ${inr(invoices.length)} invoices. Use a narrower date range or filter for the rest.`, marginX, doc.lastAutoTable.finalY + 6);
    }
  };

  if (section === 'full') {
    begin(); tableMonths(); tablePlaces();
    begin(); tableDealers();
    begin(); tableBills();
    begin(); tableInvoices();
  } else if (section === 'sales') {
    begin(); tableMonths(); tablePlaces();
    begin(); tableInvoices();
  } else if (section === 'dealers') {
    begin(); tablePlaces();
    begin(); tableDealers();
  } else {
    begin(); tableOutstandingByDealer();
    begin(); tableBills();
  }

  // Running header on every page after the first: what the report is for
  const oneLine = [
    o.yearLabel, filters.fromDate || filters.toDate ? `${filters.fromDate ? fmtDate(filters.fromDate) : '...'} to ${filters.toDate ? fmtDate(filters.toDate) : '...'}` : null,
    `State: ${chosen(filters.state)}`, `District: ${chosen(filters.district)}`, `City: ${chosen(filters.city)}`,
    `Officer: ${o.officerName || 'All'}`, `Dealer: ${filters.dealer || 'All'}`,
  ].filter(Boolean).join('  |  ');
  const total = doc.internal.getNumberOfPages();
  for (let p = 2; p <= total; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...GREY);
    doc.text(`${o.title}  -  ${oneLine}`, marginX, 9);
    doc.setDrawColor(225); doc.setLineWidth(0.2);
    doc.line(marginX, 11, pageWidth - marginX, 11);
  }
  stampFooter(doc, marginX, pageWidth);

  const slug = (s) => String(s || '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const parts = [
    { sales: 'Net-Sales-Report', dealers: 'Active-Dealers-Report', outstanding: 'Outstanding-Report', full: 'Wallnut-Sales-Report' }[section], slug(o.yearLabel), slug(filters.state), slug(filters.district), slug(filters.dealer), now.toISOString().slice(0, 10),
  ].filter(Boolean);
  return { blob: doc.output('blob'), fileName: `${parts.join('_')}.pdf` };
}
