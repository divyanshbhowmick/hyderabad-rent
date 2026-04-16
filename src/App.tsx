// src/App.tsx
import { useEffect } from 'react'
import { useUIStore } from './store/useUIStore'
import { MapContainer } from './components/Map/MapContainer'
import { MapErrorBoundary } from './components/Map/MapErrorBoundary'
import { TopBar } from './components/Layout/TopBar'
import { CounterBar } from './components/Layout/CounterBar'
import { BottomCTA } from './components/Layout/BottomCTA'
import { RightPanel } from './components/Layout/RightPanel'
import { OnboardingModal, hasOnboarded } from './components/Modals/OnboardingModal'
import { PinSubmitModal } from './components/Modals/PinSubmitModal'
import { PinDetailModal } from './components/Modals/PinDetailModal'
import { FilterPanel } from './components/Modals/FilterPanel'
import { EmailClaimModal } from './components/Modals/EmailClaimModal'
import { getMap } from './hooks/useMap'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN
if (!MAPBOX_TOKEN) {
  throw new Error('VITE_MAPBOX_TOKEN is not set — copy .env.example to .env.local and add your token')
}

export default function App() {
  const activeModal = useUIStore(s => s.activeModal)
  const openModal = useUIStore(s => s.openModal)

  useEffect(() => {
    if (!hasOnboarded()) {
      openModal('onboarding')
    }
  }, [openModal])

  function handleGPS() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        getMap()?.flyTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 15,
          duration: 1500,
        })
      },
      (err) => {
        console.error('GPS error:', err)
      },
    )
  }

  return (
    <>
      <MapErrorBoundary>
        <MapContainer token={MAPBOX_TOKEN} />
      </MapErrorBoundary>
      <TopBar />
      <CounterBar />
      <RightPanel />

      {/* GPS button */}
      <button
        onClick={handleGPS}
        aria-label="My location"
        style={{
          position: 'fixed',
          bottom: '80px',
          left: '16px',
          zIndex: 10,
          width: '44px',
          height: '44px',
          borderRadius: '8px',
          border: '1px solid #2a2a4a',
          background: '#141428',
          color: '#e2e8f0',
          fontSize: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        ◎
      </button>

      <BottomCTA />

      {/* Modals */}
      {activeModal === 'onboarding' && <OnboardingModal />}
      {activeModal === 'pinSubmit' && <PinSubmitModal />}
      {activeModal === 'pinDetail' && <PinDetailModal />}
      {activeModal === 'filter' && <FilterPanel />}
      {activeModal === 'emailClaim' && <EmailClaimModal />}
    </>
  )
}
