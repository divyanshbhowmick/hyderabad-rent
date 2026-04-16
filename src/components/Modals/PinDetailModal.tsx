// src/components/Modals/PinDetailModal.tsx
import { useState, useRef, useEffect } from 'react'
import { usePinStore } from '../../store/usePinStore'
import { useUIStore } from '../../store/useUIStore'
import { formatRent, formatDaysAgo } from '../../utils/formatters'
import styles from './PinDetailModal.module.css'

export function PinDetailModal() {
  const [reported, setReported] = useState(false)
  const [copied, setCopied] = useState(false)

  const reportTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasReportedRef = useRef(false)

  useEffect(() => {
    return () => {
      if (reportTimerRef.current) clearTimeout(reportTimerRef.current)
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    }
  }, [])

  const selectedPin = useUIStore(s => s.selectedPin)
  const closeModal = useUIStore(s => s.closeModal)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') closeModal() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [closeModal])
  const reportPin = usePinStore(s => s.reportPin)
  const livePins = usePinStore(s => s.pins)

  if (!selectedPin) return null

  // Use live pin data so reportCount stays current after reporting.
  // Guard selectedPin above first so `pin` is typed as Pin (not Pin | null),
  // which lets TypeScript narrow correctly inside inner function closures.
  const pin = livePins.find(p => p.id === selectedPin.id) ?? selectedPin

  function handleReport() {
    if (hasReportedRef.current) return
    hasReportedRef.current = true
    reportPin(pin.id)
    setReported(true)
    reportTimerRef.current = setTimeout(() => setReported(false), 2000)
  }

  async function handleShare() {
    const url = `https://hyd.rentals/#pin-${pin.id}`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'hyderabad.rent', text: `₹${formatRent(pin.rent)} in ${pin.locality ?? 'Hyderabad'}`, url })
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

  const furnishedLabel = pin.furnished === 'furnished' ? 'Furnished' : pin.furnished === 'semi' ? 'Semi-furnished' : 'Unfurnished'
  const tenantLabel = pin.tenantType === 'family' ? 'Family' : pin.tenantType === 'bachelor' ? 'Bachelor' : 'Any tenant'

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.rentBlock}>
            <span className={styles.rent}>₹{formatRent(pin.rent)}</span>
            <span className={styles.bhk}>{pin.bhk} BHK</span>
          </div>
          <div className={styles.headerRight}>
            <span className={pin.available ? styles.badgeAvail : styles.badgeNA}>
              {pin.available ? 'Available' : 'Not available'}
            </span>
            <button className={styles.closeBtn} onClick={closeModal} aria-label="Close">✕</button>
          </div>
        </div>

        {(pin.locality || pin.verified) && (
          <p className={styles.locality}>
            {pin.locality && <>📍 {pin.locality}</>}
            {pin.locality && pin.verified && ' '}
            {pin.verified && <span className={styles.verifiedBadge}>Verified ✓</span>}
          </p>
        )}

        <p className={styles.timestamp}>pinned {formatDaysAgo(pin.createdAt)}</p>

        <div className={styles.tags}>
          <span className={styles.tag}>{furnishedLabel}</span>
          <span className={styles.tag}>{pin.gated ? 'Gated' : 'Open society'}</span>
          <span className={styles.tag}>{pin.maintenance === 'included' ? 'Maintenance included' : 'Maintenance excluded'}</span>
          <span className={styles.tag}>{tenantLabel}</span>
          <span className={styles.tag}>{pin.pets ? 'Pets OK' : 'No pets'}</span>
        </div>

        <p className={styles.deposit}>Deposit: {pin.depositMonths} {pin.depositMonths === 1 ? 'month' : 'months'}</p>

        <div className={styles.actions}>
          <button className={styles.shareBtn} onClick={handleShare}>
            {copied ? 'Copied! ✓' : 'Share ↗'}
          </button>
          <button
            className={pin.reportCount >= 2 ? styles.reportBtnWarn : styles.reportBtn}
            onClick={handleReport}
            disabled={reported}
          >
            {reported ? 'Reported. Thanks.' : '🚩 Report'}
          </button>
        </div>
      </div>
    </div>
  )
}
