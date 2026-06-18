/**
 * Wallnut — Data Processors
 * Pure functions to transform raw sales data into chart/table-ready formats.
 */

import { getMonthKey, formatMonthKey, percentChange } from './formatters';
import { districtTargets, salesOfficerTargets, stateTarget } from '../data/targetData';

/**
 * Get KPI metrics: total sales, active dealers, outstanding, target achievement.
 */
export function getKPIMetrics(data) {
  const totalSales = data.reduce((sum, d) => sum + d.amount, 0);
  const activeDealers = new Set(data.map(d => d.partyName)).size;
  const totalOutstanding = data.reduce((sum, d) => sum + d.finalOutstanding, 0);

  // Compute target achievement based on total monthly target vs actual
  // Use average monthly sales over the data period
  const months = new Set(data.map(d => getMonthKey(d.date)));
  const monthCount = months.size || 1;
  const avgMonthlySales = totalSales / monthCount;
  const targetAchievement = (avgMonthlySales / stateTarget.monthly) * 100;

  // Get previous month sales for trend
  const sortedMonths = [...months].sort();
  const currentMonth = sortedMonths[sortedMonths.length - 1];
  const prevMonth = sortedMonths[sortedMonths.length - 2];

  const currentMonthSales = data
    .filter(d => getMonthKey(d.date) === currentMonth)
    .reduce((sum, d) => sum + d.amount, 0);

  const prevMonthSales = prevMonth
    ? data.filter(d => getMonthKey(d.date) === prevMonth).reduce((sum, d) => sum + d.amount, 0)
    : 0;

  const salesTrend = percentChange(currentMonthSales, prevMonthSales);

  return {
    totalSales,
    activeDealers,
    totalOutstanding,
    targetAchievement: Math.min(targetAchievement, 150), // cap at 150%
    salesTrend,
    currentMonthSales,
    prevMonthSales,
    monthCount,
  };
}

/**
 * Monthly sales trend for line chart.
 */
export function getMonthlySalesTrend(data) {
  const grouped = {};
  for (const row of data) {
    const key = getMonthKey(row.date);
    grouped[key] = (grouped[key] || 0) + row.amount;
  }

  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, amount]) => ({
      month: key,
      label: formatMonthKey(key),
      amount,
    }));
}

/**
 * District-wise performance for bar chart and table.
 */
export function getDistrictPerformance(data) {
  const grouped = {};

  for (const row of data) {
    if (!grouped[row.areaCity]) {
      grouped[row.areaCity] = { totalSales: 0, outstanding: 0, dealers: new Set() };
    }
    grouped[row.areaCity].totalSales += row.amount;
    grouped[row.areaCity].outstanding += row.finalOutstanding;
    grouped[row.areaCity].dealers.add(row.partyName);
  }

  // Calculate months for target percentage
  const months = new Set(data.map(d => getMonthKey(d.date)));
  const monthCount = months.size || 1;

  return Object.entries(grouped)
    .map(([district, metrics]) => {
      const target = districtTargets[district];
      const monthlyTarget = target ? target.monthly : 0;
      const avgMonthlySales = metrics.totalSales / monthCount;
      const targetPct = monthlyTarget ? (avgMonthlySales / monthlyTarget) * 100 : 0;

      return {
        district,
        totalSales: metrics.totalSales,
        outstanding: metrics.outstanding,
        dealers: metrics.dealers.size,
        targetPct: Math.round(targetPct * 10) / 10,
      };
    })
    .sort((a, b) => b.totalSales - a.totalSales);
}

/**
 * Stock group / category breakdown for donut chart.
 */
export function getStockGroupBreakdown(data) {
  const grouped = {};

  for (const row of data) {
    if (!grouped[row.stockGroup]) {
      grouped[row.stockGroup] = { total: 0, categories: {} };
    }
    grouped[row.stockGroup].total += row.amount;

    if (!grouped[row.stockGroup].categories[row.stockCategory]) {
      grouped[row.stockGroup].categories[row.stockCategory] = 0;
    }
    grouped[row.stockGroup].categories[row.stockCategory] += row.amount;
  }

  return Object.entries(grouped).map(([group, info]) => ({
    group,
    total: info.total,
    categories: Object.entries(info.categories)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount),
  }));
}

/**
 * Flattened category breakdown for the donut chart.
 */
export function getStockCategoryBreakdown(data) {
  const grouped = {};

  for (const row of data) {
    const catKey = row.stockCategory;
    if (!grouped[catKey]) {
      grouped[catKey] = { name: catKey, group: row.stockGroup, amount: 0 };
    }
    grouped[catKey].amount += row.amount;
  }

  return Object.values(grouped).sort((a, b) => b.amount - a.amount);
}

/**
 * Top products by amount.
 */
export function getTopProducts(data, limit = 10) {
  const grouped = {};

  for (const row of data) {
    grouped[row.itemName] = (grouped[row.itemName] || 0) + row.amount;
  }

  return Object.entries(grouped)
    .map(([product, amount]) => ({ product, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

/**
 * Top sales officers by amount.
 */
export function getTopSalesOfficers(data, limit = 10) {
  const grouped = {};

  for (const row of data) {
    if (!grouped[row.salesMan]) {
      grouped[row.salesMan] = { amount: 0, dealers: new Set(), district: row.areaCity };
    }
    grouped[row.salesMan].amount += row.amount;
    grouped[row.salesMan].dealers.add(row.partyName);
  }

  const months = new Set(data.map(d => getMonthKey(d.date)));
  const monthCount = months.size || 1;

  return Object.entries(grouped)
    .map(([name, info]) => {
      const monthlyTarget = salesOfficerTargets[name] || 0;
      const avgMonthlySales = info.amount / monthCount;
      const targetPct = monthlyTarget ? (avgMonthlySales / monthlyTarget) * 100 : 0;

      return {
        name,
        amount: info.amount,
        dealers: info.dealers.size,
        district: info.district,
        targetPct: Math.round(targetPct * 10) / 10,
      };
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

/**
 * Falling sales alerts: dealers whose current month amount < previous month.
 */
export function getFallingSalesAlerts(data) {
  const months = [...new Set(data.map(d => getMonthKey(d.date)))].sort();
  if (months.length < 2) return [];

  const currentMonth = months[months.length - 1];
  const prevMonth = months[months.length - 2];

  const currentSales = {};
  const prevSales = {};

  for (const row of data) {
    const mk = getMonthKey(row.date);
    if (mk === currentMonth) {
      currentSales[row.partyName] = (currentSales[row.partyName] || 0) + row.amount;
    } else if (mk === prevMonth) {
      prevSales[row.partyName] = (prevSales[row.partyName] || 0) + row.amount;
    }
  }

  const alerts = [];
  for (const [dealer, prevAmt] of Object.entries(prevSales)) {
    const currAmt = currentSales[dealer] || 0;
    if (currAmt < prevAmt) {
      const change = percentChange(currAmt, prevAmt);
      alerts.push({
        dealer,
        currentSales: currAmt,
        previousSales: prevAmt,
        change: Math.round(change * 10) / 10,
      });
    }
  }

  return alerts.sort((a, b) => a.change - b.change); // Most negative first
}

/**
 * High outstanding dealers sorted by Final O/s descending.
 */
export function getHighOutstandingDealers(data, limit = 10) {
  const grouped = {};

  for (const row of data) {
    if (!grouped[row.partyName]) {
      grouped[row.partyName] = { outstanding: 0, totalSales: 0, district: row.areaCity };
    }
    grouped[row.partyName].outstanding += row.finalOutstanding;
    grouped[row.partyName].totalSales += row.amount;
  }

  return Object.entries(grouped)
    .map(([dealer, info]) => ({
      dealer,
      outstanding: info.outstanding,
      totalSales: info.totalSales,
      outstandingRatio: info.totalSales ? (info.outstanding / info.totalSales * 100) : 0,
      district: info.district,
    }))
    .sort((a, b) => b.outstanding - a.outstanding)
    .slice(0, limit);
}

/**
 * Dealer performance summary table.
 */
export function getDealerPerformanceSummary(data) {
  const grouped = {};

  for (const row of data) {
    if (!grouped[row.partyName]) {
      grouped[row.partyName] = {
        dealer: row.partyName,
        salesMan: row.salesMan,
        district: row.areaCity,
        totalSales: 0,
        outstanding: 0,
        transactions: 0,
      };
    }
    grouped[row.partyName].totalSales += row.amount;
    grouped[row.partyName].outstanding += row.finalOutstanding;
    grouped[row.partyName].transactions += 1;
  }

  return Object.values(grouped).sort((a, b) => b.totalSales - a.totalSales);
}

/**
 * Aggregate state-level performance for the India Map.
 */
export function getStatePerformanceForMap(data) {
  const grouped = {};
  
  for (const row of data) {
    const state = row.state;
    if (!state) continue;
    if (!grouped[state]) {
      grouped[state] = {
        state,
        totalSales: 0,
        outstanding: 0,
        dealers: new Set(),
        categories: {}
      };
    }
    grouped[state].totalSales += row.amount;
    grouped[state].outstanding += row.finalOutstanding;
    grouped[state].dealers.add(row.partyName);
    grouped[state].categories[row.stockCategory] = (grouped[state].categories[row.stockCategory] || 0) + row.amount;
  }
  
  const months = new Set(data.map(d => getMonthKey(d.date)));
  const monthCount = months.size || 1;

  return Object.entries(grouped).reduce((acc, [state, info]) => {
    let topCategory = 'N/A';
    let maxCatAmt = -1;
    for (const [cat, amt] of Object.entries(info.categories)) {
      if (amt > maxCatAmt) {
        maxCatAmt = amt;
        topCategory = cat;
      }
    }
    
    const avgMonthlySales = info.totalSales / monthCount;
    let monthlyTarget = avgMonthlySales * 1.12; 
    if (state === 'Madhya Pradesh') {
      monthlyTarget = stateTarget.monthly;
    }
    const targetPct = monthlyTarget ? (avgMonthlySales / monthlyTarget) * 100 : 0;

    acc[state] = {
      state,
      totalSales: info.totalSales,
      outstanding: info.outstanding,
      dealers: info.dealers.size,
      targetPct: Math.round(targetPct * 10) / 10,
      topCategory
    };
    return acc;
  }, {});
}

/**
 * Aggregate district-level performance for a specific state map.
 */
export function getDistrictPerformanceForMap(data, stateName) {
  const filtered = data.filter(r => r.state === stateName);
  const grouped = {};
  
  for (const row of filtered) {
    const district = row.areaCity;
    if (!grouped[district]) {
      grouped[district] = {
        district,
        totalSales: 0,
        outstanding: 0,
        dealers: new Set(),
        categories: {}
      };
    }
    grouped[district].totalSales += row.amount;
    grouped[district].outstanding += row.finalOutstanding;
    grouped[district].dealers.add(row.partyName);
    grouped[district].categories[row.stockCategory] = (grouped[district].categories[row.stockCategory] || 0) + row.amount;
  }
  
  const months = new Set(data.map(d => getMonthKey(d.date)));
  const monthCount = months.size || 1;

  return Object.entries(grouped).reduce((acc, [district, info]) => {
    let topCategory = 'N/A';
    let maxCatAmt = -1;
    for (const [cat, amt] of Object.entries(info.categories)) {
      if (amt > maxCatAmt) {
        maxCatAmt = amt;
        topCategory = cat;
      }
    }
    
    const avgMonthlySales = info.totalSales / monthCount;
    const target = districtTargets[district];
    const monthlyTarget = target ? target.monthly : (avgMonthlySales * 1.15);
    const targetPct = monthlyTarget ? (avgMonthlySales / monthlyTarget) * 100 : 0;

    acc[district] = {
      district,
      totalSales: info.totalSales,
      outstanding: info.outstanding,
      dealers: info.dealers.size,
      targetPct: Math.round(targetPct * 10) / 10,
      topCategory
    };
    return acc;
  }, {});
}

