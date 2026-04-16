// src/components/Modals/EmailClaimModal.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('../../store/useUIStore', () => ({
  useUIStore: vi.fn(),
}))
vi.mock('../../services/PinService', () => ({
  PinService: {
    claimPin: vi.fn(),
  },
}))

import { EmailClaimModal } from './EmailClaimModal'
import { useUIStore } from '../../store/useUIStore'
import { PinService } from '../../services/PinService'

const mockCloseModal = vi.fn()

function setup(pendingPinId = 'pin-abc') {
  vi.mocked(useUIStore).mockImplementation((selector: any) =>
    selector({
      pendingPinId,
      closeModal: mockCloseModal,
      activeModal: 'emailClaim' as const,
      pendingLatLng: null,
      selectedPin: null,
      openModal: vi.fn(),
      setPendingLatLng: vi.fn(),
      setSelectedPin: vi.fn(),
      setPendingPinId: vi.fn(),
    })
  )
  return render(<EmailClaimModal />)
}

describe('EmailClaimModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the email prompt', () => {
    setup()
    expect(screen.getByText(/Pin added/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/your@email/i)).toBeInTheDocument()
  })

  it('Skip for now closes modal without calling claimPin', () => {
    setup()
    fireEvent.click(screen.getByText('Skip for now'))
    expect(mockCloseModal).toHaveBeenCalled()
    expect(PinService.claimPin).not.toHaveBeenCalled()
  })

  it('validates email contains @', async () => {
    setup()
    fireEvent.change(screen.getByPlaceholderText(/your@email/i), { target: { value: 'notanemail' } })
    fireEvent.click(screen.getByText('Notify me'))
    expect(screen.getByText(/valid email/i)).toBeInTheDocument()
    expect(PinService.claimPin).not.toHaveBeenCalled()
  })

  it('on valid submit calls claimPin and shows success', async () => {
    vi.mocked(PinService.claimPin).mockResolvedValue()
    setup()
    fireEvent.change(screen.getByPlaceholderText(/your@email/i), { target: { value: 'user@example.com' } })
    fireEvent.click(screen.getByText('Notify me'))
    await waitFor(() => {
      expect(PinService.claimPin).toHaveBeenCalledWith('pin-abc', 'user@example.com')
      expect(screen.getByText(/You're in/i)).toBeInTheDocument()
    })
  })

  it('auto-closes after success', async () => {
    vi.useFakeTimers()
    vi.mocked(PinService.claimPin).mockResolvedValue()
    setup()
    fireEvent.change(screen.getByPlaceholderText(/your@email/i), { target: { value: 'user@example.com' } })
    fireEvent.click(screen.getByText('Notify me'))
    // Flush the async claimPin promise and any microtasks
    await vi.runAllTimersAsync()
    expect(screen.getByText(/You're in/i)).toBeInTheDocument()
    // Advance past the 1500ms auto-close timer
    vi.advanceTimersByTime(1500)
    expect(mockCloseModal).toHaveBeenCalled()
    vi.useRealTimers()
  })
})
