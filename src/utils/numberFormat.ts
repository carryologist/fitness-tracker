export function formatNumber(n: number | null | undefined): string {
  if (n == null || isNaN(Number(n))) return '0'
  const v = Number(n)
  if (v === 0) return '0'
  if (Math.abs(v) < 100) {
    const rounded = Math.round(v * 10) / 10
    return rounded.toFixed(1)
  }
  return Math.round(v).toLocaleString()
}
