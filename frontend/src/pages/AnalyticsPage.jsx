import { useState, useEffect, useMemo } from 'react';
import { Trophy, Package, PackageX, Layers } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import ChartCard from '../components/common/ChartCard';
import DataTable from '../components/common/DataTable';
import KPICard from '../components/cards/KPICard';
import { abbreviateCurrency, formatNumber, formatPercent } from '../utils/formatters';
import './StateSalesHeadDashboard.css'; // Share layout CSS

// Sent as X-API-Key — must match VITE_API_KEY used by RoleContext.
const API_KEY = import.meta.env.VITE_API_KEY || '';

/**
 * Pareto/ABC/slow-moving-stock only exist as Postgres aggregations — no
 * local demo equivalent — so this page fetches independently of
 * RoleContext's sales sync and shows a clear message rather than fake
 * numbers when the backend isn't on DATA_SOURCE=db.
 */
function useAnalyticsData() {
  const [pareto, setPareto] = useState(null);
  const [abc, setAbc] = useState(null);
  const [slowMoving, setSlowMoving] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const headers = { 'X-API-Key': API_KEY };
        const [paretoRes, abcRes, slowRes] = await Promise.all([
          fetch('/api/tally/pareto', { headers }).then((r) => r.json()),
          fetch('/api/tally/abc-analysis', { headers }).then((r) => r.json()),
          fetch('/api/tally/slow-moving-stock', { headers }).then((r) => r.json()),
        ]);
        if (cancelled) return;

        if (!paretoRes.ok || !abcRes.ok || !slowRes.ok) {
          setError(paretoRes.message || abcRes.message || slowRes.message || 'Analytics require a live Postgres connection.');
          return;
        }
        setPareto(paretoRes.data);
        setAbc(abcRes.data);
        setSlowMoving(slowRes.data);
      } catch {
        if (!cancelled) setError('Could not reach the backend API.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return { pareto, abc, slowMoving, loading, error };
}

const ABC_COLOR = { A: 'var(--success, #2e7d32)', B: 'var(--warning, #f0ad4e)', C: 'var(--text-muted)' };

export default function AnalyticsPage() {
  const { pareto, abc, slowMoving, loading, error } = useAnalyticsData();

  const customerColumns = useMemo(() => [
    { header: 'Customer', accessor: 'name' },
    { header: 'Revenue', accessor: 'revenue', numeric: true, render: (v) => abbreviateCurrency(v) },
    { header: 'Cumulative %', accessor: 'cumulativePct', numeric: true, render: (v) => formatPercent(v) },
  ], []);

  const productColumns = useMemo(() => [
    { header: 'Product', accessor: 'name' },
    { header: 'Revenue', accessor: 'revenue', numeric: true, render: (v) => abbreviateCurrency(v) },
    { header: 'Cumulative %', accessor: 'cumulativePct', numeric: true, render: (v) => formatPercent(v) },
  ], []);

  const abcColumns = useMemo(() => [
    { header: 'Item', accessor: 'name' },
    { header: 'Qty Sold', accessor: 'qty', numeric: true, render: (v) => formatNumber(v) },
    { header: 'Revenue', accessor: 'revenue', numeric: true, render: (v) => abbreviateCurrency(v) },
    {
      header: 'Category', accessor: 'category',
      render: (v) => (
        <span style={{ fontWeight: 700, color: ABC_COLOR[v] }}>{v}</span>
      ),
    },
  ], []);

  const slowMovingColumns = useMemo(() => [
    { header: 'Item', accessor: 'itemName' },
    { header: 'Last Movement', accessor: 'lastMovementDate' },
    { header: 'Days Since', accessor: 'daysSinceLastMovement', numeric: true },
    { header: 'Value Moved (all-time)', accessor: 'totalValueMoved', numeric: true, render: (v) => abbreviateCurrency(v) },
    { header: 'Status', accessor: 'bucket' },
  ], []);

  if (loading) {
    return <div className="ssh-dashboard" id="analytics-page">Loading analytics…</div>;
  }

  if (error) {
    return (
      <div className="ssh-dashboard" id="analytics-page">
        <ChartCard title="Analytics unavailable">
          <p style={{ color: 'var(--text-muted)' }}>{error}</p>
        </ChartCard>
      </div>
    );
  }

  return (
    <div className="ssh-dashboard" id="analytics-page">
      <h2 style={{ marginBottom: 'var(--space-4)' }}>Sales &amp; Inventory Analytics</h2>

      {/* ── Pareto (80/20) ─────────────────────────────────────────────── */}
      <div className="kpi-row stagger-children">
        <KPICard
          icon={Trophy}
          label="Customers Driving 80% Revenue"
          value={`${pareto.topCustomerCount} of ${pareto.customers.length}`}
          color="green"
        />
        <KPICard
          icon={Trophy}
          label="Products Driving 80% Revenue"
          value={`${pareto.topProductCount} of ${pareto.products.length}`}
          color="green"
        />
        <KPICard icon={Package} label="A-Category Items" value={formatNumber(abc.counts.A)} color="green" />
        <KPICard icon={PackageX} label="Non-Moving Items (365d+)" value={formatNumber(slowMoving.summary.find((s) => s.bucket.startsWith('Non'))?.itemCount || 0)} color="red" />
      </div>

      <div className="charts-row">
        <DataTable title="Pareto — Top Customers (80/20)" columns={customerColumns} data={pareto.customers} />
        <DataTable title="Pareto — Top Products (80/20)" columns={productColumns} data={pareto.products} />
      </div>

      {/* ── ABC Analysis ───────────────────────────────────────────────── */}
      <ChartCard
        title="ABC Analysis"
        subtitle="Items classified by share of sales revenue (A = top 70%, B = next 20%, C = remaining 10%)"
        style={{ marginTop: 'var(--space-4)' }}
      >
        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', marginTop: 0 }}>
          Based on sales revenue contribution, not inventory holding value — Tally's stock sync currently only
          captures group-level rollups (Finished Goods, Raw Material, …), not individual item costs.
        </p>
        <div className="kpi-row stagger-children" style={{ marginBottom: 'var(--space-3)' }}>
          <KPICard icon={Layers} label="Category A" value={`${abc.counts.A} items`} color="green" />
          <KPICard icon={Layers} label="Category B" value={`${abc.counts.B} items`} color="orange" />
          <KPICard icon={Layers} label="Category C" value={`${abc.counts.C} items`} color="blue" />
        </div>
      </ChartCard>
      <DataTable title="ABC Item Classification" columns={abcColumns} data={abc.items} />

      {/* ── Slow-Moving / Non-Moving Stock ─────────────────────────────── */}
      <ChartCard
        title="Slow-Moving &amp; Non-Moving Stock"
        subtitle="Days since each item's last real inventory movement (sale, purchase, or stock journal)"
        style={{ marginTop: 'var(--space-4)' }}
      >
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={slowMoving.summary} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
            <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v, name) => (name === 'itemCount' ? [v, 'Items'] : [abbreviateCurrency(v), 'Value'])} />
            <Bar dataKey="itemCount" radius={[4, 4, 0, 0]} maxBarSize={60}>
              {slowMoving.summary.map((entry, i) => (
                <Cell key={i} fill={entry.bucket === 'Active' ? 'var(--accent-primary)' : entry.bucket.startsWith('Non') ? 'var(--danger)' : 'var(--warning)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <DataTable title="Item Movement Detail (oldest first)" columns={slowMovingColumns} data={slowMoving.items} />
    </div>
  );
}
