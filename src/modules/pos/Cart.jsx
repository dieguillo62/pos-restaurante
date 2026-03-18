import React from 'react'
import { formatCOP } from './ProductGrid'

export default function Cart({
  carrito,
  total,
  onCambiarCantidad,
  onEliminar,
  onLimpiar,
  onCobrar,
  cajaActiva,
}) {
  const itemCount = carrito.reduce((acc, i) => acc + i.cantidad, 0)
  const vacio     = carrito.length === 0

  return (
    <div className="cart">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="cart-header">
        <div className="cart-header-left">
          <span className="cart-icon">🛒</span>
          <span className="cart-title">Pedido</span>
          {!vacio && (
            <span className="cart-count">{itemCount} ítem{itemCount !== 1 ? 's' : ''}</span>
          )}
        </div>
        {!vacio && (
          <button className="cart-clear-btn" onClick={onLimpiar} title="Limpiar carrito">
            🗑️ Limpiar
          </button>
        )}
      </div>

      {/* ── Lista de ítems ──────────────────────────────────────────── */}
      <div className="cart-items">
        {vacio ? (
          <div className="cart-empty">
            <span className="cart-empty-icon">🍽️</span>
            <p className="cart-empty-text">El pedido está vacío</p>
            <p className="cart-empty-hint">Toca un producto para agregarlo</p>
          </div>
        ) : (
          carrito.map(item => (
            <div key={item.producto_id} className="cart-item">
              <div className="cart-item-info">
                <span className="cart-item-nombre">{item.nombre}</span>
                <span className="cart-item-precio">
                  {formatCOP(item.precio_unitario)} c/u
                </span>
              </div>

              <div className="cart-item-controls">
                <button
                  className="qty-btn minus"
                  onClick={() => onCambiarCantidad(item.producto_id, -1)}
                  aria-label="Reducir cantidad"
                >
                  −
                </button>
                <span className="qty-value">{item.cantidad}</span>
                <button
                  className="qty-btn plus"
                  onClick={() => onCambiarCantidad(item.producto_id, +1)}
                  aria-label="Aumentar cantidad"
                >
                  +
                </button>
              </div>

              <div className="cart-item-right">
                <span className="cart-item-subtotal">{formatCOP(item.subtotal)}</span>
                <button
                  className="cart-item-remove"
                  onClick={() => onEliminar(item.producto_id)}
                  aria-label="Eliminar"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Footer: Total + Cobrar ──────────────────────────────────── */}
      <div className="cart-footer">
        <div className="cart-total-row">
          <span className="cart-total-label">TOTAL</span>
          <span className="cart-total-valor">{formatCOP(total)}</span>
        </div>

        {!cajaActiva && (
          <div className="cart-caja-warning">
            ⚠️ Abre la caja antes de cobrar
          </div>
        )}

        <button
          className="cobrar-btn"
          disabled={vacio || !cajaActiva}
          onClick={onCobrar}
        >
          <span className="cobrar-icon">💳</span>
          <span>Cobrar {!vacio && formatCOP(total)}</span>
        </button>
      </div>
    </div>
  )
}
