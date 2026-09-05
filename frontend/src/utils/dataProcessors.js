/**
 * Wallnut — Data Processors
 * Pure functions to transform raw sales data into chart/table-ready formats.
 */

import { getMonthKey, formatMonthKey, percentChange } from './formatters';
import { districtTargets, salesOfficerTargets, stateTarget } from '../data/targetData';

/**
 * Get KPI metrics: total sales, active dealers, outstanding, target achievement.
 *
 * @param {Array}  data    - Rows for the selected period (year-scoped or all).
 * @param {Array}  allData - Full role-scoped dataset used for cross-year trend
 *                           lookups. Defaults to `data` when not supplied
 *                           (i.e. when no year filter is active).
 *
 * Trends use the calendar-correct previous month (not the second-to-last month
 * present in filtered data, which breaks when a filter skips months).
 * Returns null for a trend when no prior-period rows exist — avoids misleading
 * "+0.0%" badges that look like "no change" but actually mean "no data".
 */
export function getKPIMetrics(data, allData = data) {
  const totalSales       = data.reduce((sum, d) => sum + d.amount, 0);
  const activeDealers    = new Set(data.map(d => d.partyName)).size;
  const totalOutstanding = data.reduce((sum, d) => sum + d.finalOutstanding, 0);

  // Target achievement
  const months     = new Set(data.map(d => getMonthKey(d.date)));
  const monthCount = months.size || 1;
  const avgMonthlySales   = totalSales / monthCount;
  const targetAchievement = (avgMonthlySales / stateTarget.monthly) * 100;

  // Latest month present in selected-period data  e.g. "2026-06"
  const sortedMonths = [...months].sort();
  const currentMonth = sortedMonths[sortedMonths.length - 1] || null;

  // Calendar-correct previous month (handles Jan → Dec of prior year)
  let prevMonthKey = null;
  if (currentMonth) {
    const [cYear, cMonth] = currentMonth.split('-').map(Number);
    const pMonth = cMonth === 1 ? 12 : cMonth - 1;
    const pYear  = cMonth === 1 ? cYear - 1 : cYear;
    prevMonthKey = `${pYear}-${String(pMonth).padStart(2, '0')}`;
  }

  // Same month one year ago  e.g. "2025-06"
  const prevYearMonthKey = currentMonth
    ? `${Number(currentMonth.slice(0, 4)) - 1}-${currentMonth.slice(5, 7)}`
    : null;

  // Current + prev month rows come from scoped `data`;
  // prev-year month rows come from `allData` so they are found even when
  // `data` is year-filtered and contains no rows from the prior year.
  const rowsFromData   = (key) => key ? data.filter(d    => getMonthKey(d.date) === key) : [];
  const rowsFromAll    = (key) => key ? allData.filter(d => getMonthKey(d.date) === key) : [];

  const sumAmt = (rows) => rows.reduce((s, d) => s + d.amount, 0);
  const sumOut = (rows) => rows.reduce((s, d) => s + d.finalOutstanding, 0);
  const cntDlr = (rows) => new Set(rows.map(d => d.partyName)).size;

  const curRows  = rowsFromData(currentMonth);
  const prevRows = rowsFromData(prevMonthKey);
  const pyrRows  = rowsFromAll(prevYearMonthKey);  // ← from allData, not data

  const currentMonthSales = sumAmt(curRows);
  const prevMonthSales    = sumAmt(prevRows);

  const salesTrendMonth       = prevRows.length > 0 ? percentChange(currentMonthSales, prevMonthSales)     : null;
  const salesTrend            = pyrRows.length  > 0 ? percentChange(currentMonthSales, sumAmt(pyrRows))    : null;
  const dealersTrendMonth     = prevRows.length > 0 ? percentChange(cntDlr(curRows),   cntDlr(prevRows))   : null;
  const dealersTrend          = pyrRows.length  > 0 ? percentChange(cntDlr(curRows),   cntDlr(pyrRows))    : null;
  const outstandingTrendMonth = prevRows.length > 0 ? percentChange(sumOut(curRows),   sumOut(prevRows))   : null;
  const outstandingTrend      = pyrRows.length  > 0 ? percentChange(sumOut(curRows),   sumOut(pyrRows))    : null;

  return {
    totalSales,
    activeDealers,
    totalOutstanding,
    targetAchievement: Math.min(targetAchievement, 150),
    currentMonthSales,
    prevMonthSales,
    monthCount,
    // vs last month
    salesTrendMonth,
    dealersTrendMonth,
    outstandingTrendMonth,
    // vs last year (same calendar month)
    salesTrend,
    dealersTrend,
    outstandingTrend,
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
/**
 * Groups sales by stock category, sorted by value.
 *
 * Caps at 5 named slices + "Other" (the sum of every smaller category) —
 * real Tally data here has 13-14 distinct categories, and a donut past ~6
 * segments stops being readable: the tail collapses into slivers too thin
 * to see or color distinctly. See dataviz reference: "past ~7-8, fold the
 * tail into Other" rather than generating more colors.
 */
const MAX_STOCK_CATEGORY_SLICES = 5;

export function getStockCategoryBreakdown(data) {
  const grouped = {};

  for (const row of data) {
    const catKey = row.stockCategory;
    if (!grouped[catKey]) {
      grouped[catKey] = { name: catKey, group: row.stockGroup, amount: 0 };
    }
    grouped[catKey].amount += row.amount;
  }

  const sorted = Object.values(grouped).sort((a, b) => b.amount - a.amount);
  if (sorted.length <= MAX_STOCK_CATEGORY_SLICES + 1) return sorted;

  const top = sorted.slice(0, MAX_STOCK_CATEGORY_SLICES);
  const rest = sorted.slice(MAX_STOCK_CATEGORY_SLICES);
  const otherAmount = rest.reduce((sum, r) => sum + r.amount, 0);
  return [...top, { name: 'Other', group: 'Other', amount: otherAmount, isOther: true }];
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
