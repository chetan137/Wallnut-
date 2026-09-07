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
import wallnutLogo from '../assets/logo.png';
import './StateSalesHeadDashboard.css'; // Share layout CSS
import './EwayBillsPage.css';

// Sent as X-API-Key — must match VITE_API_KEY used elsewhere.
const API_KEY = import.meta.env.VITE_API_KEY || '';

// Real dimensions of assets/logo.png (260x92) — used to size it in the PDF
// without distorting the aspect ratio.
const LOGO_ASPECT_RATIO = 260 / 92;

/** Loads an image URL into a PNG data URL jsPDF's addImage() can embed. */
function loadImageAsDataUrl(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Shared branded letterhead for every PDF this page generates — real logo,
 * real registered company name, a document-specific title/meta line on the
 * right, and a rule underneath. Returns the layout constants callers need
 * (margin, page width, and the Y just below the rule) to lay out content.
 */
function drawLetterhead(doc, logoDataUrl, title, meta) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;
  const logoWidth = 30;
  const logoHeight = logoWidth / LOGO_ASPECT_RATIO;
  const textX = marginX + (logoDataUrl ? logoWidth + 6 : 0);

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', marginX, 10, logoWidth, logoHeight);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30);
  doc.text('Wallnut Building Solutions India Pvt Ltd', textX, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text('create bonds, forever', textX, 21);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(30);
  doc.text(title, pageWidth - marginX, 16, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(meta, pageWidth - marginX, 22, { align: 'right' });

  doc.setDrawColor(61, 168, 85);
  doc.setLineWidth(0.6);
  doc.line(marginX, 27, pageWidth - marginX, 27);

  return { marginX, pageWidth, contentStartY: 34 };
}

/** Page-numbered footer, stamped on every page once the document is complete. */
function stampFooter(doc, marginX, pageWidth) {
  const totalPages = doc.internal.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(220);
    doc.setLineWidth(0.2);
    doc.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text('Wallnut Building Solutions India Pvt Ltd — Confidential', marginX, pageHeight - 7);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - marginX, pageHeight - 7, { align: 'right' });
  }
}

/** A titled key-value section (e.g. "Invoice Details") — used on the single-bill PDF. */
function drawSection(doc, marginX, pageWidth, startY, title, rows) {
  doc.setFillColor(61, 168, 85);
  doc.rect(marginX, startY, pageWidth - marginX * 2, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255);
  doc.text(title, marginX + 3, startY + 5);

  autoTable(doc, {
    startY: startY + 7,
    margin: { left: marginX, right: marginX },
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: { top: 2, bottom: 2, left: 3, right: 3 } },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [90, 90, 90], cellWidth: 45 },
      1: { textColor: [20, 20, 20] },
    },
    body: rows,
  });

  return doc.lastAutoTable.finalY + 6;
}

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
  // Custom date range — narrows further on top of the year filter (both
  // apply together when set), for "give me exactly this window" downloads
  // rather than only whole-year chunks.
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const availableYears = useMemo(() => {
    if (!data) return [];
    const years = new Set(data.bills.map((b) => String(b.date).slice(0, 4)).filter((y) => y.length === 4));
    return [...years].sort((a, b) => b.localeCompare(a));
  }, [data]);

  const filteredBills = useMemo(() => {
    if (!data) return [];
    let rows = data.bills;
    if (selectedYear !== 'All') rows = rows.filter((b) => String(b.date).startsWith(selectedYear));
    if (fromDate) rows = rows.filter((b) => String(b.date).slice(0, 10) >= fromDate);
    if (toDate) rows = rows.filter((b) => String(b.date).slice(0, 10) <= toDate);
    return rows;
  }, [data, selectedYear, fromDate, toDate]);

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

  // One readable description of whatever period filter is active, for both
  // the PDF's meta line and its filename.
  const periodLabel = useMemo(() => {
    if (fromDate || toDate) return `${fromDate || '…'} to ${toDate || '…'}`;
    return selectedYear === 'All' ? 'All Years' : selectedYear;
  }, [selectedYear, fromDate, toDate]);
  const periodSuffix = useMemo(() => {
    if (fromDate || toDate) return `${fromDate || 'start'}_to_${toDate || 'end'}`;
    return selectedYear === 'All' ? 'all-years' : selectedYear;
  }, [selectedYear, fromDate, toDate]);

  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [singleBillGeneratingId, setSingleBillGeneratingId] = useState(null);

  // Builds the PDF from whatever is CURRENTLY on screen — filteredBills is
  // the same real, live data the table renders (already scoped by the
  // company/year filters above), never a separate/demo dataset.
  const handleDownloadPdf = useCallback(async () => {
    setPdfGenerating(true);
    try {
      const logoDataUrl = await loadImageAsDataUrl(wallnutLogo).catch(() => null);
      const doc = new jsPDF({ orientation: 'landscape' });
      const { marginX, pageWidth, contentStartY } = drawLetterhead(
        doc, logoDataUrl, 'e-Way Bill / e-Invoice Register',
        `Company: ${selectedCompanyName}   |   Period: ${periodLabel}   |   Generated: ${formatDateTime(new Date().toISOString())}`
      );

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(0);
      const summaryLines = [
        `e-Way Bills Generated: ${formatNumber(metrics.withEwayBill)}`,
        `e-Invoices Generated: ${formatNumber(metrics.withEInvoice)}`,
        `Total Invoice Value: ${abbreviateCurrency(metrics.totalInvoiceAmount)}`,
        `Part B Updated: ${formatNumber(metrics.withPartB)}`,
        `Part B Pending: ${formatNumber(metrics.withoutPartB)}`,
      ];
      doc.text(summaryLines.join('    |    '), marginX, contentStartY);

      autoTable(doc, {
        startY: contentStartY + 6,
        margin: { left: marginX, right: marginX, bottom: 16 },
        styles: { fontSize: 7 },
        headStyles: { fillColor: [61, 168, 85], textColor: 255 },
        alternateRowStyles: { fillColor: [246, 248, 245] },
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

      stampFooter(doc, marginX, pageWidth);

      const companySuffix = selectedCompanyId ? `company-${selectedCompanyId}` : 'all-companies';
      doc.save(`eway-bills-${companySuffix}-${periodSuffix}.pdf`);
    } finally {
      setPdfGenerating(false);
    }
  }, [filteredBills, metrics, selectedCompanyName, selectedCompanyId, periodLabel, periodSuffix]);

  // One bill, one document — the real per-voucher data (never a mock), laid
  // out like an actual compliance record instead of a spreadsheet row:
  // Invoice Details always, then e-Invoice / e-Way Bill / Transport sections
  // only for whichever of those two this specific voucher actually has.
  const handleDownloadSingleBillPdf = useCallback(async (bill) => {
    setSingleBillGeneratingId(bill.vchNo);
    try {
      const logoDataUrl = await loadImageAsDataUrl(wallnutLogo).catch(() => null);
      const doc = new jsPDF({ orientation: 'portrait' });
      const { marginX, pageWidth, contentStartY } = drawLetterhead(
        doc, logoDataUrl, 'e-Way Bill / e-Invoice Copy', `Voucher: ${bill.vchNo}`
      );

      let y = drawSection(doc, marginX, pageWidth, contentStartY, 'Invoice Details', [
        ['Voucher No', bill.vchNo],
        ['Voucher Type', bill.vchType || '—'],
        ['Date', formatDate(bill.date)],
        ['Party Name', bill.partyName || '—'],
        ['Party GSTIN', bill.partyGstin || '—'],
        ['Invoice Amount', abbreviateCurrency(bill.invoiceAmount)],
      ]);

      if (bill.irn) {
        y = drawSection(doc, marginX, pageWidth, y, 'e-Invoice Details', [
          ['IRN', bill.irn],
          ['Status', 'Generated'],
        ]);
      }

      if (bill.ewayBillNo) {
        y = drawSection(doc, marginX, pageWidth, y, 'e-Way Bill Details', [
          ['e-Way Bill No', bill.ewayBillNo],
          ['Document Type', bill.documentType || '—'],
          ['Valid Upto', bill.validUpto ? formatDateTime(bill.validUpto) : '—'],
        ]);

        drawSection(doc, marginX, pageWidth, y, 'Transport Details', [
          ['Transporter', bill.transporterName || '—'],
          ['Vehicle No', bill.vehicleNumber || '—'],
          ['Distance (km)', bill.distanceKm != null ? String(bill.distanceKm) : '—'],
          ['Part B', bill.hasPartB ? 'Yes' : 'Pending'],
        ]);
      }

      stampFooter(doc, marginX, pageWidth);
      doc.save(`bill-${bill.vchNo.replace(/[^a-z0-9]+/gi, '-')}.pdf`);
    } finally {
      setSingleBillGeneratingId(null);
    }
  }, []);

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
    {
      header: 'PDF', accessor: '_pdf',
      render: (_, row) => (
        <button
          className="eway-bills-row-download"
          onClick={() => handleDownloadSingleBillPdf(row)}
          disabled={singleBillGeneratingId === row.vchNo}
          title="Download this bill as its own PDF"
        >
          <Download size={12} />
        </button>
      ),
    },
  ], [handleDownloadSingleBillPdf, singleBillGeneratingId]);

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
          <div className="eway-bills-year-select">
            <label htmlFor="eway-bills-from">Date Range:</label>
            <input
              id="eway-bills-from" type="date" value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              max={toDate || undefined}
            />
            <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>to</span>
            <input
              id="eway-bills-to" type="date" value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              min={fromDate || undefined}
            />
            {(fromDate || toDate) && (
              <button
                className="eway-bills-row-download"
                onClick={() => { setFromDate(''); setToDate(''); }}
                title="Clear date range"
              >
                ✕
              </button>
            )}
          </div>
          <button
            className={`header-sync-btn ${pdfGenerating ? 'spinning' : ''}`}
            onClick={handleDownloadPdf}
            disabled={filteredBills.length === 0 || pdfGenerating}
            title={filteredBills.length === 0 ? 'No rows to export' : 'Download this register as a PDF'}
          >
            <Download size={14} />
            <span>{pdfGenerating ? 'Generating…' : 'Download PDF'}</span>
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
