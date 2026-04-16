// src/components/Map/MapErrorBoundary.tsx
import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { failed: boolean }

export class MapErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return (
        <div style={{
          position: 'fixed', inset: 0,
          background: '#0d0d1a',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: '12px',
          color: '#94a3b8', fontFamily: 'system-ui, sans-serif',
        }}>
          <span style={{ fontSize: '2rem' }}>🗺️</span>
          <p style={{ margin: 0, fontSize: '15px' }}>Map unavailable — WebGL not supported in this browser.</p>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Try Chrome or Firefox with hardware acceleration enabled.</p>
        </div>
      )
    }
    return this.props.children
  }
}
