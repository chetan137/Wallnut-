/**
 * The sales data spells some districts the way India Post does ("Belgaum", "Bangalore"),
 * while the state map files use the official names ("Belagavi", "Bengaluru"). This maps the
 * data spelling to the map spelling so the district shows up coloured on the state map.
 */
const ALIASES = {
  Belgaum: 'Belagavi',
  Bangalore: 'Bengaluru',
  'Bangalore Rural': 'Bengaluru Rural',
  Bagalkot: 'Bagalkote',
  'Bijapur(KAR)': 'Vijayapura',
  Mysore: 'Mysuru',
  Shimoga: 'Shivamogga',
  Kasargod: 'Kasaragod',
  Tiruvallur: 'Thiruvallur',
  Ahmedabad: 'Ahmadabad',
};

export const canonicalDistrict = (name) => {
  const n = (name || '').trim();
  return ALIASES[n] || n;
};

/** States that have a district-level map file in /public/maps. */
export const STATES_WITH_DISTRICT_MAP = [
  'Madhya Pradesh', 'Maharashtra', 'Karnataka', 'Kerala', 'Tamil Nadu', 'Gujarat', 'Rajasthan',
];
