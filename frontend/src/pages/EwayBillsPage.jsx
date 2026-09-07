import { useState, useEffect, useMemo, useCallback } from 'react';
import { FileCheck, FileSignature, Truck, CheckCircle2, Clock, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ChartCard from '../components/common/ChartCard';
import DataTable from '../components/common/DataTable';
import KPICard from '../components/cards/KPICard';
import CompanyFilterBar, { useCompanyList } from '../components/common/CompanyFilterBar';
import { SkeletonKPIRow, SkeletonTable } from '../components/common/Skeleton';
import { abbreviateCurrency, formatNumber, formatDate } from '../utils/formatters';
import './StateSalesHeadDashboard.css'; // Share layout CSS
import './EwayBillsPage.css';

// Sent as X-API-Key — must match VITE_API_KEY used elsewhere.
const API_KEY = import.meta.env.VITE_API_KEY || '';

/** Small colored pill for table cells — success (green) / warning (amber) / muted (plain "—"). */
function StatusBadge({ variant, icon: Icon, children }) {
  if (variant === 'muted') return <span className="status-badge muted">{children}</span>;
  return (
    <span className={`status-badge ${variant}`}>
      {Icon && <Icon size={11} />}
      {children}
    </span>
  );
}

/**
 * e-Way bill VALIDUPTO/e-invoice ack times are precise to the minute, not
 * just the day — a validity deadline of "6-Sept-2026" alone hides whether
 * that's 12:01am or 11:59pm. formatDate() only shows the date.
 */
function formatDateTime(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

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
    const totalInvoiceAmount = filteredBills.reduce((s, b) => s + Number(b.invoiceAmount || 0), 0);
    const withEwayBill = filteredBills.filter((b) => b.ewayBillNo).length;
    const withEInvoice = filteredBills.filter((b) => b.irn).length;
    const withPartB = filteredBills.filter((b) => b.hasPartB).length;
    // "Pending" only makes sense for vouchers that actually have an e-way
    // bill — a voucher with only an e-invoice (no e-way bill at all) was
    // never going to have Part B/transport details in the first place.
    const withoutPartB = withEwayBill - withPartB;
    return { totalInvoiceAmount, withEwayBill, withEInvoice, withPartB, withoutPartB };
  }, [filteredBills]);

  const selectedCompanyName = useMemo(() => {
    if (!selectedCompanyId) return 'All Companies (combined)';
    return companies.find((c) => String(c.id) === String(selectedCompanyId))?.name || 'Selected Company';
  }, [companies, selectedCompanyId]);

  // Builds the PDF from whatever is CURRENTLY on screen — filteredBills is
  // the same real, live data the table renders (already scoped by the
  // company/year filters above), never a separate/demo dataset.
  const handleDownloadPdf = useCallback(() => {
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(14);
    doc.text('e-Way Bills & e-Invoice Register', 14, 15);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Company: ${selectedCompanyName}  |  Year: ${selectedYear}  |  Generated: ${formatDateTime(new Date().toISOString())}`, 14, 21);

    doc.setFontSize(10);
    doc.setTextColor(0);
    const summaryLines = [
      `e-Way Bills Generated: ${formatNumber(metrics.withEwayBill)}`,
      `e-Invoices Generated: ${formatNumber(metrics.withEInvoice)}`,
      `Total Invoice Value: ${abbreviateCurrency(metrics.totalInvoiceAmount)}`,
      `Part B Updated: ${formatNumber(metrics.withPartB)}`,
      `Part B Pending: ${formatNumber(metrics.withoutPartB)}`,
    ];
    doc.text(summaryLines.join('   |   '), 14, 28);

    autoTable(doc, {
      startY: 34,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [61, 168, 85] },
      head: [[
        'Date', 'Vch No', 'Party', 'GSTIN', 'Invoice Amount',
        'e-Invoice', 'e-Way Bill No', 'Valid Upto', 'Transporter', 'Vehicle No', 'Part B',
      ]],
      body: filteredBills.map((b) => [
        formatDate(b.date),
        b.vchNo,
        b.partyName,
        b.partyGstin,
        abbreviateCurrency(b.invoiceAmount),
        b.irn ? 'Generated' : '—',
        b.ewayBillNo || '—',
        b.validUpto ? formatDateTime(b.validUpto) : '—',
        b.transporterName || '—',
        b.vehicleNumber || '—',
        b.ewayBillNo ? (b.hasPartB ? 'Yes' : 'Pending') : '—',
      ]),
    });

    const yearSuffix = selectedYear === 'All' ? 'all-years' : selectedYear;
    const companySuffix = selectedCompanyId ? `company-${selectedCompanyId}` : 'all-companies';
    doc.save(`eway-bills-${companySuffix}-${yearSuffix}.pdf`);
  }, [filteredBills, metrics, selectedCompanyName, selectedCompanyId, selectedYear]);

  const columns = useMemo(() => [
    { header: 'Date', accessor: 'date', render: (v) => formatDate(v) },
    { header: 'Vch No', accessor: 'vchNo' },
    { header: 'Party', accessor: 'partyName' },
    { header: 'GSTIN', accessor: 'partyGstin' },
    { header: 'Invoice Amount', accessor: 'invoiceAmount', numeric: true, render: (v) => abbreviateCurrency(v) },
    {
      header: 'e-Invoice', accessor: 'irn',
      render: (v) => (v
        ? <span className="eway-bills-hint-text" title={`IRN: ${v}`}><StatusBadge variant="success" icon={CheckCircle2}>Generated</StatusBadge></span>
        : <StatusBadge variant="muted">—</StatusBadge>),
    },
    { header: 'e-Way Bill No', accessor: 'ewayBillNo', render: (v) => v || <StatusBadge variant="muted">—</StatusBadge> },
    { header: 'Valid Upto', accessor: 'validUpto', render: (v) => (v ? formatDateTime(v) : <StatusBadge variant="muted">—</StatusBadge>) },
    { header: 'Transporter', accessor: 'transporterName', render: (v) => v || <StatusBadge variant="muted">—</StatusBadge> },
    { header: 'Vehicle No', accessor: 'vehicleNumber', render: (v) => v || <StatusBadge variant="muted">—</StatusBadge> },
    {
      header: 'Part B', accessor: 'hasPartB',
      render: (v, row) => {
        if (!row.ewayBillNo) return <StatusBadge variant="muted">—</StatusBadge>;
        return v
          ? <StatusBadge variant="success" icon={CheckCircle2}>Yes</StatusBadge>
          : <StatusBadge variant="warning" icon={Clock}>Pending</StatusBadge>;
      },
    },
  ], []);

  if (loading) {
    return (
      <div className="ssh-dashboard" id="eway-bills-page">
        <h2 style={{ marginBottom: 'var(--space-4)' }}>e-Way Bills &amp; e-Invoice</h2>
        <CompanyFilterBar companies={companies} selectedCompanyId={selectedCompanyId} onChange={setSelectedCompanyId} />
        <SkeletonKPIRow count={5} />
        <SkeletonTable />
      </div>
    );
  }

  if (error) {
    return (
      <div className="ssh-dashboard" id="eway-bills-page">
        <h2 style={{ marginBottom: 'var(--space-4)' }}>e-Way Bills &amp; e-Invoice</h2>
        <CompanyFilterBar companies={companies} selectedCompanyId={selectedCompanyId} onChange={setSelectedCompanyId} />
        <ChartCard title="e-Way Bills unavailable">
          <p style={{ color: 'var(--text-muted)' }}>{error}</p>
        </ChartCard>
      </div>
    );
  }

  return (
    <div className="ssh-dashboard" id="eway-bills-page">
      <div className="eway-bills-control-bar">
        <h2 style={{ margin: 0 }}>e-Way Bills &amp; e-Invoice</h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="eway-bills-year-select">
            <label htmlFor="eway-bills-year">Select Year:</label>
            <select id="eway-bills-year" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
              <option value="All">All Years</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <button
            className="header-sync-btn"
            onClick={handleDownloadPdf}
            disabled={filteredBills.length === 0}
            title={filteredBills.length === 0 ? 'No rows to export' : 'Download this register as a PDF'}
          >
            <Download size={14} />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      <CompanyFilterBar companies={companies} selectedCompanyId={selectedCompanyId} onChange={setSelectedCompanyId} />

      <div className="kpi-row stagger-children">
        <KPICard
          icon={Truck}
          label="e-Way Bills Generated"
          description="Vouchers with a real e-way bill on record for the selected period"
          value={formatNumber(metrics.withEwayBill)}
          color="green"
        />
        <KPICard
          icon={FileSignature}
          label="e-Invoices Generated"
          description="Vouchers with a real e-invoice (IRN) on record — includes local sales with no e-way bill"
          value={formatNumber(metrics.withEInvoice)}
          color="blue"
        />
        <KPICard
          icon={FileCheck}
          label="Total Invoice Value"
          description="Sum of invoice amounts across these vouchers"
          value={abbreviateCurrency(metrics.totalInvoiceAmount)}
          color="blue"
        />
        <KPICard
          icon={CheckCircle2}
          label="Part B Updated"
          description="e-Way bills with transport details (vehicle/Part B) already added"
          value={formatNumber(metrics.withPartB)}
          color="green"
        />
        <KPICard
          icon={Clock}
          label="Part B Pending"
          description="e-Way bills still missing transport details — vehicle assignment needed"
          value={formatNumber(metrics.withoutPartB)}
          color="orange"
        />
      </div>

      <DataTable title="e-Way Bill / e-Invoice Register" columns={columns} data={filteredBills} id="eway-bills-table" />
    </div>
  );
}
