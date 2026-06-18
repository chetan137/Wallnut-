/**
 * Wallnut — Formatting Utilities
 * Currency (₹ Indian numbering), percentages, dates, and number abbreviations.
 */

/**
 * Format number as Indian Rupees with the Indian grouping system.
 * e.g. 1234567 → ₹12,34,567
 */
export function formatCurrency(value, showDecimals = false) {
  if (value == null || isNaN(value)) return '₹0';
  const absVal = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  const options = {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  };

  const formatted = new Intl.NumberFormat('en-IN', options).format(absVal);
  return sign + formatted;
}

/**
 * Abbreviate large numbers Indian style.
 * e.g. 1500000 → ₹15.0L, 25000000 → ₹2.5Cr
 */
export function abbreviateCurrency(value) {
  if (value == null || isNaN(value)) return '₹0';
  const absVal = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absVal >= 10000000) {
    return `${sign}₹${(absVal / 10000000).toFixed(1)}Cr`;
  }
  if (absVal >= 100000) {
    return `${sign}₹${(absVal / 100000).toFixed(1)}L`;
  }
  if (absVal >= 1000) {
    return `${sign}₹${(absVal / 1000).toFixed(1)}K`;
  }
  return `${sign}₹${absVal.toFixed(0)}`;
}

/**
 * Format a number with Indian grouping (no currency symbol).
 */
export function formatNumber(value) {
  if (value == null || isNaN(value)) return '0';
  return new Intl.NumberFormat('en-IN').format(value);
}

/**
 * Abbreviate plain numbers.
 */
export function abbreviateNumber(value) {
  if (value == null || isNaN(value)) return '0';
  const absVal = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absVal >= 10000000) return `${sign}${(absVal / 10000000).toFixed(1)}Cr`;
  if (absVal >= 100000) return `${sign}${(absVal / 100000).toFixed(1)}L`;
  if (absVal >= 1000) return `${sign}${(absVal / 1000).toFixed(1)}K`;
  return `${sign}${absVal.toFixed(0)}`;
}

/**
 * Format percentage with specified decimals.
 */
export function formatPercent(value, decimals = 1) {
  if (value == null || isNaN(value)) return '0%';
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format date for display.
 */
export function formatDate(dateStr, format = 'short') {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  switch (format) {
    case 'short':
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    case 'month':
      return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    case 'monthYear':
      return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    case 'full':
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    default:
      return date.toLocaleDateString('en-IN');
  }
}

/**
 * Get month-year key for grouping (e.g., "2025-01").
 */
export function getMonthKey(dateStr) {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Format month key to display label.
 * "2025-01" → "Jan 2025"
 */
export function formatMonthKey(monthKey) {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

/**
 * Calculate percentage change between two values.
 */
export function percentChange(current, previous) {
  if (!previous || previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}
