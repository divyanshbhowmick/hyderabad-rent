import { useState, useRef, useEffect } from 'react'
import { useUIStore } from '../../store/useUIStore'
import styles from './OnboardingModal.module.css'

const ONBOARDED_KEY = 'hyd_onboarded'

export function OnboardingModal() {
  const [step, setStep] = useState(1)
  const [copied, setCopied] = useState(false)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeModal = useUIStore(s => s.closeModal)

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    }
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeModal()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [closeModal])

  function finish() {
    localStorage.setItem(ONBOARDED_KEY, '1')
    closeModal()
  }

  async function handleShare() {
    const url = 'https://hyderabad.rent'
    try {
      if (navigator.share) {
        await navigator.share({ title: 'hyderabad.rent', url })
      } else {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        copyTimerRef.current = setTimeout(() => setCopied(false), 2000)
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      console.error('Share failed', err)
    }
  }

  return (
    <div className={styles.overlay} role="presentation">
      <div className={styles.card}>
        {/* Step indicator */}
        <div className={styles.steps}>
          <span className={step === 1 ? styles.dotActive : styles.dot} />
          <span className={step === 2 ? styles.dotActive : styles.dot} />
        </div>

        {step === 1 ? (
          <>
            <h2 className={styles.title}>What Hyderabadis actually pay in rent</h2>
            <p className={styles.body}>
              An anonymous map of real rents — no login, no scraping, just Hyderabadis
              pinning what they actually pay. Tap the map to add yours.
            </p>
            <button className={styles.primaryBtn} onClick={() => setStep(2)}>
              Got it →
            </button>
          </>
        ) : (
          <>
            <h2 className={styles.title}>How it works</h2>
            <ul className={styles.list}>
              <li>📍 Tap anywhere on the map to pin your rent</li>
              <li>👁 See what others pay in your area</li>
              <li>🚩 Report suspicious pins — 3 reports hides a pin</li>
            </ul>
            <button className={styles.primaryBtn} onClick={finish}>
              Let's go →
            </button>
            <button className={styles.shareBtn} onClick={handleShare}>
              {copied ? 'Copied! ✓' : 'Share with a friend ↗'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// Export the gating helper for use in App.tsx
export function hasOnboarded(): boolean {
  return localStorage.getItem(ONBOARDED_KEY) === '1'
}
