const tallyClient = require('../backend/sync/tallyClient');

async function run() {
  try {
    const sales = await tallyClient.fetchSalesRegister();
    console.log(`fetchSalesRegister returned ${sales.length} records`);
    if (sales.length > 0) {
      console.log('First record:', JSON.stringify(sales[0], null, 2));
      console.log('Last record:', JSON.stringify(sales[sales.length - 1], null, 2));
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}

run();
