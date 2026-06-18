import { useMemo } from 'react';
import KPIRow from '../components/cards/KPIRow';
import MonthlySalesTrend from '../components/charts/MonthlySalesTrend';
import StockGroupBreakdown from '../components/charts/StockGroupBreakdown';
import TopProducts from '../components/charts/TopProducts';
import TopSalesOfficers from '../components/charts/TopSalesOfficers';
import AlertsPanel from '../components/panels/AlertsPanel';
import DealerPerformanceTable from '../components/tables/DealerPerformanceTable';
import { useRole } from '../context/RoleContext';
import {
  getKPIMetrics,
  getMonthlySalesTrend,
  getStockCategoryBreakdown,
  getTopProducts,
  getTopSalesOfficers,
  getFallingSalesAlerts,
  getHighOutstandingDealers,
  getDealerPerformanceSummary,
} from '../utils/dataProcessors';
import './StateSalesHeadDashboard.css';

export default function DistrictManagerDashboard({ data }) {
  const { filteredComplaints } = useRole();
  const metrics = useMemo(() => getKPIMetrics(data), [data]);
  const monthlyTrend = useMemo(() => getMonthlySalesTrend(data), [data]);
  const stockBreakdown = useMemo(() => getStockCategoryBreakdown(data), [data]);
  const topProducts = useMemo(() => getTopProducts(data, 10), [data]);
  const topOfficers = useMemo(() => getTopSalesOfficers(data, 9), [data]);
  const fallingAlerts = useMemo(() => getFallingSalesAlerts(data), [data]);
  const highOutstanding = useMemo(() => getHighOutstandingDealers(data, 8), [data]);
  const dealerSummary = useMemo(() => getDealerPerformanceSummary(data), [data]);

  return (
    <div className="ssh-dashboard" id="dm-dashboard">
      {/* KPI Cards */}
      <KPIRow metrics={metrics} />

      {/* Charts + Alerts Side Panel */}
      <div className="charts-with-alerts">
        <div className="charts-main">
          <MonthlySalesTrend data={monthlyTrend} />

          <div className="charts-row">
            {/* Sales Officer Performance bar within this district */}
            <TopSalesOfficers data={topOfficers} />
            <StockGroupBreakdown data={stockBreakdown} />
          </div>

          <div className="charts-bottom-row">
            <TopProducts data={topProducts} />
          </div>
        </div>

        <AlertsPanel
          fallingAlerts={fallingAlerts}
          highOutstanding={highOutstanding}
          complaints={filteredComplaints}
        />
      </div>

      {/* Dealer Performance Ranking Table */}
      <div className="tables-section">
        <DealerPerformanceTable data={dealerSummary} />
      </div>
    </div>
  );
}
