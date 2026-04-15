import { render, screen, fireEvent } from '@testing-library/react'
import { OnboardingModal } from './OnboardingModal'
import { useUIStore } from '../../store/useUIStore'

// Reset zustand store between tests
beforeEach(() => {
  useUIStore.setState({ activeModal: 'onboarding', pendingLatLng: null, selectedPin: null })
  localStorage.clear()
})

describe('OnboardingModal', () => {
  it('renders step 1 by default', () => {
    render(<OnboardingModal />)
    expect(screen.getByText(/What Hyderabadis actually pay in rent/i)).toBeInTheDocument()
  })

  it('advances to step 2 on "Got it"', () => {
    render(<OnboardingModal />)
    fireEvent.click(screen.getByText('Got it →'))
    expect(screen.getByText('How it works')).toBeInTheDocument()
  })

  it('shows 3 bullet points on step 2', () => {
    render(<OnboardingModal />)
    fireEvent.click(screen.getByText('Got it →'))
    expect(screen.getByText(/Tap anywhere on the map/i)).toBeInTheDocument()
    expect(screen.getByText(/See what others pay/i)).toBeInTheDocument()
    expect(screen.getByText(/Report suspicious pins/i)).toBeInTheDocument()
  })

  it("sets localStorage and closes on Let's go", () => {
    render(<OnboardingModal />)
    fireEvent.click(screen.getByText('Got it →'))
    fireEvent.click(screen.getByText("Let's go →"))
    expect(localStorage.getItem('hyd_onboarded')).toBe('1')
    expect(useUIStore.getState().activeModal).toBeNull()
  })

  it('closes on Escape without setting localStorage', () => {
    render(<OnboardingModal />)
    fireEvent.keyDown(screen.getByRole('presentation'), { key: 'Escape' })
    expect(localStorage.getItem('hyd_onboarded')).toBeNull()
    expect(useUIStore.getState().activeModal).toBeNull()
  })
})
