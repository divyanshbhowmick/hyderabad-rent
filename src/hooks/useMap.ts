// src/hooks/useMap.ts
import { useRef, useEffect, useMemo } from 'react'
import mapboxgl from 'mapbox-gl'
import { usePinStore } from '../store/usePinStore'
import { useFilterStore } from '../store/useFilterStore'
import { useUIStore } from '../store/useUIStore'
import { createPinElement } from '../components/Map/PinMarker'
import { applyFilters } from '../utils/pinFilter'

// Module-level map registry for GPS access from App.tsx
let _mapInstance: mapboxgl.Map | null = null
export function getMap(): mapboxgl.Map | null { return _mapInstance }

export function useMap(containerRef: React.RefObject<HTMLDivElement>, token: string) {
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<Map<string, { marker: mapboxgl.Marker; cleanup: () => void }>>(new Map())

  const pins = usePinStore(s => s.pins)
  const filters = useFilterStore(s => s.filters)
  const setPendingLatLng = useUIStore(s => s.setPendingLatLng)
  const openModal = useUIStore(s => s.openModal)
  const setSelectedPin = useUIStore(s => s.setSelectedPin)

  // Filter pins
  const visiblePins = useMemo(() => applyFilters(pins, filters), [pins, filters])

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    mapboxgl.accessToken = token
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [78.4867, 17.3850],
      zoom: 12,
    })

    map.on('click', (e) => {
      // Only open pin submit if click was not on a marker
      const target = e.originalEvent.target as HTMLElement
      if (target.closest('[data-pin-marker]')) return
      setPendingLatLng({ lat: e.lngLat.lat, lng: e.lngLat.lng })
      openModal('pinSubmit')
    })

    // Assign to module-level registry for GPS access from App.tsx.
    // In React Strict Mode, effects run twice (mount → unmount → mount).
    // The second assignment is the one that sticks; getMap() may briefly
    // return null between the two mounts during development hot-reloads.
    _mapInstance = map
    mapRef.current = map

    return () => {
      markersRef.current.forEach(({ marker, cleanup }) => {
        cleanup()
        marker.remove()
      })
      markersRef.current.clear()
      map.remove()
      mapRef.current = null
      _mapInstance = null
    }
  }, [token, setPendingLatLng, openModal])

  // Sync markers with visiblePins
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const visibleIds = new Set(visiblePins.map(p => p.id))

    // Remove markers no longer visible
    markersRef.current.forEach(({ marker, cleanup }, id) => {
      if (!visibleIds.has(id)) {
        cleanup()
        marker.remove()
        markersRef.current.delete(id)
      }
    })

    // Add new markers
    visiblePins.forEach(pin => {
      if (markersRef.current.has(pin.id)) return

      const { el, cleanup } = createPinElement(pin, () => {
        setSelectedPin(pin)
        openModal('pinDetail')
      })

      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([pin.lng, pin.lat])
        .addTo(map)

      markersRef.current.set(pin.id, { marker, cleanup })
    })
  }, [visiblePins, setSelectedPin, openModal])

  return mapRef
}
