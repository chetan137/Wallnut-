import { useMemo, useState } from 'react';
import KPIRow from '../components/cards/KPIRow';
import YearlySalesTrend from '../components/charts/YearlySalesTrend';
import IndiaMap from '../components/charts/IndiaMap';
import StockGroupBreakdown from '../components/charts/StockGroupBreakdown';
import TopProducts from '../components/charts/TopProducts';
import TopSalesOfficers from '../components/charts/TopSalesOfficers';
import AlertsPanel from '../components/panels/AlertsPanel';
import DistrictPerformanceTable from '../components/tables/DistrictPerformanceTable';
import DealerPerformanceTable from '../components/tables/DealerPerformanceTable';
import ChartCard from '../components/common/ChartCard';
import { useRole } from '../context/RoleContext';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { abbreviateCurrency } from '../utils/formatters';
import {
  getDistrictPerformance,
  getStockCategoryBreakdown,
  getTopProducts,
  getTopSalesOfficers,
  getHighOutstandingDealers,
  getDealerPerformanceSummary,
} from '../utils/dataProcessors';
import './StateSalesHeadDashboard.css'; // Share layout CSS

function getYearlyKPIMetrics(allData, selectedYear) {
  const yearsWithData = [...new Set(allData.map(d => d.date.slice(0, 4)))].sort();
  const latestYear = yearsWithData[yearsWithData.length - 1] || '2026';
  const currentYear = selectedYear === 'All' ? latestYear : selectedYear;
  const prevYear = String(Number(currentYear) - 1);

  const currentYearSales = allData
    .filter(d => d.date.startsWith(currentYear))
    .reduce((sum, d) => sum + d.amount, 0);

  const prevYearSales = allData
    .filter(d => d.date.startsWith(prevYear))
    .reduce((sum, d) => sum + d.amount, 0);

  // BUG FIX: this used to fall back to 0 whenever prevYearSales was missing,
  // which renders as "+0.0%" — indistinguishable from a real "no change"
  // reading. With real Tally data only going back a few months, that made
  // every early period look like flat/zero growth instead of "no prior
  // year to compare against yet". null lets KPICard hide the trend line
  // entirely instead of showing a misleading number.
  const salesTrend = prevYearSales > 0
    ? ((currentYearSales - prevYearSales) / prevYearSales) * 100
    : null;

  const scopedData = selectedYear === 'All' 
    ? allData 
    : allData.filter(d => d.date.startsWith(selectedYear));

  const totalSales = scopedData.reduce((sum, d) => sum + d.amount, 0);
  const activeDealers = new Set(scopedData.map(d => d.partyName)).size;
  const totalOutstanding = scopedData.reduce((sum, d) => sum + d.finalOutstanding, 0);

  // Group scopedData by month key "YYYY-MM" to find the latest month in current scope
  const monthsInScope = [...new Set(scopedData.map(d => d.date.slice(0, 7)).filter(m => m && m.length === 7))].sort();
  let salesTrendMonth = null;
  
  if (monthsInScope.length > 0) {
    const currentMonth = monthsInScope[monthsInScope.length - 1]; // e.g. "2026-06"
    
    // Parse year and month to get the calendar previous month
    const [cYear, cMonth] = currentMonth.split('-').map(Number);
    let pYear = cYear;
    let pMonth = cMonth - 1;
    if (pMonth === 0) {
      pMonth = 12;
      pYear = cYear - 1;
    }
    const prevMonthStr = `${pYear}-${String(pMonth).padStart(2, '0')}`;

    const currentMonthSales = allData
      .filter(d => d.date.startsWith(currentMonth))
      .reduce((sum, d) => sum + d.amount, 0);

    const prevMonthSales = allData
      .filter(d => d.date.startsWith(prevMonthStr))
      .reduce((sum, d) => sum + d.amount, 0);

    // Same fix as salesTrend above — null (hidden) instead of a misleading 0%.
    salesTrendMonth = prevMonthSales > 0
      ? ((currentMonthSales - prevMonthSales) / prevMonthSales) * 100
      : null;
  }

  return {
    totalSales,
    activeDealers,
    totalOutstanding,
    salesTrend,
    salesTrendMonth,
  };
}

function getYearlySalesAndOutstanding(allData) {
  const grouped = {};
  for (const row of allData) {
    const year = row.date.slice(0, 4);
    if (!grouped[year]) {
      grouped[year] = { year, sales: 0, outstanding: 0 };
    }
    grouped[year].sales += row.amount;
    grouped[year].outstanding += row.finalOutstanding;
  }
  return Object.values(grouped).sort((a, b) => a.year.localeCompare(b.year));
}

function getYearlyFallingSalesAlerts(allData, selectedYear) {
  const yearsWithData = [...new Set(allData.map(d => d.date.slice(0, 4)))].sort();
  const latestYear = yearsWithData[yearsWithData.length - 1] || '2026';
  const currentYear = selectedYear === 'All' ? latestYear : selectedYear;
  const prevYear = String(Number(currentYear) - 1);

  const currentSales = {};
  const prevSales = {};

  for (const row of allData) {
    const year = row.date.slice(0, 4);
    if (year === currentYear) {
      currentSales[row.partyName] = (currentSales[row.partyName] || 0) + row.amount;
    } else if (year === prevYear) {
      prevSales[row.partyName] = (prevSales[row.partyName] || 0) + row.amount;
    }
  }

  const alerts = [];
  for (const [dealer, prevAmt] of Object.entries(prevSales)) {
    const currAmt = currentSales[dealer] || 0;
    if (currAmt < prevAmt) {
      const change = ((currAmt - prevAmt) / prevAmt) * 100;
      alerts.push({
        dealer,
        currentSales: currAmt,
        previousSales: prevAmt,
        change: Math.round(change * 10) / 10,
      });
    }
  }

  return alerts.sort((a, b) => a.change - b.change);
}

export default function CEODashboard({ data }) {
  const { filteredComplaints } = useRole();
  // Defaults to "All" rather than a hardcoded year — real synced Tally data
  // won't necessarily fall in whatever year this was last hardcoded to
  // (e.g. real vouchers dated 2025 while this defaulted to 2026), which
  // silently zeroed every KPI card despite real data existing.
  const [selectedYear, setSelectedYear] = useState('All');

  const filteredData = useMemo(() => {
    if (selectedYear === 'All') return data;
    return data.filter(r => r.date.startsWith(selectedYear));
  }, [data, selectedYear]);

  const metrics = useMemo(() => getYearlyKPIMetrics(data, selectedYear), [data, selectedYear]);
  const districtPerf = useMemo(() => getDistrictPerformance(filteredData), [filteredData]);
  const stockBreakdown = useMemo(() => getStockCategoryBreakdown(filteredData), [filteredData]);
  const topProducts = useMemo(() => getTopProducts(filteredData, 10), [filteredData]);
  const topOfficers = useMemo(() => getTopSalesOfficers(filteredData, 9), [filteredData]);
  const fallingAlerts = useMemo(() => getYearlyFallingSalesAlerts(data, selectedYear), [data, selectedYear]);
  const highOutstanding = useMemo(() => getHighOutstandingDealers(filteredData, 8), [filteredData]);
  const dealerSummary = useMemo(() => getDealerPerformanceSummary(filteredData), [filteredData]);

  // BUG FIX: this used to take the single totalSales figure and fabricate
  // 4 fixed states from it — "Madhya Pradesh" got 100% of it, "Maharashtra"/
  // "Gujarat"/"Rajasthan" got arbitrary fractions (0.75/0.55/0.4) of the
  // SAME number, labeled 'Active'/'Proposed'. None of it was real per-state
  // data. Verified against live Tally data: Kerala is the real #1 state
  // (~5.3Cr) and doesn't appear at all in the old fake list; "Madhya
  // Pradesh" for real is ~7.6L, not the ~18Cr the fake formula produced.
  // Replaced with a real aggregation of filteredData by state, top 6 by
  // actual sales — this is a magnitude comparison, so one hue (not a fake
  // Active/Proposed distinction with no real data behind it).
  const statePerformanceData = useMemo(() => {
    const grouped = {};
    for (const row of filteredData) {
      if (!row.state) continue;
      grouped[row.state] = (grouped[row.state] || 0) + row.amount;
    }
    return Object.entries(grouped)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
  }, [filteredData]);

  const availableYears = useMemo(() => {
    const years = new Set(data.map(d => d.date.slice(0, 4)).filter(y => y && y.length === 4));
    return [...years].sort((a, b) => b.localeCompare(a));
  }, [data]);

  return (
    <div className="ssh-dashboard" id="ceo-dashboard">
      <div className="dashboard-control-bar" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 'var(--space-4)',
        padding: '10px 16px',
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: 'var(--border-radius-lg)',
      }}>
        <div className="control-bar-left">
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
            CEO VIEW SCOPE SELECTOR
          </span>
        </div>
        <div className="control-bar-right" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>Select Year:</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              background: 'var(--bg-main)',
              color: 'var(--text-main)',
              border: '1px solid var(--card-border)',
              fontFamily: 'inherit',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="All">All Years</option>
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      <KPIRow metrics={metrics} isYearly={true} showBothTrends={true} />

      <div className="charts-with-alerts">
        <div className="charts-main">
          <div className="charts-row">
            <IndiaMap data={filteredData} isNational={true} />
            <YearlySalesTrend data={data} selectedYear={selectedYear} />
          </div>

          <div className="charts-row">
            <ChartCard title="All-India State Performance" subtitle="Top states by real sales value">
              <ResponsiveContainer width="100%" height={290}>
                <BarChart data={statePerformanceData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
                  {/* interval={0} — Recharts silently drops tick labels it
                      guesses might collide (its default auto-interval);
                      with only 6 real states this always has room, but
                      auto-skip picked "Uttar Pradesh" (the longest name)
                      to drop, leaving a blank gap under a real bar.
                      Full state names ("Uttar Pradesh", "Uttarakhand", ...)
                      overlap at 0deg with 6 bars sharing this width — angled
                      + bottom-anchored labels give each name its own room. */}
                  <XAxis
                    dataKey="name"
                    interval={0}
                    angle={-35}
                    textAnchor="end"
                    height={55}
                    tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => abbreviateCurrency(v)} />
                  <Tooltip formatter={(v) => abbreviateCurrency(v)} />
                  {/* Magnitude comparison across nominal categories (states) —
                      one hue for every bar. Bar height already encodes the
                      value; a value-ramp here would double-encode it. */}
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={30} fill="var(--accent-primary)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <StockGroupBreakdown data={stockBreakdown} />
          </div>

          <div className="charts-bottom-row">
            <TopProducts data={topProducts} />
            <TopSalesOfficers data={topOfficers} />
          </div>
        </div>

        <AlertsPanel
          fallingAlerts={fallingAlerts}
          highOutstanding={highOutstanding}
          complaints={filteredComplaints}
        />
      </div>

      <div className="tables-section">
        <DistrictPerformanceTable data={districtPerf} />
        <DealerPerformanceTable data={dealerSummary} />
      </div>
    </div>
  );
}
