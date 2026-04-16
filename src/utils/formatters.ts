// src/utils/formatters.ts
export function formatRent(rent: number): string {
  if (rent >= 100000) {
    const l = rent / 100000
    return `${l % 1 === 0 ? l : l.toFixed(1)}L`
  }
  if (rent >= 1000) {
    const k = rent / 1000
    return `${k % 1 === 0 ? k : k.toFixed(1)}K`
  }
  return String(rent)
}

export function formatDaysAgo(isoString: string): string {
  const days = Math.floor((Date.now() - new Date(isoString).getTime()) / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

export function formatTotal(totalRent: number): string {
  if (totalRent >= 10000000) {
    const cr = totalRent / 10000000
    return `₹${cr % 1 === 0 ? cr : cr.toFixed(1)} Cr.`
  }
  const l = totalRent / 100000
  return `₹${l % 1 === 0 ? l : l.toFixed(1)}L`
}
