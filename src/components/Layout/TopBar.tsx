// src/components/Layout/TopBar.tsx
import styles from './TopBar.module.css'
import { useUIStore } from '../../store/useUIStore'
import { useFilterStore } from '../../store/useFilterStore'
import { DEFAULT_FILTERS } from '../../types/Pin'

export function TopBar() {
  const openModal = useUIStore(s => s.openModal)
  const filters = useFilterStore(s => s.filters)

  const filtersActive =
    filters.locality !== DEFAULT_FILTERS.locality ||
    filters.bhk.length > 0 ||
    filters.furnished.length > 0 ||
    filters.gated !== DEFAULT_FILTERS.gated ||
    filters.rentMin !== DEFAULT_FILTERS.rentMin ||
    filters.rentMax !== DEFAULT_FILTERS.rentMax

  return (
    <header className={styles.topBar}>
      <span className={styles.logo}>hyderabad.rent</span>
      <button
        className={styles.filterBtn}
        onClick={() => openModal('filter')}
        aria-label="Open filters"
      >
        {/* SVG funnel icon */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
        </svg>
        {filtersActive && <span className={styles.filterDot} />}
      </button>
    </header>
  )
}
