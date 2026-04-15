// src/services/PinService.ts
import { v4 as uuidv4 } from 'uuid'
import { SEED_PINS } from '../data/seed-pins'
import { inBounds } from '../utils/geo'
import type { Pin, PinSubmission } from '../types/Pin'

const STORAGE_KEY = 'hyd_pins'

interface Bounds { north: number; south: number; east: number; west: number }

function readStorage(): Pin[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Pin[]) : []
  } catch {
    return []
  }
}

function writeStorage(pins: Pin[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pins))
}

export const PinService = {
  getAllPins(): Pin[] {
    const stored = readStorage()
    // Seed pins are always present; user pins are layered on top
    const userIds = new Set(stored.map(p => p.id))
    const seedsNotOverridden = SEED_PINS.filter(p => !userIds.has(p.id))
    return [...seedsNotOverridden, ...stored]
  },

  getPinsInBounds(bounds: Bounds): Pin[] {
    return this.getAllPins().filter(pin =>
      inBounds({ lat: pin.lat, lng: pin.lng }, bounds),
    )
  },

  addPin(submission: PinSubmission): Pin {
    const pin: Pin = {
      ...submission,
      id: uuidv4(),
      reportCount: 0,
      createdAt: new Date().toISOString(),
    }
    const stored = readStorage()
    writeStorage([...stored, pin])
    return pin
  },

  reportPin(id: string): void {
    const stored = readStorage()
    const allPins = this.getAllPins()
    const pin = allPins.find(p => p.id === id)
    if (!pin) return
    const inStorage = stored.find(p => p.id === id)
    if (inStorage) {
      writeStorage(
        stored.map(p => p.id === id ? { ...p, reportCount: p.reportCount + 1 } : p),
      )
    } else {
      // Seed pin — pull into storage with incremented count
      writeStorage([...stored, { ...pin, reportCount: 1 }])
    }
  },

  getTotalRent(): number {
    return this.getAllPins().reduce((sum, p) => sum + p.rent, 0)
  },
}
