import React from 'react'
import { formatCOP } from '../pos/ProductGrid'

export default function ListaMovimientos({ movimientos }) {
  if (!movimientos.length) {
    return (
      <div className="caja-section">
        <h3 className="caja-section-title">Movimientos del turno</h3>
        <div className="lista-vacia">
          <span>📋</span>
          <p>Sin movimientos registrados</p>
        </div>
      </div>
    )
  }

  return (
    <div className="caja-section">
      <h3 className="caja-section-title">
        Movimientos del turno
        <span className="caja-section-badge">{movimientos.length}</span>
      </h3>
      <div className="movimientos-lista">
        {movimientos.map(mov => (
          <div key={mov.id} className={`movimiento-row ${mov.tipo}`}>
            <span className="mov-icon">{mov.tipo === 'egreso' ? '📤' : '📥'}</span>
            <span className="mov-descripcion">{mov.descripcion}</span>
            <span className="mov-hora">
              {new Date(mov.created_at).toLocaleTimeString('es-CO', {
                hour: '2-digit', minute: '2-digit',
              })}
            </span>
            <span className={`mov-monto ${mov.tipo}`}>
              {mov.tipo === 'egreso' ? '−' : '+'}{formatCOP(mov.monto)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
