import React, { useState, useEffect } from 'react'
import PinPad from './PinPad'
import { useUser } from '../../context/UserContext'
import './auth.css'

const ROLE_ICON = { admin: '👑', user: '👤' }
const ROLE_LABEL = { admin: 'Administrador', user: 'Cajero' }

export default function LoginScreen() {
  const { login } = useUser()
  const [usuarios, setUsuarios] = useState([])
  const [usuarioSel, setUsuarioSel] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function cargar() {
      try {
        const lista = await window.electronAPI.auth.listarUsuarios()
        setUsuarios(lista)
        // Si solo hay un usuario, lo preselecciona
        if (lista.length === 1) setUsuarioSel(lista[0])
      } catch {
        setUsuarios([
          { id: 1, username: 'admin', role: 'admin' },
          { id: 2, username: 'cajero', role: 'user' },
        ])
      }
    }
    cargar()
  }, [])

  async function handlePin(pin) {
    if (!usuarioSel) return
    setCargando(true)
    setError(null)
    try {
      const res = await window.electronAPI.auth.loginPin(usuarioSel.id, pin)
      if (res.success) {
        login(res.user)
      } else {
        setError(res.mensaje)
      }
    } catch (err) {
      setError('Error al autenticar. Intenta de nuevo.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">

        {/* Logo */}
        <div className="login-logo">
          <span className="login-logo-icon">🍽️</span>
          <h1 className="login-title">POS Restaurante</h1>
          <p className="login-subtitle">Selecciona tu usuario</p>
        </div>

        {/* Tarjetas de usuario */}
        {!usuarioSel ? (
          <div className="usuarios-grid">
            {usuarios.map(u => (
              <button
                key={u.id}
                className="usuario-card"
                onClick={() => { setUsuarioSel(u); setError(null) }}
              >
                <span className="usuario-avatar">
                  {ROLE_ICON[u.role] ?? '👤'}
                </span>
                <span className="usuario-nombre">{u.username}</span>
                <span className="usuario-rol">{ROLE_LABEL[u.role] ?? u.role}</span>
              </button>
            ))}
          </div>
        ) : (
          // Usuario seleccionado → mostrar PIN
          <div className="login-pin-section">
            {/* Header del usuario seleccionado */}
            <div className="usuario-seleccionado">
              <span className="usuario-sel-avatar">{ROLE_ICON[usuarioSel.role]}</span>
              <div>
                <div className="usuario-sel-nombre">{usuarioSel.username}</div>
                <div className="usuario-sel-rol">{ROLE_LABEL[usuarioSel.role]}</div>
              </div>
              <button
                className="btn-cambiar-usuario"
                onClick={() => { setUsuarioSel(null); setError(null) }}
              >
                Cambiar
              </button>
            </div>

            {/* PinPad */}
            <PinPad
              onConfirm={handlePin}
              cargando={cargando}
              error={error}
              titulo="Ingresa tu PIN de 4 dígitos"
            />
          </div>
        )}

        {/* Versión */}
        <p className="login-version">v1.0.0 — Colombia 🇨🇴</p>
      </div>
    </div>
  )
}
