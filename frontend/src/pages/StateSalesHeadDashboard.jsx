import { useMemo } from 'react';
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
  const metrics = useMemo(() => getKPIMetrics(data), [data]);
  const monthlyTrend = useMemo(() => getMonthlySalesTrend(data), [data]);
  const districtPerf = useMemo(() => getDistrictPerformance(data), [data]);
  const stockBreakdown = useMemo(() => getStockCategoryBreakdown(data), [data]);
  const topProducts = useMemo(() => getTopProducts(data, 10), [data]);
  const topOfficers = useMemo(() => getTopSalesOfficers(data, 9), [data]);
  const fallingAlerts = useMemo(() => getFallingSalesAlerts(data), [data]);
  const highOutstanding = useMemo(() => getHighOutstandingDealers(data, 8), [data]);
  const dealerSummary = useMemo(() => getDealerPerformanceSummary(data), [data]);

  return (
    <div className="ssh-dashboard" id="ssh-dashboard">
      {/* KPI Cards */}
      <KPIRow metrics={metrics} />

      {/* Charts + Alerts Side Panel */}
      <div className="charts-with-alerts">
        <div className="charts-main">
          {/* Geographical Map + Monthly Trend */}
          <div className="charts-row">
            <IndiaMap data={data} isNational={false} />
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
