import React, { useState } from 'react'
import { formatCOP } from '../pos/ProductGrid'

const EGRESOS_RAPIDOS = [
  'Hielo', 'Gas', 'Domicilio', 'Mercado', 'Servilletas',
  'Carbón', 'Aceite', 'Sal / Condimentos', 'Detergente', 'Otro',
]

export default function RegistroEgreso({ onGuardar, onCerrar, cargando }) {
  const [descripcion, setDescripcion] = useState('')
  const [monto,       setMonto]       = useState('')

  const montoNum = parseFloat(monto.replace(/\D/g, '')) || 0
  const valido   = descripcion.trim() && montoNum > 0

  function handleMontoInput(e) {
    setMonto(e.target.value.replace(/\D/g, ''))
  }

  function handleSubmit() {
    if (!valido) return
    onGuardar({ descripcion: descripcion.trim(), monto: montoNum })
  }

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <h2 className="modal-title">➖ Registrar egreso</h2>
          <button className="modal-close" onClick={onCerrar}>✕</button>
        </div>

        {/* Atajos de descripción */}
        <div>
          <label className="form-label">Concepto</label>
          <div className="egreso-atajos-grid">
            {EGRESOS_RAPIDOS.map(item => (
              <button
                key={item}
                className={`egreso-atajo ${descripcion === item ? 'active' : ''}`}
                onClick={() => setDescripcion(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <input
            className="form-input"
            type="text"
            placeholder="O escribe una descripción..."
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            style={{ marginTop: 8 }}
          />
        </div>

        {/* Monto */}
        <div>
          <label className="form-label">Monto</label>
          <div className="apertura-input-wrap">
            <span className="apertura-prefix">$</span>
            <input
              className="apertura-input"
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={monto ? parseInt(monto).toLocaleString('es-CO') : ''}
              onChange={handleMontoInput}
            />
          </div>
          {montoNum > 0 && (
            <span className="apertura-preview">{formatCOP(montoNum)}</span>
          )}
        </div>

        <div className="cierre-acciones">
          <button className="btn-cancelar" onClick={onCerrar} disabled={cargando}>
            Cancelar
          </button>
          <button
            className="btn-confirmar-cierre"
            style={{ background: 'var(--danger)', boxShadow: '0 4px 16px rgba(239,68,68,.3)' }}
            onClick={handleSubmit}
            disabled={!valido || cargando}
          >
            {cargando ? '⏳ Guardando...' : '➖ Registrar egreso'}
          </button>
        </div>

      </div>
    </div>
  )
}
