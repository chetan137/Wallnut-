/**
 * Wallnut — Role & Data Context
 * Manages role-based view switching, district/officer scoping, and mutable sales/complaints/visits states.
 */

import { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { salesData, allDistricts, allSalesOfficers, allDealers, districtToState, allStates } from '../data/salesData';
import { complaintsData } from '../data/complaintsData';
import { visitsData } from '../data/visitsData';

export const ROLES = {
  CEO: 'ceo',
  STATE_SALES_HEAD: 'state_sales_head',
  DISTRICT_MANAGER: 'district_manager',
  SALES_OFFICER: 'sales_officer',
};

const RoleContext = createContext(null);

export function RoleProvider({ children }) {
  const [currentRole, setCurrentRole] = useState(ROLES.STATE_SALES_HEAD);
  const [selectedState, setSelectedState] = useState('Madhya Pradesh');
  const [selectedDistrict, setSelectedDistrict] = useState('Indore');
  const [selectedSalesMan, setSelectedSalesMan] = useState('Rajesh Sharma');

  // Mutable states persisted in localStorage
  const [sales, setSales] = useState(() => {
    const saved = localStorage.getItem('wallnut_sales_records');
    return saved ? JSON.parse(saved) : salesData;
  });

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

  const addVisitEntry = useCallback((entry) => {
    const newRecord = {
      ...entry,
      id: String(Date.now()),
      status: 'Pending',
    };

    setVisits((prev) => {
      const updated = [newRecord, ...prev];
      localStorage.setItem('wallnut_visits_records', JSON.stringify(updated));
      return updated;
    });
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
        return sales.filter(r => r.areaCity === selectedDistrict);
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
        return visits.filter(v => stateOfficers.some(so => normalizeName(so) === normalizeName(v.salesMan)));
      }
      case ROLES.DISTRICT_MANAGER: {
        const districtOfficers = allSalesOfficers
          .filter(o => o.district === selectedDistrict)
          .map(o => o.name);
        return visits.filter(v => districtOfficers.some(so => normalizeName(so) === normalizeName(v.salesMan)));
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
    filters,
    clearFilters,
    availableAreas,
    availableSalesMen,
    availableStockGroups,
    availableStockCategories,
    availableDealers,
    normalizeName,
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
