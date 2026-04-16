// src/components/Map/MapContainer.tsx
import { useRef, useEffect } from 'react'
// mapRef returned by useMap is not needed here; GPS access goes through getMap() in App.tsx
import 'mapbox-gl/dist/mapbox-gl.css'
import { useMap } from '../../hooks/useMap'
import { usePinStore } from '../../store/usePinStore'
import styles from './MapContainer.module.css'

interface MapContainerProps {
  token: string
}

export function MapContainer({ token }: MapContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  useMap(containerRef, token)
  const loadPins = usePinStore(s => s.loadPins)

  useEffect(() => {
    loadPins()
  }, [loadPins])

  return (
    <div ref={containerRef} className={styles.map} />
  )
}
