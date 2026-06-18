/**
 * Wallnut — Mock Complaints Data
 */

export const complaintsData = [
  { id: 1, dealer: 'M/s Shree Cement House', district: 'Indore', date: '2025-06-12', type: 'Quality', status: 'Open', description: 'Tile adhesive setting time too long in batch #WN-4502' },
  { id: 2, dealer: 'Bhopal Cement Depot', district: 'Bhopal', date: '2025-06-10', type: 'Delivery', status: 'Open', description: 'Order WN-4380 delayed by 5 days' },
  { id: 3, dealer: 'Jabalpur Building Mart', district: 'Jabalpur', date: '2025-06-08', type: 'Quality', status: 'Resolved', description: 'Wall putty bags damaged during transit' },
  { id: 4, dealer: 'Ujjain Hardware Center', district: 'Ujjain', date: '2025-06-05', type: 'Billing', status: 'Open', description: 'Incorrect rate applied on invoice WN-4290' },
  { id: 5, dealer: 'Fort City Traders', district: 'Gwalior', date: '2025-05-28', type: 'Delivery', status: 'Resolved', description: 'Short delivery of 15 bags in order WN-4120' },
  { id: 6, dealer: 'Kumar Hardware & Paints', district: 'Indore', date: '2025-05-25', type: 'Quality', status: 'In Progress', description: 'Waterproof coat colour inconsistency reported' },
  { id: 7, dealer: 'Capital Construction Co.', district: 'Bhopal', date: '2025-05-20', type: 'Billing', status: 'Resolved', description: 'Credit note pending for returned goods' },
  { id: 8, dealer: 'Mahakoshal Traders', district: 'Jabalpur', date: '2025-05-15', type: 'Quality', status: 'Open', description: 'Epoxy grout curing issue in humid conditions' },
];

export function getComplaintSummary(data = complaintsData) {
  const total = data.length;
  const open = data.filter(c => c.status === 'Open').length;
  const inProgress = data.filter(c => c.status === 'In Progress').length;
  const resolved = data.filter(c => c.status === 'Resolved').length;

  const byType = data.reduce((acc, c) => {
    acc[c.type] = (acc[c.type] || 0) + 1;
    return acc;
  }, {});

  return { total, open, inProgress, resolved, byType, recent: data.slice(0, 5) };
}

export default complaintsData;
