// src/components/Map/PinMarker.ts
import { formatRent } from '../../utils/formatters'
import type { Pin } from '../../types/Pin'

export function createPinElement(pin: Pin, onClick: () => void): { el: HTMLElement; cleanup: () => void } {
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

  const handleClick = (e: MouseEvent) => { e.stopPropagation(); onClick() }
  const handleEnter = () => { el.style.transform = 'scale(1.1)' }
  const handleLeave = () => { el.style.transform = '' }

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
