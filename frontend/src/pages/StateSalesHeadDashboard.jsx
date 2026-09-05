import { useMemo, useState } from 'react';
import KPIRow from '../components/cards/KPIRow';
import MonthlySalesTrend from '../components/charts/MonthlySalesTrend';
import IndiaMap from '../components/charts/IndiaMap';
import DistrictPerformance from '../components/charts/DistrictPerformance';
import StockGroupBreakdown from '../components/charts/StockGroupBreakdown';
import TopProducts from '../components/charts/TopProducts';
import TopSalesOfficers from '../components/charts/TopSalesOfficers';
import AlertsPanel from '../components/panels/AlertsPanel';
import DistrictPerformanceTable from '../components/tables/DistrictPerformanceTable';
import DealerPerformanceTable from '../components/tables/DealerPerformanceTable';
import { useRole } from '../context/RoleContext';
import {
  getKPIMetrics,
  getMonthlySalesTrend,
  getDistrictPerformance,
  getStockCategoryBreakdown,
  getTopProducts,
  getTopSalesOfficers,
  getFallingSalesAlerts,
  getHighOutstandingDealers,
  getDealerPerformanceSummary,
} from '../utils/dataProcessors';
import './StateSalesHeadDashboard.css';

export default function StateSalesHeadDashboard({ data }) {
  const { filteredComplaints } = useRole();
  const [selectedYear, setSelectedYear] = useState('All');

  // Available years derived from data
  const availableYears = useMemo(() => {
    const years = new Set(data.map(d => d.date?.slice(0, 4)).filter(y => y && y.length === 4));
    return [...years].sort((a, b) => b.localeCompare(a));
  }, [data]);

  // Year-scoped data for charts + KPI totals
  const scopedData = useMemo(() => {
    if (selectedYear === 'All') return data;
    return data.filter(r => r.date?.startsWith(selectedYear));
  }, [data, selectedYear]);

  // KPI metrics: scoped data for totals, full data for cross-year trend lookups
  const metrics      = useMemo(() => getKPIMetrics(scopedData, data), [scopedData, data]);
  const monthlyTrend = useMemo(() => getMonthlySalesTrend(scopedData), [scopedData]);
  const districtPerf = useMemo(() => getDistrictPerformance(scopedData), [scopedData]);
  const stockBreakdown = useMemo(() => getStockCategoryBreakdown(scopedData), [scopedData]);
  const topProducts  = useMemo(() => getTopProducts(scopedData, 10), [scopedData]);
  const topOfficers  = useMemo(() => getTopSalesOfficers(scopedData, 9), [scopedData]);
  const fallingAlerts = useMemo(() => getFallingSalesAlerts(scopedData), [scopedData]);
  const highOutstanding = useMemo(() => getHighOutstandingDealers(scopedData, 8), [scopedData]);
  const dealerSummary = useMemo(() => getDealerPerformanceSummary(scopedData), [scopedData]);

  return (
    <div className="ssh-dashboard" id="ssh-dashboard">
      {/* Year Scope Selector */}
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
        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
          STATE VIEW SCOPE SELECTOR
        </span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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

      {/* KPI Cards */}
      <KPIRow metrics={metrics} showBothTrends={true} />

      {/* Charts + Alerts Side Panel */}
      <div className="charts-with-alerts">
        <div className="charts-main">
          {/* Geographical Map + Monthly Trend */}
          <div className="charts-row">
            <IndiaMap data={scopedData} isNational={false} />
            <MonthlySalesTrend data={monthlyTrend} />
          </div>

          {/* District + Stock Breakdown */}
          <div className="charts-row">
            <DistrictPerformance data={districtPerf} />
            <StockGroupBreakdown data={stockBreakdown} />
          </div>

          {/* Top Products + Top Officers */}
          <div className="charts-bottom-row">
            <TopProducts data={topProducts} />
            <TopSalesOfficers data={topOfficers} />
          </div>
        </div>

        {/* Alerts Panel */}
        <AlertsPanel
          fallingAlerts={fallingAlerts}
          highOutstanding={highOutstanding}
          complaints={filteredComplaints}
        />
      </div>

      {/* Bottom Tables */}
      <div className="tables-section">
        <DistrictPerformanceTable data={districtPerf} />
        <DealerPerformanceTable data={dealerSummary} />
      </div>
    </div>
  );
}
