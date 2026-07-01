const fs = require('fs');
const path = require('path');
const data = require('../backend/data.js');

// 1. Export Dealers to dealers.csv
const dealersFile = path.join(__dirname, 'dealers.csv');
let dealersCsv = 'Name,State,City\n';
data.allDealers.forEach(d => {
    const cleanName = d.name.replace(/&/g, 'and');
    dealersCsv += `${cleanName},${d.state},${d.district}\n`;
});
fs.writeFileSync(dealersFile, dealersCsv);
console.log(`Saved ${data.allDealers.length} dealers to dealers.csv`);

// 2. Export Products to products.csv
const productsFile = path.join(__dirname, 'products.csv');
let productsCsv = 'Name,UOM,Category,Rate\n';
data.inventorySummary.forEach(p => {
    const rate = Math.round(p.totalRevenue / p.totalQty) || 500;
    productsCsv += `${p.itemName},${p.unit},${p.stockCategory},${rate}\n`;
});
fs.writeFileSync(productsFile, productsCsv);
console.log(`Saved ${data.inventorySummary.length} products to products.csv`);

// 3. Export Vouchers to vouchers_to_create.csv
const vouchersFile = path.join(__dirname, 'vouchers_to_create.csv');
let vouchersCsv = 'Date,Dealer,Product,Qty,Rate,State,UOM\n';
data.salesData.forEach(v => {
    // Tally format date (YYYYMMDD). data.js uses 'YYYY-MM-DD'
    const dateStr = v.date.replace(/-/g, '');
    const cleanName = v.partyName.replace(/&/g, 'and');
    vouchersCsv += `${dateStr},${cleanName},${v.itemName},${v.quantity},${v.rate},${v.state},${v.units}\n`;
});
fs.writeFileSync(vouchersFile, vouchersCsv);
console.log(`Saved ${data.salesData.length} vouchers to vouchers_to_create.csv`);
