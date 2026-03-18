import React from 'react'
import { formatCOP } from '../pos/ProductGrid'

export default function CierreCaja({ resumen, cajaActiva, onConfirmar, onCancelar, cargando }) {
  if (!resumen) return null

  const { ventas = {}, egresos = 0 } = resumen
  const montoCierre = (cajaActiva?.monto_apertura ?? 0) + (ventas.total ?? 0) - egresos

  const filas = [
    { label: 'Apertura de caja',    valor: cajaActiva?.monto_apertura ?? 0, color: 'var(--info)'    },
    { label: '+ Ventas efectivo',   valor: ventas.efectivo  ?? 0,           color: 'var(--success)' },
    { label: '+ Ventas Nequi',      valor: ventas.nequi     ?? 0,           color: 'var(--success)' },
    { label: '+ Ventas DaviPlata',  valor: ventas.daviplata ?? 0,           color: 'var(--success)' },
    { label: '− Egresos del turno', valor: -(egresos),                      color: 'var(--danger)'  },
  ]

  return (
    <div className="cierre-body">
      <p className="cierre-subtitle">
        Resumen del turno — {ventas.cantidad ?? 0} venta{ventas.cantidad !== 1 ? 's' : ''} registradas
      </p>

      <div className="cierre-tabla">
        {filas.map((f, i) => (
          <div key={i} className="cierre-fila">
            <span className="cierre-fila-label">{f.label}</span>
            <span className="cierre-fila-valor" style={{ color: f.color }}>
              {formatCOP(Math.abs(f.valor))}
            </span>
          </div>
        ))}
        <div className="cierre-fila total">
          <span className="cierre-fila-label">TOTAL EN CAJA</span>
          <span className="cierre-fila-valor total">{formatCOP(montoCierre)}</span>
        </div>
      </div>

      <div className="cierre-acciones">
        <button className="btn-cancelar" onClick={onCancelar} disabled={cargando}>
          Cancelar
        </button>
        <button className="btn-confirmar-cierre" onClick={onConfirmar} disabled={cargando}>
          {cargando ? '⏳ Cerrando...' : '🔒 Confirmar cierre'}
        </button>
      </div>
    </div>
  )
}
