// src/store/useUIStore.ts
import { create } from 'zustand'
import type { Pin } from '../types/Pin'

type Modal = 'onboarding' | 'pinSubmit' | 'pinDetail' | 'filter' | null

interface UIStore {
  activeModal: Modal
  pendingLatLng: { lat: number; lng: number } | null
  selectedPin: Pin | null
  openModal: (modal: Modal) => void
  closeModal: () => void
  setPendingLatLng: (latlng: { lat: number; lng: number }) => void
  setSelectedPin: (pin: Pin | null) => void
}

export const useUIStore = create<UIStore>((set) => ({
  activeModal: null,
  pendingLatLng: null,
  selectedPin: null,

  openModal(modal) {
    set({ activeModal: modal })
  },

  closeModal() {
    set({ activeModal: null, pendingLatLng: null, selectedPin: null })
  },

  setPendingLatLng(latlng) {
    set({ pendingLatLng: latlng })
  },

  setSelectedPin(pin) {
    set({ selectedPin: pin })
  },
}))
