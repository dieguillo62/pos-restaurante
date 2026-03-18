import React, { useState } from 'react'
import { formatCOP } from '../pos/ProductGrid'

const ATAJOS = [0, 50000, 100000, 200000, 300000, 500000]

export default function AperturaCaja({ onAbrir, cargando }) {
  const [monto, setMonto] = useState('')

  const montoNum = parseFloat(monto.replace(/\D/g, '')) || 0

  function handleInput(e) {
    const raw = e.target.value.replace(/\D/g, '')
    setMonto(raw)
  }

  function handleSubmit() {
    if (montoNum < 0) return
    onAbrir(montoNum)
  }

  return (
    <div className="apertura-form">
      <div className="apertura-field">
        <label className="apertura-label">Dinero inicial en caja</label>
        <div className="apertura-input-wrap">
          <span className="apertura-prefix">$</span>
          <input
            className="apertura-input"
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={monto ? parseInt(monto).toLocaleString('es-CO') : ''}
            onChange={handleInput}
            autoFocus
          />
        </div>
        {montoNum > 0 && (
          <span className="apertura-preview">{formatCOP(montoNum)}</span>
        )}
      </div>

      {/* Atajos rápidos */}
      <div className="apertura-atajos">
        {ATAJOS.map(val => (
          <button
            key={val}
            className={`apertura-atajo ${montoNum === val ? 'active' : ''}`}
            onClick={() => setMonto(String(val))}
          >
            {val === 0 ? 'Sin base' : formatCOP(val)}
          </button>
        ))}
      </div>

      <button
        className="apertura-btn"
        onClick={handleSubmit}
        disabled={cargando}
      >
        {cargando ? '⏳ Abriendo...' : '✅ Abrir caja'}
      </button>
    </div>
  )
}
