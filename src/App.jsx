import React, { useState, useEffect } from 'react'
import POSScreen      from './modules/pos/POSScreen'
import CajaPlaceholder from './modules/caja/CajaPlaceholder'
import './index.css'

const VIEWS = {
  POS:        'pos',
  CAJA:       'caja',
  INVENTARIO: 'inventario',
  REPORTES:   'reportes',
  CONFIG:     'configuracion',
}

const NAV = [
  { id: VIEWS.POS,        label: 'Ventas',     icon: '🛒' },
  { id: VIEWS.CAJA,       label: 'Caja',       icon: '💰' },
  { id: VIEWS.INVENTARIO, label: 'Inventario', icon: '📦' },
  { id: VIEWS.REPORTES,   label: 'Reportes',   icon: '📊' },
  { id: VIEWS.CONFIG,     label: 'Config',     icon: '⚙️'  },
]

export default function App() {
  const [vistaActual,    setVistaActual]    = useState(VIEWS.POS)
  const [cajaActiva,     setCajaActiva]     = useState(null)
  const [nombreNegocio,  setNombreNegocio]  = useState('Mi Restaurante')

  useEffect(() => {
    async function init() {
      try {
        const [caja, nombre] = await Promise.all([
          window.electronAPI.caja.obtenerActiva(),
          window.electronAPI.config.obtener('nombre_negocio'),
        ])
        setCajaActiva(caja)
        if (nombre) setNombreNegocio(nombre)
      } catch (err) {
        // En modo web (sin Electron) continúa sin error
        console.warn('[App] electronAPI no disponible:', err.message)
      }
    }
    init()
  }, [])

  return (
    <div className="app-container">

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <nav className="sidebar">
        <div className="sidebar-logo">
          <span className="sidebar-logo-icon">🍽️</span>
          <span className="sidebar-logo-text">POS</span>
        </div>

        <div className="sidebar-nav">
          {NAV.map(({ id, label, icon }) => (
            <button
              key={id}
              className={`nav-btn ${vistaActual === id ? 'active' : ''}`}
              onClick={() => setVistaActual(id)}
              title={label}
            >
              <span className="nav-icon">{icon}</span>
              <span className="nav-label">{label}</span>
            </button>
          ))}
        </div>

        <div className="sidebar-caja-status">
          <span className={`caja-dot ${cajaActiva ? 'abierta' : 'cerrada'}`} />
          <span className="caja-texto">
            {cajaActiva ? 'Caja abierta' : 'Caja cerrada'}
          </span>
        </div>
      </nav>

      {/* ── Contenido principal ─────────────────────────────────────── */}
      <div className="main-wrapper">
        <header className="top-bar">
          <h1 className="top-bar-title">{nombreNegocio}</h1>
          <span className="top-bar-fecha">
            {new Date().toLocaleDateString('es-CO', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })}
          </span>
        </header>

        <main className="main-content">
          {vistaActual === VIEWS.POS        && <POSScreen cajaActiva={cajaActiva} />}
          {vistaActual === VIEWS.CAJA       && <CajaPlaceholder />}
          {vistaActual === VIEWS.INVENTARIO && <Placeholder title="Inventario"    icon="📦" />}
          {vistaActual === VIEWS.REPORTES   && <Placeholder title="Reportes"      icon="📊" />}
          {vistaActual === VIEWS.CONFIG     && <Placeholder title="Configuración" icon="⚙️"  />}
        </main>
      </div>
    </div>
  )
}

function Placeholder({ title, icon }) {
  return (
    <div className="placeholder-view">
      <div className="placeholder-card">
        <span style={{ fontSize: 52 }}>{icon}</span>
        <h2 className="placeholder-title">{title}</h2>
        <div className="placeholder-badge">Próximamente</div>
      </div>
    </div>
  )
}
