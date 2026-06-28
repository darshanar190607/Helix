/**
 * Feature 2: Financial Value Sanitation
 * Formatting and sanitizing numeric values before they reach the DOM.
 */

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number | string | undefined): string {
  const val = typeof value === 'number' ? value : parseFloat(value || '0');
  const clampedVal = Math.max(0, isNaN(val) ? 0 : val);
  return currencyFormatter.format(clampedVal);
}

export function formatRoi(value: number | string | undefined): string {
  const val = typeof value === 'number' ? value : parseFloat(value || '0');
  const clampedVal = Math.max(0, Math.min(500, isNaN(val) ? 0 : val));
  return clampedVal.toFixed(2) + '%';
}

export function formatHours(value: number | string | undefined): string {
  const val = typeof value === 'number' ? value : parseInt(value || '0', 10);
  const clampedVal = Math.max(0, isNaN(val) ? 0 : val);
  return clampedVal.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function formatRobots(value: number | string | undefined): string {
  const val = typeof value === 'number' ? value : parseInt(value || '0', 10);
  const clampedVal = Math.max(0, isNaN(val) ? 0 : val);
  return clampedVal.toLocaleString('en-US', { maximumFractionDigits: 0 });
}
