import { useState, useEffect, useMemo, useRef } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { feature } from 'topojson-client';
import { abbreviateCurrency, formatPercent, formatNumber } from '../../utils/formatters';
import { getStatePerformanceForMap, getDistrictPerformanceForMap } from '../../utils/dataProcessors';
import { Landmark, TrendingUp, DollarSign, Users, AlertCircle } from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import './IndiaMap.css';

// Translation map for district names from sales data -> TopoJSON
const DISTRICT_NAME_MAP = {
  'Mangaluru': 'Dakshina Kannada',
  'Hubli': 'Dharwad',
  'Ahmedabad': 'Ahmadabad'
};

const STATE_MAP_CONFIGS = {
  'Madhya Pradesh': { center: [78.5, 23.5], scale: 3200 },
  'Maharashtra': { center: [76.5, 19.3], scale: 2800 },
  'Karnataka': { center: [76.3, 14.8], scale: 3200 },
  'Kerala': { center: [76.5, 10.5], scale: 5000 },
  'Tamil Nadu': { center: [78.8, 10.8], scale: 3800 },
  'Gujarat': { center: [71.8, 22.3], scale: 3200 },
  'Rajasthan': { center: [73.8, 26.3], scale: 2800 },
};

const STATE_SLUGS = {
  'Madhya Pradesh': 'madhya-pradesh',
  'Maharashtra': 'maharashtra',
  'Karnataka': 'karnataka',
  'Kerala': 'kerala',
  'Tamil Nadu': 'tamil-nadu',
  'Gujarat': 'gujarat',
  'Rajasthan': 'rajasthan'
};

export default function IndiaMap({ data, isNational = true, defaultState = 'Madhya Pradesh' }) {
  const [activeMetric, setActiveMetric] = useState('sales'); // 'sales' | 'outstanding'
  const { selectedState, setSelectedState } = useRole();
  const activeState = isNational ? defaultState : selectedState;
  const [geoData, setGeoData] = useState(null);
  const [hoveredGeo, setHoveredGeo] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);


  const stateSlug = useMemo(() => STATE_SLUGS[activeState] || 'madhya-pradesh', [activeState]);

  // Aggregate metrics
  const regionMetrics = useMemo(() => {
    if (isNational) {
      return getStatePerformanceForMap(data);
    } else {
      return getDistrictPerformanceForMap(data, activeState);
    }
  }, [data, isNational, activeState]);

  // Max value for scale calculation
  const maxVal = useMemo(() => {
    const values = Object.values(regionMetrics).map(m => 
      activeMetric === 'sales' ? m.totalSales : m.outstanding
    );
    return Math.max(...values, 1);
  }, [regionMetrics, activeMetric]);

  // Fetch and decode TopoJSON map data
  useEffect(() => {
    const mapUrl = isNational ? '/maps/india-states.json' : `/maps/${stateSlug}.json`;
    
    setGeoData(null); // Clear previous data
    
    fetch(mapUrl)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(topojsonObj => {
        const objectKey = isNational ? 'IND_adm1' : stateSlug;
        if (!topojsonObj.objects[objectKey]) {
          console.error(`Object key "${objectKey}" not found in TopoJSON objects:`, Object.keys(topojsonObj.objects));
          return;
        }
        const geojson = feature(topojsonObj, topojsonObj.objects[objectKey]);
        setGeoData(geojson.features);
      })
      .catch(err => console.error("Error loading map:", err));
  }, [isNational, stateSlug]);

  // Dynamic projection configuration
  const projectionConfig = useMemo(() => {
    if (isNational) {
      return {
        scale: 780,
        center: [78.9629, 22.5937] // Center of India
      };
    } else {
      const config = STATE_MAP_CONFIGS[activeState] || { center: [78.9, 22.5], scale: 1500 };
      return {
        scale: config.scale,
        center: config.center
      };
    }
  }, [isNational, activeState]);

  // Helper to color geometries
  const getColor = (value) => {
    if (value === 0 || value == null) {
      return 'var(--map-empty, #EDECE4)';
    }
    const ratio = Math.min(value / maxVal, 1);
    
    if (activeMetric === 'sales') {
      // Light green (#F0F7E6) -> Leaf green (#82B22C)
      const r = Math.round(240 - (240 - 130) * ratio);
      const g = Math.round(247 - (247 - 178) * ratio);
      const b = Math.round(230 - (230 - 44) * ratio);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // Light terracotta (#FDF3EB) -> Terracotta/Clay (#C8742C)
      const r = Math.round(253 - (253 - 200) * ratio);
      const g = Math.round(243 - (243 - 116) * ratio);
      const b = Math.round(235 - (235 - 44) * ratio);
      return `rgb(${r}, ${g}, ${b})`;
    }
  };

  const handleMouseMove = (e) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      // Position relative to container
      setTooltipPos({
        x: e.clientX - rect.left + 15,
        y: e.clientY - rect.top + 15
      });
    }
  };

  // State switcher dropdown for State Sales Head (in case we want to preview other states)
  const availableStates = Object.keys(STATE_SLUGS);

  return (
    <div className="map-card" ref={containerRef} id={isNational ? "ceo-india-map" : "ssh-state-map"}>
      {/* Map Header */}
      <div className="map-card-header">
        <div className="map-card-title-group">
          <Landmark className="map-card-icon" size={18} />
          <div>
            <h3 className="map-card-title">
              {isNational ? "All-India Sales Performance Map" : `${activeState} Territory Map`}
            </h3>
            <span className="map-card-subtitle">
              {isNational 
                ? "Geographical sales & outstanding analytics across state branches" 
                : "District-level sales concentration and target performance"}
            </span>
          </div>
        </div>

        <div className="map-controls">
          {/* State selection for state head preview */}
          {!isNational && (
            <select 
              value={activeState} 
              onChange={(e) => setSelectedState(e.target.value)}
              className="map-state-select"
              id="map-state-scope"
            >
              {availableStates.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          )}

          {/* Metric Selector Toggles */}
          <div className="map-metric-toggles">
            <button
              onClick={() => setActiveMetric('sales')}
              className={`map-metric-btn sales ${activeMetric === 'sales' ? 'active' : ''}`}
            >
              Sales
            </button>
            <button
              onClick={() => setActiveMetric('outstanding')}
              className={`map-metric-btn oustanding ${activeMetric === 'outstanding' ? 'active' : ''}`}
            >
              Outstanding
            </button>
          </div>
        </div>
      </div>

      {/* Map Content */}
      <div className="map-body">
        {geoData ? (
          <ComposableMap
            projection="geoMercator"
            projectionConfig={projectionConfig}
            width={600}
            height={420}
            style={{ width: '100%', height: 'auto', maxHeight: '420px' }}
          >
            <Geographies geography={geoData}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const geoName = isNational ? geo.properties.NAME_1 : geo.properties.district;
                  const lookupName = isNational ? geoName : (DISTRICT_NAME_MAP[geoName] || geoName);
                  const m = regionMetrics[lookupName];
                  const value = m ? (activeMetric === 'sales' ? m.totalSales : m.outstanding) : 0;
                  const fill = getColor(value);

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={fill}
                      stroke="#FFFFFF"
                      strokeWidth={1}
                      style={{
                        default: { outline: 'none', transition: 'fill 0.2s ease' },
                        hover: { 
                          fill: activeMetric === 'sales' ? 'var(--accent-primary)' : 'var(--accent-secondary)', 
                          stroke: '#13170F',
                          strokeWidth: 1.5,
                          outline: 'none', 
                          cursor: 'pointer' 
                        },
                        pressed: { outline: 'none' }
                      }}
                      onMouseEnter={(e) => {
                        setHoveredGeo({
                          name: geoName,
                          lookupName,
                          metrics: m || {
                            totalSales: 0,
                            outstanding: 0,
                            dealers: 0,
                            targetPct: 0,
                            topCategory: 'N/A'
                          }
                        });
                        handleMouseMove(e);
                      }}
                      onMouseMove={handleMouseMove}
                      onMouseLeave={() => setHoveredGeo(null)}
                    />
                  );
                })
              }
            </Geographies>
          </ComposableMap>
        ) : (
          <div className="map-loading">
            <div className="map-spinner"></div>
            <span>Loading map data...</span>
          </div>
        )}

        {/* Legend */}
        {geoData && (
          <div className="map-legend">
            <span className="legend-label">Low</span>
            <div className={`legend-bar ${activeMetric}`}></div>
            <span className="legend-label">High ({abbreviateCurrency(maxVal)})</span>
          </div>
        )}

        {/* Floating Custom Tooltip */}
        {hoveredGeo && (
          <div 
            className="map-tooltip"
            style={{ 
              left: `${tooltipPos.x}px`, 
              top: `${tooltipPos.y}px` 
            }}
          >
            <div className="tooltip-header">
              <span className="tooltip-title">{hoveredGeo.name}</span>
              <span className="tooltip-tag">
                {isNational ? 'State Branch' : 'District'}
              </span>
            </div>
            
            <div className="tooltip-body">
              <div className="tooltip-row">
                <span className="tooltip-label">
                  <TrendingUp size={12} className="text-muted" /> Total Sales
                </span>
                <span className="tooltip-value font-mono">
                  {abbreviateCurrency(hoveredGeo.metrics.totalSales)}
                </span>
              </div>
              <div className="tooltip-row">
                <span className="tooltip-label">
                  <DollarSign size={12} className="text-muted" /> Outstanding
                </span>
                <span className={`tooltip-value font-mono ${hoveredGeo.metrics.outstanding > 500000 ? 'text-terracotta' : ''}`}>
                  {abbreviateCurrency(hoveredGeo.metrics.outstanding)}
                </span>
              </div>
              <div className="tooltip-row">
                <span className="tooltip-label">
                  <Users size={12} className="text-muted" /> Active Dealers
                </span>
                <span className="tooltip-value font-mono">
                  {formatNumber(hoveredGeo.metrics.dealers)}
                </span>
              </div>
              <div className="tooltip-row">
                <span className="tooltip-label">
                  <AlertCircle size={12} className="text-muted" /> Target Achievement
                </span>
                <span className={`tooltip-value font-mono ${hoveredGeo.metrics.targetPct >= 100 ? 'text-green' : 'text-orange'}`}>
                  {hoveredGeo.metrics.totalSales > 0 ? formatPercent(hoveredGeo.metrics.targetPct) : '0.0%'}
                </span>
              </div>
              <div className="tooltip-category-row">
                <span className="tooltip-label-sub">Top Stock Category</span>
                <span className="tooltip-val-sub" title={hoveredGeo.metrics.topCategory}>
                  {hoveredGeo.metrics.topCategory}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
