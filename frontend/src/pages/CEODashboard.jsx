import { useEffect, useMemo, useState } from 'react';
import KPIRow from '../components/cards/KPIRow';
import YearlySalesTrend from '../components/charts/YearlySalesTrend';
import IndiaMap from '../components/charts/IndiaMap';
import StockGroupBreakdown from '../components/charts/StockGroupBreakdown';
import TopProducts from '../components/charts/TopProducts';
import TopSalesOfficers from '../components/charts/TopSalesOfficers';
import DistrictPerformance from '../components/charts/DistrictPerformance';
import AlertsPanel from '../components/panels/AlertsPanel';
import DistrictPerformanceTable from '../components/tables/DistrictPerformanceTable';
import DealerPerformanceTable from '../components/tables/DealerPerformanceTable';
import DailySalesTable from '../components/tables/DailySalesTable';
import NonSalesInvoicesTable from '../components/tables/NonSalesInvoicesTable';
import SalesReconciliationTable from '../components/tables/SalesReconciliationTable';
import CalculationNotes from '../components/panels/CalculationNotes';
import CeoFilterBar from '../components/filters/CeoFilterBar';
import DrillDownDrawer from '../components/panels/DrillDownDrawer';
import SalesCallsReportTable from '../components/tables/SalesCallsReportTable';
import ChartCard from '../components/common/ChartCard';
import TabBar from '../components/common/TabBar';
import { useRole } from '../context/RoleContext';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { abbreviateCurrency } from '../utils/formatters';
import { STATES_WITH_DISTRICT_MAP } from '../utils/districtNames';
import { fiscalYearOfDate, previousFiscalYear, fiscalYearOptions } from '../utils/fiscalYear';
import { EMPTY_CEO_FILTERS, buildDealerIndex, applyCeoFilters } from '../utils/ceoFilters';
import {
  getDistrictPerformance,
  getStockCategoryBreakdown,
  getTopProducts,
  getTopSalesOfficers,
  getHighOutstandingDealers,
  getDealerPerformanceSummary,
  getDailySalesSummary,
  getCityPerformance,
} from '../utils/dataProcessors';
import './StateSalesHeadDashboard.css'; // Share layout CSS

// BUG FIX: trend calcs used to fall back to 0 whenever the prior period had
// no sales, which renders as "+0.0%" — indistinguishable from a real "no
// change" reading. With real Tally data only going back a few months, that
// made every early period look like flat/zero growth instead of "no prior
// period to compare against yet". null lets KPICard hide the trend line
// entirely instead of showing a misleading number.
function pctChange(current, prev) {
  return prev > 0 ? ((current - prev) / prev) * 100 : null;
}

// What each CEO card means, in plain words (see CalculationNotes for the full explanation).
const KPI_DESCRIPTIONS = {
  sales: "Same as Tally's Sales: after discount, without GST. Credit notes are subtracted. Branch Transfer and Sample are not included.",
  dealers: 'Customers with a sales invoice or credit note in this period. Branch Transfer and Sample are not counted.',
  outstanding: "Money customers still have to pay (Tally's pending bills) for invoices of this period. Very old bills are not included yet.",
};

const aggSales = (rows) => rows.reduce((sum, d) => sum + d.amount, 0);
const aggDealers = (rows) => new Set(rows.map(d => d.partyName)).size;
const aggOutstanding = (rows) => rows.reduce((sum, d) => sum + d.finalOutstanding, 0);

function getYearlyKPIMetrics(allData, selectedYear) {
  // `selectedYear` is a Financial Year label ("25-26", Apr-Mar) or 'All'.
  const yearsWithData = [...new Set(allData.map(d => fiscalYearOfDate(d.date)).filter(Boolean))].sort();
  const latestYear = yearsWithData[yearsWithData.length - 1] || '26-27';
  const currentYear = selectedYear === 'All' ? latestYear : selectedYear;
  const prevYear = previousFiscalYear(currentYear);

  // BUG FIX: a year-over-year %-change is only fair over calendar months that
  // actually appear in BOTH years (e.g. FY 26-27 so far has Apr-Sep, so it is
  // compared only with Apr-Sep of FY 25-26, not the full prior year). If
  // there's no overlap at all, there's no fair basis for a trend, so leave it
  // null (hidden) rather than show a number from mismatched data.
  const currentYearRows = allData.filter(d => fiscalYearOfDate(d.date) === currentYear);
  const currentMonthsOfYear = new Set(currentYearRows.map(d => d.date.slice(5, 7)));
  const prevYearRows = allData.filter(d => fiscalYearOfDate(d.date) === prevYear && currentMonthsOfYear.has(d.date.slice(5, 7)));

  const salesTrend = prevYearRows.length > 0 ? pctChange(aggSales(currentYearRows), aggSales(prevYearRows)) : null;
  const dealersTrend = prevYearRows.length > 0 ? pctChange(aggDealers(currentYearRows), aggDealers(prevYearRows)) : null;
  const outstandingTrend = prevYearRows.length > 0 ? pctChange(aggOutstanding(currentYearRows), aggOutstanding(prevYearRows)) : null;

  const scopedData = selectedYear === 'All'
    ? allData
    : allData.filter(d => fiscalYearOfDate(d.date) === selectedYear);

  const totalSales = aggSales(scopedData);
  const activeDealers = aggDealers(scopedData);
  const totalOutstanding = aggOutstanding(scopedData);

  // Group scopedData by month key "YYYY-MM" to find the latest month in current scope
  const monthsInScope = [...new Set(scopedData.map(d => d.date.slice(0, 7)).filter(m => m && m.length === 7))].sort();
  let salesTrendMonth = null;
  let dealersTrendMonth = null;
  let outstandingTrendMonth = null;

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

    // Same idea as the yearly fix above, one level down: the current month
    // is usually still in progress, so cap the previous month at the same
    // day-of-month instead of its full total. But verified against real
    // data this isn't enough on its own — day-to-day sales here are bursty
    // (invoices land unevenly through a month, e.g. Aug 1-5 was ~4% of
    // Aug's eventual total), so a day-cutoff comparison this early in a
    // month swings wildly in either direction and isn't a real trend yet.
    // Require at least MIN_DAYS_FOR_MONTH_TREND elapsed before trusting it.
    const MIN_DAYS_FOR_MONTH_TREND = 10;
    const currentMonthDates = allData.filter(d => d.date.startsWith(currentMonth)).map(d => d.date);
    const mtdCutoffDay = currentMonthDates.reduce((a, b) => (a > b ? a : b)).slice(8, 10);

    if (Number(mtdCutoffDay) >= MIN_DAYS_FOR_MONTH_TREND) {
      const currentMonthRows = allData.filter(d => d.date.startsWith(currentMonth) && d.date.slice(8, 10) <= mtdCutoffDay);
      const prevMonthRows = allData.filter(d => d.date.startsWith(prevMonthStr) && d.date.slice(8, 10) <= mtdCutoffDay);

      salesTrendMonth = pctChange(aggSales(currentMonthRows), aggSales(prevMonthRows));
      dealersTrendMonth = pctChange(aggDealers(currentMonthRows), aggDealers(prevMonthRows));
      outstandingTrendMonth = pctChange(aggOutstanding(currentMonthRows), aggOutstanding(prevMonthRows));
    }
  }

  return {
    totalSales,
    activeDealers,
    totalOutstanding,
    salesTrend,
    salesTrendMonth,
    dealersTrend,
    dealersTrendMonth,
    outstandingTrend,
    outstandingTrendMonth,
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
  const yearsWithData = [...new Set(allData.map(d => fiscalYearOfDate(d.date)).filter(Boolean))].sort();
  const latestYear = yearsWithData[yearsWithData.length - 1] || '26-27';
  const currentYear = selectedYear === 'All' ? latestYear : selectedYear;
  const prevYear = previousFiscalYear(currentYear);

  const currentSales = {};
  const prevSales = {};

  for (const row of allData) {
    const year = fiscalYearOfDate(row.date);
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

// views: ceo = CEO, state = State Sales Head, district = District Manager
const DASHBOARD_TABS = [
  { key: 'overview', label: 'Overview', views: ['ceo', 'state', 'district'] },
  { key: 'states', label: 'State Performance', views: ['ceo'] },
  { key: 'districtChart', label: 'District Performance', views: ['state'] },
  { key: 'products', label: 'Products & Officers', views: ['ceo', 'state', 'district'] },
  { key: 'calls', label: 'Sales Calls', views: ['ceo', 'state', 'district'] },
  { key: 'daily', label: 'Daily Sales', views: ['ceo', 'state', 'district'] },
  { key: 'districts', label: 'Districts', views: ['ceo', 'state'] },
  { key: 'cities', label: 'Cities', views: ['district'] },
  { key: 'dealers', label: 'Dealers', views: ['ceo', 'state', 'district'] },
  { key: 'breakdown', label: 'Sales Breakdown', views: ['ceo', 'state', 'district'] },
  { key: 'nonsales', label: 'Branch Transfer & Samples', views: ['ceo', 'state', 'district'] },
];

// scopeLabel / controlTitle / stateView / districtView let the State Sales Head and the District Manager
// reuse this exact dashboard on the state(s) / district the CEO assigned (the data passed in is already
// limited to them).
export default function CEODashboard({ data, scopeLabel = 'All-India', controlTitle = 'CEO VIEW SCOPE SELECTOR', stateView = false, districtView = false }) {
  const { filteredComplaints, filteredVisits, filteredNonSalesInvoices, clearFilters } = useRole();
  // Defaults to "All" rather than a hardcoded year — real synced Tally data
  // won't necessarily fall in whatever year this was last hardcoded to
  // (e.g. real vouchers dated 2025 while this defaulted to 2026), which
  // silently zeroed every KPI card despite real data existing.
  const [selectedYear, setSelectedYear] = useState('All');
  const [activeTab, setActiveTab] = useState('overview');
  const view = districtView ? 'district' : stateView ? 'state' : 'ceo';

  // The CEO page has its own filters (below). The shared filter bar is hidden for the CEO, so make
  // sure no filter chosen earlier in it is still silently applied to `data`.
  useEffect(() => { clearFilters(); }, [clearFilters]);

  // CEO filters: date range, State > District > City, Sales Officer, Dealer. Every card, chart,
  // table and click-through list below is built from `localRows`.
  const [ceoFilters, setCeoFilters] = useState({ ...EMPTY_CEO_FILTERS });
  const [drill, setDrill] = useState(null); // 'sales' | 'dealers' | 'outstanding' | null
  const dealerIndex = useMemo(() => buildDealerIndex(data), [data]);
  const localRows = useMemo(() => applyCeoFilters(data, ceoFilters, dealerIndex), [data, ceoFilters, dealerIndex]);
  const nonSalesRows = useMemo(
    () => applyCeoFilters(filteredNonSalesInvoices, ceoFilters, dealerIndex),
    [filteredNonSalesInvoices, ceoFilters, dealerIndex]
  );

  const changeYear = (year) => {
    setSelectedYear(year);
    // Dates must stay inside the Financial Year.
    setCeoFilters((prev) => ({ ...prev, fromDate: '', toDate: '' }));
  };
  const fyRange = useMemo(() => {
    if (selectedYear === 'All') return null;
    const start = 2000 + Number(selectedYear.slice(0, 2));
    return { min: `${start}-04-01`, max: `${start + 1}-03-31` };
  }, [selectedYear]);

  const filteredData = useMemo(() => {
    if (selectedYear === 'All') return localRows;
    return localRows.filter(r => fiscalYearOfDate(r.date) === selectedYear);
  }, [localRows, selectedYear]);

  const metrics = useMemo(() => getYearlyKPIMetrics(localRows, selectedYear), [localRows, selectedYear]);
  const districtPerf = useMemo(() => getDistrictPerformance(filteredData), [filteredData]);
  const stockBreakdown = useMemo(() => getStockCategoryBreakdown(filteredData), [filteredData]);
  const topProducts = useMemo(() => getTopProducts(filteredData, 10), [filteredData]);
  const topOfficers = useMemo(() => getTopSalesOfficers(filteredData, 9), [filteredData]);
  const fallingAlerts = useMemo(() => getYearlyFallingSalesAlerts(localRows, selectedYear), [localRows, selectedYear]);
  const highOutstanding = useMemo(() => getHighOutstandingDealers(filteredData, 8), [filteredData]);
  const dealerSummary = useMemo(() => getDealerPerformanceSummary(filteredData), [filteredData]);
  const dailySales = useMemo(() => getDailySalesSummary(filteredData), [filteredData]);
  const cityPerf = useMemo(() => getCityPerformance(filteredData), [filteredData]);

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

  // Financial Years (Apr-Mar): FY 25-26 and 24-25 always, plus any in the data (e.g. 26-27)
  const availableYears = useMemo(() => fiscalYearOptions(data), [data]);

  // The map follows the State filter: pick a state that has a district map and the map switches to
  // that state's districts. A scope with a single state (e.g. a State Sales Head) starts there.
  const mapState = useMemo(() => {
    if (ceoFilters.state) return STATES_WITH_DISTRICT_MAP.includes(ceoFilters.state) ? ceoFilters.state : null;
    const states = [...new Set(data.map((r) => r.state).filter(Boolean))];
    return states.length === 1 && STATES_WITH_DISTRICT_MAP.includes(states[0]) ? states[0] : null;
  }, [ceoFilters.state, data]);

  const periodLabel = useMemo(() => {
    const parts = [selectedYear === 'All' ? 'All years' : `FY ${selectedYear}`];
    if (ceoFilters.fromDate || ceoFilters.toDate) parts.push(`${ceoFilters.fromDate || '…'} to ${ceoFilters.toDate || '…'}`);
    ['state', 'district', 'city'].forEach((k) => { if (ceoFilters[k]) parts.push(ceoFilters[k]); });
    if (ceoFilters.dealer) parts.push(ceoFilters.dealer);
    return parts.join(' · ');
  }, [selectedYear, ceoFilters]);

  return (
    <div className="ssh-dashboard" id="ceo-dashboard">
      <div className="dashboard-control-bar ceo-control-bar">
        <div className="control-bar-left">
          <span className="control-bar-title">
            {controlTitle}
          </span>
        </div>
        <div className="control-bar-right">
          <span className="control-bar-label">Financial Year:</span>
          <select
            value={selectedYear}
            onChange={(e) => changeYear(e.target.value)}
            className="control-bar-select"
          >
            <option value="All">All Years</option>
            {availableYears.map(year => (
              <option key={year} value={year}>FY {year}</option>
            ))}
          </select>
        </div>
      </div>

      <CeoFilterBar filters={ceoFilters} setFilters={setCeoFilters} dealerIndex={dealerIndex} fyRange={fyRange} />

      <CalculationNotes />

      <KPIRow
        metrics={metrics}
        isYearly={true}
        showBothTrends={true}
        descriptions={KPI_DESCRIPTIONS}
        onCardClick={{
          sales: () => setDrill('sales'),
          dealers: () => setDrill('dealers'),
          outstanding: () => setDrill('outstanding'),
        }}
      />

      {drill && (
        <DrillDownDrawer
          key={drill}
          kind={drill}
          rows={filteredData}
          dealerIndex={dealerIndex}
          periodLabel={periodLabel}
          onClose={() => setDrill(null)}
        />
      )}

      <TabBar tabs={DASHBOARD_TABS.filter((t) => t.views.includes(view))} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'overview' && (
        <div className="charts-with-alerts">
          <div className="charts-main">
            <div className="charts-row">
              {mapState
                ? <IndiaMap data={filteredData} isNational={false} stateName={mapState} />
                : <IndiaMap data={filteredData} isNational={true} />}
              <YearlySalesTrend data={localRows} selectedYear={selectedYear} />
            </div>
          </div>

          <AlertsPanel
            fallingAlerts={fallingAlerts}
            highOutstanding={highOutstanding}
            complaints={filteredComplaints}
          />
        </div>
      )}

      {activeTab === 'states' && (
        <div className="charts-row">
          <ChartCard title={`${scopeLabel} State Performance`} subtitle="Top states by real sales value">
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
        </div>
      )}

      {activeTab === 'districtChart' && stateView && (
        <div className="charts-row">
          <DistrictPerformance data={districtPerf} />
        </div>
      )}

      {activeTab === 'products' && (
        <div className="charts-bottom-row">
          <TopProducts data={topProducts} />
          <TopSalesOfficers data={topOfficers} />
        </div>
      )}

      {activeTab === 'calls' && (
        <SalesCallsReportTable visits={filteredVisits} title={`${scopeLabel} Daily Sales Calls & Visits (Google Sheet Replacement)`} />
      )}
      {activeTab === 'daily' && (
        <DailySalesTable data={dailySales} title={`${scopeLabel} Daily Sales Register (Excl. GST)`} />
      )}
      {activeTab === 'districts' && <DistrictPerformanceTable data={districtPerf} />}
      {activeTab === 'cities' && (
        <DistrictPerformanceTable data={cityPerf} title={`${scopeLabel} City Performance`} label="City" accessor="city" showTarget={false} />
      )}
      {activeTab === 'dealers' && <DealerPerformanceTable data={dealerSummary} />}
      {activeTab === 'breakdown' && (
        <SalesReconciliationTable salesRows={filteredData} selectedYear={selectedYear} title={`${scopeLabel} Sales Breakdown (compare with Tally)`} />
      )}
      {activeTab === 'nonsales' && (
        <NonSalesInvoicesTable selectedYear={selectedYear} rows={nonSalesRows} title={`${scopeLabel} Branch Transfer & Sample Invoices`} />
      )}
    </div>
  );
}
