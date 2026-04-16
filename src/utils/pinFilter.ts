// src/utils/pinFilter.ts
import type { Pin, FilterState } from '../types/Pin'

export function applyFilters(pins: Pin[], filters: FilterState): Pin[] {
  return pins.filter(pin => {
    if (pin.reportCount >= 3) return false
    if (filters.locality !== null && pin.locality !== filters.locality) return false
    if (filters.bhk.length > 0 && !filters.bhk.includes(pin.bhk)) return false
    if (pin.rent < filters.rentMin || pin.rent > filters.rentMax) return false
    if (filters.furnished.length > 0 && !filters.furnished.includes(pin.furnished)) return false
    if (filters.gated !== null && pin.gated !== filters.gated) return false
    return true
  })
}
