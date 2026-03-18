import React, { useState, useEffect, useCallback } from 'react'
import AperturaCaja    from './AperturaCaja'
import CierreCaja      from './CierreCaja'
import RegistroEgreso  from './RegistroEgreso'
import ListaMovimientos from './ListaMovimientos'
import './caja.css'
import { formatCOP } from '../pos/ProductGrid'

export default function CajaScreen({ cajaActiva, onCajaChange }) {
  const [resumen,    setResumen]    = useState(null)
  const [movimientos, setMovimientos] = useState([])
  const [modalEgreso, setModalEgreso] = useState(false)
  const [modalCierre, setModalCierre] = useState(false)
  const [cargando,   setCargando]   = useState(false)

  // Cargar resumen de la sesión activa
  const cargarResumen = useCallback(async () => {
    if (!cajaActiva?.id) { setResumen(null); setMovimientos([]); return }
    try {
      const [res, movs] = await Promise.all([
        window.electronAPI.caja.resumenSesion(cajaActiva.id),
        window.electronAPI.caja.listarMovimientos(cajaActiva.id),
      ])
      setResumen(res)
      setMovimientos(movs)
    } catch (err) {
      console.error('[Caja] Error cargando resumen:', err)
    }
  }, [cajaActiva])

  useEffect(() => { cargarResumen() }, [cargarResumen])

  // ── Abrir caja ─────────────────────────────────────────────────────────
  async function handleAbrirCaja(montoApertura) {
    setCargando(true)
    try {
      const sesion = await window.electronAPI.caja.abrir(montoApertura)
      onCajaChange(sesion)
    } catch (err) {
      alert(`Error al abrir caja:\n${err.message}`)
    } finally {
      setCargando(false)
    }
  }

  // ── Cerrar caja ────────────────────────────────────────────────────────
  async function handleCerrarCaja() {
    if (!cajaActiva?.id) return
    setCargando(true)
    try {
      const resultado = await window.electronAPI.caja.cerrar(cajaActiva.id)
      await window.electronAPI.print.cierreCaja(resultado)
      onCajaChange(null)
      setModalCierre(false)
      alert(`✅ Caja cerrada correctamente.\nMonto final: ${formatCOP(resultado.monto_cierre)}`)
    } catch (err) {
      alert(`Error al cerrar caja:\n${err.message}`)
    } finally {
      setCargando(false)
    }
  }

  // ── Registrar egreso ───────────────────────────────────────────────────
  async function handleEgreso(data) {
    setCargando(true)
    try {
      await window.electronAPI.caja.registrarEgreso({ ...data, sesion_id: cajaActiva.id })
      await cargarResumen()
      setModalEgreso(false)
    } catch (err) {
      alert(`Error al registrar egreso:\n${err.message}`)
    } finally {
      setCargando(false)
    }
  }

  // ── Sin caja activa ────────────────────────────────────────────────────
  if (!cajaActiva) {
    return (
      <div className="caja-screen">
        <div className="caja-sin-sesion">
          <div className="caja-sin-sesion-card">
            <span className="caja-sin-sesion-icon">🔒</span>
            <h2>Caja cerrada</h2>
            <p>Ingresa el dinero inicial para comenzar el turno</p>
            <AperturaCaja onAbrir={handleAbrirCaja} cargando={cargando} />
          </div>
        </div>
      </div>
    )
  }

  const ventas  = resumen?.ventas  ?? {}
  const egresos = resumen?.egresos ?? 0

  return (
    <div className="caja-screen">

      {/* ── Header de sesión ──────────────────────────────────────────── */}
      <div className="caja-header">
        <div className="caja-header-info">
          <div className="caja-sesion-badge">
            <span className="caja-dot-live" />
            Sesión activa
          </div>
          <span className="caja-apertura-hora">
            Apertura: {new Date(cajaActiva.abierta_at).toLocaleTimeString('es-CO', {
              hour: '2-digit', minute: '2-digit',
            })}
          </span>
        </div>
        <div className="caja-header-actions">
          <button className="btn-egreso" onClick={() => setModalEgreso(true)}>
            ➖ Registrar egreso
          </button>
          <button className="btn-cerrar-caja" onClick={() => setModalCierre(true)}>
            🔒 Cerrar caja
          </button>
        </div>
      </div>

      {/* ── Tarjetas resumen ──────────────────────────────────────────── */}
      <div className="caja-stats">
        <StatCard
          label="Apertura"
          valor={formatCOP(cajaActiva.monto_apertura)}
          icon="💵"
          color="var(--info)"
        />
        <StatCard
          label="Ventas del turno"
          valor={formatCOP(ventas.total ?? 0)}
          sub={`${ventas.cantidad ?? 0} venta${ventas.cantidad !== 1 ? 's' : ''}`}
          icon="🛒"
          color="var(--success)"
        />
        <StatCard
          label="Egresos"
          valor={formatCOP(egresos)}
          sub={`${movimientos.length} movimiento${movimientos.length !== 1 ? 's' : ''}`}
          icon="📤"
          color="var(--danger)"
        />
        <StatCard
          label="Caja actual"
          valor={formatCOP((cajaActiva.monto_apertura ?? 0) + (ventas.total ?? 0) - egresos)}
          icon="💰"
          color="var(--accent)"
          highlight
        />
      </div>

      {/* ── Desglose por método de pago ───────────────────────────────── */}
      <div className="caja-metodos">
        <h3 className="caja-section-title">Ingresos por método de pago</h3>
        <div className="metodos-row">
          <MetodoChip icon="💵" label="Efectivo"   valor={ventas.efectivo   ?? 0} color="#22c55e" />
          <MetodoChip icon="📱" label="Nequi"      valor={ventas.nequi      ?? 0} color="#a855f7" />
          <MetodoChip icon="🔴" label="DaviPlata"  valor={ventas.daviplata  ?? 0} color="#ef4444" />
        </div>
      </div>

      {/* ── Movimientos ──────────────────────────────────────────────── */}
      <ListaMovimientos movimientos={movimientos} />

      {/* ── Modal: Registrar egreso ───────────────────────────────────── */}
      {modalEgreso && (
        <RegistroEgreso
          onGuardar={handleEgreso}
          onCerrar={() => setModalEgreso(false)}
          cargando={cargando}
        />
      )}

      {/* ── Modal: Confirmación cierre ────────────────────────────────── */}
      {modalCierre && (
        <div className="modal-overlay" onClick={() => setModalCierre(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">🔒 Cerrar caja</h2>
            <CierreCaja
              resumen={resumen}
              cajaActiva={cajaActiva}
              onConfirmar={handleCerrarCaja}
              onCancelar={() => setModalCierre(false)}
              cargando={cargando}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Componentes auxiliares ────────────────────────────────────────────────────

function StatCard({ label, valor, sub, icon, color, highlight }) {
  return (
    <div className={`stat-card ${highlight ? 'highlight' : ''}`} style={{ '--card-color': color }}>
      <span className="stat-icon">{icon}</span>
      <div className="stat-body">
        <span className="stat-label">{label}</span>
        <span className="stat-valor">{valor}</span>
        {sub && <span className="stat-sub">{sub}</span>}
      </div>
    </div>
  )
}

function MetodoChip({ icon, label, valor, color }) {
  return (
    <div className="metodo-chip" style={{ '--chip-color': color }}>
      <span className="chip-icon">{icon}</span>
      <div>
        <div className="chip-label">{label}</div>
        <div className="chip-valor">{formatCOP(valor)}</div>
      </div>
    </div>
  )
}
