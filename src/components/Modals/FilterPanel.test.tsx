import { render, screen, fireEvent } from '@testing-library/react'
import { FilterPanel } from './FilterPanel'
import { useFilterStore } from '../../store/useFilterStore'
import { useUIStore } from '../../store/useUIStore'
import { DEFAULT_FILTERS } from '../../types/Pin'

beforeEach(() => {
  useFilterStore.setState({ filters: { ...DEFAULT_FILTERS } })
  useUIStore.setState({ activeModal: 'filter', pendingLatLng: null, selectedPin: null })
})

afterEach(() => {
  useUIStore.setState({ activeModal: null })
})

describe('FilterPanel', () => {
  it('renders all filter sections', () => {
    render(<FilterPanel />)
    expect(screen.getByText('Filters')).toBeInTheDocument()
    expect(screen.getByText('BHK')).toBeInTheDocument()
    expect(screen.getByText('Rent range')).toBeInTheDocument()
    expect(screen.getByText('Furnishing')).toBeInTheDocument()
    expect(screen.getByText('Society type')).toBeInTheDocument()
  })

  it('toggles BHK filter on click', () => {
    render(<FilterPanel />)
    fireEvent.click(screen.getByText('2BHK'))
    expect(useFilterStore.getState().filters.bhk).toContain(2)
    fireEvent.click(screen.getByText('2BHK'))
    expect(useFilterStore.getState().filters.bhk).not.toContain(2)
  })

  it('toggles furnished filter on click', () => {
    render(<FilterPanel />)
    fireEvent.click(screen.getByText('Semi'))
    expect(useFilterStore.getState().filters.furnished).toContain('semi')
  })

  it('sets gated filter', () => {
    render(<FilterPanel />)
    fireEvent.click(screen.getByText('Gated'))
    expect(useFilterStore.getState().filters.gated).toBe(true)
    fireEvent.click(screen.getByText('Open'))
    expect(useFilterStore.getState().filters.gated).toBe(false)
    fireEvent.click(screen.getByText('All'))
    expect(useFilterStore.getState().filters.gated).toBeNull()
  })

  it('clears all filters on "Clear all"', () => {
    // Set some filters first
    useFilterStore.setState({ filters: { ...DEFAULT_FILTERS, bhk: [2, 3], locality: 'Gachibowli' } })
    render(<FilterPanel />)
    fireEvent.click(screen.getByText('Clear all'))
    const filters = useFilterStore.getState().filters
    expect(filters.bhk).toHaveLength(0)
    expect(filters.locality).toBeNull()
  })

  it('closes modal on Apply', () => {
    render(<FilterPanel />)
    fireEvent.click(screen.getByText('Apply filters'))
    expect(useUIStore.getState().activeModal).toBeNull()
  })
})
