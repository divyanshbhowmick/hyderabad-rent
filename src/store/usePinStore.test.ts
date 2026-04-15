// src/store/usePinStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { usePinStore } from './usePinStore'
import type { PinSubmission } from '../types/Pin'

const submission: PinSubmission = {
  lat: 17.44, lng: 78.38, rent: 30000, bhk: 2,
  furnished: 'furnished', gated: true, maintenance: 'included',
  tenantType: 'family', depositMonths: 3, pets: false, available: false,
}

beforeEach(() => {
  localStorage.clear()
  usePinStore.getState().loadPins()
})

describe('usePinStore', () => {
  it('loadPins populates pins from PinService', () => {
    expect(usePinStore.getState().pins.length).toBeGreaterThan(0)
  })
  it('addPin adds a pin and updates state', () => {
    const before = usePinStore.getState().pins.length
    usePinStore.getState().addPin(submission)
    expect(usePinStore.getState().pins.length).toBe(before + 1)
  })
  it('reportPin increments reportCount in state', () => {
    usePinStore.getState().addPin(submission)
    const pin = usePinStore.getState().pins.find(p => p.rent === 30000)!
    usePinStore.getState().reportPin(pin.id)
    const updated = usePinStore.getState().pins.find(p => p.id === pin.id)
    expect(updated?.reportCount).toBe(1)
  })
})
