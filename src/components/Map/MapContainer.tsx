// src/components/Map/MapContainer.tsx
import { useRef, useEffect } from 'react'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useMap } from '../../hooks/useMap'
import { usePinStore } from '../../store/usePinStore'
import styles from './MapContainer.module.css'

interface MapContainerProps {
  token: string
}

export function MapContainer({ token }: MapContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useMap(containerRef, token)
  const loadPins = usePinStore(s => s.loadPins)

  useEffect(() => {
    loadPins()
  }, [loadPins])

  return (
    <div ref={containerRef} className={styles.map} />
  )
}
