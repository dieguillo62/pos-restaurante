import React from 'react'

export default function CajaPlaceholder() {
  return (
    <div className="placeholder-view">
      <div className="placeholder-card">
        <span style={{ fontSize: 52 }}>💰</span>
        <h2 className="placeholder-title">Control de Caja</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, maxWidth: 260, textAlign: 'center' }}>
          Apertura de caja, registro de egresos y cierre de turno
        </p>
        <div className="placeholder-badge">Parte 3 →</div>
      </div>
    </div>
  )
}
