// src/components/Modals/EmailClaimModal.tsx
import { useState, useRef, useEffect } from 'react'
import { useUIStore } from '../../store/useUIStore'
import { usePinStore } from '../../store/usePinStore'
import { PinService } from '../../services/PinService'
import styles from './EmailClaimModal.module.css'

export function EmailClaimModal() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pendingPinId = useUIStore(s => s.pendingPinId)
  const closeModal = useUIStore(s => s.closeModal)
  const verifyPin = usePinStore(s => s.verifyPin)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  async function handleSubmit() {
    if (!pendingPinId || submitting) return
    if (!email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await PinService.claimPin(pendingPinId, email)
      verifyPin(pendingPinId)
      setSuccess(true)
      timerRef.current = setTimeout(() => closeModal(), 1500)
    } catch {
      setError("Couldn't save your email — try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className={styles.overlay}>
        <div className={styles.card}>
          <p className={styles.successMsg}>You're in! ✓</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <h2 className={styles.title}>Pin added! 📍</h2>
        <p className={styles.subtitle}>Add your email to:</p>
        <ul className={styles.benefits}>
          <li>Get matched when seekers are looking near your area</li>
          <li>Edit or remove this pin later</li>
          <li>Get a Verified ✓ badge</li>
        </ul>

        <input
          className={styles.input}
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          disabled={submitting}
        />

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <button
            className={styles.notifyBtn}
            onClick={handleSubmit}
            type="button"
            disabled={submitting}
          >
            {submitting ? 'Saving...' : 'Notify me'}
          </button>
          <button
            className={styles.skipBtn}
            onClick={closeModal}
            type="button"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  )
}
