import { useEffect } from 'react'
import { useFilterStore } from '../../store/useFilterStore'
import { useUIStore } from '../../store/useUIStore'
import { LOCALITIES } from '../../data/localities'
import type { BHK, Furnished } from '../../types/Pin'
import styles from './FilterPanel.module.css'

export function FilterPanel() {
  const filters = useFilterStore(s => s.filters)
  const setFilter = useFilterStore(s => s.setFilter)
  const clearFilters = useFilterStore(s => s.clearFilters)
  const closeModal = useUIStore(s => s.closeModal)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') closeModal() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [closeModal])

  function toggleBHK(n: BHK) {
    const next = filters.bhk.includes(n)
      ? filters.bhk.filter(b => b !== n)
      : [...filters.bhk, n]
    setFilter('bhk', next)
  }

  function toggleFurnished(v: Furnished) {
    const next = filters.furnished.includes(v)
      ? filters.furnished.filter(f => f !== v)
      : [...filters.furnished, v]
    setFilter('furnished', next)
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h2 className={styles.title}>Filters</h2>
          <div className={styles.headerActions}>
            <button className={styles.clearBtn} onClick={clearFilters}>Clear all</button>
            <button className={styles.closeBtn} onClick={closeModal} aria-label="Close filters">✕</button>
          </div>
        </div>

        {/* Locality */}
        <div className={styles.section}>
          <label className={styles.sectionLabel}>Locality</label>
          <select
            className={styles.select}
            value={filters.locality ?? ''}
            onChange={e => setFilter('locality', e.target.value || null)}
          >
            <option value="">All localities</option>
            {LOCALITIES.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        {/* BHK */}
        <div className={styles.section}>
          <label className={styles.sectionLabel}>BHK</label>
          <div className={styles.toggleGroup}>
            {([1, 2, 3, 4, 5] as BHK[]).map(n => (
              <button
                key={n}
                type="button"
                aria-pressed={filters.bhk.includes(n)}
                className={filters.bhk.includes(n) ? styles.toggleActive : styles.toggle}
                onClick={() => toggleBHK(n)}
              >
                {n}BHK
              </button>
            ))}
          </div>
        </div>

        {/* Rent range */}
        <div className={styles.section}>
          <label className={styles.sectionLabel}>Rent range</label>
          <div className={styles.rentInputs}>
            <div className={styles.rentField}>
              <label htmlFor="filter-rent-min" className={styles.rentFieldLabel}>Min</label>
              <input
                id="filter-rent-min"
                className={styles.rentInput}
                type="number"
                value={filters.rentMin}
                min={1000}
                max={filters.rentMax}
                onChange={e => {
                  const v = Math.max(1000, Number(e.target.value))
                  setFilter('rentMin', Math.min(v, filters.rentMax))
                }}
              />
            </div>
            <span className={styles.rentSep}>—</span>
            <div className={styles.rentField}>
              <label htmlFor="filter-rent-max" className={styles.rentFieldLabel}>Max</label>
              <input
                id="filter-rent-max"
                className={styles.rentInput}
                type="number"
                value={filters.rentMax}
                min={filters.rentMin}
                max={500000}
                onChange={e => {
                  const v = Math.max(1000, Number(e.target.value))
                  setFilter('rentMax', Math.max(v, filters.rentMin))
                }}
              />
            </div>
          </div>
          <p className={styles.rentHint}>
            ₹{filters.rentMin.toLocaleString('en-IN')} – ₹{filters.rentMax.toLocaleString('en-IN')}
          </p>
        </div>

        {/* Furnishing */}
        <div className={styles.section}>
          <label className={styles.sectionLabel}>Furnishing</label>
          <div className={styles.toggleGroup}>
            {(['furnished', 'semi', 'unfurnished'] as Furnished[]).map(v => (
              <button
                key={v}
                type="button"
                aria-pressed={filters.furnished.includes(v)}
                className={filters.furnished.includes(v) ? styles.toggleActive : styles.toggle}
                onClick={() => toggleFurnished(v)}
              >
                {v === 'semi' ? 'Semi' : v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Gated */}
        <div className={styles.section}>
          <label className={styles.sectionLabel}>Society type</label>
          <div className={styles.toggleGroup}>
            <button
              type="button"
              aria-pressed={filters.gated === null}
              className={filters.gated === null ? styles.toggleActive : styles.toggle}
              onClick={() => setFilter('gated', null)}
            >All</button>
            <button
              type="button"
              aria-pressed={filters.gated === true}
              className={filters.gated === true ? styles.toggleActive : styles.toggle}
              onClick={() => setFilter('gated', true)}
            >Gated</button>
            <button
              type="button"
              aria-pressed={filters.gated === false}
              className={filters.gated === false ? styles.toggleActive : styles.toggle}
              onClick={() => setFilter('gated', false)}
            >Open</button>
          </div>
        </div>

        <button className={styles.applyBtn} onClick={closeModal}>
          Apply filters
        </button>
      </div>
    </div>
  )
}
