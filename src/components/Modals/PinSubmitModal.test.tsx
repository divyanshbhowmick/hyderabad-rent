// src/components/Modals/PinSubmitModal.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { PinSubmitModal } from './PinSubmitModal'
import { useUIStore } from '../../store/useUIStore'
import { usePinStore } from '../../store/usePinStore'

beforeEach(() => {
  useUIStore.setState({
    activeModal: 'pinSubmit',
    pendingLatLng: { lat: 17.385, lng: 78.4867 },
    selectedPin: null,
  })
  // Clear localStorage so seed pins don't interfere
  localStorage.clear()
  usePinStore.getState().loadPins()
})

afterEach(() => {
  useUIStore.setState({ activeModal: null, pendingLatLng: null, selectedPin: null })
})

function fillValidForm() {
  // Rent
  fireEvent.change(screen.getByPlaceholderText(/e.g. 22000/i), { target: { value: '22000' } })
  // BHK
  fireEvent.click(screen.getByText('2BHK'))
  // Furnished
  fireEvent.click(screen.getByText('Semi'))
  // Gated — click Yes (index 0: Gated Yes)
  const yesButtons = screen.getAllByText('Yes')
  fireEvent.click(yesButtons[0])
  // Maintenance
  fireEvent.click(screen.getByText('Included'))
  // Tenant type
  fireEvent.click(screen.getByText('Family'))
  // Deposit is pre-filled with '2', no change needed
  // Pets — click No (index 1: Pets No; index 0 is Gated No)
  const noButtons = screen.getAllByText('No')
  fireEvent.click(noButtons[1])
  // Available
  fireEvent.click(screen.getByText('Available'))
}

describe('PinSubmitModal', () => {
  it('renders the form with coordinates', () => {
    render(<PinSubmitModal />)
    expect(screen.getByText(/Pin your rent/i)).toBeInTheDocument()
    expect(screen.getByText(/17.3850°N/)).toBeInTheDocument()
  })

  it('shows validation errors when submitting empty form', () => {
    render(<PinSubmitModal />)
    fireEvent.click(screen.getByText('Pin rent'))
    expect(screen.getByText(/Enter a valid rent/i)).toBeInTheDocument()
  })

  it('shows success state after valid submission', async () => {
    render(<PinSubmitModal />)
    fillValidForm()
    fireEvent.click(screen.getByText('Pin rent'))
    expect(screen.getByText(/Pin added!/i)).toBeInTheDocument()
  })

  it('calls addPin with correct lat/lng from pendingLatLng', () => {
    render(<PinSubmitModal />)
    fillValidForm()
    fireEvent.click(screen.getByText('Pin rent'))
    const pin = usePinStore.getState().pins.find(p => p.rent === 22000 && p.lat === 17.385)
    expect(pin).toBeDefined()
    expect(pin!.lat).toBe(17.385)
    expect(pin!.lng).toBe(78.4867)
  })

  it('closes on Cancel click', () => {
    render(<PinSubmitModal />)
    fireEvent.click(screen.getByText('Cancel'))
    expect(useUIStore.getState().activeModal).toBeNull()
  })
})
