import { useState, useMemo } from 'react';
import { IndianRupee, Users, ClipboardList, PlusCircle, MessageSquare, Clock, MapPin, PhoneCall, Package } from 'lucide-react';
import KPICard from '../components/cards/KPICard';
import ChartCard from '../components/common/ChartCard';
import DataTable from '../components/common/DataTable';
import DailySalesTable from '../components/tables/DailySalesTable';
import SalesCallsReportTable from '../components/tables/SalesCallsReportTable';
import LogSalesCallModal from '../components/common/LogSalesCallModal';
import DealerProductDrilldownModal from '../components/tables/DealerProductDrilldownModal';
import { useRole } from '../context/RoleContext';
import { abbreviateCurrency, formatNumber, formatMonthKey, formatPercent } from '../utils/formatters';
import { getDailySalesSummary, getDealerPerformanceSummary } from '../utils/dataProcessors';
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import './SalesOfficerDashboard.css';

export default function SalesOfficerDashboard({ data }) {
  const {
    roleConfig,
    filteredVisits,
    addSalesEntry,
    addComplaintEntry,
  } = useRole();

  // Selected Sales Officer name
  const officerName = roleConfig.scope;

  // Find dealers assigned to this sales officer
  // Every dealer this officer has invoice lines for (the data passed in is already limited to the officer).
  const myDealers = useMemo(() => {
    return [...new Set(data.map(r => r.partyName).filter(Boolean))];
  }, [data]);

  // Determine latest transaction date in data to represent "Today" for demo purposes
  const latestDate = useMemo(() => {
    if (data.length === 0) return '2025-06-28';
    return data.reduce((max, r) => r.date > max ? r.date : max, '');
  }, [data]);

  // KPIs
  const todaysSales = useMemo(() => {
    return data
      .filter(r => r.date === latestDate)
      .reduce((sum, r) => sum + r.amount, 0);
  }, [data, latestDate]);

  const monthlyLabel = useMemo(() => (latestDate ? formatMonthKey(latestDate.slice(0, 7)) : ''), [latestDate]);

  const monthlySales = useMemo(() => {
    const monthPrefix = latestDate.slice(0, 7); // e.g. "2025-06"
    return data
      .filter(r => r.date.startsWith(monthPrefix))
      .reduce((sum, r) => sum + r.amount, 0);
  }, [data, latestDate]);

  const assignedDealersCount = myDealers.length;

  const pendingVisits = useMemo(() => {
    return filteredVisits.filter(v => v.status === 'Pending');
  }, [filteredVisits]);

  const pendingVisitsCount = pendingVisits.length;

  // Chart 1: My Sales Trend (group by Month)
  const salesTrendData = useMemo(() => {
    const monthlySalesMap = {};
    data.forEach(r => {
      const monthKey = r.date.slice(0, 7); // YYYY-MM
      monthlySalesMap[monthKey] = (monthlySalesMap[monthKey] || 0) + r.amount;
    });

    // Every month between the first and the last sale, so a month with no sales shows as 0.
    const keys = Object.keys(monthlySalesMap).sort();
    if (keys.length === 0) return [];
    const out = [];
    let [y, m] = keys[0].split('-').map(Number);
    const [ly, lm] = keys[keys.length - 1].split('-').map(Number);
    while (y < ly || (y === ly && m <= lm)) {
      const key = `${y}-${String(m).padStart(2, '0')}`;
      out.push({ month: formatMonthKey(key), amount: monthlySalesMap[key] || 0 });
      m += 1;
      if (m > 12) { m = 1; y += 1; }
    }
    return out;
  }, [data]);

  // Product-wise sales of all this officer's customers together (from the customer invoices).
  const productSalesData = useMemo(() => {
    const map = {};
    let total = 0;
    data.forEach(r => {
      const name = r.itemName || 'Other (no item on invoice)';
      if (!map[name]) map[name] = { name, quantity: 0, units: r.units || '', amount: 0, dealers: new Set() };
      map[name].quantity += Number(r.quantity) || 0;
      map[name].amount += Number(r.amount) || 0;
      if (!map[name].units && r.units) map[name].units = r.units;
      if (r.partyName) map[name].dealers.add(r.partyName);
      total += Number(r.amount) || 0;
    });
    return Object.values(map)
      .map(p => ({ name: p.name, quantity: p.quantity, units: p.units, amount: p.amount, dealers: p.dealers.size, share: total ? (p.amount / total) * 100 : 0 }))
      .sort((x, y) => y.amount - x.amount);
  }, [data]);

  const productColumns = [
    { header: 'Product', accessor: 'name' },
    { header: 'Quantity', accessor: 'quantity', numeric: true, render: (val, row) => `${formatNumber(Math.round(val))} ${row.units || ''}`.trim() },
    { header: 'Net Sales (Excl. GST)', accessor: 'amount', numeric: true, render: (val) => abbreviateCurrency(val) },
    { header: 'Dealers', accessor: 'dealers', numeric: true },
    {
      header: 'Share (%)',
      help: "This product's net sales / total net sales of all your customers x 100.",
      accessor: 'share',
      numeric: true,
      render: (val) => formatPercent(val),
    },
  ];

  // Chart 2: My Top Dealers (Amount by Party Name)
  const topDealersData = useMemo(() => {
    const dealerMap = {};
    data.forEach(r => {
      dealerMap[r.partyName] = (dealerMap[r.partyName] || 0) + r.amount;
    });

    return Object.entries(dealerMap)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [data]);

  // Chart 3: Product Mix (donut, Amount by Stock Category)
  const productMixData = useMemo(() => {
    const categoryMap = {};
    data.forEach(r => {
      categoryMap[r.stockCategory] = (categoryMap[r.stockCategory] || 0) + r.amount;
    });

    return Object.entries(categoryMap)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [data]);

  const COLORS = ['var(--accent-primary)', 'var(--accent-secondary)', 'var(--info)', 'var(--warning)', '#9b59b6', '#34495e'];

  // Table 1: My Dealer Summary with Product Drill-down support
  const dealerSummaryData = useMemo(() => {
    const fullSummary = getDealerPerformanceSummary(data);
    const summaryMap = {};
    fullSummary.forEach(d => { summaryMap[d.dealer] = d; });

    const dealerMetrics = {};
    myDealers.forEach(name => {
      const match = summaryMap[name];
      dealerMetrics[name] = {
        name,
        dealer: name,
        salesMan: officerName,
        totalSales: match ? match.totalSales : 0,
        lastSaleDate: '-',
        outstanding: match ? match.outstanding : 0,
        transactions: match ? match.transactions : 0,
        productList: match ? match.productList : [],
        pyGrowth: match ? match.pyGrowth : null,
        monthlySales: match ? match.monthlySales : {},
        status: 'Active'
      };
    });

    data.forEach(r => {
      if (dealerMetrics[r.partyName]) {
        if (dealerMetrics[r.partyName].lastSaleDate === '-' || r.date > dealerMetrics[r.partyName].lastSaleDate) {
          dealerMetrics[r.partyName].lastSaleDate = r.date;
        }
      }
    });

    return Object.values(dealerMetrics).map(d => {
      const limitDate = '2025-05-15';
      if (d.lastSaleDate !== '-' && d.lastSaleDate < limitDate) {
        d.status = 'Inactive';
      } else if (d.outstanding > 150000) {
        d.status = 'At Risk';
      } else {
        d.status = 'Active';
      }
      return d;
    }).sort((a, b) => b.totalSales - a.totalSales);
  }, [data, myDealers, officerName]);

  const dailySales = useMemo(() => getDailySalesSummary(data), [data]);

  // Today's date string for comparing visits
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Split visits: today's assigned vs upcoming
  const todaysVisits = useMemo(() => {
    return filteredVisits.filter(v => v.date === todayStr || v.date === latestDate);
  }, [filteredVisits, todayStr, latestDate]);

  const upcomingVisits = useMemo(() => {
    return filteredVisits
      .filter(v => v.status === 'Pending' && v.date !== todayStr && v.date !== latestDate)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5);
  }, [filteredVisits, todayStr, latestDate]);

  // Modals Local State
  const [activeModal, setActiveModal] = useState(null); // 'sales', 'complaint'
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [salesForm, setSalesForm] = useState({ dealer: '', product: '', qty: '', rate: '' });
  const [complaintForm, setComplaintForm] = useState({ dealer: '', type: '', desc: '' });

  // Standard Product List for selection
  const standardProducts = [
    { name: 'Wallnut Tile Adhesive 20Kg', rate: 450, unit: 'Bags', group: 'Finished Goods', category: 'Finished Goods Adhesives' },
    { name: 'Wallnut Wall Putty 40Kg', rate: 680, unit: 'Bags', group: 'Finished Goods', category: 'Finished Goods Putty' },
    { name: 'Wallnut Waterproof Coat 20L', rate: 3200, unit: 'Buckets', group: 'Finished Goods', category: 'Finished Goods Waterproofing' },
    { name: 'Wallnut Epoxy Grout 1Kg', rate: 890, unit: 'Pcs', group: 'Finished Goods', category: 'Finished Goods Adhesives' },
  ];

  const handleProductChange = (prodName) => {
    const prod = standardProducts.find(p => p.name === prodName);
    if (prod) {
      setSalesForm(prev => ({ ...prev, product: prodName, rate: prod.rate }));
    }
  };

  const handleSalesSubmit = (e) => {
    e.preventDefault();
    if (!salesForm.dealer || !salesForm.product || !salesForm.qty || !salesForm.rate) return;

    const selectedProduct = standardProducts.find(p => p.name === salesForm.product);

    addSalesEntry({
      date: new Date().toISOString().split('T')[0],
      partyName: salesForm.dealer,
      itemName: salesForm.product,
      quantity: Number(salesForm.qty),
      units: selectedProduct?.unit || 'Bags',
      rate: Number(salesForm.rate),
      salesMan: officerName,
      areaCity: data[0]?.areaCity || 'Indore',
      stockGroup: selectedProduct?.group || 'Finished Goods',
      stockCategory: selectedProduct?.category || 'Finished Goods Adhesives',
    });

    setActiveModal(null);
    setSalesForm({ dealer: '', product: '', qty: '', rate: '' });
  };

  const handleComplaintSubmit = (e) => {
    e.preventDefault();
    if (!complaintForm.dealer || !complaintForm.type || !complaintForm.desc) return;

    addComplaintEntry({
      dealer: complaintForm.dealer,
      district: data[0]?.areaCity || 'Indore',
      date: new Date().toISOString().split('T')[0],
      type: complaintForm.type,
      description: complaintForm.desc,
    });

    setActiveModal(null);
    setComplaintForm({ dealer: '', type: '', desc: '' });
  };



  const [selectedDealerForDrilldown, setSelectedDealerForDrilldown] = useState(null);

  // Columns for My Dealer Summary table
  const dealerColumns = [
    {
      header: 'Dealer Name',
      accessor: 'name',
      render: (val, row) => (
        <button
          onClick={() => setSelectedDealerForDrilldown(row)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: 'var(--accent-primary)',
            fontWeight: 600,
            cursor: 'pointer',
            textAlign: 'left',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
          title="Click to view product drill-down"
        >
          <span>{val}</span>
          <Package size={13} style={{ opacity: 0.7 }} />
        </button>
      ),
    },
    { header: 'Total Sales (Excl. GST)', accessor: 'totalSales', render: (val) => abbreviateCurrency(val), numeric: true },
    { header: 'Last Sale Date', accessor: 'lastSaleDate', numeric: true },
    { header: 'Outstanding', accessor: 'outstanding', render: (val) => abbreviateCurrency(val), numeric: true },
    {
      header: 'Status',
      accessor: 'status',
      render: (val) => (
        <span className={`visit-card-badge ${val.toLowerCase().replace(/\s+/g, '-')}`}>
          {val}
        </span>
      ),
    },
  ];

  return (
    <div className="so-dashboard" id="so-dashboard">
      {/* Quick Actions Bar */}
      <div className="quick-actions-bar">
        <span className="quick-actions-title">Quick Actions:</span>
        <button className="action-btn visit" onClick={() => setIsCallModalOpen(true)}>
          <PhoneCall size={15} /> Log Daily Sales Call
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="so-kpi-row stagger-children">
        <KPICard
          icon={IndianRupee}
          label="Today's Sales (Excl. GST)"
          value={abbreviateCurrency(todaysSales)}
          color="green"
        />
        <KPICard
          icon={ClipboardList}
          label={`Sales in ${monthlyLabel} (Excl. GST)`}
          value={abbreviateCurrency(monthlySales)}
          color="blue"
        />
        <KPICard
          icon={Users}
          label="Assigned Dealers"
          value={formatNumber(assignedDealersCount)}
          color="orange"
        />
        <KPICard
          icon={MapPin}
          label="Assigned Visits"
          value={formatNumber(pendingVisitsCount)}
          color={pendingVisitsCount > 0 ? 'orange' : 'green'}
        />
      </div>

      {/* Charts Layout */}
      <div className="so-charts-grid">
        <div className="so-charts-col-left">
          {/* Trend Chart */}
          <ChartCard title="My Sales Trend" subtitle="Monthly sales performance">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={salesTrendData} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
                <XAxis dataKey="month" interval={salesTrendData.length > 12 ? Math.ceil(salesTrendData.length / 8) - 1 : 0} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => abbreviateCurrency(v)} />
                <Tooltip formatter={(v) => abbreviateCurrency(v)} />
                <Line type="monotone" dataKey="amount" stroke="var(--accent-primary)" strokeWidth={3} activeDot={{ r: 6 }} dot={{ strokeWidth: 2, r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="so-charts-row-inner">
            {/* Top Dealers Bar */}
            <ChartCard title="My Top Dealers" subtitle="Top 5 by sales volume">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={topDealersData} layout="vertical" margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} tickFormatter={(v) => abbreviateCurrency(v)} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} width={85} />
                  <Tooltip formatter={(v) => abbreviateCurrency(v)} />
                  <Bar dataKey="amount" fill="var(--accent-secondary)" radius={[0, 4, 4, 0]} maxBarSize={15} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Product Mix Category breakdown hidden as per requirements */}
          </div>
        </div>

        {/* Right Panel: Assigned Visits */}
        <div className="so-charts-col-right">
          {/* Today's Assigned Tasks */}
          <ChartCard title="Today's Assigned Tasks" subtitle={`Visits assigned to you for ${todayStr}`}>
            <div className="visit-card-list">
              {todaysVisits.length > 0 ? todaysVisits.map((visit) => (
                <div key={visit.id} className="visit-card today-task">
                  <div className="visit-card-header">
                    <span className="visit-card-dealer">{visit.dealer}</span>
                    <span className="visit-card-badge today">Today</span>
                  </div>
                  <div className="visit-card-purpose">
                    <MapPin size={11} style={{ marginRight: 4, verticalAlign: 'middle', color: 'var(--accent-primary)' }} />
                    {visit.purpose}
                  </div>
                  {visit.notes && (
                    <div className="visit-card-notes">{visit.notes}</div>
                  )}
                  <div className="visit-card-date">
                    <Clock size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    {visit.date}
                  </div>
                </div>
              )) : (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-4)' }}>
                  ✓ No visits scheduled for today.
                </div>
              )}
            </div>
          </ChartCard>

          {/* Upcoming Assigned Visits */}
          <ChartCard title="Upcoming Visits" subtitle="Next scheduled dealer visits" style={{ marginTop: 'var(--space-4)' }}>
            <div className="visit-card-list">
              {upcomingVisits.length > 0 ? upcomingVisits.map((visit) => (
                <div key={visit.id} className="visit-card">
                  <div className="visit-card-header">
                    <span className="visit-card-dealer">{visit.dealer}</span>
                    <span className="visit-card-badge pending">Pending</span>
                  </div>
                  <div className="visit-card-purpose">{visit.purpose}</div>
                  <div className="visit-card-date">
                    <Clock size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    {visit.date}
                  </div>
                </div>
              )) : (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-4)' }}>
                  No upcoming visits scheduled.
                </div>
              )}
            </div>
          </ChartCard>
        </div>
      </div>

      {/* Bottom Table: Dealer Performance */}
      <div className="tables-section">
        <SalesCallsReportTable visits={filteredVisits} title="My Daily Sales Calls & Visits (Google Sheet Replacement)" />
        <DailySalesTable data={dailySales} title="My Daily Sales Register (Excl. GST)" />
        <DataTable
          title="My Dealer Summary"
          subtitle="Dealers performance and outstanding collection summary"
          data={dealerSummaryData}
          columns={dealerColumns}
          searchKey="name"
          id="dealer-summary-table"
        />
        <DataTable
          title="My Product-wise Sales (all my customers)"
          subtitle="Net sales of every product across all your customers, from the customer invoices (Excl. GST). Click a dealer above for one customer's products."
          data={productSalesData}
          columns={productColumns}
          id="officer-product-sales-table"
        />
      </div>

      <LogSalesCallModal
        isOpen={isCallModalOpen}
        onClose={() => setIsCallModalOpen(false)}
        defaultOfficer={officerName}
      />

      <DealerProductDrilldownModal
        isOpen={Boolean(selectedDealerForDrilldown)}
        onClose={() => setSelectedDealerForDrilldown(null)}
        dealer={selectedDealerForDrilldown}
      />

      {/* ================= MODALS ================= */}

      {/* 1. Add Sales Entry Modal */}
      {activeModal === 'sales' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add Sales Entry</h3>
              <span className="modal-close" onClick={() => setActiveModal(null)}>&times;</span>
            </div>
            <form onSubmit={handleSalesSubmit}>
              <div className="modal-body modal-form">
                <div className="login-field">
                  <label className="login-label">Dealer / Party Name</label>
                  <select
                    className="login-input"
                    value={salesForm.dealer}
                    onChange={(e) => setSalesForm(s => ({ ...s, dealer: e.target.value }))}
                    required
                  >
                    <option value="">Select Dealer...</option>
                    {myDealers.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div className="login-field">
                  <label className="login-label">Product Name</label>
                  <select
                    className="login-input"
                    value={salesForm.product}
                    onChange={(e) => handleProductChange(e.target.value)}
                    required
                  >
                    <option value="">Select Product...</option>
                    {standardProducts.map(p => (
                      <option key={p.name} value={p.name}>{p.name} (₹{p.rate})</option>
                    ))}
                  </select>
                </div>
                <div className="login-field">
                  <label className="login-label">Quantity</label>
                  <input
                    type="number"
                    className="login-input"
                    placeholder="Enter quantity"
                    min="1"
                    value={salesForm.qty}
                    onChange={(e) => setSalesForm(s => ({ ...s, qty: e.target.value }))}
                    required
                  />
                </div>
                <div className="login-field">
                  <label className="login-label">Rate (₹)</label>
                  <input
                    type="number"
                    className="login-input"
                    placeholder="Rate per unit"
                    value={salesForm.rate}
                    onChange={(e) => setSalesForm(s => ({ ...s, rate: e.target.value }))}
                    required
                  />
                </div>
                {salesForm.qty && salesForm.rate && (
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', textAlign: 'right' }}>
                    Calculated Total: <strong>₹{Number(salesForm.qty) * Number(salesForm.rate)}</strong>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="modal-btn-cancel" onClick={() => setActiveModal(null)}>Cancel</button>
                <button type="submit" className="modal-btn-submit sales">Submit Sales Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* 3. Add Complaint Modal */}
      {activeModal === 'complaint' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Log Customer Complaint</h3>
              <span className="modal-close" onClick={() => setActiveModal(null)}>&times;</span>
            </div>
            <form onSubmit={handleComplaintSubmit}>
              <div className="modal-body modal-form">
                <div className="login-field">
                  <label className="login-label">Dealer / Party Name</label>
                  <select
                    className="login-input"
                    value={complaintForm.dealer}
                    onChange={(e) => setComplaintForm(c => ({ ...c, dealer: e.target.value }))}
                    required
                  >
                    <option value="">Select Dealer...</option>
                    {myDealers.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div className="login-field">
                  <label className="login-label">Complaint Type</label>
                  <select
                    className="login-input"
                    value={complaintForm.type}
                    onChange={(e) => setComplaintForm(c => ({ ...c, type: e.target.value }))}
                    required
                  >
                    <option value="">Select Type...</option>
                    <option value="Quality">Product Quality Issue</option>
                    <option value="Delivery">Delivery / Shortage</option>
                    <option value="Billing">Billing / Rates Error</option>
                    <option value="Other">Other Issues</option>
                  </select>
                </div>
                <div className="login-field">
                  <label className="login-label">Description</label>
                  <textarea
                    className="login-input"
                    rows="4"
                    placeholder="Provide details about the issue reported by the dealer..."
                    value={complaintForm.desc}
                    onChange={(e) => setComplaintForm(c => ({ ...c, desc: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="modal-btn-cancel" onClick={() => setActiveModal(null)}>Cancel</button>
                <button type="submit" className="modal-btn-submit complaint">Submit Complaint</button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
}
