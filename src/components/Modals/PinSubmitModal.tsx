// src/components/Modals/PinSubmitModal.tsx
import { useState } from 'react'
import { usePinStore } from '../../store/usePinStore'
import { useUIStore } from '../../store/useUIStore'
import { LOCALITIES } from '../../data/localities'
import type { BHK, Furnished, TenantType, Maintenance } from '../../types/Pin'
import styles from './PinSubmitModal.module.css'

interface FormState {
  rent: string
  bhk: BHK | null
  furnished: Furnished | null
  gated: boolean | null
  maintenance: Maintenance | null
  tenantType: TenantType | null
  depositMonths: string
  pets: boolean | null
  available: boolean | null
  locality: string
}

const INITIAL: FormState = {
  rent: '', bhk: null, furnished: null, gated: null,
  maintenance: null, tenantType: null, depositMonths: '2',
  pets: null, available: null, locality: '',
}

export function PinSubmitModal() {
  const [form, setForm] = useState<FormState>(INITIAL)
  const [errors, setErrors] = useState<string[]>([])
  const [success, setSuccess] = useState(false)

  const pendingLatLng = useUIStore(s => s.pendingLatLng)
  const closeModal = useUIStore(s => s.closeModal)
  const addPin = usePinStore(s => s.addPin)

  function validate(): string[] {
    const errs: string[] = []
    const rent = Number(form.rent)
    if (!form.rent || isNaN(rent) || rent < 1000) errs.push('Enter a valid rent (min ₹1,000)')
    if (form.bhk === null) errs.push('Select BHK')
    if (form.furnished === null) errs.push('Select furnishing')
    if (form.gated === null) errs.push('Select society type')
    if (form.maintenance === null) errs.push('Select maintenance')
    if (form.tenantType === null) errs.push('Select tenant type')
    const dep = Number(form.depositMonths)
    if (!form.depositMonths || isNaN(dep) || dep < 1 || dep > 12) errs.push('Deposit months must be 1–12')
    if (form.pets === null) errs.push('Select pets policy')
    if (form.available === null) errs.push('Select availability')
    return errs
  }

  function handleSubmit() {
    if (!pendingLatLng) return
    const errs = validate()
    if (errs.length > 0) { setErrors(errs); return }
    setErrors([])
    addPin({
      lat: pendingLatLng.lat,
      lng: pendingLatLng.lng,
      rent: Number(form.rent),
      bhk: form.bhk!,
      furnished: form.furnished!,
      gated: form.gated!,
      maintenance: form.maintenance!,
      tenantType: form.tenantType!,
      depositMonths: Number(form.depositMonths),
      pets: form.pets!,
      available: form.available!,
    })
    setSuccess(true)
    setTimeout(() => closeModal(), 1500)
  }

  if (success) {
    return (
      <div className={styles.overlay}>
        <div className={styles.card}>
          <p className={styles.successMsg}>Pin added! Thanks for contributing. 🙏</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h2 className={styles.title}>Pin your rent</h2>
          <button className={styles.closeBtn} onClick={closeModal} aria-label="Close">✕</button>
        </div>

        {pendingLatLng && (
          <p className={styles.coords}>
            📍 {pendingLatLng.lat.toFixed(4)}°N, {pendingLatLng.lng.toFixed(4)}°E
          </p>
        )}

        {errors.length > 0 && (
          <ul className={styles.errors}>
            {errors.map(e => <li key={e}>{e}</li>)}
          </ul>
        )}

        {/* Rent */}
        <div className={styles.field}>
          <label className={styles.label}>Monthly rent (₹)</label>
          <input
            className={styles.input}
            type="number"
            placeholder="e.g. 22000"
            value={form.rent}
            onChange={e => setForm(f => ({ ...f, rent: e.target.value }))}
            min={1000}
            max={500000}
          />
        </div>

        {/* Locality */}
        <div className={styles.field}>
          <label className={styles.label}>Locality (optional)</label>
          <select
            className={styles.select}
            value={form.locality}
            onChange={e => setForm(f => ({ ...f, locality: e.target.value }))}
          >
            <option value="">Select locality</option>
            {LOCALITIES.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        {/* BHK */}
        <div className={styles.field}>
          <label className={styles.label}>BHK</label>
          <div className={styles.toggleGroup}>
            {([1, 2, 3, 4, 5] as BHK[]).map(n => (
              <button
                key={n}
                className={form.bhk === n ? styles.toggleActive : styles.toggle}
                onClick={() => setForm(f => ({ ...f, bhk: n }))}
                type="button"
              >
                {n}BHK
              </button>
            ))}
          </div>
        </div>

        {/* Furnished */}
        <div className={styles.field}>
          <label className={styles.label}>Furnishing</label>
          <div className={styles.toggleGroup}>
            {(['furnished', 'semi', 'unfurnished'] as Furnished[]).map(v => (
              <button
                key={v}
                className={form.furnished === v ? styles.toggleActive : styles.toggle}
                onClick={() => setForm(f => ({ ...f, furnished: v }))}
                type="button"
              >
                {v === 'semi' ? 'Semi' : v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Gated */}
        <div className={styles.field}>
          <label className={styles.label}>Gated society?</label>
          <div className={styles.toggleGroup}>
            <button className={form.gated === true ? styles.toggleActive : styles.toggle} onClick={() => setForm(f => ({ ...f, gated: true }))} type="button">Yes</button>
            <button className={form.gated === false ? styles.toggleActive : styles.toggle} onClick={() => setForm(f => ({ ...f, gated: false }))} type="button">No</button>
          </div>
        </div>

        {/* Maintenance */}
        <div className={styles.field}>
          <label className={styles.label}>Maintenance</label>
          <div className={styles.toggleGroup}>
            {(['included', 'excluded'] as Maintenance[]).map(v => (
              <button
                key={v}
                className={form.maintenance === v ? styles.toggleActive : styles.toggle}
                onClick={() => setForm(f => ({ ...f, maintenance: v }))}
                type="button"
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Tenant type */}
        <div className={styles.field}>
          <label className={styles.label}>Preferred tenant</label>
          <div className={styles.toggleGroup}>
            {(['family', 'bachelor', 'any'] as TenantType[]).map(v => (
              <button
                key={v}
                className={form.tenantType === v ? styles.toggleActive : styles.toggle}
                onClick={() => setForm(f => ({ ...f, tenantType: v }))}
                type="button"
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Deposit months */}
        <div className={styles.field}>
          <label className={styles.label}>Deposit (months)</label>
          <input
            className={styles.input}
            type="number"
            value={form.depositMonths}
            onChange={e => setForm(f => ({ ...f, depositMonths: e.target.value }))}
            min={1}
            max={12}
          />
        </div>

        {/* Pets */}
        <div className={styles.field}>
          <label className={styles.label}>Pets allowed?</label>
          <div className={styles.toggleGroup}>
            <button className={form.pets === true ? styles.toggleActive : styles.toggle} onClick={() => setForm(f => ({ ...f, pets: true }))} type="button">Yes</button>
            <button className={form.pets === false ? styles.toggleActive : styles.toggle} onClick={() => setForm(f => ({ ...f, pets: false }))} type="button">No</button>
          </div>
        </div>

        {/* Available */}
        <div className={styles.field}>
          <label className={styles.label}>Availability</label>
          <div className={styles.toggleGroup}>
            <button className={form.available === true ? styles.toggleActive : styles.toggle} onClick={() => setForm(f => ({ ...f, available: true }))} type="button">Available</button>
            <button className={form.available === false ? styles.toggleActive : styles.toggle} onClick={() => setForm(f => ({ ...f, available: false }))} type="button">Not available</button>
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={closeModal} type="button">Cancel</button>
          <button className={styles.submitBtn} onClick={handleSubmit} type="button">Pin rent</button>
        </div>
      </div>
    </div>
  )
}
