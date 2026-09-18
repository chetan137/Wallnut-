/**
 * Wallnut — Role & Data Context
 * Manages role-based view switching, district/officer scoping, and mutable sales/complaints/visits states.
 */

import { createContext, useContext, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { salesData } from '../data/salesData';
import { complaintsData } from '../data/complaintsData';
import { visitsData } from '../data/visitsData';
import { useAuth } from './AuthContext';

// Sent as X-API-Key so the backend can reject requests that don't come from
// this app — set in Vercel project env vars, must match API_KEY on the server.
const API_KEY = import.meta.env.VITE_API_KEY || '';

export const ROLES = {
  CEO: 'ceo',
  STATE_SALES_HEAD: 'state_sales_head',
  DISTRICT_MANAGER: 'district_manager',
  SALES_OFFICER: 'sales_officer',
};

const RoleContext = createContext(null);

export function RoleProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [currentRole, setCurrentRole] = useState(() => {
    try {
      return localStorage.getItem('wallnut_view_role') || ROLES.STATE_SALES_HEAD;
    } catch {
      return ROLES.STATE_SALES_HEAD;
    }
  });
  const [selectedState, setSelectedState] = useState(() => {
    try {
      return localStorage.getItem('wallnut_selected_state') || 'Maharashtra';
    } catch {
      return 'Maharashtra';
    }
  });
  const [selectedDistrict, setSelectedDistrict] = useState(() => {
    try {
      return localStorage.getItem('wallnut_selected_district') || 'Kolhapur';
    } catch {
      return 'Kolhapur';
    }
  });
  const [selectedSalesMan, setSelectedSalesMan] = useState(() => {
    try {
      return localStorage.getItem('wallnut_selected_salesman') || 'Mr. Vaibhav Pawar';
    } catch {
      return 'Mr. Vaibhav Pawar';
    }
  });

  // Automatically synchronize scope state changes to localStorage
  useEffect(() => {
    try {
      if (currentRole) localStorage.setItem('wallnut_view_role', currentRole);
    } catch (e) { /* ignore */ }
  }, [currentRole]);

  useEffect(() => {
    try {
      if (selectedState) localStorage.setItem('wallnut_selected_state', selectedState);
    } catch (e) { /* ignore */ }
  }, [selectedState]);

  useEffect(() => {
    try {
      if (selectedDistrict) localStorage.setItem('wallnut_selected_district', selectedDistrict);
    } catch (e) { /* ignore */ }
  }, [selectedDistrict]);

  useEffect(() => {
    try {
      if (selectedSalesMan) localStorage.setItem('wallnut_selected_salesman', selectedSalesMan);
    } catch (e) { /* ignore */ }
  }, [selectedSalesMan]);

  // Mutable states persisted in localStorage
  const [sales, setSales] = useState(() => {
    const saved = localStorage.getItem('wallnut_sales_records');
    return saved ? JSON.parse(saved) : salesData;
  });

  // Mirrors `sales` so syncFromTally (a stable useCallback with no deps) can
  // read the pre-sync record set without needing `sales` as a dependency.
  const salesRef = useRef(sales);
  useEffect(() => { salesRef.current = sales; }, [sales]);

  // No stable row id comes back from the API (see dbDataService.js), so a
  // composite of fields that together identify one (voucher, line item) row
  // stands in for one — good enough to tell "new since last sync" from
  // "already had this" without needing schema changes on the backend.
  const recordKey = (r) => `${r.vchNo}|${r.date}|${r.itemName}|${r.amount}|${r.quantity}`;

  // Reference lists (states/districts/officers/dealers) are derived from the
  // live `sales` array rather than the static mock — once /api/tally/sync
  // returns real Tally/Postgres records, these are the actual states,
  // districts, officers and dealers that appear in that data, so role-based
  // filtering below still matches instead of filtering against a permanently
  // fictional roster.
  const allStates = useMemo(
    () => [...new Set(sales.map((r) => r.state).filter(Boolean))].sort(),
    [sales]
  );

  const districtToState = useMemo(() => {
    const map = {};
    sales.forEach((r) => { if (r.areaCity) map[r.areaCity] = r.state; });
    return map;
  }, [sales]);

  const allDistricts = useMemo(() => Object.keys(districtToState), [districtToState]);

  const allSalesOfficers = useMemo(() => {
    const map = {};
    sales.forEach((r) => {
      if (r.salesMan) {
        const raw = r.salesMan.trim();
        if (/branch|godown|warehouse|location/i.test(raw)) return;
        const key = raw.replace(/^M[rs]\.\s+/i, '').trim().toLowerCase();
        if (!map[key]) {
          map[key] = { name: raw, district: r.areaCity || '', state: r.state || '' };
        } else {
          if (!map[key].name.startsWith('Mr.') && raw.startsWith('Mr.')) {
            map[key].name = raw;
          }
          if (!map[key].state && r.state) map[key].state = r.state;
          if (!map[key].district && r.areaCity) map[key].district = r.areaCity;
        }
      }
    });
    return Object.values(map);
  }, [sales]);

  const allDealers = useMemo(() => {
    const map = {};
    sales.forEach((r) => {
      if (r.partyName) {
        const raw = r.partyName.trim();
        if (!map[raw]) {
          map[raw] = { name: raw, salesOfficer: r.salesMan || '', district: r.areaCity || '', state: r.state || '' };
        } else {
          if (!map[raw].salesOfficer && r.salesMan) map[raw].salesOfficer = r.salesMan;
          if (!map[raw].state && r.state) map[raw].state = r.state;
          if (!map[raw].district && r.areaCity) map[raw].district = r.areaCity;
        }
      }
    });
    return Object.values(map);
  }, [sales]);

  // Track data source for UI badge
  const [dataSource, setDataSource] = useState('local');
  const [dataLoading, setDataLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  // Summary of the most recent MANUAL sync (records fetched, source, per-year
  // breakdown) so the header can show a plain confirmation of what actually
  // came in — not just a spinner that silently stops. Only set for manual
  // clicks (silent=false), not the automatic sync-on-login.
  const [syncResult, setSyncResult] = useState(null);
  const dismissSyncResult = useCallback(() => setSyncResult(null), []);

  // Core sync function — fetches from Tally (or falls back to local demo data)
  const syncFromTally = useCallback(async (silent = false) => {
    if (!silent) setSyncing(true);
    try {
      const res  = await fetch('/api/tally/sync', { headers: { 'X-API-Key': API_KEY } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      // Always apply backend data — whether live Tally/Postgres or local fallback
      if (json.ok && Array.isArray(json.data?.salesData)) {
        const records = json.data.salesData;
        setSales(records);
        setDataSource(json.source || 'local');
        const syncTime = json.source === 'tally' || json.source === 'db' ? (json.lastSync || new Date().toISOString()) : null;
        if (syncTime) setLastSync(syncTime);
        localStorage.setItem('wallnut_sales_records', JSON.stringify(records));
        localStorage.setItem('wallnut_data_source', json.source || 'local');
        localStorage.setItem('wallnut_last_sync', syncTime || '');

        if (!silent) {
          const previousKeys = new Set(salesRef.current.map(recordKey));
          const newRecordCount = records.reduce((n, r) => n + (previousKeys.has(recordKey(r)) ? 0 : 1), 0);

          const byYear = {};
          for (const r of records) {
            const y = (r.date || '').slice(0, 4);
            if (y) byYear[y] = (byYear[y] || 0) + 1;
          }
          setSyncResult({
            ok: true,
            source: json.source || 'local',
            recordCount: records.length,
            newRecordCount,
            byYear,
          });
        }
      } else if (!silent) {
        setSyncResult({ ok: false, error: 'Sync completed but returned no data.' });
      }
    } catch {
      // Backend unreachable — keep existing data
      if (!silent) setSyncResult({ ok: false, error: 'Could not reach the backend.' });
    } finally {
      if (!silent) setSyncing(false);
      setDataLoading(false);
    }
  }, []);

  const fetchCallsFromDb = useCallback(async () => {
    try {
      const res = await fetch('/api/calls', { headers: { 'X-API-Key': API_KEY } });
      if (res.ok) {
        const json = await res.json();
        if (json.ok && Array.isArray(json.calls) && json.calls.length > 0) {
          setVisits(prev => {
            const dbIds = new Set(json.calls.map(c => c.id));
            const remaining = prev.filter(p => !dbIds.has(p.id));
            const merged = [...json.calls, ...remaining];
            try {
              localStorage.setItem('wallnut_visits_records', JSON.stringify(merged));
            } catch (e) { /* ignore */ }
            return merged;
          });
        }
      }
    } catch (err) {
      console.warn('Could not fetch calls from DB, using local calls', err);
    }
  }, []);

  // Only fetch real data once logged in — an unauthenticated visitor should
  // never trigger a request to the sales API, not just be blocked from
  // seeing it rendered.
  useEffect(() => {
    if (!isAuthenticated) return;
    const cachedSource = localStorage.getItem('wallnut_data_source');
    const cachedSync   = localStorage.getItem('wallnut_last_sync');
    if (cachedSource) setDataSource(cachedSource);
    if (cachedSync)   setLastSync(cachedSync);
    syncFromTally(true); // silent = no spinner on first load
    fetchCallsFromDb();
  }, [isAuthenticated, syncFromTally, fetchCallsFromDb]);

  const [complaints, setComplaints] = useState(() => {
    const saved = localStorage.getItem('wallnut_complaints_records');
    return saved ? JSON.parse(saved) : complaintsData;
  });

  const [visits, setVisits] = useState(() => {
    const saved = localStorage.getItem('wallnut_visits_records');
    return saved ? JSON.parse(saved) : visitsData;
  });

  // Action methods
  const addSalesEntry = useCallback((entry) => {
    const newRecord = {
      ...entry,
      vchNo: `WN-${Date.now().toString().slice(-4)}`,
      vchType: 'Sales',
      amount: Number(entry.quantity) * Number(entry.rate),
      finalOutstanding: Math.round(Number(entry.quantity) * Number(entry.rate) * 0.1), // 10% defaults as outstanding
    };

    setSales((prev) => {
      const updated = [newRecord, ...prev];
      localStorage.setItem('wallnut_sales_records', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const addVisitEntry = useCallback(async (entry) => {
    const localRecord = {
      id: String(Date.now()),
      status: entry.status || 'Completed',
      ...entry,
    };

    // 1. Optimistic instant local update
    setVisits((prev) => {
      const updated = [localRecord, ...prev];
      try {
        localStorage.setItem('wallnut_visits_records', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save visit to localStorage', e);
      }
      return updated;
    });

    // 2. Persist to PostgreSQL database on the VM
    try {
      const res = await fetch('/api/calls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify(entry),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.ok && json.call) {
          setVisits((prev) => {
            const updated = prev.map(v => v.id === localRecord.id ? json.call : v);
            try {
              localStorage.setItem('wallnut_visits_records', JSON.stringify(updated));
            } catch (e) { /* ignore */ }
            return updated;
          });
        }
      }
    } catch (err) {
      console.warn('Could not save call to DB, saved locally', err);
    }

    return localRecord;
  }, []);

  const addComplaintEntry = useCallback((entry) => {
    const newRecord = {
      ...entry,
      id: Date.now(),
      status: 'Open',
    };

    setComplaints((prev) => {
      const updated = [newRecord, ...prev];
      localStorage.setItem('wallnut_complaints_records', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    areas: [],
    salesMen: [],
    stockGroup: '',
    stockCategory: '',
    partyName: '',
  });

  const normalizeName = useCallback((name) => {
    if (!name) return '';
    return name.replace(/^M[rs]\.\s+/, '').trim().toLowerCase();
  }, []);

  // Baseline scoped datasets (before global filters)
  const baseSales = useMemo(() => {
    switch (currentRole) {
      case ROLES.CEO:
        return sales;
      case ROLES.STATE_SALES_HEAD:
        return sales.filter(r => r.state === selectedState);
      case ROLES.DISTRICT_MANAGER:
        return sales.filter(r => {
          if (!r.areaCity) return false;
          if (r.areaCity === selectedDistrict) return true;
          const normA = r.areaCity.replace(/\s*(Plant|Godown|Warehouse|Location|Branch)\s*/gi, '').trim().toLowerCase();
          const normB = (selectedDistrict || '').replace(/\s*(Plant|Godown|Warehouse|Location|Branch)\s*/gi, '').trim().toLowerCase();
          return normA === normB || (normB && r.areaCity.toLowerCase().includes(normB));
        });
      case ROLES.SALES_OFFICER:
        return sales.filter(r => normalizeName(r.salesMan) === normalizeName(selectedSalesMan));
      default:
        return [];
    }
  }, [currentRole, selectedState, selectedDistrict, selectedSalesMan, sales, normalizeName]);

  const baseComplaints = useMemo(() => {
    switch (currentRole) {
      case ROLES.CEO:
        return complaints;
      case ROLES.STATE_SALES_HEAD:
        return complaints.filter(c => districtToState[c.district] === selectedState);
      case ROLES.DISTRICT_MANAGER:
        return complaints.filter(c => c.district === selectedDistrict);
      case ROLES.SALES_OFFICER: {
        const officerDealers = allDealers
          .filter(d => normalizeName(d.salesOfficer) === normalizeName(selectedSalesMan))
          .map(d => d.name);
        return complaints.filter(c => officerDealers.includes(c.dealer));
      }
      default:
        return [];
    }
  }, [currentRole, selectedState, selectedDistrict, selectedSalesMan, complaints, allDealers, normalizeName]);

  const baseVisits = useMemo(() => {
    switch (currentRole) {
      case ROLES.CEO:
        return visits;
      case ROLES.STATE_SALES_HEAD: {
        const stateOfficers = allSalesOfficers
          .filter(o => o.state === selectedState)
          .map(o => o.name);
        return visits.filter(v => 
          v.state === selectedState || 
          stateOfficers.some(so => normalizeName(so) === normalizeName(v.salesMan))
        );
      }
      case ROLES.DISTRICT_MANAGER: {
        const districtOfficers = allSalesOfficers
          .filter(o => o.district === selectedDistrict)
          .map(o => o.name);
        return visits.filter(v => 
          v.district === selectedDistrict || 
          districtOfficers.some(so => normalizeName(so) === normalizeName(v.salesMan))
        );
      }
      case ROLES.SALES_OFFICER:
        return visits.filter(v => normalizeName(v.salesMan) === normalizeName(selectedSalesMan));
      default:
        return [];
    }
  }, [currentRole, selectedState, selectedDistrict, selectedSalesMan, visits, allSalesOfficers, normalizeName]);

  // Available options for the filters based on baseline
  const availableAreas = useMemo(() => {
    const unique = new Set(baseSales.map(r => r.areaCity).filter(Boolean));
    return [...unique].sort();
  }, [baseSales]);

  const availableSalesMen = useMemo(() => {
    const unique = new Set(baseSales.map(r => r.salesMan).filter(Boolean));
    return [...unique].sort();
  }, [baseSales]);

  const availableStockGroups = useMemo(() => {
    const unique = new Set(baseSales.map(r => r.stockGroup).filter(Boolean));
    return [...unique].sort();
  }, [baseSales]);

  const availableStockCategories = useMemo(() => {
    let dataset = baseSales;
    if (filters.stockGroup) {
      dataset = dataset.filter(r => r.stockGroup === filters.stockGroup);
    }
    const unique = new Set(dataset.map(r => r.stockCategory).filter(Boolean));
    return [...unique].sort();
  }, [baseSales, filters.stockGroup]);

  const availableDealers = useMemo(() => {
    const unique = new Set(baseSales.map(r => r.partyName).filter(Boolean));
    return [...unique].sort();
  }, [baseSales]);

  // Apply Global Filters (AND Logic)
  const filteredSales = useMemo(() => {
    let result = baseSales;

    if (filters.fromDate) {
      result = result.filter(r => r.date >= filters.fromDate);
    }
    if (filters.toDate) {
      result = result.filter(r => r.date <= filters.toDate);
    }
    if (filters.areas && filters.areas.length > 0) {
      result = result.filter(r => filters.areas.includes(r.areaCity));
    }
    if (filters.salesMen && filters.salesMen.length > 0) {
      const normalizedFilters = filters.salesMen.map(sm => normalizeName(sm));
      result = result.filter(r => normalizedFilters.includes(normalizeName(r.salesMan)));
    }
    if (filters.stockGroup) {
      result = result.filter(r => r.stockGroup === filters.stockGroup);
    }
    if (filters.stockCategory) {
      result = result.filter(r => r.stockCategory === filters.stockCategory);
    }
    if (filters.partyName) {
      result = result.filter(r => normalizeName(r.partyName) === normalizeName(filters.partyName));
    }

    return result;
  }, [baseSales, filters, normalizeName]);

  const filteredComplaints = useMemo(() => {
    let result = baseComplaints;

    if (filters.fromDate) {
      result = result.filter(c => c.date >= filters.fromDate);
    }
    if (filters.toDate) {
      result = result.filter(c => c.date <= filters.toDate);
    }
    if (filters.areas && filters.areas.length > 0) {
      result = result.filter(c => filters.areas.includes(c.district));
    }
    if (filters.salesMen && filters.salesMen.length > 0) {
      const normalizedFilters = filters.salesMen.map(sm => normalizeName(sm));
      result = result.filter(c => {
        const dealerInfo = allDealers.find(d => normalizeName(d.name) === normalizeName(c.dealer));
        const salesManName = dealerInfo ? dealerInfo.salesOfficer : '';
        return normalizedFilters.includes(normalizeName(salesManName));
      });
    }
    if (filters.partyName) {
      result = result.filter(c => normalizeName(c.dealer) === normalizeName(filters.partyName));
    }

    return result;
  }, [baseComplaints, filters, allDealers, normalizeName]);

  const filteredVisits = useMemo(() => {
    let result = baseVisits;

    if (filters.fromDate) {
      result = result.filter(v => v.date >= filters.fromDate);
    }
    if (filters.toDate) {
      result = result.filter(v => v.date <= filters.toDate);
    }
    if (filters.areas && filters.areas.length > 0) {
      result = result.filter(v => {
        const dealerInfo = allDealers.find(d => normalizeName(d.name) === normalizeName(v.dealer));
        const district = dealerInfo ? dealerInfo.district : '';
        return filters.areas.includes(district);
      });
    }
    if (filters.salesMen && filters.salesMen.length > 0) {
      const normalizedFilters = filters.salesMen.map(sm => normalizeName(sm));
      result = result.filter(v => normalizedFilters.includes(normalizeName(v.salesMan)));
    }
    if (filters.partyName) {
      result = result.filter(v => normalizeName(v.dealer) === normalizeName(filters.partyName));
    }

    return result;
  }, [baseVisits, filters, allDealers, normalizeName]);

  const clearFilters = useCallback(() => {
    setFilters({
      fromDate: '',
      toDate: '',
      areas: [],
      salesMen: [],
      stockGroup: '',
      stockCategory: '',
      partyName: '',
    });
  }, []);

  const roleConfig = useMemo(() => {
    switch (currentRole) {
      case ROLES.CEO:
        return {
          label: 'CEO',
          description: 'Company-wide Overview',
          scope: 'All India',
        };
      case ROLES.STATE_SALES_HEAD:
        return {
          label: 'State Sales Head',
          description: `${selectedState} State`,
          scope: `${selectedState} Branch`,
        };
      case ROLES.DISTRICT_MANAGER:
        return {
          label: 'District Sales Manager',
          description: `${selectedDistrict} District`,
          scope: selectedDistrict,
        };
      case ROLES.SALES_OFFICER:
        return {
          label: 'Sales Officer',
          description: selectedSalesMan,
          scope: selectedSalesMan,
        };
      default:
        return { label: '', description: '', scope: '' };
    }
  }, [currentRole, selectedState, selectedDistrict, selectedSalesMan]);

  const allRoles = useMemo(() => [
    { key: ROLES.CEO, label: 'CEO / Admin', description: 'Company-wide Overview' },
    { key: ROLES.STATE_SALES_HEAD, label: 'State Sales Head', description: selectedState },
    { key: ROLES.DISTRICT_MANAGER, label: 'District Sales Manager', description: `${selectedDistrict} District` },
    { key: ROLES.SALES_OFFICER, label: 'Sales Officer', description: selectedSalesMan },
  ], [selectedState, selectedDistrict, selectedSalesMan]);

  const value = useMemo(() => ({
    currentRole,
    setRole: setCurrentRole,
    selectedState,
    setSelectedState,
    selectedDistrict,
    setSelectedDistrict,
    selectedSalesMan,
    setSelectedSalesMan,
    roleConfig,
    allRoles,
    filteredSales,
    filteredComplaints,
    filteredVisits,
    addSalesEntry,
    addVisitEntry,
    addComplaintEntry,
    allStates,
    allDistricts,
    allSalesOfficers,
    allDealers,
    filters,
    setFilters,
    clearFilters,
    availableAreas,
    availableSalesMen,
    availableStockGroups,
    availableStockCategories,
    availableDealers,
    normalizeName,
    dataSource,
    dataLoading,
    syncing,
    lastSync,
    syncFromTally,
    syncResult,
    dismissSyncResult,
  }), [
    currentRole,
    selectedState,
    selectedDistrict,
    selectedSalesMan,
    roleConfig,
    allRoles,
    filteredSales,
    filteredComplaints,
    filteredVisits,
    addSalesEntry,
    addVisitEntry,
    addComplaintEntry,
    allStates,
    allDistricts,
    allSalesOfficers,
    allDealers,
    filters,
    clearFilters,
    availableAreas,
    availableSalesMen,
    availableStockGroups,
    availableStockCategories,
    availableDealers,
    normalizeName,
    dataSource,
    dataLoading,
    syncing,
    lastSync,
    syncFromTally,
    syncResult,
    dismissSyncResult,
  ]);

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}

export default RoleContext;
