/**
 * generate_from_frontend.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Reads D:\Wallnut\frontend\src\data\salesData.js (ES module),
 * converts it to CommonJS-compatible form, executes it, then exports:
 *   1. dealers.csv       — unique dealers
 *   2. products.csv      — unique products
 *   3. vouchers_to_create.csv — all sales transactions
 *
 * Run from D:\Wallnut\tally-data-generator\:
 *   node generate_from_frontend.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ─── Read & eval the ES module as CommonJS ───────────────────────────────────

const srcPath = path.resolve(__dirname, '../frontend/src/data/salesData.js');
let src = fs.readFileSync(srcPath, 'utf8');

// Strip ES module export keywords so Node can eval it
src = src
  .replace(/^export\s+const\s+/gm, 'const ')   // export const → const
  .replace(/^export\s+default\s+/gm, 'const _default = ') // export default
  .replace(/^export\s+\{[^}]*\};?\s*$/gm, '');  // remove export {} blocks

// Execute in a sandboxed scope and capture the named exports
const fn = new Function('module', 'exports', src + '\n;module.exports={salesData,allSalesOfficers,allDealers,allStates,allDistricts,districtToState};');
const mod = { exports: {} };
fn(mod, mod.exports);

const { salesData, allSalesOfficers, allDealers } = mod.exports;

console.log(`✔ Loaded ${salesData.length} sales records from frontend/src/data/salesData.js`);

// ─── Helper: escape commas/quotes for CSV ────────────────────────────────────
function csvField(val) {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const OUT = __dirname;

// ─── 1. dealers.csv ──────────────────────────────────────────────────────────

const dealerMap = {};
salesData.forEach(r => {
  if (!dealerMap[r.partyName]) {
    dealerMap[r.partyName] = {
      name:         r.partyName,
      state:        r.state,
      city:         r.areaCity,
      salesOfficer: r.salesMan,
    };
  }
});

let dealersCsv = 'Name,State,City,SalesOfficer\n';
Object.values(dealerMap).forEach(d => {
  // Replace & → and for Tally XML safety
  const name = d.name.replace(/&/g, 'and');
  dealersCsv += `${csvField(name)},${csvField(d.state)},${csvField(d.city)},${csvField(d.salesOfficer)}\n`;
});

const dealersFile = path.join(OUT, 'dealers.csv');
fs.writeFileSync(dealersFile, dealersCsv, 'utf8');
console.log(`✔ dealers.csv — ${Object.keys(dealerMap).length} dealers`);

// ─── 2. products.csv ─────────────────────────────────────────────────────────

const productMap = {};
salesData.forEach(r => {
  if (!productMap[r.itemName]) {
    productMap[r.itemName] = {
      name:          r.itemName,
      uom:           r.units,
      stockGroup:    r.stockGroup,
      stockCategory: r.stockCategory,
      rate:          r.rate,
    };
  }
});

let productsCsv = 'Name,UOM,StockGroup,StockCategory,Rate\n';
Object.values(productMap).forEach(p => {
  productsCsv += `${csvField(p.name)},${csvField(p.uom)},${csvField(p.stockGroup)},${csvField(p.stockCategory)},${p.rate}\n`;
});

const productsFile = path.join(OUT, 'products.csv');
fs.writeFileSync(productsFile, productsCsv, 'utf8');
console.log(`✔ products.csv — ${Object.keys(productMap).length} products`);

// ─── 3. vouchers_to_create.csv ───────────────────────────────────────────────

// NOTE: salesData.js generates dates for Apr-Jun 2025 (financial year 2025-26).
// Wallnut3 in Tally Prime has BOOKSFROM=20260401 (FY 2026-27).
// We shift all dates by exactly +1 year so they land in the correct Tally period.
// IMPORTANT: Tally Educational Mode only allows vouchers on day 1 or 2 of each month.
// We alternate between the 1st and 2nd to spread entries naturally.
function shiftDateForTally(yyyymmdd, index) {
  if (!yyyymmdd || yyyymmdd.length < 8) return yyyymmdd;
  const year  = parseInt(yyyymmdd.slice(0, 4), 10) + 1; // 2025 → 2026
  const month = yyyymmdd.slice(4, 6);
  const day   = (index % 2 === 0) ? '01' : '02';       // alternate 1 and 2
  return `${year}${month}${day}`;
}

let vouchersCsv = 'Date,VchNo,VchType,Dealer,Product,Qty,Rate,Amount,UOM,SalesOfficer,Area,State\n';
salesData.forEach((v, idx) => {
  // YYYYMMDD format for Tally, shifted +1 year, day forced to 1 or 2
  const rawDate = (v.date || '').replace(/-/g, '');
  const dateStr = shiftDateForTally(rawDate, idx);
  const dealer  = (v.partyName || '').replace(/&/g, 'and');
  const vchType = /credit note/i.test(v.vchType) ? 'Credit Note' : 'Sales';

  vouchersCsv += [
    csvField(dateStr),
    csvField(v.vchNo),
    csvField(vchType),
    csvField(dealer),
    csvField(v.itemName),
    v.quantity,
    v.rate,
    v.amount,
    csvField(v.units),
    csvField(v.salesMan),
    csvField(v.areaCity),
    csvField(v.state),
  ].join(',') + '\n';
});

const vouchersFile = path.join(OUT, 'vouchers_to_create.csv');
fs.writeFileSync(vouchersFile, vouchersCsv, 'utf8');
console.log(`✔ vouchers_to_create.csv — ${salesData.length} vouchers`);

console.log('\n✅ All CSV files generated. Now run:');
console.log('   python create_masters.py     ← create ledgers & stock items in Tally');
console.log('   python push_vouchers.py      ← push all vouchers to Tally Wallnut3');
