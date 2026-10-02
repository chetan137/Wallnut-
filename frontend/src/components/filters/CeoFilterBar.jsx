import { useEffect, useMemo, useState } from 'react';
import { Calendar, Search, X } from 'lucide-react';
import { buildOptions, updateCeoFilter, hasCeoFilters, EMPTY_CEO_FILTERS } from '../../utils/ceoFilters';
import './CeoFilterBar.css';

/**
 * Filters of the CEO dashboard. Everything on the page (cards, charts, tables and the
 * click-through lists) follows them. State -> District -> City narrow each other, and the
 * Sales Officer and Dealer lists only show what is left of the chosen place.
 *
 * `fyRange` = { min, max } (YYYY-MM-DD) of the selected Financial Year, or null for All Years.
 */
export default function CeoFilterBar({ filters, setFilters, dealerIndex, fyRange }) {
  const options = useMemo(() => buildOptions(dealerIndex, filters), [dealerIndex, filters]);
  const set = (key, value) => setFilters((prev) => updateCeoFilter(prev, key, value, dealerIndex));
  const active = hasCeoFilters(filters);
  // What is typed in the dealer box; only a full dealer name becomes a filter.
  const [dealerText, setDealerText] = useState(filters.dealer);
  useEffect(() => { setDealerText(filters.dealer); }, [filters.dealer]);

  const select = (label, key, items, allLabel, getValue = (x) => x, getLabel = (x) => x) => (
    <label className="ceo-filter">
      <span className="ceo-filter-label">{label}</span>
      <select className="ceo-filter-control" value={filters[key]} onChange={(e) => set(key, e.target.value)}>
        <option value="">{allLabel}</option>
        {items.map((x) => <option key={getValue(x)} value={getValue(x)}>{getLabel(x)}</option>)}
      </select>
    </label>
  );

  return (
    <div className="ceo-filter-bar" id="ceo-filter-bar">
      <div className="ceo-filter ceo-filter-dates">
        <span className="ceo-filter-label">Date Range{fyRange ? ' (within the Financial Year)' : ''}</span>
        <div className="ceo-filter-date-row">
          <span className="ceo-filter-date">
            <Calendar size={13} />
            <input type="date" value={filters.fromDate} min={fyRange?.min} max={filters.toDate || fyRange?.max}
              onChange={(e) => set('fromDate', e.target.value)} aria-label="From date" />
          </span>
          <span className="ceo-filter-to">to</span>
          <span className="ceo-filter-date">
            <Calendar size={13} />
            <input type="date" value={filters.toDate} min={filters.fromDate || fyRange?.min} max={fyRange?.max}
              onChange={(e) => set('toDate', e.target.value)} aria-label="To date" />
          </span>
        </div>
      </div>

      {select('State', 'state', options.states, 'All India')}
      {select('District', 'district', options.districts, 'All Districts')}
      {select('City', 'city', options.cities, 'All Cities')}
      {select('Sales Officer', 'officer', options.officers, 'All Officers', (o) => o.key, (o) => o.name)}

      <div className="ceo-filter ceo-filter-dealer">
        <span className="ceo-filter-label">Dealer</span>
        <div className="ceo-filter-search">
          <Search size={13} />
          <input
            list="ceo-dealer-options"
            placeholder="Type a dealer name…"
            value={dealerText}
            onChange={(e) => {
              const v = e.target.value;
              setDealerText(v);
              if (!v) set('dealer', '');
              else if (options.dealers.includes(v)) set('dealer', v);
            }}
          />
          {dealerText && (
            <button type="button" className="ceo-filter-clear-x" onClick={() => { setDealerText(''); set('dealer', ''); }} aria-label="Clear dealer"><X size={13} /></button>
          )}
          <datalist id="ceo-dealer-options">
            {options.dealers.map((d) => <option key={d} value={d} />)}
          </datalist>
        </div>
      </div>

      <button type="button" className="ceo-filter-clear" disabled={!active} onClick={() => setFilters({ ...EMPTY_CEO_FILTERS })}>
        Clear
      </button>
    </div>
  );
}
