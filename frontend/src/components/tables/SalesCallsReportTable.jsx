import React, { useMemo, useState } from 'react';
import DataTable from '../common/DataTable';
import { PhoneCall, MapPin, Eye, CheckCircle2, Clock, Calendar, Filter, RotateCcw, User, Building, Layers } from 'lucide-react';
import { formatDate, formatNumber } from '../../utils/formatters';
import { useRole } from '../../context/RoleContext';
import { cleanDistrictName, inferStateFromLocation, formatLocationLabel } from '../common/LogSalesCallModal';

export default function SalesCallsReportTable({ visits = [], title = 'Daily Sales Calls & Visits Report' }) {
  const { currentRole, allStates, allSalesOfficers } = useRole();
  const isCeo = currentRole === 'ceo';

  const [selectedCallerLogs, setSelectedCallerLogs] = useState(null);

  // Filter States for CEO / Multi-territory filtering
  const [filterState, setFilterState] = useState('ALL');
  const [filterDistrict, setFilterDistrict] = useState('ALL');
  const [filterOfficer, setFilterOfficer] = useState('ALL');
  const [filterCallType, setFilterCallType] = useState('ALL'); // 'ALL' | 'Store Visit' | 'Phone Call'
  const [filterTimeframe, setFilterTimeframe] = useState('ALL'); // 'ALL' | 'today' | 'this_month'

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const currentMonthPrefix = useMemo(() => todayStr.slice(0, 7), [todayStr]);

  // Extract distinct states present in visits or allStates
  const distinctStates = useMemo(() => {
    const counts = {};
    visits.forEach((v) => {
      const st = inferStateFromLocation(v.district, v.state) || 'Other';
      counts[st] = (counts[st] || 0) + 1;
    });

    const set = new Set((allStates || []).filter(Boolean));
    Object.keys(counts).forEach(s => {
      if (s && s !== 'Other') set.add(s);
    });

    return Array.from(set).sort().map(st => ({
      name: st,
      count: counts[st] || 0,
    }));
  }, [visits, allStates]);

  // Extract distinct districts (filtered by selected state if any)
  const distinctDistricts = useMemo(() => {
    const districts = new Set();
    visits.forEach((v) => {
      const st = inferStateFromLocation(v.district, v.state);
      if (filterState === 'ALL' || (st && st.toLowerCase() === filterState.toLowerCase())) {
        const cd = cleanDistrictName(v.district);
        if (cd) districts.add(cd);
      }
    });
    return Array.from(districts).sort();
  }, [visits, filterState]);

  // Extract distinct officers (filtered by selected state if any)
  const distinctOfficers = useMemo(() => {
    const officers = new Map();
    visits.forEach((v) => {
      const st = inferStateFromLocation(v.district, v.state);
      if (filterState === 'ALL' || (st && st.toLowerCase() === filterState.toLowerCase())) {
        const name = v.salesMan || 'Sales Team';
        if (!officers.has(name)) {
          const loc = formatLocationLabel(v.district, st);
          officers.set(name, { name, location: loc });
        }
      }
    });

    // Also include sales officers from context if CEO
    (allSalesOfficers || []).forEach((o) => {
      if (!o?.name) return;
      const st = inferStateFromLocation(o.district, o.state);
      if (filterState === 'ALL' || (st && st.toLowerCase() === filterState.toLowerCase())) {
        if (!officers.has(o.name)) {
          const loc = formatLocationLabel(o.district, st);
          officers.set(o.name, { name: o.name, location: loc });
        }
      }
    });

    return Array.from(officers.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [visits, allSalesOfficers, filterState]);

  // Filter the visits array according to active filter controls
  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      const vState = inferStateFromLocation(v.district, v.state);
      const vDistrict = cleanDistrictName(v.district);

      if (filterState !== 'ALL' && vState && vState.toLowerCase() !== filterState.toLowerCase()) {
        return false;
      }
      if (filterDistrict !== 'ALL' && vDistrict && vDistrict.toLowerCase() !== filterDistrict.toLowerCase()) {
        return false;
      }
      if (filterOfficer !== 'ALL' && v.salesMan !== filterOfficer) {
        return false;
      }
      if (filterCallType !== 'ALL' && v.callType !== filterCallType) {
        return false;
      }
      if (filterTimeframe === 'today' && v.date !== todayStr) {
        return false;
      }
      if (filterTimeframe === 'this_month' && (!v.date || !v.date.startsWith(currentMonthPrefix))) {
        return false;
      }
      return true;
    });
  }, [visits, filterState, filterDistrict, filterOfficer, filterCallType, filterTimeframe, todayStr, currentMonthPrefix]);

  // Check if any filter is actively applied
  const hasActiveFilters = filterState !== 'ALL' || filterDistrict !== 'ALL' || filterOfficer !== 'ALL' || filterCallType !== 'ALL' || filterTimeframe !== 'ALL';

  const handleResetFilters = () => {
    setFilterState('ALL');
    setFilterDistrict('ALL');
    setFilterOfficer('ALL');
    setFilterCallType('ALL');
    setFilterTimeframe('ALL');
  };

  // Live KPI metrics from the filtered visits
  const metrics = useMemo(() => {
    const total = filteredVisits.length;
    const today = filteredVisits.filter(v => v.date === todayStr).length;
    const storeVisits = filteredVisits.filter(v => v.callType === 'Store Visit').length;
    const phoneCalls = filteredVisits.filter(v => v.callType === 'Phone Call').length;
    const uniqueOfficers = new Set(filteredVisits.map(v => v.salesMan).filter(Boolean)).size;

    return { total, today, storeVisits, phoneCalls, uniqueOfficers };
  }, [filteredVisits, todayStr]);

  // Aggregate calls per sales officer / person
  const aggregatedRows = useMemo(() => {
    const map = {};

    filteredVisits.forEach((v) => {
      const caller = v.salesMan || 'General Team';
      const cleanLocDistrict = cleanDistrictName(v.district) || 'All Districts';
      const cleanLocState = inferStateFromLocation(v.district, v.state) || 'All States';

      if (!map[caller]) {
        map[caller] = {
          salesMan: caller,
          district: cleanLocDistrict,
          state: cleanLocState,
          cleanLocation: formatLocationLabel(v.district, cleanLocState),
          callsToday: 0,
          callsThisMonth: 0,
          totalCalls: 0,
          phoneCalls: 0,
          storeVisits: 0,
          lastCallDate: '',
          rawLogs: [],
        };
      }

      const entry = map[caller];
      entry.totalCalls += 1;
      entry.rawLogs.push(v);

      if (v.callType === 'Store Visit') entry.storeVisits += 1;
      else entry.phoneCalls += 1;

      if (v.date === todayStr) {
        entry.callsToday += 1;
      }
      if (v.date && v.date.startsWith(currentMonthPrefix)) {
        entry.callsThisMonth += 1;
      }
      if (!entry.lastCallDate || (v.date && v.date > entry.lastCallDate)) {
        entry.lastCallDate = v.date;
      }
    });

    return Object.values(map).sort((a, b) => b.callsToday - a.callsToday || b.callsThisMonth - a.callsThisMonth || b.totalCalls - a.totalCalls);
  }, [filteredVisits, todayStr, currentMonthPrefix]);

  const columns = [
    {
      header: 'Sales Officer / Person',
      accessor: 'salesMan',
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-main, #1e293b)' }}>{val}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted, #64748b)' }}>
            {row.cleanLocation || `${row.district}, ${row.state}`}
          </div>
        </div>
      ),
    },
    {
      header: 'Calls Today',
      accessor: 'callsToday',
      numeric: true,
      render: (val) => (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 8px',
          borderRadius: 12,
          fontWeight: 700,
          fontSize: 12,
          background: val > 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(107, 114, 128, 0.1)',
          color: val > 0 ? 'var(--success, #16a34a)' : 'var(--text-muted, #94a3b8)'
        }}>
          {val > 0 && <CheckCircle2 size={12} />}
          {val} {val === 1 ? 'Call' : 'Calls'}
        </span>
      ),
    },
    {
      header: 'Calls This Month',
      accessor: 'callsThisMonth',
      numeric: true,
      render: (val) => (
        <span style={{ fontWeight: 700, color: 'var(--accent-primary, #d97706)', fontSize: 13 }}>
          {formatNumber(val)} Calls
        </span>
      ),
    },
    {
      header: 'Call Types (Visits / Phone)',
      accessor: 'storeVisits',
      render: (val, row) => (
        <div style={{ fontSize: 11, color: 'var(--text-secondary, #475569)' }}>
          <span style={{ color: 'var(--accent-primary, #d97706)', fontWeight: 600 }}>{row.storeVisits} Visits</span> • <span>{row.phoneCalls} Calls</span>
        </div>
      ),
    },
    {
      header: 'Last Call Date',
      accessor: 'lastCallDate',
      render: (val) => val ? formatDate(val) : '—',
    },
    {
      header: 'Action',
      accessor: 'action',
      render: (val, row) => (
        <button
          type="button"
          onClick={() => setSelectedCallerLogs(row)}
          style={{
            padding: '4px 10px',
            borderRadius: 6,
            border: '1px solid var(--card-border, #cbd5e1)',
            background: 'var(--card-bg, #ffffff)',
            color: 'var(--text-main, #1e293b)',
            fontSize: 11,
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent-primary, #d97706)';
            e.currentTarget.style.color = 'var(--accent-primary, #d97706)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--card-border, #cbd5e1)';
            e.currentTarget.style.color = 'var(--text-main, #1e293b)';
          }}
        >
          <Eye size={12} /> View Logs ({row.rawLogs.length})
        </button>
      ),
    },
  ];

  // Dedicated CEO / Territory Filter Toolbar
  const filterToolbar = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Control Selectors Row */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {/* State Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 140, flex: '1 1 auto' }}>
          <label style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 3 }}>
            <MapPin size={11} style={{ color: 'var(--accent-primary, #d97706)' }} /> State / Territory
          </label>
          <select
            value={filterState}
            onChange={(e) => {
              setFilterState(e.target.value);
              setFilterDistrict('ALL'); // Reset district when state changes
            }}
            style={{
              height: 34,
              borderRadius: 6,
              border: filterState !== 'ALL' ? '1.5px solid var(--accent-primary, #d97706)' : '1px solid var(--card-border, #cbd5e1)',
              background: filterState !== 'ALL' ? 'rgba(217, 119, 6, 0.04)' : 'var(--card-bg, #ffffff)',
              color: 'var(--text-primary, #1e293b)',
              fontSize: 12,
              padding: '0 8px',
              cursor: 'pointer',
              fontWeight: filterState !== 'ALL' ? 600 : 400,
            }}
          >
            <option value="ALL">🌐 All States (India-wide)</option>
            {distinctStates.map(st => (
              <option key={st.name} value={st.name}>
                📍 {st.name} {st.count > 0 ? `(${st.count})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* District Filter (Enabled if state has districts or multi) */}
        {distinctDistricts.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 130, flex: '1 1 auto' }}>
            <label style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Layers size={11} style={{ color: 'var(--accent-primary, #d97706)' }} /> District / Area
            </label>
            <select
              value={filterDistrict}
              onChange={(e) => setFilterDistrict(e.target.value)}
              style={{
                height: 34,
                borderRadius: 6,
                border: filterDistrict !== 'ALL' ? '1.5px solid var(--accent-primary, #d97706)' : '1px solid var(--card-border, #cbd5e1)',
                background: filterDistrict !== 'ALL' ? 'rgba(217, 119, 6, 0.04)' : 'var(--card-bg, #ffffff)',
                color: 'var(--text-primary, #1e293b)',
                fontSize: 12,
                padding: '0 8px',
                cursor: 'pointer',
                fontWeight: filterDistrict !== 'ALL' ? 600 : 400,
              }}
            >
              <option value="ALL">All Districts</option>
              {distinctDistricts.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        )}

        {/* Sales Officer Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 150, flex: '1 1 auto' }}>
          <label style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 3 }}>
            <User size={11} style={{ color: 'var(--accent-primary, #d97706)' }} /> Sales Officer
          </label>
          <select
            value={filterOfficer}
            onChange={(e) => setFilterOfficer(e.target.value)}
            style={{
              height: 34,
              borderRadius: 6,
              border: filterOfficer !== 'ALL' ? '1.5px solid var(--accent-primary, #d97706)' : '1px solid var(--card-border, #cbd5e1)',
              background: filterOfficer !== 'ALL' ? 'rgba(217, 119, 6, 0.04)' : 'var(--card-bg, #ffffff)',
              color: 'var(--text-primary, #1e293b)',
              fontSize: 12,
              padding: '0 8px',
              cursor: 'pointer',
              fontWeight: filterOfficer !== 'ALL' ? 600 : 400,
            }}
          >
            <option value="ALL">All Officers / Callers ({distinctOfficers.length})</option>
            {distinctOfficers.map(o => (
              <option key={o.name} value={o.name}>
                {o.name} {o.location ? `(${o.location})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Interaction Type Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 130, flex: '1 1 auto' }}>
          <label style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 3 }}>
            <PhoneCall size={11} style={{ color: 'var(--accent-primary, #d97706)' }} /> Call Type
          </label>
          <select
            value={filterCallType}
            onChange={(e) => setFilterCallType(e.target.value)}
            style={{
              height: 34,
              borderRadius: 6,
              border: filterCallType !== 'ALL' ? '1.5px solid var(--accent-primary, #d97706)' : '1px solid var(--card-border, #cbd5e1)',
              background: filterCallType !== 'ALL' ? 'rgba(217, 119, 6, 0.04)' : 'var(--card-bg, #ffffff)',
              color: 'var(--text-primary, #1e293b)',
              fontSize: 12,
              padding: '0 8px',
              cursor: 'pointer',
              fontWeight: filterCallType !== 'ALL' ? 600 : 400,
            }}
          >
            <option value="ALL">All Types (Visits & Calls)</option>
            <option value="Store Visit">📍 Store Visits Only</option>
            <option value="Phone Call">📞 Phone Calls Only</option>
          </select>
        </div>

        {/* Timeframe Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 120, flex: '1 1 auto' }}>
          <label style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 3 }}>
            <Calendar size={11} style={{ color: 'var(--accent-primary, #d97706)' }} /> Time Period
          </label>
          <select
            value={filterTimeframe}
            onChange={(e) => setFilterTimeframe(e.target.value)}
            style={{
              height: 34,
              borderRadius: 6,
              border: filterTimeframe !== 'ALL' ? '1.5px solid var(--accent-primary, #d97706)' : '1px solid var(--card-border, #cbd5e1)',
              background: filterTimeframe !== 'ALL' ? 'rgba(217, 119, 6, 0.04)' : 'var(--card-bg, #ffffff)',
              color: 'var(--text-primary, #1e293b)',
              fontSize: 12,
              padding: '0 8px',
              cursor: 'pointer',
              fontWeight: filterTimeframe !== 'ALL' ? 600 : 400,
            }}
          >
            <option value="ALL">All Dates</option>
            <option value="today">Today Only</option>
            <option value="this_month">This Month</option>
          </select>
        </div>

        {/* Reset Filters Button */}
        {hasActiveFilters && (
          <div style={{ display: 'flex', alignItems: 'flex-end', paddingTop: 16 }}>
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                height: 34,
                padding: '0 12px',
                borderRadius: 6,
                border: '1px solid #fca5a5',
                background: '#fef2f2',
                color: '#b91c1c',
                fontSize: 11.5,
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Reset all filters back to All-India"
            >
              <RotateCcw size={12} /> Reset
            </button>
          </div>
        )}
      </div>

      {/* Summary KPI Badges Row */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 6,
          paddingTop: 4,
          borderTop: '1px dashed var(--card-border, #e2e8f0)',
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-primary, #1e293b)',
            background: 'var(--card-bg, #ffffff)',
            border: '1px solid var(--card-border, #e2e8f0)',
            padding: '3px 8px',
            borderRadius: 6,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <strong style={{ color: 'var(--accent-primary, #d97706)' }}>{metrics.total}</strong> Total Interactions
        </span>

        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: metrics.today > 0 ? '#15803d' : 'var(--text-muted, #64748b)',
            background: metrics.today > 0 ? 'rgba(34, 197, 94, 0.1)' : 'var(--card-bg, #ffffff)',
            border: metrics.today > 0 ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--card-border, #e2e8f0)',
            padding: '3px 8px',
            borderRadius: 6,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <CheckCircle2 size={11} />
          <strong>{metrics.today}</strong> Today
        </span>

        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--text-secondary, #475569)',
            background: 'var(--card-bg, #ffffff)',
            border: '1px solid var(--card-border, #e2e8f0)',
            padding: '3px 8px',
            borderRadius: 6,
          }}
        >
          📍 <strong style={{ color: 'var(--accent-primary, #d97706)' }}>{metrics.storeVisits}</strong> Visits
        </span>

        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--text-secondary, #475569)',
            background: 'var(--card-bg, #ffffff)',
            border: '1px solid var(--card-border, #e2e8f0)',
            padding: '3px 8px',
            borderRadius: 6,
          }}
        >
          📞 <strong>{metrics.phoneCalls}</strong> Calls
        </span>

        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--text-secondary, #475569)',
            background: 'var(--card-bg, #ffffff)',
            border: '1px solid var(--card-border, #e2e8f0)',
            padding: '3px 8px',
            borderRadius: 6,
          }}
        >
          👥 <strong>{metrics.uniqueOfficers}</strong> Active Staff
        </span>

        {hasActiveFilters && (
          <span style={{ fontSize: 11, color: 'var(--accent-primary, #d97706)', fontWeight: 600, marginLeft: 'auto' }}>
            Filtered Results ({aggregatedRows.length} {aggregatedRows.length === 1 ? 'Officer' : 'Officers'})
          </span>
        )}
      </div>
    </div>
  );

  return (
    <>
      <DataTable
        title={title}
        subtitle="Live daily & monthly calls summary to replace Google Sheet logs"
        columns={columns}
        data={aggregatedRows}
        id="sales-calls-report-table"
        searchable={true}
        toolbar={filterToolbar}
      />

      {/* Log Details Modal */}
      {selectedCallerLogs && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setSelectedCallerLogs(null)}
        >
          <div
            style={{
              backgroundColor: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--card-border, #e2e8f0)',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '650px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.3)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '14px 20px',
                background: 'var(--surface-dark, #1e293b)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: '#ffffff' }}>
                  Call Logs: {selectedCallerLogs.salesMan}
                </h3>
                <p style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.75)', margin: '2px 0 0 0' }}>
                  {selectedCallerLogs.cleanLocation || `${selectedCallerLogs.district}, ${selectedCallerLogs.state}`} • Total {selectedCallerLogs.totalCalls} interactions
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCallerLogs(null)}
                aria-label="Close"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.8)',
                  cursor: 'pointer',
                  fontSize: '20px',
                  lineHeight: 1,
                  padding: '4px',
                }}
              >
                &times;
              </button>
            </div>
            <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {selectedCallerLogs.rawLogs.map((log) => {
                const logLoc = formatLocationLabel(log.district, inferStateFromLocation(log.district, log.state));
                return (
                  <div
                    key={log.id}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 8,
                      background: 'var(--bg-secondary, #f8fafc)',
                      border: '1px solid var(--card-border, #e2e8f0)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13, color: 'var(--text-main, #1e293b)' }}>
                        {log.callType === 'Store Visit' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--accent-primary, #d97706)', background: 'rgba(217, 119, 6, 0.1)', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>
                            <MapPin size={11} /> Store Visit
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--success, #16a34a)', background: 'rgba(34, 197, 94, 0.1)', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>
                            <PhoneCall size={11} /> Phone Call
                          </span>
                        )}
                        <span>{log.dealer}</span>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted, #64748b)', fontFamily: 'var(--font-mono)' }}>
                        {formatDate(log.date)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: 'var(--text-secondary, #475569)' }}>
                      {logLoc && (
                        <span>📍 {logLoc}</span>
                      )}
                      <span style={{ fontWeight: 600, color: 'var(--accent-primary, #d97706)' }}>
                        Purpose: {log.purpose}
                      </span>
                    </div>
                    {log.notes && (
                      <div style={{ fontSize: 12, color: 'var(--text-secondary, #475569)', background: 'var(--card-bg, #ffffff)', border: '1px solid var(--card-border, #e2e8f0)', padding: '6px 10px', borderRadius: 6, marginTop: 4 }}>
                        {log.notes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
