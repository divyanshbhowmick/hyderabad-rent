// src/components/Map/PinMarker.ts
import { formatRent } from '../../utils/formatters'
import type { Pin } from '../../types/Pin'

export function createPinElement(pin: Pin, onClick: () => void): HTMLElement {
  const el = document.createElement('div')
  el.setAttribute('data-pin-marker', pin.id)
  el.style.cssText = [
    `background: ${pin.available ? '#10b981' : '#7c3aed'}`,
    'color: #fff',
    'font-size: 11px',
    'font-weight: 700',
    'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    'padding: 3px 7px',
    'border-radius: 10px',
    'white-space: nowrap',
    'cursor: pointer',
    'user-select: none',
    'box-shadow: 0 1px 4px rgba(0,0,0,0.5)',
    'transition: transform 0.1s ease',
    'line-height: 1.4',
  ].join(';')

  el.textContent = formatRent(pin.rent)
  el.addEventListener('click', (e) => {
    e.stopPropagation()
    onClick()
  })
  el.addEventListener('mouseenter', () => {
    el.style.transform = 'scale(1.1)'
  })
  el.addEventListener('mouseleave', () => {
    el.style.transform = ''
  })

  return el
}
