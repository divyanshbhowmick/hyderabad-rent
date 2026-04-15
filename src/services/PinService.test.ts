// src/services/PinService.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { PinService } from './PinService'
import type { PinSubmission } from '../types/Pin'

const submission: PinSubmission = {
  lat: 17.44, lng: 78.38, rent: 25000, bhk: 2,
  furnished: 'semi', gated: true, maintenance: 'excluded',
  tenantType: 'any', depositMonths: 2, pets: false, available: false,
}

beforeEach(() => {
  localStorage.clear()
})

describe('PinService.getAllPins', () => {
  it('returns seed pins when localStorage is empty', () => {
    const pins = PinService.getAllPins()
    expect(pins.length).toBeGreaterThan(0)
    expect(pins[0]).toHaveProperty('id')
    expect(pins[0]).toHaveProperty('rent')
  })
})

describe('PinService.addPin', () => {
  it('adds a pin and returns it with an id', () => {
    const pin = PinService.addPin(submission)
    expect(pin.id).toBeTruthy()
    expect(pin.rent).toBe(25000)
    expect(pin.reportCount).toBe(0)
  })
  it('persists the pin across calls', () => {
    PinService.addPin(submission)
    const pins = PinService.getAllPins()
    const added = pins.find(p => p.rent === 25000 && p.lat === 17.44)
    expect(added).toBeDefined()
  })
})

describe('PinService.reportPin', () => {
  it('increments reportCount', () => {
    const pin = PinService.addPin(submission)
    PinService.reportPin(pin.id)
    const updated = PinService.getAllPins().find(p => p.id === pin.id)
    expect(updated?.reportCount).toBe(1)
  })
})

describe('PinService.getPinsInBounds', () => {
  it('returns only pins within the bounds', () => {
    PinService.addPin(submission) // lat 17.44, lng 78.38
    const pins = PinService.getPinsInBounds({ north: 17.5, south: 17.4, east: 78.4, west: 78.3 })
    expect(pins.some(p => p.rent === 25000)).toBe(true)
  })
  it('excludes pins outside the bounds', () => {
    PinService.addPin(submission)
    const pins = PinService.getPinsInBounds({ north: 17.0, south: 16.9, east: 77.5, west: 77.4 })
    expect(pins.some(p => p.rent === 25000 && p.lat === 17.44)).toBe(false)
  })
})
