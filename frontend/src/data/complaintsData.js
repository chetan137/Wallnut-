/**
 * Wallnut — Complaints
 * No bundled demo records: complaints start empty and are added through the app.
 */

export const complaintsData = [];

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
