// src/store/usePinStore.ts
import { create } from 'zustand'
import { PinService } from '../services/PinService'
import type { Pin, PinSubmission } from '../types/Pin'

interface PinStore {
  pins: Pin[]
  totalRent: number
  loading: boolean
  loadPins: () => Promise<void>
  addPin: (submission: PinSubmission) => Promise<Pin>
  reportPin: (id: string) => Promise<void>
  verifyPin: (id: string) => void
}

export const usePinStore = create<PinStore>((set) => ({
  pins: [],
  totalRent: 0,
  loading: false,

  async loadPins() {
    set({ loading: true })
    try {
      const pins = await PinService.getAllPins()
      const totalRent = pins.reduce((sum, p) => sum + p.rent, 0)
      set({ pins, totalRent, loading: false })
    } catch (err) {
      console.error('loadPins failed:', err)
      set({ loading: false })
    }
  },

  async addPin(submission) {
    const pin = await PinService.addPin(submission)
    set(state => ({
      pins: [...state.pins, pin],
      totalRent: state.totalRent + pin.rent,
    }))
    return pin
  },

  async reportPin(id) {
    await PinService.reportPin(id)
    set(state => ({
      pins: state.pins.map(p =>
        p.id === id ? { ...p, reportCount: p.reportCount + 1 } : p,
      ),
    }))
  },

  verifyPin(id) {
    set(state => ({
      pins: state.pins.map(p => p.id === id ? { ...p, verified: true } : p),
    }))
  },
}))
