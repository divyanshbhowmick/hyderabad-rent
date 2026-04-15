// src/utils/formatters.test.ts
import { describe, it, expect } from 'vitest'
import { formatRent, formatDaysAgo, formatTotal } from './formatters'

describe('formatRent', () => {
  it('formats thousands as K', () => {
    expect(formatRent(22000)).toBe('22K')
  })
  it('formats lakhs as L', () => {
    expect(formatRent(150000)).toBe('1.5L')
  })
  it('formats exact lakh', () => {
    expect(formatRent(100000)).toBe('1L')
  })
  it('handles sub-thousand', () => {
    expect(formatRent(500)).toBe('500')
  })
})

describe('formatDaysAgo', () => {
  it('returns today for same day', () => {
    const now = new Date().toISOString()
    expect(formatDaysAgo(now)).toBe('today')
  })
  it('returns 1 day ago for yesterday', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString()
    expect(formatDaysAgo(yesterday)).toBe('1 day ago')
  })
  it('returns N days ago for older dates', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString()
    expect(formatDaysAgo(threeDaysAgo)).toBe('3 days ago')
  })
})

describe('formatTotal', () => {
  it('formats crores with one decimal', () => {
    expect(formatTotal(18260000)).toBe('₹1.8 Cr.')
  })
  it('formats zero as 0 Cr.', () => {
    expect(formatTotal(0)).toBe('₹0 Cr.')
  })
})
