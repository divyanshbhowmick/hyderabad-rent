// src/store/usePinStore.ts
import { create } from 'zustand'
import { PinService } from '../services/PinService'
import type { Pin, PinSubmission } from '../types/Pin'

interface PinStore {
  pins: Pin[]
  totalRent: number
  loadPins: () => void
  addPin: (submission: PinSubmission) => Pin
  reportPin: (id: string) => void
}

export const usePinStore = create<PinStore>((set) => ({
  pins: [],
  totalRent: 0,

  loadPins() {
    const pins = PinService.getAllPins()
    set({ pins, totalRent: PinService.getTotalRent() })
  },

  addPin(submission) {
    const pin = PinService.addPin(submission)
    set(state => ({
      pins: [...state.pins, pin],
      totalRent: state.totalRent + pin.rent,
    }))
    return pin
  },

  reportPin(id) {
    PinService.reportPin(id)
    set(state => ({
      pins: state.pins.map(p =>
        p.id === id ? { ...p, reportCount: p.reportCount + 1 } : p,
      ),
    }))
  },
}))
