// src/store/useFilterStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useFilterStore } from './useFilterStore'
import { DEFAULT_FILTERS } from '../types/Pin'

beforeEach(() => {
  useFilterStore.setState({ filters: { ...DEFAULT_FILTERS } })
})

describe('useFilterStore', () => {
  it('starts with default filters', () => {
    expect(useFilterStore.getState().filters).toEqual(DEFAULT_FILTERS)
  })
  it('setFilter updates a single field', () => {
    useFilterStore.getState().setFilter('bhk', [2, 3])
    expect(useFilterStore.getState().filters.bhk).toEqual([2, 3])
    expect(useFilterStore.getState().filters.rentMin).toBe(DEFAULT_FILTERS.rentMin)
  })
  it('clearFilters resets to defaults', () => {
    useFilterStore.getState().setFilter('bhk', [2])
    useFilterStore.getState().clearFilters()
    expect(useFilterStore.getState().filters).toEqual(DEFAULT_FILTERS)
  })
})
