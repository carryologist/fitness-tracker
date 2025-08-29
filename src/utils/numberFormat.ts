export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  
  // For numbers below 100, round to nearest tenth
  if (value < 100) {
    return value.toFixed(1);
  }
  
  // For numbers 100 and above, use comma formatting
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}