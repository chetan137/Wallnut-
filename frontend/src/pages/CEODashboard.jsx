import { useMemo } from 'react';
import KPIRow from '../components/cards/KPIRow';
import MonthlySalesTrend from '../components/charts/MonthlySalesTrend';
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
import './StateSalesHeadDashboard.css'; // Share layout CSS

export default function CEODashboard({ data }) {
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

  // CEO Specific: State Performance (using real MP data and dummy other states for visual completeness)
  const statePerformanceData = useMemo(() => {
    const mpSales = metrics.totalSales;
    return [
      { name: 'Madhya Pradesh', amount: mpSales, status: 'Active' },
      { name: 'Maharashtra', amount: Math.round(mpSales * 0.75), status: 'Proposed' },
      { name: 'Gujarat', amount: Math.round(mpSales * 0.55), status: 'Proposed' },
      { name: 'Rajasthan', amount: Math.round(mpSales * 0.4), status: 'Proposed' },
    ];
  }, [metrics.totalSales]);

  return (
    <div className="ssh-dashboard" id="ceo-dashboard">
      {/* KPI Cards */}
      <KPIRow metrics={metrics} />

      {/* Charts + Alerts Side Panel */}
      <div className="charts-with-alerts">
        <div className="charts-main">
          {/* Geographical Map + Monthly Trend */}
          <div className="charts-row">
            <IndiaMap data={data} isNational={true} />
            <MonthlySalesTrend data={monthlyTrend} />
          </div>


          {/* CEO State Performance & Stock Breakdown */}
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
