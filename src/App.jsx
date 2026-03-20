import React, { useState, useEffect, useCallback } from 'react'
import { UserProvider, useUser } from './context/UserContext'
import LoginScreen      from './modules/auth/LoginScreen'
import POSScreen        from './modules/pos/POSScreen'
import CajaScreen       from './modules/caja/CajaScreen'
import InventarioScreen from './modules/inventario/InventarioScreen'
import ReportesScreen   from './modules/reportes/ReportesScreen'
import ConfigScreen     from './modules/config/ConfigScreen'
import './index.css'

// ── Envuelve toda la app en UserProvider ─────────────────────────────────────
export default function App() {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  )
}

// ── Contenido principal (accede al contexto) ──────────────────────────────────
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

function AppContent() {
  const { user, logout, cerrarAppSeguro } = useUser()

  const [vistaActual,   setVistaActual]   = useState(VIEWS.POS)
  const [cajaActiva,    setCajaActiva]    = useState(null)
  const [nombreNegocio, setNombreNegocio] = useState('POS Restaurante')
  const [temaOscuro,    setTemaOscuro]    = useState(false)
  const [cerrando,      setCerrando]      = useState(false)

  // ── Tema ──────────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement[temaOscuro ? 'setAttribute' : 'removeAttribute']('data-theme', 'dark')
  }, [temaOscuro])

  // ── Cargar estado inicial al autenticarse ─────────────────────────
  useEffect(() => {
    if (!user) return
    async function init() {
      try {
        const [caja, nombre] = await Promise.all([
          window.electronAPI.caja.obtenerActiva(),
          window.electronAPI.config.obtener('nombre_negocio'),
        ])
        if (caja)   setCajaActiva(caja)
        if (nombre) setNombreNegocio(nombre)
      } catch {
        console.warn('[App] Electron no disponible')
      }
    }
    init()
  }, [user])

  const handleCajaChange = useCallback((nueva) => setCajaActiva(nueva), [])

  // ── Logout simple ─────────────────────────────────────────────────
  async function handleLogout() {
    await logout()
    setCajaActiva(null)
    setVistaActual(VIEWS.POS)
  }

  // ── Cierre seguro de app ──────────────────────────────────────────
  async function handleCerrarApp() {
    if (cerrando) return
    const confirmar = window.confirm(
      '¿Cerrar la aplicación?\n\nSe cerrará la caja activa si la hay.'
    )
    if (!confirmar) return
    setCerrando(true)
    await cerrarAppSeguro(cajaActiva, async (sesionId) => {
      if (window.electronAPI) await window.electronAPI.caja.cerrar(sesionId)
    })
  }

  // ── Sin usuario → pantalla de login ──────────────────────────────
  if (!user) return <LoginScreen />

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
                  position:'absolute',top:6,right:6,
                  width:8,height:8,background:'var(--danger)',borderRadius:'50%',
                }} />
              )}
              <span className="nav-icon">{icon}</span>
              <span className="nav-label">{label}</span>
            </button>
          ))}
        </div>

        {/* Info usuario + logout */}
        <div className="sidebar-user">
          <span className="sidebar-user-icon">
            {user.role === 'admin' ? '👑' : '👤'}
          </span>
          <span className="sidebar-user-name">{user.username}</span>
          <button
            className="sidebar-logout-btn"
            onClick={handleLogout}
            title="Cerrar sesión"
          >
            ↩
          </button>
        </div>

        <div className="sidebar-caja-status">
          <span className={`caja-dot ${cajaActiva ? 'abierta' : 'cerrada'}`} />
          <span className="caja-texto">{cajaActiva ? 'Abierta' : 'Cerrada'}</span>
        </div>
      </nav>

      {/* ── Main ──────────────────────────────────────────────────── */}
      <div className="main-wrapper">
        <header className="top-bar">
          <h1 className="top-bar-title">{nombreNegocio}</h1>

          <div style={{ flex:1, display:'flex', justifyContent:'center' }}>
            {cajaActiva && (
              <span style={{
                fontSize:11,color:'var(--success)',fontWeight:800,
                background:'rgba(21,128,61,.1)',padding:'4px 12px',
                borderRadius:20,border:'1.5px solid var(--success)',whiteSpace:'nowrap',
              }}>
                🟢 Caja abierta desde{' '}
                {new Date(cajaActiva.abierta_at).toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'})}
              </span>
            )}
          </div>

          <div style={{ display:'flex',alignItems:'center',gap:10,flexShrink:0 }}>
            <span className="top-bar-fecha">
              {new Date().toLocaleDateString('es-CO',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
            </span>

            <button
              className="theme-toggle-btn"
              onClick={() => setTemaOscuro(p => !p)}
            >
              <span style={{ fontSize:16 }}>{temaOscuro ? '☀️' : '🌙'}</span>
              {temaOscuro ? 'Modo claro' : 'Modo oscuro'}
            </button>

            {/* ── Botón cerrar app (flujo seguro) ─────────────────── */}
            <button
              onClick={handleCerrarApp}
              disabled={cerrando}
              title="Cerrar aplicación"
              style={{
                padding:'8px 14px',border:'2px solid var(--border)',
                borderRadius:24,background:'var(--bg-input)',
                color:'var(--text-secondary)',fontSize:12,fontWeight:800,
                cursor:'pointer',fontFamily:'inherit',transition:'all .15s',
                opacity: cerrando ? .5 : 1,
              }}
            >
              {cerrando ? '⏳' : '⏻'} Salir
            </button>
          </div>
        </header>

        <main className="main-content">
          {vistaActual === VIEWS.POS        && <POSScreen        cajaActiva={cajaActiva} />}
          {vistaActual === VIEWS.CAJA       && <CajaScreen       cajaActiva={cajaActiva} onCajaChange={handleCajaChange} />}
          {vistaActual === VIEWS.INVENTARIO && <InventarioScreen />}
          {vistaActual === VIEWS.REPORTES   && <ReportesScreen />}
          {vistaActual === VIEWS.CONFIG     && <ConfigScreen />}
        </main>
      </div>
    </div>
  )
}
