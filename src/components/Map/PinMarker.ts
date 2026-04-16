// src/components/Map/PinMarker.ts
import { formatRent } from '../../utils/formatters'
import type { Pin } from '../../types/Pin'

export function createPinElement(pin: Pin, onClick: () => void): { el: HTMLElement; cleanup: () => void } {
  // Mapbox applies its own `transform: translate(...)` directly to the element
  // passed as the custom marker. We must NEVER touch `el.style.transform` or we
  // overwrite Mapbox's positioning and the marker jumps off-screen.
  //
  // Solution: outer `el` is owned by Mapbox (no transform from us).
  //           inner `pill` is owned by us (hover scale, styling).
  const el = document.createElement('div')
  el.setAttribute('data-pin-marker', pin.id)
  // Transparent wrapper — zero layout contribution, just a click/hover target.
  el.style.cssText = 'cursor:pointer;user-select:none'

  const pill = document.createElement('div')
  pill.style.cssText = [
    `background: ${pin.available ? '#10b981' : '#7c3aed'}`,
    'color: #fff',
    'font-size: 11px',
    'font-weight: 700',
    'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    'padding: 3px 7px',
    'border-radius: 10px',
    'white-space: nowrap',
    'box-shadow: 0 1px 4px rgba(0,0,0,0.5)',
    'transition: transform 0.1s ease',
    'line-height: 1.4',
    'transform-origin: bottom center',
  ].join(';')
  pill.textContent = formatRent(pin.rent)
  el.appendChild(pill)

  const handleClick = (e: MouseEvent) => { e.stopPropagation(); onClick() }
  // Scale the pill, never el — el's transform belongs to Mapbox.
  const handleEnter = () => { pill.style.transform = 'scale(1.1)' }
  const handleLeave = () => { pill.style.transform = '' }

  el.addEventListener('click', handleClick)
  el.addEventListener('mouseenter', handleEnter)
  el.addEventListener('mouseleave', handleLeave)

  const cleanup = () => {
    el.removeEventListener('click', handleClick)
    el.removeEventListener('mouseenter', handleEnter)
    el.removeEventListener('mouseleave', handleLeave)
  }

  return { el, cleanup }
}
