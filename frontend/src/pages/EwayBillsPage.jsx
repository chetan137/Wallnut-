import { useState, useEffect, useMemo } from 'react';
import { FileCheck, Truck, CheckCircle2, AlertCircle } from 'lucide-react';
import ChartCard from '../components/common/ChartCard';
import DataTable from '../components/common/DataTable';
import KPICard from '../components/cards/KPICard';
import CompanyFilterBar, { useCompanyList } from '../components/common/CompanyFilterBar';
import { SkeletonKPIRow, SkeletonTable } from '../components/common/Skeleton';
import { abbreviateCurrency, formatNumber, formatDate } from '../utils/formatters';
import './StateSalesHeadDashboard.css'; // Share layout CSS

// Sent as X-API-Key — must match VITE_API_KEY used elsewhere.
const API_KEY = import.meta.env.VITE_API_KEY || '';

/**
 * e-Way bill compliance data only exists in Postgres (tallybackend's
 * eway_bills table) — fetches independently of RoleContext's sales sync,
 * same pattern as FinancialsPage.
 * @param {string} companyId '' means "all companies combined".
 */
function useEwayBillsData(companyId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const qs = companyId ? `?companyId=${encodeURIComponent(companyId)}` : '';
    fetch(`/api/tally/eway-bills${qs}`, { headers: { 'X-API-Key': API_KEY } })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (!json.ok) {
          setError(json.message || 'e-Way bill data requires a live Postgres connection.');
          return;
        }
        setData(json.data);
      })
      .catch(() => { if (!cancelled) setError('Could not reach the backend API.'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [companyId]);

  return { data, loading, error };
}

export default function EwayBillsPage() {
  const companies = useCompanyList();
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const { data, loading, error } = useEwayBillsData(selectedCompanyId);
  const [selectedYear, setSelectedYear] = useState('All');

  const availableYears = useMemo(() => {
    if (!data) return [];
    const years = new Set(data.bills.map((b) => String(b.date).slice(0, 4)).filter((y) => y.length === 4));
    return [...years].sort((a, b) => b.localeCompare(a));
  }, [data]);

  const filteredBills = useMemo(() => {
    if (!data) return [];
    if (selectedYear === 'All') return data.bills;
    return data.bills.filter((b) => String(b.date).startsWith(selectedYear));
  }, [data, selectedYear]);

  const metrics = useMemo(() => {
    const totalCount = filteredBills.length;
    const totalInvoiceAmount = filteredBills.reduce((s, b) => s + Number(b.invoiceAmount || 0), 0);
    const withPartB = filteredBills.filter((b) => b.hasPartB).length;
    const withoutPartB = totalCount - withPartB;
    return { totalCount, totalInvoiceAmount, withPartB, withoutPartB };
  }, [filteredBills]);

  const columns = useMemo(() => [
    { header: 'Date', accessor: 'date', render: (v) => formatDate(v) },
    { header: 'Vch No', accessor: 'vchNo' },
    { header: 'Party', accessor: 'partyName' },
    { header: 'GSTIN', accessor: 'partyGstin' },
    { header: 'Invoice Amount', accessor: 'invoiceAmount', numeric: true, render: (v) => abbreviateCurrency(v) },
    { header: 'e-Way Bill No', accessor: 'ewayBillNo' },
    { header: 'Valid Upto', accessor: 'validUpto', render: (v) => (v ? formatDate(v, 'full') : '—') },
    { header: 'Transporter', accessor: 'transporterName' },
    { header: 'Vehicle No', accessor: 'vehicleNumber' },
    { header: 'Part B', accessor: 'hasPartB', render: (v) => (v ? '✅ Yes' : '⏳ Pending') },
  ], []);

  if (loading) {
    return (
      <div className="ssh-dashboard" id="eway-bills-page">
        <h2 style={{ marginBottom: 'var(--space-4)' }}>e-Way Bills</h2>
        <CompanyFilterBar companies={companies} selectedCompanyId={selectedCompanyId} onChange={setSelectedCompanyId} />
        <SkeletonKPIRow count={4} />
        <SkeletonTable />
      </div>
    );
  }

  if (error) {
    return (
      <div className="ssh-dashboard" id="eway-bills-page">
        <h2 style={{ marginBottom: 'var(--space-4)' }}>e-Way Bills</h2>
        <CompanyFilterBar companies={companies} selectedCompanyId={selectedCompanyId} onChange={setSelectedCompanyId} />
        <ChartCard title="e-Way Bills unavailable">
          <p style={{ color: 'var(--text-muted)' }}>{error}</p>
        </ChartCard>
      </div>
    );
  }

  return (
    <div className="ssh-dashboard" id="eway-bills-page">
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
        <h2 style={{ margin: 0 }}>e-Way Bills</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
            {availableYears.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      <CompanyFilterBar companies={companies} selectedCompanyId={selectedCompanyId} onChange={setSelectedCompanyId} />

      <div className="kpi-row stagger-children">
        <KPICard
          icon={FileCheck}
          label="e-Way Bills Generated"
          description="Vouchers with a real e-way bill on record for the selected period"
          value={formatNumber(metrics.totalCount)}
          color="green"
        />
        <KPICard
          icon={Truck}
          label="Total Invoice Value"
          description="Sum of invoice amounts for these e-way bills"
          value={abbreviateCurrency(metrics.totalInvoiceAmount)}
          color="blue"
        />
        <KPICard
          icon={CheckCircle2}
          label="Part B Updated"
          description="Transport details (vehicle/Part B) already added"
          value={formatNumber(metrics.withPartB)}
          color="green"
        />
        <KPICard
          icon={AlertCircle}
          label="Part B Pending"
          description="Transport details not yet added — vehicle assignment still needed"
          value={formatNumber(metrics.withoutPartB)}
          color="orange"
        />
      </div>

      <DataTable title="e-Way Bill Register" columns={columns} data={filteredBills} id="eway-bills-table" />
    </div>
  );
}
