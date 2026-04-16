// src/store/usePinStore.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../services/PinService', () => ({
  PinService: {
    getAllPins: vi.fn(),
    addPin: vi.fn(),
    reportPin: vi.fn(),
    getTotalRent: vi.fn(),
  },
}))

import { usePinStore } from './usePinStore'
import { PinService } from '../services/PinService'

const mockPin = {
  id: 'p1', lat: 17.44, lng: 78.38, rent: 25000, bhk: 2 as const,
  furnished: 'semi' as const, gated: true, maintenance: 'included' as const,
  tenantType: 'any' as const, depositMonths: 2, pets: false, available: true,
  reportCount: 0, createdAt: '2026-04-16T00:00:00.000Z',
  verified: false, isSeed: false,
}

describe('usePinStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    usePinStore.setState({ pins: [], totalRent: 0, loading: false })
  })

  it('loadPins sets pins and totalRent', async () => {
    vi.mocked(PinService.getAllPins).mockResolvedValue([mockPin])
    await usePinStore.getState().loadPins()
    const state = usePinStore.getState()
    expect(state.pins).toHaveLength(1)
    expect(state.totalRent).toBe(25000)
    expect(state.loading).toBe(false)
  })

  it('addPin appends pin and updates totalRent', async () => {
    vi.mocked(PinService.addPin).mockResolvedValue(mockPin)
    const submission = {
      lat: 17.44, lng: 78.38, rent: 25000, bhk: 2 as const,
      furnished: 'semi' as const, gated: true, maintenance: 'included' as const,
      tenantType: 'any' as const, depositMonths: 2, pets: false, available: true,
    }
    const pin = await usePinStore.getState().addPin(submission)
    expect(pin.id).toBe('p1')
    expect(usePinStore.getState().pins).toHaveLength(1)
    expect(usePinStore.getState().totalRent).toBe(25000)
  })

  it('addPin propagates RATE_LIMITED error', async () => {
    vi.mocked(PinService.addPin).mockRejectedValue(new Error('RATE_LIMITED'))
    const submission = {
      lat: 17.44, lng: 78.38, rent: 25000, bhk: 2 as const,
      furnished: 'semi' as const, gated: true, maintenance: 'included' as const,
      tenantType: 'any' as const, depositMonths: 2, pets: false, available: true,
    }
    await expect(usePinStore.getState().addPin(submission)).rejects.toThrow('RATE_LIMITED')
  })

  it('reportPin updates reportCount in place', async () => {
    vi.mocked(PinService.reportPin).mockResolvedValue()
    usePinStore.setState({ pins: [mockPin], totalRent: 25000, loading: false })
    await usePinStore.getState().reportPin('p1')
    expect(usePinStore.getState().pins[0].reportCount).toBe(1)
  })
})
