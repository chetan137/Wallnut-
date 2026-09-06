import { useState, useEffect, useMemo } from 'react';
import { Wallet, Landmark, TrendingUp, TrendingDown, FileText, AlertTriangle } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import ChartCard from '../components/common/ChartCard';
import DataTable from '../components/common/DataTable';
import KPICard from '../components/cards/KPICard';
import TabBar from '../components/common/TabBar';
import { SkeletonKPIRow, SkeletonChartCard, SkeletonTable } from '../components/common/Skeleton';
import { abbreviateCurrency, formatNumber, formatDate } from '../utils/formatters';
import './StateSalesHeadDashboard.css'; // Share layout CSS

// Sent as X-API-Key — must match VITE_API_KEY used by RoleContext.
const API_KEY = import.meta.env.VITE_API_KEY || '';

/**
 * Payables/cash-flow/P&L/balance-sheet only exist in Postgres — there's no
 * local demo equivalent (data.js never modeled them), so this page fetches
 * independently of RoleContext's sales sync and shows a clear message
 * rather than fake numbers when the backend isn't on DATA_SOURCE=db.
 */
/**
 * @param {string} companyId '' means "all companies" (the historical
 * default) — Payables/Receivables are party-name totals summed across
 * every synced company when no companyId is given, e.g. one dealer's real
 * outstanding can span both an old and a current company. Passing a
 * specific companyId scopes every fetch to just that one.
 */
function useFinancialsData(companyId) {
  const [payables, setPayables] = useState(null);
  const [receivables, setReceivables] = useState(null);
  const [cashFlow, setCashFlow] = useState(null);
  const [financials, setFinancials] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const headers = { 'X-API-Key': API_KEY };
        const qs = companyId ? `?companyId=${encodeURIComponent(companyId)}` : '';
        const [payablesRes, receivablesRes, cashFlowRes, financialsRes] = await Promise.all([
          fetch(`/api/tally/payables${qs}`, { headers }).then((r) => r.json()),
          fetch(`/api/tally/receivables-aging${qs}`, { headers }).then((r) => r.json()),
          fetch(`/api/tally/cashflow${qs}`, { headers }).then((r) => r.json()),
          fetch(`/api/tally/financials${qs}`, { headers }).then((r) => r.json()),
        ]);
        if (cancelled) return;

        if (!payablesRes.ok || !receivablesRes.ok || !cashFlowRes.ok || !financialsRes.ok) {
          setError(
            payablesRes.message || receivablesRes.message || cashFlowRes.message || financialsRes.message ||
            'Financial data requires a live Postgres connection.'
          );
          return;
        }
        setPayables(payablesRes.data);
        setReceivables(receivablesRes.data);
        setCashFlow(cashFlowRes.data);
        setFinancials(financialsRes.data);
      } catch {
        if (!cancelled) setError('Could not reach the backend API.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [companyId]);

  return { payables, receivables, cashFlow, financials, loading, error };
}

/** '' = All Companies (combined) — matches the default backend behavior. */
function useCompanyList() {
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/tally/companies', { headers: { 'X-API-Key': API_KEY } })
      .then((r) => r.json())
      .then((json) => { if (!cancelled && json.ok) setCompanies(json.data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return companies;
}

const AGING_ORDER = ['Not Due', '1-30 days', '31-60 days', '61-90 days', '90+ days'];

const FINANCIALS_TABS = [
  { key: 'payables', label: 'Payables' },
  { key: 'receivables', label: 'Receivables' },
  { key: 'plbs', label: 'P&L / Balance Sheet' },
];

/**
 * Payables/Receivables totals combine every synced company by default (one
 * dealer's outstanding can span an old and a current company) — this lets
 * whoever's looking at the page narrow to a single company to match what
 * they see when they open that one company in Tally directly.
 */
function CompanyFilterBar({ companies, selectedCompanyId, onChange }) {
  return (
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
        COMPANY
      </span>
      <select
        value={selectedCompanyId}
        onChange={(e) => onChange(e.target.value)}
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
        <option value="">All Companies (combined)</option>
        {companies.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
    </div>
  );
}

export default function FinancialsPage() {
  const companies = useCompanyList();
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const { payables, receivables, cashFlow, financials, loading, error } = useFinancialsData(selectedCompanyId);
  const [activeTab, setActiveTab] = useState('payables');

  const payablesAgingData = useMemo(() => {
    if (!payables) return [];
    return [...payables.aging].sort((a, b) => AGING_ORDER.indexOf(a.bucket) - AGING_ORDER.indexOf(b.bucket));
  }, [payables]);

  const receivablesAgingData = useMemo(() => {
    if (!receivables) return [];
    return [...receivables.aging].sort((a, b) => AGING_ORDER.indexOf(a.bucket) - AGING_ORDER.indexOf(b.bucket));
  }, [receivables]);

  const vendorColumns = useMemo(() => [
    { header: 'Vendor', accessor: 'partyName' },
    { header: 'Amount Payable', accessor: 'amountPayable', numeric: true, render: (v) => abbreviateCurrency(v) },
  ], []);

  const customerColumns = useMemo(() => [
    { header: 'Customer', accessor: 'partyName' },
    { header: 'Bills', accessor: 'billCount', numeric: true },
    { header: 'Amount Receivable', accessor: 'amountReceivable', numeric: true, render: (v) => abbreviateCurrency(v) },
  ], []);

  if (loading) {
    return (
      <div className="ssh-dashboard" id="financials-page">
        <h2 style={{ marginBottom: 'var(--space-4)' }}>Financial Overview</h2>
        <CompanyFilterBar companies={companies} selectedCompanyId={selectedCompanyId} onChange={setSelectedCompanyId} />
        <SkeletonKPIRow count={4} />
        <div className="charts-row" style={{ marginTop: 'var(--space-4)' }}>
          <SkeletonChartCard />
          <SkeletonTable />
        </div>
        <div className="charts-row" style={{ marginTop: 'var(--space-4)' }}>
          <SkeletonChartCard />
          <SkeletonTable />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ssh-dashboard" id="financials-page">
        <h2 style={{ marginBottom: 'var(--space-4)' }}>Financial Overview</h2>
        <CompanyFilterBar companies={companies} selectedCompanyId={selectedCompanyId} onChange={setSelectedCompanyId} />
        <ChartCard title="Financial Overview unavailable">
          <p style={{ color: 'var(--text-muted)' }}>{error}</p>
        </ChartCard>
      </div>
    );
  }

  return (
    <div className="ssh-dashboard" id="financials-page">
      <h2 style={{ marginBottom: 'var(--space-4)' }}>Financial Overview</h2>
      <CompanyFilterBar companies={companies} selectedCompanyId={selectedCompanyId} onChange={setSelectedCompanyId} />

      <div className="kpi-row stagger-children">
        <KPICard icon={Wallet} label="Total Payable" value={abbreviateCurrency(payables.totalPayable)} color="orange" />
        <KPICard icon={Landmark} label="Total Receivable" value={abbreviateCurrency(receivables.totalReceivable)} color="blue" />
        {cashFlow.companies.map((c) => (
          <KPICard
            key={c.companyId}
            icon={c.netCashFlow >= 0 ? TrendingUp : TrendingDown}
            label={`Net Cash Flow — ${c.companyName}`}
            value={abbreviateCurrency(c.netCashFlow)}
            color={c.netCashFlow >= 0 ? 'green' : 'red'}
          />
        ))}
      </div>

      <TabBar tabs={FINANCIALS_TABS} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'payables' && (
        <div className="charts-row">
          <ChartCard title="Payables Aging" subtitle="Bills payable, grouped by how overdue">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={payablesAgingData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
                <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => abbreviateCurrency(v)} />
                <Tooltip formatter={(v) => abbreviateCurrency(v)} />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {payablesAgingData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.bucket === 'Not Due' ? 'var(--accent-primary)' : entry.bucket === '90+ days' ? 'var(--danger)' : 'var(--accent-secondary)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <DataTable title="Top Vendors (Payables)" columns={vendorColumns} data={payables.payables} />
        </div>
      )}

      {activeTab === 'receivables' && (
        <div className="charts-row">
          <ChartCard title="Debtors Aging" subtitle="Bills receivable, grouped by how overdue">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={receivablesAgingData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
                <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => abbreviateCurrency(v)} />
                <Tooltip formatter={(v) => abbreviateCurrency(v)} />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {receivablesAgingData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.bucket === 'Not Due' ? 'var(--accent-primary)' : entry.bucket === '90+ days' ? 'var(--danger)' : 'var(--accent-secondary)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <DataTable title="Top Customers (Receivables)" columns={customerColumns} data={receivables.customers} />
        </div>
      )}

      {activeTab === 'plbs' && financials.companies.map((c) => (
        <ChartCard
          key={c.companyId}
          title={`${c.companyName} — Financial Summary`}
          subtitle={`Period: ${formatDate(c.periodFrom)} to ${formatDate(c.periodTo)}`}
          style={{ marginBottom: 'var(--space-4)' }}
        >
          <div className="kpi-row stagger-children" style={{ marginBottom: 'var(--space-3)' }}>
            <KPICard icon={TrendingUp} label="Revenue" value={abbreviateCurrency(c.pl.revenue)} color="green" />
            <KPICard icon={TrendingDown} label="Cost of Sales" value={abbreviateCurrency(Math.abs(c.pl.costOfSales))} color="red" />
            <KPICard icon={FileText} label="Gross Profit" value={abbreviateCurrency(c.pl.grossProfit)} color={c.pl.grossProfit >= 0 ? 'green' : 'red'} />
            <KPICard icon={AlertTriangle} label="Net Profit" value={abbreviateCurrency(c.pl.netProfit)} color={c.pl.netProfit >= 0 ? 'green' : 'red'} />
          </div>
          <div className="kpi-row stagger-children">
            <KPICard icon={Landmark} label="Current Assets" value={abbreviateCurrency(c.balanceSheet.currentAssets)} color="blue" />
            <KPICard icon={Landmark} label="Current Liabilities" value={abbreviateCurrency(c.balanceSheet.currentLiabilities)} color="orange" />
            <KPICard icon={Landmark} label="Fixed Assets" value={abbreviateCurrency(c.balanceSheet.fixedAssets)} color="blue" />
            <KPICard icon={Wallet} label="Loans + Capital" value={abbreviateCurrency(c.balanceSheet.loans + c.balanceSheet.capitalAccount)} color="orange" />
          </div>
        </ChartCard>
      ))}
    </div>
  );
}
