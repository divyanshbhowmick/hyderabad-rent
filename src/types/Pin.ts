// src/types/Pin.ts
export type BHK = 1 | 2 | 3 | 4 | 5
export type Furnished = 'furnished' | 'semi' | 'unfurnished'
export type TenantType = 'family' | 'bachelor' | 'any'
export type Maintenance = 'included' | 'excluded'

export interface Pin {
  id: string
  lat: number
  lng: number
  rent: number
  bhk: BHK
  furnished: Furnished
  gated: boolean
  maintenance: Maintenance
  tenantType: TenantType
  depositMonths: number
  pets: boolean
  available: boolean
  reportCount: number
  createdAt: string   // ISO string
  locality?: string
}

export interface PinSubmission {
  lat: number
  lng: number
  rent: number
  bhk: BHK
  furnished: Furnished
  gated: boolean
  maintenance: Maintenance
  tenantType: TenantType
  depositMonths: number
  pets: boolean
  available: boolean
}

export interface FilterState {
  locality: string | null
  bhk: BHK[]
  rentMin: number
  rentMax: number
  furnished: Furnished[]
  gated: boolean | null
}

export const DEFAULT_FILTERS: FilterState = {
  locality: null,
  bhk: [],
  rentMin: 5000,
  rentMax: 200000,
  furnished: [],
  gated: null,
}
