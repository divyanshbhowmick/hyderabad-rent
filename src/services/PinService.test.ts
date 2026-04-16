// src/services/PinService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase module before importing PinService
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}))

vi.mock('../lib/deviceId', () => ({
  getDeviceId: vi.fn(() => 'test-device-id'),
}))

import { PinService } from './PinService'
import { supabase } from '../lib/supabase'

const mockRow = {
  id: 'test-uuid',
  lat: 17.44,
  lng: 78.38,
  rent: 25000,
  bhk: 2,
  furnished: 'semi',
  gated: true,
  maintenance: 'included',
  tenant_type: 'any',
  deposit_months: 2,
  pets: false,
  available: true,
  locality: 'Gachibowli',
  sqft: null,
  report_count: 0,
  verified: false,
  is_seed: false,
  created_at: '2026-04-16T00:00:00.000Z',
}

describe('PinService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getAllPins maps snake_case rows to camelCase Pin objects', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lt: vi.fn().mockResolvedValue({ data: [mockRow], error: null }),
      }),
    } as any)

    const pins = await PinService.getAllPins()
    expect(pins[0].tenantType).toBe('any')
    expect(pins[0].depositMonths).toBe(2)
    expect(pins[0].reportCount).toBe(0)
    expect(pins[0].isSeed).toBe(false)
    expect(pins[0].verified).toBe(false)
  })

  it('addPin calls rpc with submission and device id, then fetches row', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: 'new-uuid', error: null } as any)
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockRow, error: null }),
        }),
      }),
    } as any)

    const submission = {
      lat: 17.44, lng: 78.38, rent: 25000, bhk: 2 as const,
      furnished: 'semi' as const, gated: true, maintenance: 'included' as const,
      tenantType: 'any' as const, depositMonths: 2, pets: false, available: true,
    }

    const pin = await PinService.addPin(submission)
    expect(supabase.rpc).toHaveBeenCalledWith('add_pin', expect.objectContaining({
      p_device_id: 'test-device-id',
    }))
    expect(pin.id).toBe('test-uuid')
  })

  it('addPin throws RATE_LIMITED when rpc returns that error', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { message: 'RATE_LIMITED', code: 'P0001' },
    } as any)

    const submission = {
      lat: 17.44, lng: 78.38, rent: 25000, bhk: 2 as const,
      furnished: 'semi' as const, gated: true, maintenance: 'included' as const,
      tenantType: 'any' as const, depositMonths: 2, pets: false, available: true,
    }

    await expect(PinService.addPin(submission)).rejects.toThrow('RATE_LIMITED')
  })

  it('reportPin calls rpc with pin id', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as any)
    await PinService.reportPin('pin-123')
    expect(supabase.rpc).toHaveBeenCalledWith('report_pin', { p_pin_id: 'pin-123' })
  })

  it('claimPin calls rpc with pin id and email', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as any)
    await PinService.claimPin('pin-123', 'user@example.com')
    expect(supabase.rpc).toHaveBeenCalledWith('claim_pin', {
      p_pin_id: 'pin-123',
      p_email: 'user@example.com',
    })
  })
})
