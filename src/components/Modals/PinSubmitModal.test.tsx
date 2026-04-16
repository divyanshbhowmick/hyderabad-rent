// src/components/Modals/PinSubmitModal.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('../../store/usePinStore', () => ({
  usePinStore: vi.fn(),
}))
vi.mock('../../store/useUIStore', () => ({
  useUIStore: vi.fn(),
}))

import { PinSubmitModal } from './PinSubmitModal'
import { usePinStore } from '../../store/usePinStore'
import { useUIStore } from '../../store/useUIStore'

const mockAddPin = vi.fn()
const mockCloseModal = vi.fn()
const mockOpenModal = vi.fn()
const mockSetPendingPinId = vi.fn()

function setup() {
  vi.mocked(usePinStore).mockImplementation((selector: any) =>
    selector({ addPin: mockAddPin, pins: [], totalRent: 0, loading: false, loadPins: vi.fn(), reportPin: vi.fn() })
  )
  vi.mocked(useUIStore).mockImplementation((selector: any) =>
    selector({
      pendingLatLng: { lat: 17.44, lng: 78.38 },
      closeModal: mockCloseModal,
      openModal: mockOpenModal,
      setPendingPinId: mockSetPendingPinId,
      activeModal: 'pinSubmit' as const,
      selectedPin: null,
      pendingPinId: null,
    })
  )
  return render(<PinSubmitModal />)
}

function fillValidForm() {
  fireEvent.change(screen.getByPlaceholderText('e.g. 22000'), { target: { value: '25000' } })
  fireEvent.click(screen.getByText('2BHK'))
  fireEvent.click(screen.getByText('Semi'))
  // Gated: Yes (first Yes button)
  const yesButtons = screen.getAllByText('Yes')
  fireEvent.click(yesButtons[0])
  fireEvent.click(screen.getByText('Included'))
  fireEvent.click(screen.getByText('Family'))
  // Pets: No (second No button — first is gated No)
  const noButtons = screen.getAllByText('No')
  fireEvent.click(noButtons[1])
  fireEvent.click(screen.getByText('Available'))
}

describe('PinSubmitModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows validation errors for empty form', () => {
    setup()
    fireEvent.click(screen.getByText('Pin rent'))
    expect(screen.getByText(/valid rent/i)).toBeInTheDocument()
  })

  it('on success opens emailClaim modal with pendingPinId', async () => {
    const newPin = {
      id: 'new-pin-id', lat: 17.44, lng: 78.38, rent: 25000, bhk: 2,
      furnished: 'semi', gated: true, maintenance: 'included',
      tenantType: 'any', depositMonths: 2, pets: false, available: true,
      reportCount: 0, createdAt: '2026-04-16T00:00:00.000Z',
      verified: false, isSeed: false,
    }
    mockAddPin.mockResolvedValue(newPin)
    setup()
    fillValidForm()
    fireEvent.click(screen.getByText('Pin rent'))
    await waitFor(() => {
      expect(mockSetPendingPinId).toHaveBeenCalledWith('new-pin-id')
      expect(mockOpenModal).toHaveBeenCalledWith('emailClaim')
    })
  })

  it('shows RATE_LIMITED user-friendly message', async () => {
    mockAddPin.mockRejectedValue(new Error('RATE_LIMITED'))
    setup()
    fillValidForm()
    fireEvent.click(screen.getByText('Pin rent'))
    await waitFor(() => {
      expect(screen.getByText(/3 pins today/i)).toBeInTheDocument()
    })
  })

  it('shows IMPLAUSIBLE_RENT user-friendly message', async () => {
    mockAddPin.mockRejectedValue(new Error('IMPLAUSIBLE_RENT'))
    setup()
    fillValidForm()
    fireEvent.click(screen.getByText('Pin rent'))
    await waitFor(() => {
      expect(screen.getByText(/rent looks off/i)).toBeInTheDocument()
    })
  })

  it('shows generic network error message', async () => {
    mockAddPin.mockRejectedValue(new Error('Network request failed'))
    setup()
    fillValidForm()
    fireEvent.click(screen.getByText('Pin rent'))
    await waitFor(() => {
      expect(screen.getByText(/check your connection/i)).toBeInTheDocument()
    })
  })
})
