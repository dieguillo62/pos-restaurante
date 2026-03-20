import React, { useState } from 'react'
import PinPad from './PinPad'
import './auth.css'

/**
 * AdminOverlay — Modal de autorización puntual
 * Pide el PIN del admin para autorizar UNA acción sin cambiar la sesión activa.
 *
 * Props:
 *   accion    string — descripción de la acción que se quiere realizar
 *   onAutorizado () => void
 *   onCancelar   () => void
 */
export default function AdminOverlay({ accion, onAutorizado, onCancelar }) {
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)

  async function handlePin(pin) {
    setCargando(true)
    setError(null)
    try {
      const res = await window.electronAPI.auth.verificarAdminPin(pin)
      if (res.success) {
        onAutorizado(res.adminUsername)
      } else {
        setError(res.mensaje)
      }
    } catch {
      setError('Error al verificar. Intenta de nuevo.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="admin-overlay" onClick={e => e.target === e.currentTarget && onCancelar()}>
      <div className="admin-modal">
        <div className="admin-modal-header">
          <span className="admin-modal-icon">🔐</span>
          <div>
            <h2 className="admin-modal-title">Autorización requerida</h2>
            <p className="admin-modal-accion">{accion}</p>
          </div>
        </div>
        <p className="admin-modal-hint">
          Esta acción requiere PIN de administrador
        </p>
        <PinPad
          onConfirm={handlePin}
          onCancel={onCancelar}
          cargando={cargando}
          error={error}
          titulo="PIN de administrador"
        />
      </div>
    </div>
  )
}
