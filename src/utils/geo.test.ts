// src/utils/geo.test.ts
import { describe, it, expect } from 'vitest'
import { inBounds, haversineKm } from './geo'

describe('inBounds', () => {
  const bounds = { north: 18, south: 17, east: 79, west: 78 }
  it('returns true for point inside bounds', () => {
    expect(inBounds({ lat: 17.5, lng: 78.5 }, bounds)).toBe(true)
  })
  it('returns false for point outside bounds', () => {
    expect(inBounds({ lat: 19, lng: 78.5 }, bounds)).toBe(false)
  })
  it('returns true for point on boundary', () => {
    expect(inBounds({ lat: 17, lng: 78 }, bounds)).toBe(true)
  })
})

describe('haversineKm', () => {
  it('returns ~0 for same point', () => {
    expect(haversineKm(17.385, 78.4867, 17.385, 78.4867)).toBeCloseTo(0, 1)
  })
  it('returns ~111km per degree latitude', () => {
    expect(haversineKm(0, 0, 1, 0)).toBeCloseTo(111, 0)
  })
})
