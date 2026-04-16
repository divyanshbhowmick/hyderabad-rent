// src/services/PinService.ts
import { supabase } from '../lib/supabase'
import { getDeviceId } from '../lib/deviceId'
import type { Pin, PinSubmission } from '../types/Pin'

// Map DB snake_case row to TypeScript camelCase Pin
function rowToPin(row: Record<string, unknown>): Pin {
  return {
    id:            row.id as string,
    lat:           row.lat as number,
    lng:           row.lng as number,
    rent:          row.rent as number,
    bhk:           row.bhk as Pin['bhk'],
    furnished:     row.furnished as Pin['furnished'],
    gated:         row.gated as boolean,
    maintenance:   row.maintenance as Pin['maintenance'],
    tenantType:    row.tenant_type as Pin['tenantType'],
    depositMonths: row.deposit_months as number,
    pets:          row.pets as boolean,
    available:     row.available as boolean,
    reportCount:   row.report_count as number,
    createdAt:     row.created_at as string,
    locality:      row.locality as string | undefined,
    sqft:          row.sqft as number | undefined,
    verified:      row.verified as boolean,
    isSeed:        row.is_seed as boolean,
  }
}

export const PinService = {
  async getAllPins(): Promise<Pin[]> {
    const { data, error } = await supabase
      .from('pins')
      .select('*')
      .lt('report_count', 3)
    if (error) throw new Error(error.message)
    return (data ?? []).map(rowToPin)
  },

  async addPin(submission: PinSubmission): Promise<Pin> {
    const deviceId = getDeviceId()
    const { data: newId, error } = await supabase.rpc('add_pin', {
      p_pin: {
        lat:           submission.lat,
        lng:           submission.lng,
        rent:          submission.rent,
        bhk:           submission.bhk,
        furnished:     submission.furnished,
        gated:         submission.gated,
        maintenance:   submission.maintenance,
        tenantType:    submission.tenantType,
        depositMonths: submission.depositMonths,
        pets:          submission.pets,
        available:     submission.available,
        locality:      submission.locality ?? '',
      },
      p_device_id: deviceId,
    })

    if (error) {
      if (error.message.includes('RATE_LIMITED')) throw new Error('RATE_LIMITED')
      if (error.message.includes('IMPLAUSIBLE_RENT')) throw new Error('IMPLAUSIBLE_RENT')
      throw new Error(error.message)
    }

    const { data: row, error: fetchError } = await supabase
      .from('pins')
      .select('*')
      .eq('id', newId)
      .single()
    if (fetchError) throw new Error(fetchError.message)
    return rowToPin(row)
  },

  async reportPin(id: string): Promise<void> {
    const { error } = await supabase.rpc('report_pin', { p_pin_id: id })
    if (error) throw new Error(error.message)
  },

  async claimPin(id: string, email: string): Promise<void> {
    const { error } = await supabase.rpc('claim_pin', {
      p_pin_id: id,
      p_email: email,
    })
    if (error) throw new Error(error.message)
  },

  async getTotalRent(): Promise<number> {
    const pins = await this.getAllPins()
    return pins.reduce((sum, p) => sum + p.rent, 0)
  },
}
