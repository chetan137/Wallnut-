import { useEffect, useState } from 'react';

// Sent as X-API-Key — must match VITE_API_KEY used elsewhere.
const API_KEY = import.meta.env.VITE_API_KEY || '';

/** '' = All Companies (combined) — matches the default backend behavior. */
export function useCompanyList() {
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

/**
 * Shared company selector for pages whose data can combine every synced
 * company by default (e.g. Payables/Receivables, e-Way Bills) — lets
 * whoever's looking at the page narrow to a single company to match what
 * they see when they open that one company in Tally directly.
 */
export default function CompanyFilterBar({ companies, selectedCompanyId, onChange }) {
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
