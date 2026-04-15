// src/components/Layout/CounterBar.tsx
import styles from './CounterBar.module.css'
import { usePinStore } from '../../store/usePinStore'
import { formatTotal } from '../../utils/formatters'

export function CounterBar() {
  const pins = usePinStore(s => s.pins)
  const totalRent = usePinStore(s => s.totalRent)

  return (
    <div className={styles.counterBar}>
      <span className={styles.hint}>tap map to pin rent</span>
      <span className={styles.sep}>·</span>
      <span className={styles.total}>{formatTotal(totalRent)} pinned</span>
      <span className={styles.sep}>·</span>
      <span className={styles.count}>{pins.length} pins</span>
    </div>
  )
}
