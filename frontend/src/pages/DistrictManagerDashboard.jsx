import { useMemo, useState } from 'react';
import KPIRow from '../components/cards/KPIRow';
import MonthlySalesTrend from '../components/charts/MonthlySalesTrend';
import StockGroupBreakdown from '../components/charts/StockGroupBreakdown';
import TopProducts from '../components/charts/TopProducts';
import TopSalesOfficers from '../components/charts/TopSalesOfficers';
import AlertsPanel from '../components/panels/AlertsPanel';
import DealerPerformanceTable from '../components/tables/DealerPerformanceTable';
import { useRole } from '../context/RoleContext';
import { Calendar } from 'lucide-react';
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
import './SalesOfficerDashboard.css';

export default function DistrictManagerDashboard({ data }) {
  const {
    filteredComplaints,
    selectedDistrict,
    allDealers,
    allSalesOfficers,
    addVisitEntry
  } = useRole();

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
  const metrics         = useMemo(() => getKPIMetrics(scopedData, data), [scopedData, data]);
  const monthlyTrend    = useMemo(() => getMonthlySalesTrend(scopedData), [scopedData]);
  const stockBreakdown  = useMemo(() => getStockCategoryBreakdown(scopedData), [scopedData]);
  const topProducts     = useMemo(() => getTopProducts(scopedData, 10), [scopedData]);
  const topOfficers     = useMemo(() => getTopSalesOfficers(scopedData, 9), [scopedData]);
  const fallingAlerts   = useMemo(() => getFallingSalesAlerts(scopedData), [scopedData]);
  const highOutstanding = useMemo(() => getHighOutstandingDealers(scopedData, 8), [scopedData]);
  const dealerSummary   = useMemo(() => getDealerPerformanceSummary(scopedData), [scopedData]);

  // Visit assignment modal states
  const [activeModal, setActiveModal] = useState(null); // null or 'visit'
  const [visitForm, setVisitForm] = useState({ dealer: '', salesMan: '', purpose: '', date: '', notes: '' });

  // Get dealers in this district
  const myDealers = useMemo(() => {
    return allDealers
      .filter(d => d.district === selectedDistrict)
      .map(d => d.name);
  }, [allDealers, selectedDistrict]);

  // Get sales officers in this district
  const mySalesOfficers = useMemo(() => {
    return allSalesOfficers
      .filter(o => o.district === selectedDistrict)
      .map(o => o.name);
  }, [allSalesOfficers, selectedDistrict]);

  const handleVisitSubmit = (e) => {
    e.preventDefault();
    if (!visitForm.dealer || !visitForm.salesMan || !visitForm.purpose || !visitForm.date) return;

    addVisitEntry({
      dealer: visitForm.dealer,
      salesMan: visitForm.salesMan,
      purpose: visitForm.purpose,
      date: visitForm.date,
      notes: visitForm.notes,
    });

    setActiveModal(null);
    setVisitForm({ dealer: '', salesMan: '', purpose: '', date: '', notes: '' });
  };

  return (
    <div className="ssh-dashboard" id="dm-dashboard">
      {/* Year Scope Selector + Quick Actions */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', alignItems: 'stretch' }}>
        <div className="quick-actions-bar" style={{ flex: 1, marginBottom: 0 }}>
          <span className="quick-actions-title">Quick Actions:</span>
          <button className="action-btn visit" onClick={() => setActiveModal('visit')}>
            <Calendar size={15} /> Add Visit Entry
          </button>
        </div>
        <div className="dashboard-control-bar" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: 'var(--border-radius-lg)',
        }}>
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

      {/* Assign Visit Modal */}
      {activeModal === 'visit' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Assign Visit to Officer</h3>
              <span className="modal-close" onClick={() => setActiveModal(null)}>&times;</span>
            </div>
            <form onSubmit={handleVisitSubmit}>
              <div className="modal-body modal-form">
                <div className="login-field">
                  <label className="login-label">Dealer / Party Name</label>
                  <select
                    className="login-input"
                    value={visitForm.dealer}
                    onChange={(e) => setVisitForm(v => ({ ...v, dealer: e.target.value }))}
                    required
                  >
                    <option value="">Select Dealer...</option>
                    {myDealers.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="login-field">
                  <label className="login-label">Assign Sales Officer</label>
                  <select
                    className="login-input"
                    value={visitForm.salesMan}
                    onChange={(e) => setVisitForm(v => ({ ...v, salesMan: e.target.value }))}
                    required
                  >
                    <option value="">Select Officer...</option>
                    {mySalesOfficers.map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>

                <div className="login-field">
                  <label className="login-label">Purpose of Visit</label>
                  <select
                    className="login-input"
                    value={visitForm.purpose}
                    onChange={(e) => setVisitForm(v => ({ ...v, purpose: e.target.value }))}
                    required
                  >
                    <option value="">Select Purpose...</option>
                    <option value="Product Demonstration & Feedback">Product Demonstration & Feedback</option>
                    <option value="Outstanding Payment Collection">Outstanding Payment Collection</option>
                    <option value="New Order Pitching">New Order Pitching</option>
                    <option value="Routine Courtesy Visit">Routine Courtesy Visit</option>
                  </select>
                </div>

                <div className="login-field">
                  <label className="login-label">Scheduled Date</label>
                  <input
                    type="date"
                    className="login-input"
                    value={visitForm.date}
                    onChange={(e) => setVisitForm(v => ({ ...v, date: e.target.value }))}
                    required
                  />
                </div>

                <div className="login-field">
                  <label className="login-label">Notes (Optional)</label>
                  <textarea
                    className="login-input"
                    rows="3"
                    placeholder="Add notes about the planned visit..."
                    value={visitForm.notes}
                    onChange={(e) => setVisitForm(v => ({ ...v, notes: e.target.value }))}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="modal-btn-cancel" onClick={() => setActiveModal(null)}>Cancel</button>
                <button type="submit" className="modal-btn-submit visit">Assign Visit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
