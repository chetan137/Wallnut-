import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRole, ROLES } from '../../context/RoleContext';
import { Calendar, Search, X, ChevronDown, CheckSquare, Square, Filter } from 'lucide-react';
import './FilterBar.css';

export default function FilterBar() {
  const {
    currentRole,
    filters,
    setFilters,
    clearFilters,
    availableAreas,
    availableSalesMen,
    availableStockGroups,
    availableStockCategories,
    availableDealers,
    filteredSales
  } = useRole();

  // Dropdown open states
  const [activeDropdown, setActiveDropdown] = useState(null); // 'areas' | 'salesMen' | 'stockGroup' | 'stockCategory' | 'presets'
  const [dealerSearch, setDealerSearch] = useState('');
  const [showDealerSuggestions, setShowDealerSuggestions] = useState(false);

  // Search filter inputs inside multi-select dropdowns
  const [areaSearch, setAreaSearch] = useState('');
  const [salesManSearch, setSalesManSearch] = useState('');

  const dropdownRef = useRef(null);
  const dealerRef = useRef(null);

  // Auto-close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
      if (dealerRef.current && !dealerRef.current.contains(event.target)) {
        setShowDealerSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update dealerSearch text if filters.partyName is cleared externally
  useEffect(() => {
    if (!filters.partyName) {
      setDealerSearch('');
    } else {
      setDealerSearch(filters.partyName);
    }
  }, [filters.partyName]);

  // Compute anchor date from sales dataset to align presets relative to data timeframe (usually Apr-Jun 2025)
  const anchorDate = useMemo(() => {
    if (!filteredSales || filteredSales.length === 0) return new Date();
    const maxDateStr = filteredSales.reduce((max, r) => r.date > max ? r.date : max, '2025-06-28');
    return new Date(maxDateStr);
  }, [filteredSales]);

  // Handle Preset Clicks
  const applyPreset = (presetType) => {
    const year = anchorDate.getFullYear();
    const month = anchorDate.getMonth(); // 0-indexed
    let from = '';
    let to = '';

    const formatDate = (d) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    switch (presetType) {
      case 'this_month': {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        from = formatDate(firstDay);
        to = formatDate(lastDay);
        break;
      }
      case 'last_month': {
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0);
        from = formatDate(firstDay);
        to = formatDate(lastDay);
        break;
      }
      case 'this_quarter': {
        // Indian Financial Quarter logic (Q1: Apr-Jun, Q2: Jul-Sep, Q3: Oct-Dec, Q4: Jan-Mar)
        // Let's determine quarter based on the anchorDate month
        const qStartMonth = Math.floor(month / 3) * 3;
        const firstDay = new Date(year, qStartMonth, 1);
        const lastDay = new Date(year, qStartMonth + 3, 0);
        from = formatDate(firstDay);
        to = formatDate(lastDay);
        break;
      }
      case 'this_year': {
        // Indian Financial Year starts Apr 1st
        const fyStartYear = month >= 3 ? year : year - 1;
        const firstDay = new Date(fyStartYear, 3, 1);
        const lastDay = new Date(fyStartYear + 1, 3, 0);
        from = formatDate(firstDay);
        to = formatDate(lastDay);
        break;
      }
      default:
        break;
    }

    setFilters(prev => ({ ...prev, fromDate: from, toDate: to }));
    setActiveDropdown(null);
  };

  // Toggle multi-select item selection
  const handleMultiSelectToggle = (field, value) => {
    setFilters(prev => {
      const list = prev[field] || [];
      const updated = list.includes(value)
        ? list.filter(v => v !== value)
        : [...list, value];
      return { ...prev, [field]: updated };
    });
  };

  // Autocomplete dealer suggestions
  const filteredDealerSuggestions = useMemo(() => {
    if (!dealerSearch) return [];
    return availableDealers.filter(d =>
      d.toLowerCase().includes(dealerSearch.toLowerCase())
    );
  }, [dealerSearch, availableDealers]);

  const selectDealer = (dealer) => {
    setFilters(prev => ({ ...prev, partyName: dealer }));
    setDealerSearch(dealer);
    setShowDealerSuggestions(false);
  };

  const removeFilterVal = (field, valToRemove) => {
    setFilters(prev => {
      if (Array.isArray(prev[field])) {
        return { ...prev, [field]: prev[field].filter(v => v !== valToRemove) };
      }
      return { ...prev, [field]: '' };
    });
  };

  // Calculate Active Filter Count & Chips
  const activeChips = useMemo(() => {
    const chips = [];
    if (filters.fromDate || filters.toDate) {
      if (filters.fromDate && filters.toDate) {
        chips.push({ field: 'date', label: `${filters.fromDate} to ${filters.toDate}` });
      } else if (filters.fromDate) {
        chips.push({ field: 'fromDate', label: `From: ${filters.fromDate}` });
      } else {
        chips.push({ field: 'toDate', label: `To: ${filters.toDate}` });
      }
    }
    if (filters.areas && filters.areas.length > 0) {
      filters.areas.forEach(area => {
        chips.push({ field: 'areas', val: area, label: area });
      });
    }
    if (currentRole !== ROLES.SALES_OFFICER && filters.salesMen && filters.salesMen.length > 0) {
      filters.salesMen.forEach(sm => {
        chips.push({ field: 'salesMen', val: sm, label: sm });
      });
    }
    if (filters.stockGroup) {
      chips.push({ field: 'stockGroup', label: `Group: ${filters.stockGroup}` });
    }
    if (filters.stockCategory) {
      chips.push({ field: 'stockCategory', label: `Cat: ${filters.stockCategory}` });
    }
    if (filters.partyName) {
      chips.push({ field: 'partyName', label: `Dealer: ${filters.partyName}` });
    }
    return chips;
  }, [filters, currentRole]);

  const hasActiveFilters = activeChips.length > 0;

  // Filtered lists for dropdown menus
  const filteredAreas = availableAreas.filter(a =>
    a.toLowerCase().includes(areaSearch.toLowerCase())
  );

  const filteredSalesMen = availableSalesMen.filter(sm =>
    sm.toLowerCase().includes(salesManSearch.toLowerCase())
  );

  return (
    <div className="filter-bar-wrapper">
      <div className="filter-bar-container" ref={dropdownRef}>
        
        {/* Date From & Date To */}
        <div className="filter-group">
          <label className="filter-label">Date Range</label>
          <div className="date-range-inputs">
            <div className="date-input-box">
              <Calendar size={13} className="date-icon" />
              <input
                type="date"
                className="filter-date-field"
                value={filters.fromDate}
                onChange={e => setFilters(prev => ({ ...prev, fromDate: e.target.value }))}
              />
            </div>
            <span className="date-range-sep">to</span>
            <div className="date-input-box">
              <Calendar size={13} className="date-icon" />
              <input
                type="date"
                className="filter-date-field"
                value={filters.toDate}
                onChange={e => setFilters(prev => ({ ...prev, toDate: e.target.value }))}
              />
            </div>
            <button
              className="preset-dropdown-btn"
              onClick={() => setActiveDropdown(activeDropdown === 'presets' ? null : 'presets')}
              title="Date Presets"
            >
              <ChevronDown size={14} />
            </button>
          </div>

          {/* Presets Overlay */}
          {activeDropdown === 'presets' && (
            <div className="preset-dropdown-menu">
              <button onClick={() => applyPreset('this_month')}>This Month</button>
              <button onClick={() => applyPreset('last_month')}>Last Month</button>
              <button onClick={() => applyPreset('this_quarter')}>This Quarter</button>
              <button onClick={() => applyPreset('this_year')}>This Year</button>
            </div>
          )}
        </div>

        {/* Area / City Multi-Select Dropdown */}
        <div className="filter-group">
          <label className="filter-label">Area / City</label>
          <button
            className={`filter-dropdown-trigger ${filters.areas.length > 0 ? 'active' : ''}`}
            onClick={() => setActiveDropdown(activeDropdown === 'areas' ? null : 'areas')}
          >
            <span>
              {filters.areas.length === 0
                ? 'All Areas'
                : `Areas (${filters.areas.length})`}
            </span>
            <ChevronDown size={14} className="dropdown-arrow-icon" />
          </button>

          {activeDropdown === 'areas' && (
            <div className="filter-dropdown-panel">
              <div className="dropdown-search-wrapper">
                <Search size={12} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search areas..."
                  value={areaSearch}
                  onChange={e => setAreaSearch(e.target.value)}
                  className="dropdown-search-input"
                />
              </div>
              <div className="dropdown-options-list">
                {filteredAreas.length === 0 ? (
                  <div className="no-options">No areas found</div>
                ) : (
                  filteredAreas.map(area => {
                    const isChecked = filters.areas.includes(area);
                    return (
                      <div
                        key={area}
                        className="dropdown-option-row"
                        onClick={() => handleMultiSelectToggle('areas', area)}
                      >
                        {isChecked ? (
                          <CheckSquare size={14} className="checkbox-icon checked" />
                        ) : (
                          <Square size={14} className="checkbox-icon" />
                        )}
                        <span>{area}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sales Officer Multi-Select Dropdown (Hidden if role = Sales Officer) */}
        {currentRole !== ROLES.SALES_OFFICER && (
          <div className="filter-group">
            <label className="filter-label">Sales Officer</label>
            <button
              className={`filter-dropdown-trigger ${filters.salesMen.length > 0 ? 'active' : ''}`}
              onClick={() => setActiveDropdown(activeDropdown === 'salesMen' ? null : 'salesMen')}
            >
              <span>
                {filters.salesMen.length === 0
                  ? 'All Officers'
                  : `Officers (${filters.salesMen.length})`}
              </span>
              <ChevronDown size={14} className="dropdown-arrow-icon" />
            </button>

            {activeDropdown === 'salesMen' && (
              <div className="filter-dropdown-panel">
                <div className="dropdown-search-wrapper">
                  <Search size={12} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search officers..."
                    value={salesManSearch}
                    onChange={e => setSalesManSearch(e.target.value)}
                    className="dropdown-search-input"
                  />
                </div>
                <div className="dropdown-options-list">
                  {filteredSalesMen.length === 0 ? (
                    <div className="no-options">No officers found</div>
                  ) : (
                    filteredSalesMen.map(sm => {
                      const isChecked = filters.salesMen.includes(sm);
                      return (
                        <div
                          key={sm}
                          className="dropdown-option-row"
                          onClick={() => handleMultiSelectToggle('salesMen', sm)}
                        >
                          {isChecked ? (
                            <CheckSquare size={14} className="checkbox-icon checked" />
                          ) : (
                            <Square size={14} className="checkbox-icon" />
                          )}
                          <span>{sm}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stock Group Dropdown */}
        <div className="filter-group">
          <label className="filter-label">Stock Group</label>
          <select
            className="filter-select-field"
            value={filters.stockGroup}
            onChange={e => {
              const val = e.target.value;
              setFilters(prev => ({ ...prev, stockGroup: val, stockCategory: '' }));
            }}
          >
            <option value="">All Groups</option>
            {availableStockGroups.map(group => (
              <option key={group} value={group}>{group}</option>
            ))}
          </select>
        </div>

        {/* Stock Category Dropdown (Dependent on Stock Group) */}
        <div className="filter-group">
          <label className="filter-label">Stock Category</label>
          <select
            className="filter-select-field"
            value={filters.stockCategory}
            onChange={e => setFilters(prev => ({ ...prev, stockCategory: e.target.value }))}
            disabled={!filters.stockGroup}
            title={!filters.stockGroup ? "Select a Stock Group first" : ""}
          >
            <option value="">All Categories</option>
            {availableStockCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Searchable Dealer (Party Name) */}
        <div className="filter-group party-name-filter" ref={dealerRef}>
          <label className="filter-label">Dealer (Party Name)</label>
          <div className="dealer-search-box">
            <Search size={13} className="search-icon" />
            <input
              type="text"
              placeholder="Search dealer..."
              className="filter-dealer-input"
              value={dealerSearch}
              onChange={e => {
                setDealerSearch(e.target.value);
                setShowDealerSuggestions(true);
                if (!e.target.value) {
                  setFilters(prev => ({ ...prev, partyName: '' }));
                }
              }}
              onFocus={() => setShowDealerSuggestions(true)}
            />
            {filters.partyName && (
              <button
                className="clear-dealer-btn"
                onClick={() => {
                  setFilters(prev => ({ ...prev, partyName: '' }));
                  setDealerSearch('');
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Autocomplete suggestions dropdown */}
          {showDealerSuggestions && dealerSearch && filteredDealerSuggestions.length > 0 && (
            <div className="dealer-suggestions-panel">
              {filteredDealerSuggestions.map(dealer => (
                <div
                  key={dealer}
                  className="dealer-suggestion-row"
                  onClick={() => selectDealer(dealer)}
                >
                  {dealer}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Active Chips & Clear Filters Panel */}
      {hasActiveFilters && (
        <div className="active-filters-chips-row">
          <div className="filter-status-prefix">
            <Filter size={12} className="filter-icon" />
            <span className="badge">{activeChips.length} active</span>
          </div>

          <div className="chips-container">
            {activeChips.map((chip, index) => (
              <div className="filter-chip" key={`${chip.field}-${index}`}>
                <span>{chip.label}</span>
                <button
                  className="chip-remove-btn"
                  onClick={() => removeFilterVal(chip.field, chip.val)}
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>

          <button className="clear-all-filters-btn" onClick={clearFilters}>
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
