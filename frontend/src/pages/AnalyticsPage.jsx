import { useState, useEffect, useMemo } from 'react';
import { Trophy, Package, PackageX, Layers } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import ChartCard from '../components/common/ChartCard';
import DataTable from '../components/common/DataTable';
import KPICard from '../components/cards/KPICard';
import TabBar from '../components/common/TabBar';
import { SkeletonKPIRow, SkeletonChartCard, SkeletonTable } from '../components/common/Skeleton';
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

const ANALYTICS_TABS = [
  { key: 'pareto', label: 'Pareto (80/20)' },
  { key: 'abc', label: 'ABC Analysis' },
  { key: 'slowmoving', label: 'Slow-Moving Stock' },
];

export default function AnalyticsPage() {
  const { pareto, abc, slowMoving, loading, error } = useAnalyticsData();
  const [activeTab, setActiveTab] = useState('pareto');

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
    return (
      <div className="ssh-dashboard" id="analytics-page">
        <h2 style={{ marginBottom: 'var(--space-4)' }}>Sales &amp; Inventory Analytics</h2>
        <SkeletonKPIRow count={4} />
        <div className="charts-row" style={{ marginTop: 'var(--space-4)' }}>
          <SkeletonTable />
          <SkeletonTable />
        </div>
        <div style={{ marginTop: 'var(--space-4)' }}>
          <SkeletonChartCard />
        </div>
      </div>
    );
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
      <h2 style={{ marginBottom: 'var(--space-1)' }}>Sales &amp; Inventory Analytics</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)', marginTop: 0 }}>
        See which customers and products drive the most revenue, and which stock has been sitting idle.
      </p>

      {/* ── Pareto (80/20) ─────────────────────────────────────────────── */}
      <div className="kpi-row stagger-children">
        <KPICard
          icon={Trophy}
          label="Top Customers (80% Revenue)"
          value={`${pareto.topCustomerCount} / ${pareto.customers.length}`}
          description={`Only ${pareto.topCustomerCount} customers generate 80% of total revenue — prioritise them`}
          color="green"
        />
        <KPICard
          icon={Trophy}
          label="Top Products (80% Revenue)"
          value={`${pareto.topProductCount} / ${pareto.products.length}`}
          description={`Only ${pareto.topProductCount} products account for 80% of revenue — keep these in stock`}
          color="green"
        />
        <KPICard
          icon={Package}
          label="A-Category (Best Sellers)"
          value={formatNumber(abc.counts.A)}
          description="Top-selling items — always keep these in stock"
          color="green"
        />
        <KPICard
          icon={PackageX}
          label="Dead Stock (1+ Year)"
          value={formatNumber(slowMoving.summary.find((s) => s.bucket.startsWith('Non'))?.itemCount || 0)}
          description="No movement in 365+ days — capital is tied up, take action"
          color="red"
        />
      </div>

      <TabBar tabs={ANALYTICS_TABS} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'pareto' && (
        <div className="charts-row">
          <DataTable title="Pareto — Top Customers (80/20)" columns={customerColumns} data={pareto.customers} />
          <DataTable title="Pareto — Top Products (80/20)" columns={productColumns} data={pareto.products} />
        </div>
      )}

      {/* ── ABC Analysis ───────────────────────────────────────────────── */}
      {activeTab === 'abc' && (
        <>
          <ChartCard
            title="ABC Analysis — Item Classification"
            subtitle="How important is each item? A = best sellers (top 70% revenue), B = average movers (next 20%), C = slow movers (bottom 10%)"
          >
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', marginTop: 0 }}>
              Based on sales revenue contribution, not inventory holding value — Tally's stock sync currently only
              captures group-level rollups (Finished Goods, Raw Material, …), not individual item costs.
            </p>
            <div className="kpi-row stagger-children" style={{ marginBottom: 'var(--space-3)' }}>
              <KPICard icon={Layers} label="A — Best Sellers" value={`${abc.counts.A} items`} description="Contribute to top 70% of revenue" color="green" />
              <KPICard icon={Layers} label="B — Average Movers" value={`${abc.counts.B} items`} description="Contribute to the next 20% of revenue" color="orange" />
              <KPICard icon={Layers} label="C — Slow Movers" value={`${abc.counts.C} items`} description="Bottom 10% of revenue — review these stocks" color="blue" />
            </div>
          </ChartCard>
          <DataTable title="ABC Item Classification" columns={abcColumns} data={abc.items} />
        </>
      )}

      {/* ── Slow-Moving / Non-Moving Stock ─────────────────────────────── */}
      {activeTab === 'slowmoving' && (
        <>
          <ChartCard
            title="Slow-Moving &amp; Non-Moving Stock"
            subtitle="How long has each item been sitting? Active = healthy, Slow = needs attention, Non-Moving = urgent action required"
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
        </>
      )}
    </div>
  );
}
