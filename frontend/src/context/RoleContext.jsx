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

  // Compute filtered datasets based on current role scope
  const filteredSales = useMemo(() => {
    switch (currentRole) {
      case ROLES.CEO:
        return sales;
      case ROLES.STATE_SALES_HEAD:
        return sales.filter(r => r.state === selectedState);
      case ROLES.DISTRICT_MANAGER:
        return sales.filter(r => r.areaCity === selectedDistrict);
      case ROLES.SALES_OFFICER:
        return sales.filter(r => r.salesMan === selectedSalesMan);
      default:
        return [];
    }
  }, [currentRole, selectedState, selectedDistrict, selectedSalesMan, sales]);

  const filteredComplaints = useMemo(() => {
    switch (currentRole) {
      case ROLES.CEO:
        return complaints;
      case ROLES.STATE_SALES_HEAD:
        return complaints.filter(c => districtToState[c.district] === selectedState);
      case ROLES.DISTRICT_MANAGER:
        return complaints.filter(c => c.district === selectedDistrict);
      case ROLES.SALES_OFFICER: {
        // Find dealers assigned to this sales officer
        const officerDealers = allDealers
          .filter(d => d.salesOfficer === selectedSalesMan)
          .map(d => d.name);
        return complaints.filter(c => officerDealers.includes(c.dealer));
      }
      default:
        return [];
    }
  }, [currentRole, selectedState, selectedDistrict, selectedSalesMan, complaints]);

  const filteredVisits = useMemo(() => {
    switch (currentRole) {
      case ROLES.CEO:
        return visits;
      case ROLES.STATE_SALES_HEAD: {
        const stateOfficers = allSalesOfficers
          .filter(o => o.state === selectedState)
          .map(o => o.name);
        return visits.filter(v => stateOfficers.includes(v.salesMan));
      }
      case ROLES.DISTRICT_MANAGER: {
        // Find sales officers for this district
        const districtOfficers = allSalesOfficers
          .filter(o => o.district === selectedDistrict)
          .map(o => o.name);
        return visits.filter(v => districtOfficers.includes(v.salesMan));
      }
      case ROLES.SALES_OFFICER:
        return visits.filter(v => v.salesMan === selectedSalesMan);
      default:
        return [];
    }
  }, [currentRole, selectedState, selectedDistrict, selectedSalesMan, visits]);

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
