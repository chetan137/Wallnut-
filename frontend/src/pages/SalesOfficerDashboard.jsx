import { useState, useMemo } from 'react';
import { IndianRupee, Users, ClipboardList, PlusCircle, Calendar, MessageSquare, CheckCircle, Clock } from 'lucide-react';
import KPICard from '../components/cards/KPICard';
import ChartCard from '../components/common/ChartCard';
import DataTable from '../components/common/DataTable';
import { useRole } from '../context/RoleContext';
import { abbreviateCurrency, formatNumber } from '../utils/formatters';
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
    filteredComplaints,
    addSalesEntry,
    addVisitEntry,
    addComplaintEntry,
    allDealers
  } = useRole();

  // Selected Sales Officer name
  const officerName = roleConfig.scope;

  // Find dealers assigned to this sales officer
  const myDealers = useMemo(() => {
    return allDealers
      .filter(d => d.salesOfficer === officerName)
      .map(d => d.name);
  }, [allDealers, officerName]);

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

    const months = ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06'];
    const monthLabels = {
      '2025-01': 'Jan', '2025-02': 'Feb', '2025-03': 'Mar',
      '2025-04': 'Apr', '2025-05': 'May', '2025-06': 'Jun'
    };

    return months.map(m => ({
      month: monthLabels[m] || m,
      amount: monthlySalesMap[m] || 0
    }));
  }, [data]);

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

  // Table 1: My Dealer Summary
  const dealerSummaryData = useMemo(() => {
    const dealerMetrics = {};
    // Initialize all assigned dealers
    myDealers.forEach(name => {
      dealerMetrics[name] = {
        name,
        totalSales: 0,
        lastSaleDate: '-',
        outstanding: 0,
        status: 'Active'
      };
    });

    data.forEach(r => {
      if (dealerMetrics[r.partyName]) {
        dealerMetrics[r.partyName].totalSales += r.amount;
        dealerMetrics[r.partyName].outstanding += r.finalOutstanding;
        if (dealerMetrics[r.partyName].lastSaleDate === '-' || r.date > dealerMetrics[r.partyName].lastSaleDate) {
          dealerMetrics[r.partyName].lastSaleDate = r.date;
        }
      }
    });

    // Determine status: "At Risk" if high outstanding or no sale in June 2025
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
  }, [data, myDealers]);

  // Modals Local State
  const [activeModal, setActiveModal] = useState(null); // 'sales', 'visit', 'complaint', 'followup'
  const [salesForm, setSalesForm] = useState({ dealer: '', product: '', qty: '', rate: '' });
  const [visitForm, setVisitForm] = useState({ dealer: '', purpose: '', date: '', notes: '' });
  const [complaintForm, setComplaintForm] = useState({ dealer: '', type: '', desc: '' });
  const [followupForm, setFollowupForm] = useState({ dealer: '', notes: '', nextDate: '' });

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

  const handleVisitSubmit = (e) => {
    e.preventDefault();
    if (!visitForm.dealer || !visitForm.purpose || !visitForm.date) return;

    addVisitEntry({
      dealer: visitForm.dealer,
      salesMan: officerName,
      purpose: visitForm.purpose,
      date: visitForm.date,
      notes: visitForm.notes,
    });

    setActiveModal(null);
    setVisitForm({ dealer: '', purpose: '', date: '', notes: '' });
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

  const handleFollowupSubmit = (e) => {
    e.preventDefault();
    if (!followupForm.dealer || !followupForm.notes || !followupForm.nextDate) return;

    // Followups are logged as courteous visits scheduled for nextDate
    addVisitEntry({
      dealer: followupForm.dealer,
      salesMan: officerName,
      purpose: `Follow-up: ${followupForm.notes}`,
      date: followupForm.nextDate,
    });

    setActiveModal(null);
    setFollowupForm({ dealer: '', notes: '', nextDate: '' });
  };

  // Columns for My Dealer Summary table
  const dealerColumns = [
    { header: 'Dealer Name', accessor: 'name' },
    { header: 'Total Sales', accessor: 'totalSales', render: (val) => abbreviateCurrency(val), numeric: true },
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
        <button className="action-btn sales" onClick={() => setActiveModal('sales')}>
          <PlusCircle size={15} /> Add Sales Entry
        </button>
        <button className="action-btn visit" onClick={() => setActiveModal('visit')}>
          <Calendar size={15} /> Add Visit Entry
        </button>
        <button className="action-btn complaint" onClick={() => setActiveModal('complaint')}>
          <MessageSquare size={15} /> Add Complaint
        </button>
        <button className="action-btn followup" onClick={() => setActiveModal('followup')}>
          <ClipboardList size={15} /> Follow-up Entry
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="so-kpi-row stagger-children">
        <KPICard
          icon={IndianRupee}
          label="Today's Sales"
          value={abbreviateCurrency(todaysSales)}
          color="green"
        />
        <KPICard
          icon={ClipboardList}
          label="Monthly Sales"
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
          icon={Calendar}
          label="Pending Visits"
          value={formatNumber(pendingVisitsCount)}
          color={pendingVisitsCount > 0 ? 'red' : 'green'}
        />
      </div>

      {/* Charts Layout */}
      <div className="so-charts-grid">
        <div className="so-charts-col-left">
          {/* Trend Chart */}
          <ChartCard title="My Sales Trend" subtitle="Monthly sales performance">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={salesTrendData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
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
                <BarChart data={topDealersData} layout="vertical" margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} tickFormatter={(v) => abbreviateCurrency(v)} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip formatter={(v) => abbreviateCurrency(v)} />
                  <Bar dataKey="amount" fill="var(--accent-secondary)" radius={[0, 4, 4, 0]} maxBarSize={15} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Product Mix Pie */}
            <ChartCard title="Product Mix" subtitle="Category breakdown">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={productMixData}
                    cx="50%"
                    cy="45%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="amount"
                  >
                    {productMixData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => abbreviateCurrency(v)} />
                  <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>

        {/* Right Panel: Upcoming Visits */}
        <div className="so-charts-col-right">
          <ChartCard title="Upcoming &amp; Pending Visits" subtitle="Next client touchpoints">
            <div className="visit-card-list">
              {pendingVisits.slice(0, 5).map((visit) => (
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
              ))}

              {pendingVisits.length === 0 && (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-6)' }}>
                  No pending visits scheduled.
                </div>
              )}
            </div>
          </ChartCard>
        </div>
      </div>

      {/* Bottom Table: Dealer Performance */}
      <div className="tables-section">
        <DataTable
          title="My Dealer Summary"
          subtitle="Dealers performance and outstanding collection summary"
          data={dealerSummaryData}
          columns={dealerColumns}
          searchKey="name"
          id="dealer-summary-table"
        />
      </div>

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

      {/* 2. Add Visit Entry Modal */}
      {activeModal === 'visit' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add Visit Entry</h3>
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
                <button type="submit" className="modal-btn-submit visit">Schedule Visit</button>
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

      {/* 4. Follow-up Entry Modal */}
      {activeModal === 'followup' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Record Follow-up Action</h3>
              <span className="modal-close" onClick={() => setActiveModal(null)}>&times;</span>
            </div>
            <form onSubmit={handleFollowupSubmit}>
              <div className="modal-body modal-form">
                <div className="login-field">
                  <label className="login-label">Dealer Name</label>
                  <select
                    className="login-input"
                    value={followupForm.dealer}
                    onChange={(e) => setFollowupForm(f => ({ ...f, dealer: e.target.value }))}
                    required
                  >
                    <option value="">Select Dealer...</option>
                    {myDealers.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div className="login-field">
                  <label className="login-label">Follow-up Notes / Commitments</label>
                  <textarea
                    className="login-input"
                    rows="3"
                    placeholder="What was agreed or committed? (e.g. will pay ₹50k by Friday)"
                    value={followupForm.notes}
                    onChange={(e) => setFollowupForm(f => ({ ...f, notes: e.target.value }))}
                    required
                  />
                </div>
                <div className="login-field">
                  <label className="login-label">Next Action Date</label>
                  <input
                    type="date"
                    className="login-input"
                    value={followupForm.nextDate}
                    onChange={(e) => setFollowupForm(f => ({ ...f, nextDate: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="modal-btn-cancel" onClick={() => setActiveModal(null)}>Cancel</button>
                <button type="submit" className="modal-btn-submit followup">Save Action</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
