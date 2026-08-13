import { useState, useEffect, useMemo } from 'react';
import { Wallet, Landmark, TrendingUp, TrendingDown, FileText, AlertTriangle } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import ChartCard from '../components/common/ChartCard';
import DataTable from '../components/common/DataTable';
import KPICard from '../components/cards/KPICard';
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
function useFinancialsData() {
  const [payables, setPayables] = useState(null);
  const [cashFlow, setCashFlow] = useState(null);
  const [financials, setFinancials] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const headers = { 'X-API-Key': API_KEY };
        const [payablesRes, cashFlowRes, financialsRes] = await Promise.all([
          fetch('/api/tally/payables', { headers }).then((r) => r.json()),
          fetch('/api/tally/cashflow', { headers }).then((r) => r.json()),
          fetch('/api/tally/financials', { headers }).then((r) => r.json()),
        ]);
        if (cancelled) return;

        if (!payablesRes.ok || !cashFlowRes.ok || !financialsRes.ok) {
          setError(
            payablesRes.message || cashFlowRes.message || financialsRes.message ||
            'Financial data requires a live Postgres connection.'
          );
          return;
        }
        setPayables(payablesRes.data);
        setCashFlow(cashFlowRes.data);
        setFinancials(financialsRes.data);
      } catch {
        if (!cancelled) setError('Could not reach the backend API.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return { payables, cashFlow, financials, loading, error };
}

const AGING_ORDER = ['Not Due', '1-30 days', '31-60 days', '61-90 days', '90+ days'];

export default function FinancialsPage() {
  const { payables, cashFlow, financials, loading, error } = useFinancialsData();

  const agingChartData = useMemo(() => {
    if (!payables) return [];
    return [...payables.aging].sort((a, b) => AGING_ORDER.indexOf(a.bucket) - AGING_ORDER.indexOf(b.bucket));
  }, [payables]);

  const vendorColumns = useMemo(() => [
    { header: 'Vendor', accessor: 'partyName' },
    { header: 'Amount Payable', accessor: 'amountPayable', numeric: true, render: (v) => abbreviateCurrency(v) },
  ], []);

  if (loading) {
    return <div className="ssh-dashboard" id="financials-page">Loading financial data…</div>;
  }

  if (error) {
    return (
      <div className="ssh-dashboard" id="financials-page">
        <ChartCard title="Financial Overview unavailable">
          <p style={{ color: 'var(--text-muted)' }}>{error}</p>
        </ChartCard>
      </div>
    );
  }

  return (
    <div className="ssh-dashboard" id="financials-page">
      <h2 style={{ marginBottom: 'var(--space-4)' }}>Financial Overview</h2>

      <div className="kpi-row stagger-children">
        <KPICard icon={Wallet} label="Total Payable" value={abbreviateCurrency(payables.totalPayable)} color="orange" />
        <KPICard icon={Landmark} label="Vendors Owed" value={formatNumber(payables.totalVendors)} color="blue" />
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

      <div className="charts-row">
        <ChartCard title="Payables Aging" subtitle="Bills payable, grouped by how overdue">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={agingChartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
              <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => abbreviateCurrency(v)} />
              <Tooltip formatter={(v) => abbreviateCurrency(v)} />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {agingChartData.map((entry, i) => (
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

      {financials.companies.map((c) => (
        <ChartCard
          key={c.companyId}
          title={`${c.companyName} — Financial Summary`}
          subtitle={`Period: ${formatDate(c.periodFrom)} to ${formatDate(c.periodTo)}`}
          style={{ marginTop: 'var(--space-4)' }}
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
