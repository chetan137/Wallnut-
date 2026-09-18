import React, { useState, useMemo, useEffect } from 'react';
import { PhoneCall, MapPin, X, Calendar, User, FileText, CheckCircle2, Check, Filter, Plus, ArrowLeft, Building } from 'lucide-react';
import { useRole } from '../../context/RoleContext';

// Clean awkward plant / godown strings into clean geographic names
export const cleanDistrictName = (district) => {
  if (!district) return '';
  const d = district.replace(/\s*(Plant|Godown|Warehouse|Location|Branch)\s*/gi, '').trim();
  if (['main', 'amazon', 'head office'].includes(d.toLowerCase())) {
    return '';
  }
  return d;
};

// Infer state from known cities/districts if state is blank
export const inferStateFromLocation = (district, state) => {
  if (state && state.trim()) return state.trim();
  if (!district) return '';
  const dl = district.toLowerCase();
  if (dl.includes('kolhapur') || dl.includes('mumbai') || dl.includes('pune') || dl.includes('nashik') || dl.includes('bhiwandi')) return 'Maharashtra';
  if (dl.includes('vadodara') || dl.includes('ahmedabad') || dl.includes('surat') || dl.includes('rajkot')) return 'Gujarat';
  if (dl.includes('ernakulam') || dl.includes('kochi') || dl.includes('calicut') || dl.includes('thrissur') || dl.includes('thiruvananthapuram')) return 'Kerala';
  if (dl.includes('bangalore') || dl.includes('bengaluru')) return 'Karnataka';
  if (dl.includes('indore') || dl.includes('bhopal') || dl.includes('jabalpur')) return 'Madhya Pradesh';
  if (dl.includes('chennai') || dl.includes('coimbatore')) return 'Tamil Nadu';
  if (dl.includes('lucknow') || dl.includes('kanpur') || dl.includes('varanasi') || dl.includes('noida')) return 'Uttar Pradesh';
  return '';
};

export const formatLocationLabel = (district, state) => {
  const cleanDist = cleanDistrictName(district);
  const detectedState = inferStateFromLocation(district, state);
  if (cleanDist && detectedState && cleanDist.toLowerCase() !== detectedState.toLowerCase()) {
    return `${cleanDist}, ${detectedState}`;
  }
  return cleanDist || detectedState || '';
};

export default function LogSalesCallModal({ isOpen, onClose, defaultOfficer = '', defaultDistrict = '', defaultState = '' }) {
  const { allDealers, allSalesOfficers, allStates, addVisitEntry, currentRole, roleConfig, selectedState: globalState } = useRole();

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Officer list sanitized: clean godown/plant names into cities/states, merge duplicates (e.g. Kamlesh Dave and Mr. Kamlesh Dave)
  const sanitizedOfficers = useMemo(() => {
    const map = new Map();

    (allSalesOfficers || []).forEach(o => {
      if (!o?.name) return;
      const rawName = o.name.trim();
      if (/branch|godown|warehouse|location/i.test(rawName)) return;

      const baseName = rawName.replace(/^mr\.?\s+/i, '').trim();
      const preferredName = rawName.startsWith('Mr. ') ? rawName : `Mr. ${baseName}`;

      const existing = map.get(baseName.toLowerCase());
      const detectedState = inferStateFromLocation(o.district, o.state);
      const cleanLoc = formatLocationLabel(o.district, detectedState);

      if (!existing) {
        map.set(baseName.toLowerCase(), {
          name: preferredName,
          rawName: rawName,
          district: cleanDistrictName(o.district),
          state: detectedState,
          cleanLocation: cleanLoc,
          cleanState: detectedState,
        });
      } else {
        if (!existing.state && detectedState) {
          existing.state = detectedState;
          existing.cleanState = detectedState;
          existing.cleanLocation = formatLocationLabel(existing.district || o.district, detectedState);
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allSalesOfficers]);

  // Initial officer resolution
  const initialOfficer = useMemo(() => {
    if (defaultOfficer) return defaultOfficer;
    if (roleConfig?.scope) {
      const match = sanitizedOfficers.find(o => o.name === roleConfig.scope || o.rawName === roleConfig.scope);
      if (match) return match.name;
    }
    return '';
  }, [defaultOfficer, roleConfig, sanitizedOfficers]);

  // Main form state
  const [form, setForm] = useState({
    dealer: '',
    salesMan: initialOfficer,
    date: todayStr,
    callType: 'Phone Call',
    purpose: 'Payment Follow-up',
    notes: '',
  });

  // State filtering for dealers
  const [selectedStateFilter, setSelectedStateFilter] = useState(() => {
    return defaultState || globalState || 'ALL';
  });

  // Custom / Unlisted dealer entry mode
  const [isCustomDealer, setIsCustomDealer] = useState(false);
  const [customDealer, setCustomDealer] = useState({
    name: '',
    city: defaultDistrict || '',
    state: defaultState || globalState || 'Maharashtra',
  });

  // Custom / Unlisted sales officer entry mode
  const [isCustomOfficer, setIsCustomOfficer] = useState(false);
  const [customOfficerName, setCustomOfficerName] = useState('');

  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);

  // Sync state filter when modal opens or defaultState changes
  useEffect(() => {
    if (isOpen) {
      if (defaultState) {
        setSelectedStateFilter(defaultState);
      } else if (globalState && globalState !== 'All') {
        setSelectedStateFilter(globalState);
      }
      if (initialOfficer) {
        setForm(f => ({ ...f, salesMan: initialOfficer }));
        const match = sanitizedOfficers.find(o => o.name === initialOfficer || o.rawName === initialOfficer);
        if (match && match.cleanState && !defaultState) {
          setSelectedStateFilter(match.cleanState);
        }
      }
    }
  }, [isOpen, defaultState, globalState, initialOfficer, sanitizedOfficers]);

  // Count dealers per state for the state selector
  const stateCounts = useMemo(() => {
    const counts = {};
    (allDealers || []).forEach(d => {
      const st = inferStateFromLocation(d.district, d.state) || 'Other';
      counts[st] = (counts[st] || 0) + 1;
    });
    return counts;
  }, [allDealers]);

  // Distinct states with dealers
  const distinctStatesWithDealers = useMemo(() => {
    const set = new Set((allStates || []).filter(Boolean));
    Object.keys(stateCounts).forEach(s => {
      if (s && s !== 'Other') set.add(s);
    });
    return Array.from(set).sort();
  }, [allStates, stateCounts]);

  // Filtered dealers list based on selectedStateFilter
  const filteredDealers = useMemo(() => {
    let list = allDealers || [];

    if (selectedStateFilter && selectedStateFilter !== 'ALL') {
      list = list.filter(d => {
        const dealerState = inferStateFromLocation(d.district, d.state);
        return dealerState.toLowerCase() === selectedStateFilter.toLowerCase();
      });
    }

    return list
      .map(d => {
        const dState = inferStateFromLocation(d.district, d.state);
        const cleanLoc = formatLocationLabel(d.district, dState);
        return {
          ...d,
          cleanLocation: cleanLoc,
          cleanState: dState,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allDealers, selectedStateFilter]);

  if (!isOpen) return null;

  const handleClose = () => {
    setIsSuccess(false);
    setSubmittedData(null);
    setIsCustomDealer(false);
    setIsCustomOfficer(false);
    setCustomOfficerName('');
    setCustomDealer({ name: '', city: '', state: defaultState || globalState || 'Maharashtra' });
    setForm({
      dealer: '',
      salesMan: initialOfficer,
      date: todayStr,
      callType: 'Phone Call',
      purpose: 'Payment Follow-up',
      notes: '',
    });
    onClose();
  };

  const handleOfficerSelect = (e) => {
    const val = e.target.value;
    if (val === '__custom_officer__') {
      setIsCustomOfficer(true);
      setForm(f => ({ ...f, salesMan: '' }));
    } else {
      setForm(f => ({ ...f, salesMan: val }));
      const found = sanitizedOfficers.find(o => o.name === val || o.rawName === val);
      if (found && found.cleanState) {
        setSelectedStateFilter(found.cleanState);
      }
    }
  };

  const handleDealerSelect = (e) => {
    const val = e.target.value;
    if (val === '__custom__') {
      setIsCustomDealer(true);
      setForm(f => ({ ...f, dealer: '' }));
    } else {
      setForm(f => ({ ...f, dealer: val }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dealerName = isCustomDealer ? customDealer.name.trim() : form.dealer;
    const officerName = isCustomOfficer ? customOfficerName.trim() : form.salesMan;
    if (!dealerName || !officerName || !form.date || !form.purpose) return;

    const matchedDealer = (allDealers || []).find(d => d.name === dealerName);
    const resolvedDistrict = isCustomDealer
      ? (customDealer.city.trim() || 'General')
      : cleanDistrictName(matchedDealer?.district) || defaultDistrict || 'General';

    const resolvedState = isCustomDealer
      ? (customDealer.state || (selectedStateFilter !== 'ALL' ? selectedStateFilter : defaultState || 'General'))
      : (inferStateFromLocation(matchedDealer?.district, matchedDealer?.state) || (selectedStateFilter !== 'ALL' ? selectedStateFilter : defaultState || 'General'));

    const recordToSave = {
      dealer: dealerName,
      salesMan: officerName,
      callerRole: currentRole,
      district: resolvedDistrict,
      state: resolvedState,
      date: form.date,
      callType: form.callType,
      purpose: form.purpose,
      notes: form.notes,
      status: 'Completed',
    };

    addVisitEntry(recordToSave);
    setSubmittedData(recordToSave);
    setIsSuccess(true);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '12px',
        backdropFilter: 'blur(4px)',
      }}
      onClick={handleClose}
    >
      <div
        style={{
          backgroundColor: 'var(--card-bg, #ffffff)',
          border: '1px solid var(--card-border, #e2e8f0)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '540px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div
          style={{
            padding: '14px 18px',
            background: 'var(--surface-dark, #1e293b)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PhoneCall size={16} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 600, color: '#ffffff' }}>
                Log Daily Sales Call / Visit
              </h3>
              <p style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.75)', margin: '2px 0 0 0' }}>
                Record daily dealer interactions across all territories
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
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

        {/* Success Confirmation View */}
        {isSuccess ? (
          <div
            style={{
              padding: '36px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--card-bg, #ffffff)',
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'rgba(34, 197, 94, 0.15)',
                color: 'var(--success, #16a34a)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14,
              }}
            >
              <CheckCircle2 size={34} />
            </div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.18rem', color: 'var(--text-primary)' }}>
              Call Logged Successfully!
            </h3>
            <p style={{ margin: '0 0 14px 0', color: 'var(--text-secondary)', fontSize: '0.86rem', maxWidth: 360 }}>
              Entry for <strong style={{ color: 'var(--accent-primary)' }}>{submittedData?.dealer}</strong> ({submittedData?.callType}) saved to daily records.
            </p>
            <div
              style={{
                background: 'var(--bg-secondary, #f8fafc)',
                border: '1px solid var(--card-border, #e2e8f0)',
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '0.82rem',
                textAlign: 'left',
                width: '100%',
                maxWidth: 380,
                marginBottom: 18,
                display: 'flex',
                flexDirection: 'column',
                gap: 5,
              }}
            >
              <div><strong>Dealer:</strong> {submittedData?.dealer}</div>
              <div><strong>Location:</strong> {submittedData?.district}, {submittedData?.state}</div>
              <div><strong>Date:</strong> {submittedData?.date}</div>
              <div><strong>Purpose:</strong> {submittedData?.purpose}</div>
              <div><strong>Sales Officer:</strong> {submittedData?.salesMan}</div>
              {submittedData?.notes && <div><strong>Notes:</strong> {submittedData?.notes}</div>}
            </div>
            <button
              type="button"
              className="modal-btn-submit visit"
              onClick={handleClose}
              style={{ padding: '8px 24px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Check size={16} /> Done
            </button>
          </div>
        ) : (
          /* Scrollable Form Body */
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div
              style={{
                padding: '16px 18px',
                overflowY: 'auto',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 13,
              }}
            >
              {/* Interaction Type Selection */}
              <div className="login-field">
                <label className="login-label">Interaction Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, callType: 'Phone Call' }))}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '9px',
                      borderRadius: 8,
                      border: form.callType === 'Phone Call' ? '2px solid var(--accent-primary)' : '1px solid var(--card-border)',
                      background: form.callType === 'Phone Call' ? 'rgba(217, 119, 6, 0.08)' : 'var(--bg-secondary)',
                      color: form.callType === 'Phone Call' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      fontWeight: form.callType === 'Phone Call' ? 600 : 500,
                      cursor: 'pointer',
                      fontSize: '13px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <PhoneCall size={15} /> Phone Call
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, callType: 'Store Visit' }))}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '9px',
                      borderRadius: 8,
                      border: form.callType === 'Store Visit' ? '2px solid var(--accent-primary)' : '1px solid var(--card-border)',
                      background: form.callType === 'Store Visit' ? 'rgba(217, 119, 6, 0.08)' : 'var(--bg-secondary)',
                      color: form.callType === 'Store Visit' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      fontWeight: form.callType === 'Store Visit' ? 600 : 500,
                      cursor: 'pointer',
                      fontSize: '13px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <MapPin size={15} /> Store Visit
                  </button>
                </div>
              </div>

              {/* Date */}
              <div className="login-field">
                <label className="login-label">Date</label>
                <input
                  type="date"
                  className="login-input"
                  value={form.date}
                  onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
                  required
                />
              </div>

              {/* Sales Officer / Caller */}
              <div className="login-field">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <label className="login-label" style={{ margin: 0 }}>
                    Caller / Sales Officer
                  </label>
                  {!isCustomOfficer ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomOfficer(true);
                        setForm(f => ({ ...f, salesMan: '' }));
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--accent-primary, #d97706)',
                        fontSize: '11.5px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        fontWeight: 600,
                        padding: '2px 0',
                      }}
                    >
                      <Plus size={12} /> Add New Officer
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsCustomOfficer(false)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--accent-primary, #d97706)',
                        fontSize: '11.5px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        fontWeight: 600,
                        padding: '2px 0',
                      }}
                    >
                      <ArrowLeft size={12} /> Choose Existing Officer
                    </button>
                  )}
                </div>

                {!isCustomOfficer ? (
                  <select
                    className="login-input"
                    value={form.salesMan}
                    onChange={handleOfficerSelect}
                    required
                  >
                    <option value="">Select Sales Officer...</option>
                    {sanitizedOfficers.map(o => (
                      <option key={o.name} value={o.name}>
                        {o.name} {o.cleanLocation ? `(${o.cleanLocation})` : ''}
                      </option>
                    ))}
                    {form.salesMan && !sanitizedOfficers.some(o => o.name === form.salesMan) && (
                      <option value={form.salesMan}>{form.salesMan}</option>
                    )}
                    <option value="__custom_officer__">
                      ➕ + Enter New / Other Sales Officer Name...
                    </option>
                  </select>
                ) : (
                  <div
                    style={{
                      background: 'rgba(217, 119, 6, 0.04)',
                      border: '1px dashed var(--accent-primary, #d97706)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                    }}
                  >
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary, #d97706)' }}>
                      New Sales Officer / Representative Full Name
                    </span>
                    <input
                      type="text"
                      className="login-input"
                      placeholder="e.g. Mr. Rahul Sharma"
                      value={customOfficerName}
                      onChange={(e) => setCustomOfficerName(e.target.value)}
                      required
                      style={{ marginTop: 4 }}
                    />
                  </div>
                )}
              </div>

              {/* State Territory Filter (Unlocked: allows choosing any state or All States) */}
              <div
                style={{
                  background: 'var(--bg-secondary, #f8fafc)',
                  border: '1px solid var(--card-border, #e2e8f0)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <Filter size={12} style={{ color: 'var(--accent-primary)' }} />
                    Filter Dealers Territory by State
                  </label>
                  <span style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: 500 }}>
                    {filteredDealers.length} {filteredDealers.length === 1 ? 'Dealer' : 'Dealers'} available
                  </span>
                </div>
                <select
                  className="login-input"
                  value={selectedStateFilter}
                  onChange={(e) => setSelectedStateFilter(e.target.value)}
                  style={{
                    fontSize: '12.5px',
                    padding: '7px 10px',
                    background: 'var(--card-bg, #ffffff)',
                    borderColor: selectedStateFilter !== 'ALL' ? 'var(--accent-primary)' : 'var(--card-border)',
                  }}
                >
                  <option value="ALL">🌐 All States (All {allDealers.length} Active Dealers)</option>
                  {distinctStatesWithDealers.map(stateName => (
                    <option key={stateName} value={stateName}>
                      📍 {stateName} ({stateCounts[stateName] || 0} Dealers)
                    </option>
                  ))}
                </select>
              </div>

              {/* Dealer / Party Selection */}
              <div className="login-field">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <label className="login-label" style={{ margin: 0 }}>
                    Dealer / Party Name
                  </label>
                  {!isCustomDealer ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomDealer(true);
                        setForm(f => ({ ...f, dealer: '' }));
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--accent-primary)',
                        fontSize: '11.5px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        fontWeight: 600,
                        padding: '2px 0',
                      }}
                    >
                      <Plus size={12} /> Add Unlisted Dealer
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsCustomDealer(false)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--accent-primary)',
                        fontSize: '11.5px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        fontWeight: 600,
                        padding: '2px 0',
                      }}
                    >
                      <ArrowLeft size={12} /> Choose Existing List
                    </button>
                  )}
                </div>

                {!isCustomDealer ? (
                  <select
                    className="login-input"
                    value={form.dealer}
                    onChange={handleDealerSelect}
                    required
                  >
                    <option value="">
                      Select Dealer / Party ({filteredDealers.length} in {selectedStateFilter === 'ALL' ? 'All States' : selectedStateFilter})...
                    </option>
                    {filteredDealers.map(d => (
                      <option key={d.name} value={d.name}>
                        {d.name} {d.cleanLocation ? `(${d.cleanLocation})` : ''}
                      </option>
                    ))}
                    <option value="__custom__">
                      ➕ + Enter New / Other Dealer Name (Not Listed)...
                    </option>
                  </select>
                ) : (
                  /* Custom Unlisted Dealer Card */
                  <div
                    style={{
                      background: 'rgba(217, 119, 6, 0.04)',
                      border: '1px dashed var(--accent-primary)',
                      borderRadius: '8px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>
                        New Prospect / Unlisted Store Name
                      </span>
                      <input
                        type="text"
                        className="login-input"
                        placeholder="e.g. Shree Ram Hardware & Sanitary"
                        value={customDealer.name}
                        onChange={(e) => setCustomDealer(cd => ({ ...cd, name: e.target.value }))}
                        required
                        style={{ marginTop: 4 }}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>City / District</span>
                        <input
                          type="text"
                          className="login-input"
                          placeholder="e.g. Surat / Kolhapur"
                          value={customDealer.city}
                          onChange={(e) => setCustomDealer(cd => ({ ...cd, city: e.target.value }))}
                          style={{ marginTop: 3, fontSize: '12px', padding: '7px 9px' }}
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>State</span>
                        <select
                          className="login-input"
                          value={customDealer.state}
                          onChange={(e) => setCustomDealer(cd => ({ ...cd, state: e.target.value }))}
                          style={{ marginTop: 3, fontSize: '12px', padding: '7px 9px' }}
                        >
                          {distinctStatesWithDealers.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Purpose */}
              <div className="login-field">
                <label className="login-label">Purpose of Call / Visit</label>
                <select
                  className="login-input"
                  value={form.purpose}
                  onChange={(e) => setForm(f => ({ ...f, purpose: e.target.value }))}
                  required
                >
                  <option value="Payment Follow-up">Payment Follow-up / Collection</option>
                  <option value="New Order Pitching">New Order Pitching / Booking</option>
                  <option value="Product Demonstration & Feedback">Product Demonstration & Feedback</option>
                  <option value="Stock & Inventory Check">Stock & Inventory Check</option>
                  <option value="Routine Courtesy Check-in">Routine Courtesy Check-in</option>
                  <option value="Complaint & Resolution">Complaint & Issue Resolution</option>
                </select>
              </div>

              {/* Discussion Notes */}
              <div className="login-field">
                <label className="login-label">Discussion Notes (Optional)</label>
                <textarea
                  className="login-input"
                  rows="2"
                  placeholder="Details of discussion, payment commitments, order quantities discussed..."
                  value={form.notes}
                  onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>

            {/* Fixed Sticky Footer - Always Visible */}
            <div
              style={{
                padding: '12px 18px',
                background: 'var(--bg-secondary, #f8fafc)',
                borderTop: '1px solid var(--card-border, #e2e8f0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '10px',
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                className="modal-btn-cancel"
                onClick={handleClose}
                style={{ padding: '8px 16px', borderRadius: 6 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="modal-btn-submit visit"
                style={{
                  padding: '8px 20px',
                  borderRadius: 6,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontWeight: 600,
                }}
              >
                <CheckCircle2 size={15} /> Submit Call Log
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
