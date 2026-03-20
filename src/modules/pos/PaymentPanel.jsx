import React, { useState, useEffect } from 'react'
import { formatCOP } from './ProductGrid'
import TicketPreview from './TicketPreview'

const METODOS = [
  { id: 'efectivo',   label: 'Efectivo',   icon: '💵', color: '#22c55e', desc: 'Pago en efectivo'       },
  { id: 'nequi',      label: 'Nequi',      icon: '📱', color: '#a855f7', desc: 'Transferencia Nequi'    },
  { id: 'daviplata',  label: 'DaviPlata',  icon: '🔴', color: '#ef4444', desc: 'Transferencia DaviPlata'},
]

export default function PaymentPanel({ total, carrito, cargando, onConfirmar, onCerrar }) {
  const [metodoSeleccionado, setMetodoSeleccionado] = useState(null)
  const [efectivoIngresado,  setEfectivoIngresado]  = useState('')
  const [confirmando,        setConfirmando]         = useState(false)

  // ── Datos del ticket post-venta ──────────────────────────────────
  const [ticketData,   setTicketData]   = useState(null)   // { venta, items, config }
  const [imprimiendo,  setImprimiendo]  = useState(false)

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape' && !cargando && !ticketData) onCerrar()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [cargando, onCerrar, ticketData])

  const efectivoNum = parseFloat(efectivoIngresado) || 0
  const cambio      = metodoSeleccionado === 'efectivo' ? Math.max(0, efectivoNum - total) : 0
  const puedeCobrar = metodoSeleccionado &&
    (metodoSeleccionado !== 'efectivo' || efectivoNum >= total)

  async function handleConfirmar() {
    if (!puedeCobrar || cargando) return
    setConfirmando(true)
    try {
      const ventaCompleta = await onConfirmar(metodoSeleccionado)
      // onConfirmar devuelve { venta, items } desde POSScreen
      if (ventaCompleta) {
        const config = window.electronAPI
          ? await window.electronAPI.config.obtenerTodos()
          : {}
        setTicketData({ ...ventaCompleta, config })
      }
    } finally {
      setConfirmando(false)
    }
  }

  // ── Imprimir desde el preview ────────────────────────────────────
  async function handleImprimir() {
    if (!ticketData?.venta?.id || !window.electronAPI) return
    setImprimiendo(true)
    try {
      const res = await window.electronAPI.print.recibo(ticketData.venta.id)
      if (!res.success) alert(`⚠️ ${res.mensaje}`)
    } finally {
      setImprimiendo(false)
    }
  }

  // ── Cerrar ticket y el modal ──────────────────────────────────────
  function handleCerrarTicket() {
    setTicketData(null)
    onCerrar()
  }

  // ── Teclado numérico ─────────────────────────────────────────────
  function presionarTecla(valor) {
    setEfectivoIngresado(prev => {
      if (valor === 'C')   return ''
      if (valor === '⌫')  return prev.slice(0, -1)
      if (valor === '000') return prev === '' ? '' : prev + '000'
      return prev + valor
    })
  }

  const TECLAS = ['7','8','9','4','5','6','1','2','3','C','0','⌫','000']

  // ── Mostrar ticket si ya se confirmó ────────────────────────────
  if (ticketData) {
    return (
      <TicketPreview
        venta={ticketData.venta}
        items={ticketData.items}
        config={ticketData.config}
        onCerrar={handleCerrarTicket}
        onImprimir={handleImprimir}
        imprimiendo={imprimiendo}
      />
    )
  }

  return (
    <div className="payment-overlay" onClick={e => e.target === e.currentTarget && !cargando && onCerrar()}>
      <div className="payment-panel">

        <div className="payment-header">
          <h2 className="payment-title">💳 Seleccionar pago</h2>
          <button className="payment-close" onClick={onCerrar} disabled={cargando}>✕</button>
        </div>

        {/* Resumen */}
        <div className="payment-resumen">
          <div className="payment-items-list">
            {carrito.map(item => (
              <div key={item.producto_id} className="payment-item-row">
                <span className="payment-item-qty">{item.cantidad}×</span>
                <span className="payment-item-nombre">{item.nombre}</span>
                <span className="payment-item-sub">{formatCOP(item.subtotal)}</span>
              </div>
            ))}
          </div>
          <div className="payment-total-row">
            <span>TOTAL A COBRAR</span>
            <span className="payment-total-valor">{formatCOP(total)}</span>
          </div>
        </div>

        {/* Métodos */}
        <div className="payment-metodos">
          {METODOS.map(m => (
            <button
              key={m.id}
              className={`metodo-btn ${metodoSeleccionado === m.id ? 'selected' : ''}`}
              style={{ '--metodo-color': m.color }}
              onClick={() => {
                setMetodoSeleccionado(m.id)
                if (m.id !== 'efectivo') setEfectivoIngresado('')
              }}
            >
              <span className="metodo-icon">{m.icon}</span>
              <span className="metodo-label">{m.label}</span>
              <span className="metodo-desc">{m.desc}</span>
            </button>
          ))}
        </div>

        {/* Panel efectivo */}
        {metodoSeleccionado === 'efectivo' && (
          <div className="efectivo-panel">
            <div className="efectivo-display">
              <span className="efectivo-label">Efectivo recibido</span>
              <span className="efectivo-valor">
                {efectivoIngresado ? formatCOP(efectivoNum) : '$ —'}
              </span>
            </div>

            {efectivoNum >= total && efectivoNum > 0 && (
              <div className="cambio-display">
                <span className="cambio-label">Cambio</span>
                <span className="cambio-valor">{formatCOP(cambio)}</span>
              </div>
            )}

            <div className="numpad">
              {TECLAS.map(tecla => (
                <button
                  key={tecla}
                  className={`numpad-btn ${tecla === 'C' ? 'clear' : ''} ${tecla === '⌫' ? 'back' : ''}`}
                  onClick={() => presionarTecla(tecla)}
                >
                  {tecla}
                </button>
              ))}
            </div>

            <div className="efectivo-atajos">
              {[20000, 50000, 100000].map(val => (
                <button
                  key={val}
                  className="atajo-btn"
                  onClick={() => setEfectivoIngresado(String(val))}
                >
                  {formatCOP(val)}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          className={`confirmar-btn ${puedeCobrar ? 'listo' : ''}`}
          disabled={!puedeCobrar || cargando || confirmando}
          onClick={handleConfirmar}
        >
          {cargando || confirmando
            ? '⏳ Procesando...'
            : puedeCobrar
              ? `✅ Confirmar — ${formatCOP(total)}`
              : 'Selecciona un método de pago'}
        </button>

      </div>
    </div>
  )
}
