// src/components/Layout/CounterBar.tsx
import { useMemo } from 'react'
import styles from './CounterBar.module.css'
import { usePinStore } from '../../store/usePinStore'
import { useFilterStore } from '../../store/useFilterStore'
import { formatTotal } from '../../utils/formatters'
import { applyFilters } from '../../utils/pinFilter'

export function CounterBar() {
  const allPins = usePinStore(s => s.pins)
  const filters = useFilterStore(s => s.filters)
  const pins = useMemo(() => applyFilters(allPins, filters), [allPins, filters])
  const totalRent = pins.reduce((sum, p) => sum + p.rent, 0)

  return (
    <div className={styles.counterBar}>
      <span className={styles.hint}>tap map to pin rent</span>
      {pins.length > 0 && (
        <>
          <span className={styles.sep}>·</span>
          <span className={styles.total}>{formatTotal(totalRent)} pinned</span>
        </>
      )}
      <span className={styles.sep}>·</span>
      <span className={styles.count}>{pins.length} pins</span>
    </div>
  )
}
