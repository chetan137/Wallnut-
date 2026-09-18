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
import DailySalesTable from '../components/tables/DailySalesTable';
import SalesCallsReportTable from '../components/tables/SalesCallsReportTable';
import LogSalesCallModal from '../components/common/LogSalesCallModal';
import { useRole } from '../context/RoleContext';
import { PhoneCall } from 'lucide-react';
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
  getDailySalesSummary,
} from '../utils/dataProcessors';
import './StateSalesHeadDashboard.css';
import './SalesOfficerDashboard.css';

export default function StateSalesHeadDashboard({ data }) {
  const { filteredComplaints, filteredVisits, selectedState } = useRole();
  const [selectedYear, setSelectedYear] = useState('All');
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);

  // Available years: always include 2026, 2025, 2024 + any additional years from data
  const availableYears = useMemo(() => {
    const years = new Set(['2026', '2025', '2024']);
    data.forEach(d => {
      const y = d.date?.slice(0, 4);
      if (y && y.length === 4) years.add(y);
    });
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
  const dailySales   = useMemo(() => getDailySalesSummary(scopedData), [scopedData]);

  return (
    <div className="ssh-dashboard" id="ssh-dashboard">
      {/* Quick Actions + Scope Bar */}
      <div className="dashboard-actions-header">
        <div className="quick-actions-bar">
          <span className="quick-actions-title">Quick Actions:</span>
          <button className="action-btn visit" onClick={() => setIsCallModalOpen(true)}>
            <PhoneCall size={15} /> Log Daily Sales Call
          </button>
        </div>
        <div className="dashboard-control-bar">
          <span className="control-bar-label">Select Year:</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="control-bar-select"
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

          {/* District Performance */}
          <div className="charts-row">
            <DistrictPerformance data={districtPerf} />
            {/* StockGroupBreakdown hidden as per requirements */}
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
        <SalesCallsReportTable visits={filteredVisits} title="State Daily Sales Calls & Visits (Google Sheet Replacement)" />
        <DailySalesTable data={dailySales} title="State Daily Sales Register (Excl. GST)" />
        <DistrictPerformanceTable data={districtPerf} />
        <DealerPerformanceTable data={dealerSummary} />
      </div>

      <LogSalesCallModal
        isOpen={isCallModalOpen}
        onClose={() => setIsCallModalOpen(false)}
        defaultState={selectedState}
      />
    </div>
  );
}
