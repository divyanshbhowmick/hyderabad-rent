// src/components/Layout/RightPanel.tsx
import styles from './RightPanel.module.css'

export function RightPanel() {
  return (
    <div className={styles.panel}>
      <div className={styles.fabWrapper}>
        <button className={styles.fab} disabled title="Coming soon">
          {/* Metro/train icon */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="5" y="2" width="14" height="20" rx="2"/>
            <path d="M12 6v4"/>
            <circle cx="9" cy="16" r="1"/>
            <circle cx="15" cy="16" r="1"/>
            <path d="M5 22l2-4M19 22l-2-4"/>
          </svg>
        </button>
        <span className={styles.tooltip}>Metro Lines<br/>Coming soon</span>
      </div>

      <div className={styles.fabWrapper}>
        <button className={styles.fab} disabled title="Coming soon">
          {/* Area stats / chart icon */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
        </button>
        <span className={styles.tooltip}>Area Stats<br/>Coming soon</span>
      </div>
    </div>
  )
}
