// src/store/useFilterStore.ts
import { create } from 'zustand'
import { DEFAULT_FILTERS } from '../types/Pin'
import type { FilterState } from '../types/Pin'

interface FilterStore {
  filters: FilterState
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void
  clearFilters: () => void
}

export const useFilterStore = create<FilterStore>((set) => ({
  filters: { ...DEFAULT_FILTERS },

  setFilter(key, value) {
    set(state => ({ filters: { ...state.filters, [key]: value } }))
  },

  clearFilters() {
    set({ filters: { ...DEFAULT_FILTERS } })
  },
}))
