/**
 * Wallnut — Mock Target Data
 * Sales targets per district and per sales officer for Target Achievement % calculation.
 */

// Monthly targets per district / plant (in ₹)
export const districtTargets = {
  // Plants & Warehouses
  'Kolhapur Plant':  { monthly: 2500000, quarterly: 7500000 },
  'Vadodara Plant':  { monthly: 2000000, quarterly: 6000000 },
  'Bhiwandi Godown': { monthly: 1500000, quarterly: 4500000 },
  'Main Location':   { monthly: 1000000, quarterly: 3000000 },
  'Amazon Godown':   { monthly: 500000,  quarterly: 1500000 },

  // Maharashtra
  'Kolhapur':        { monthly: 2500000, quarterly: 7500000 },
  'Mumbai':          { monthly: 4000000, quarterly: 12000000 },
  'Pune':            { monthly: 3000000, quarterly: 9000000 },
  'Nashik':          { monthly: 2000000, quarterly: 6000000 },

  // Gujarat
  'Ahmedabad':       { monthly: 3500000, quarterly: 10500000 },
  'Surat':           { monthly: 2800000, quarterly: 8400000 },
  'Vadodara':        { monthly: 2200000, quarterly: 6600000 },

  // Madhya Pradesh
  'Indore':          { monthly: 3500000, quarterly: 10500000 },
  'Bhopal':          { monthly: 3000000, quarterly: 9000000 },
  'Jabalpur':        { monthly: 2200000, quarterly: 6600000 },
  'Ujjain':          { monthly: 1500000, quarterly: 4500000 },
  'Gwalior':         { monthly: 2500000, quarterly: 7500000 },

  // Karnataka & Kerala
  'Bengaluru':       { monthly: 4500000, quarterly: 13500000 },
  'Ernakulam':       { monthly: 3800000, quarterly: 11400000 },
};

// Monthly targets per sales officer (in ₹)
export const salesOfficerTargets = {
  'Rajesh Sharma':   1800000,
  'Amit Verma':      1700000,
  'Sunil Patel':     1600000,
  'Vikram Singh':    1400000,
  'Manoj Tiwari':    1200000,
  'Deepak Jain':     1000000,
  'Prakash Gupta':   1500000,
  'Arvind Yadav':    1400000,
  'Kiran Deshmukh':  1100000,
};

// State-level target (sum of all district targets)
export const stateTarget = {
  monthly: Object.values(districtTargets).reduce((sum, d) => sum + d.monthly, 0),
  quarterly: Object.values(districtTargets).reduce((sum, d) => sum + d.quarterly, 0),
};

export default districtTargets;
