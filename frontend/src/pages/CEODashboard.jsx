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
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { abbreviateCurrency } from '../utils/formatters';
import { stateTarget } from '../data/targetData';
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

  const salesTrend = currentYearSales && prevYearSales 
    ? ((currentYearSales - prevYearSales) / prevYearSales) * 100 
    : 0;

  const scopedData = selectedYear === 'All' 
    ? allData 
    : allData.filter(d => d.date.startsWith(selectedYear));

  const totalSales = scopedData.reduce((sum, d) => sum + d.amount, 0);
  const activeDealers = new Set(scopedData.map(d => d.partyName)).size;
  const totalOutstanding = scopedData.reduce((sum, d) => sum + d.finalOutstanding, 0);

  const yearCount = selectedYear === 'All' ? (yearsWithData.length || 1) : 1;
  const targetForPeriod = (stateTarget.monthly * 12) * yearCount;
  const targetAchievement = (totalSales / targetForPeriod) * 100;

  // Group scopedData by month key "YYYY-MM" to find the latest month in current scope
  const monthsInScope = [...new Set(scopedData.map(d => d.date.slice(0, 7)).filter(m => m && m.length === 7))].sort();
  let salesTrendMonth = 0;
  
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

    salesTrendMonth = currentMonthSales && prevMonthSales
      ? ((currentMonthSales - prevMonthSales) / prevMonthSales) * 100
      : 0;
  }

  return {
    totalSales,
    activeDealers,
    totalOutstanding,
    targetAchievement: Math.min(targetAchievement, 150),
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
  const [selectedYear, setSelectedYear] = useState('2026');

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

  const statePerformanceData = useMemo(() => {
    const mpSales = metrics.totalSales;
    return [
      { name: 'Madhya Pradesh', amount: mpSales, status: 'Active' },
      { name: 'Maharashtra', amount: Math.round(mpSales * 0.75), status: 'Proposed' },
      { name: 'Gujarat', amount: Math.round(mpSales * 0.55), status: 'Proposed' },
      { name: 'Rajasthan', amount: Math.round(mpSales * 0.4), status: 'Proposed' },
    ];
  }, [metrics.totalSales]);

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
            {!availableYears.includes('2026') && <option value="2026">2026</option>}
            {!availableYears.includes('2025') && <option value="2025">2025</option>}
            {!availableYears.includes('2024') && <option value="2024">2024</option>}
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
            <ChartCard title="All-India State Performance" subtitle="Active vs Expansion Markets">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={statePerformanceData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => abbreviateCurrency(v)} />
                  <Tooltip formatter={(v) => abbreviateCurrency(v)} />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={30}>
                    {statePerformanceData.map((entry, index) => (
                      <Cell key={index} fill={entry.status === 'Active' ? 'var(--accent-primary)' : 'var(--accent-secondary)'} opacity={entry.status === 'Active' ? 1 : 0.6} />
                    ))}
                  </Bar>
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
