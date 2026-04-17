// src/components/Layout/BottomCTA.tsx
import { useState } from 'react'
import styles from './BottomCTA.module.css'

export function BottomCTA() {
  const [tapped, setTapped] = useState(false)

  function handleClick() {
    setTapped(true)
    setTimeout(() => setTapped(false), 2500)
  }

  return (
    <div className={styles.wrapper}>
      <button className={styles.cta} onClick={handleClick}>
        {tapped ? 'Seeker matching coming soon! 🚀' : 'Find Flat or Tenants →'}
      </button>
    </div>
  )
}
