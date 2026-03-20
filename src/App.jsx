import React, { useState, useEffect, useCallback } from 'react'
import POSScreen from './modules/pos/POSScreen'
import CajaScreen from './modules/caja/CajaScreen'
import InventarioScreen from './modules/inventario/InventarioScreen'
import ReportesScreen from './modules/reportes/ReportesScreen'
import ConfigScreen from './modules/config/ConfigScreen'
import './index.css'

const VIEWS = {
  POS: 'pos',
  CAJA: 'caja',
  INVENTARIO: 'inventario',
  REPORTES: 'reportes',
  CONFIG: 'configuracion',
}

const NAV = [
  { id: VIEWS.POS, label: 'Ventas', icon: '🛒' },
  { id: VIEWS.CAJA, label: 'Caja', icon: '💰' },
  { id: VIEWS.INVENTARIO, label: 'Inventario', icon: '📦' },
  { id: VIEWS.REPORTES, label: 'Reportes', icon: '📊' },
  { id: VIEWS.CONFIG, label: 'Config', icon: '⚙️' },
]

export default function App() {
  const [vistaActual, setVistaActual] = useState(VIEWS.POS)
  const [cajaActiva, setCajaActiva] = useState(null)
  const [nombreNegocio, setNombreNegocio] = useState('POS Restaurante')
  const [iniciado, setIniciado] = useState(false)

  // ── Tema: SIEMPRE inicia en claro ────────────────────────────────
  const [temaOscuro, setTemaOscuro] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    if (temaOscuro) {
      root.setAttribute('data-theme', 'dark')
    } else {
      root.removeAttribute('data-theme')
    }
  }, [temaOscuro])

  // ── Carga inicial ────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        const [caja, nombre] = await Promise.all([
          window.electronAPI.caja.obtenerActiva(),
          window.electronAPI.config.obtener('nombre_negocio'),
        ])
        if (caja) setCajaActiva(caja)
        if (nombre) setNombreNegocio(nombre)
      } catch {
        console.warn('[App] Electron no disponible — modo demo')
      } finally {
        setIniciado(true)
      }
    }
    init()
  }, [])

  const handleCajaChange = useCallback((nuevaCaja) => {
    setCajaActiva(nuevaCaja)
  }, [])

  if (!iniciado) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--bg-app)',
      }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🍽️</div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Iniciando POS...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">

      {/* ── Sidebar ───────────────────────────────────────────────── */}
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
              {id === VIEWS.CAJA && !cajaActiva && (
                <span style={{
                  position: 'absolute', top: 6, right: 6,
                  width: 8, height: 8,
                  background: 'var(--danger)',
                  borderRadius: '50%',
                }} />
              )}
              <span className="nav-icon">{icon}</span>
              <span className="nav-label">{label}</span>
            </button>
          ))}
        </div>

        <div className="sidebar-caja-status">
          <span className={`caja-dot ${cajaActiva ? 'abierta' : 'cerrada'}`} />
          <span className="caja-texto">
            {cajaActiva ? 'Abierta' : 'Cerrada'}
          </span>
        </div>
      </nav>

      {/* ── Main ──────────────────────────────────────────────────── */}
      <div className="main-wrapper">
        <header className="top-bar">

          {/* Nombre del negocio */}
          <h1 className="top-bar-title">{nombreNegocio}</h1>

          {/* Estado de caja */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            {cajaActiva && (
              <span style={{
                fontSize: 11, color: 'var(--success)', fontWeight: 800,
                background: 'rgba(21,128,61,0.1)',
                padding: '4px 12px', borderRadius: 20,
                border: '1.5px solid var(--success)',
                whiteSpace: 'nowrap',
              }}>
                🟢 Caja abierta desde{' '}
                {new Date(cajaActiva.abierta_at).toLocaleTimeString('es-CO', {
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>
            )}
          </div>

          {/* Fecha + botón de tema */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <span className="top-bar-fecha">
              {new Date().toLocaleDateString('es-CO', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              })}
            </span>

            <button
              className="theme-toggle-btn"
              onClick={() => setTemaOscuro(prev => !prev)}
              title={temaOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              <span style={{ fontSize: 16 }}>
                {temaOscuro ? '☀️' : '🌙'}
              </span>
              {temaOscuro ? 'Modo claro' : 'Modo oscuro'}
            </button>
          </div>
        </header>

        <main className="main-content">
          {vistaActual === VIEWS.POS && <POSScreen cajaActiva={cajaActiva} />}
          {vistaActual === VIEWS.CAJA && <CajaScreen cajaActiva={cajaActiva} onCajaChange={handleCajaChange} />}
          {vistaActual === VIEWS.INVENTARIO && <InventarioScreen />}
          {vistaActual === VIEWS.REPORTES && <ReportesScreen />}
          {vistaActual === VIEWS.CONFIG && <ConfigScreen />}
        </main>
      </div>
    </div>
  )
}
