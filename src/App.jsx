import React, { useState, useEffect } from 'react'

const VIEWS = {
  POS:        'pos',
  CAJA:       'caja',
  INVENTARIO: 'inventario',
  REPORTES:   'reportes',
  CONFIG:     'configuracion',
}

const NAV_ITEMS = [
  { id: VIEWS.POS,        label: 'Ventas',     icon: '🛒' },
  { id: VIEWS.CAJA,       label: 'Caja',       icon: '💰' },
  { id: VIEWS.INVENTARIO, label: 'Inventario', icon: '📦' },
  { id: VIEWS.REPORTES,   label: 'Reportes',   icon: '📊' },
  { id: VIEWS.CONFIG,     label: 'Config',     icon: '⚙️'  },
]

export default function App() {
  const [vistaActual,   setVistaActual]   = useState(VIEWS.POS)
  const [cajaActiva,    setCajaActiva]    = useState(null)
  const [nombreNegocio, setNombreNegocio] = useState('POS Restaurante')

  useEffect(() => {
    async function cargarEstadoInicial() {
      try {
        const [caja, nombre] = await Promise.all([
          window.electronAPI.caja.obtenerActiva(),
          window.electronAPI.config.obtener('nombre_negocio'),
        ])
        setCajaActiva(caja)
        if (nombre) setNombreNegocio(nombre)
      } catch (err) {
        console.error('[App] Error al cargar estado inicial:', err)
      }
    }
    cargarEstadoInicial()
  }, [])

  return (
    <div className="app-container">
      {/* ── Sidebar ───────────────────────────────────────────────────── */}
      <nav className="sidebar">
        <div className="sidebar-logo">
          <span className="sidebar-logo-icon">🍽️</span>
          <span className="sidebar-logo-text">POS</span>
        </div>

        <div className="sidebar-nav">
          {NAV_ITEMS.map(({ id, label, icon }) => (
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

      {/* ── Main ──────────────────────────────────────────────────────── */}
      <div className="main-wrapper">
        <header className="top-bar">
          <h1 className="top-bar-title">{nombreNegocio}</h1>
          <div className="top-bar-meta">
            <span className="top-bar-fecha">
              {new Date().toLocaleDateString('es-CO', {
                weekday: 'long',
                year:    'numeric',
                month:   'long',
                day:     'numeric',
              })}
            </span>
          </div>
        </header>

        <main className="main-content">
          {vistaActual === VIEWS.POS        && <PlaceholderView title="Punto de Venta"   icon="🛒" descripcion="Selección de productos y cobro táctil" />}
          {vistaActual === VIEWS.CAJA       && <PlaceholderView title="Control de Caja"  icon="💰" descripcion="Apertura, cierre y egresos" />}
          {vistaActual === VIEWS.INVENTARIO && <PlaceholderView title="Inventario"        icon="📦" descripcion="Stock de bebidas y ajustes" />}
          {vistaActual === VIEWS.REPORTES   && <PlaceholderView title="Reportes"          icon="📊" descripcion="Ventas, productos y horas pico" />}
          {vistaActual === VIEWS.CONFIG     && <PlaceholderView title="Configuración"     icon="⚙️"  descripcion="Datos del negocio e impresora" />}
        </main>
      </div>
    </div>
  )
}

function PlaceholderView({ title, icon, descripcion }) {
  return (
    <div className="placeholder-view">
      <div className="placeholder-card">
        <span className="placeholder-icon">{icon}</span>
        <h2 className="placeholder-title">{title}</h2>
        <p className="placeholder-desc">{descripcion}</p>
        <div className="placeholder-badge">Parte 2 →</div>
      </div>
    </div>
  )
}
