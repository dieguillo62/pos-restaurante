import React from 'react'

// ── Utilidad: formato de moneda colombiana ────────────────────────────────────
export function formatCOP(valor) {
  return new Intl.NumberFormat('es-CO', {
    style:    'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor)
}

// ── Iconos por categoría ─────────────────────────────────────────────────────
const ICON_CATEGORIA = {
  1: '🍽️',   // Platos
  2: '🥤',   // Bebidas
  3: '🍮',   // Postres
  4: '🥗',   // Entradas
}

export default function ProductGrid({
  categorias,
  productos,
  categoriaActiva,
  onCategoriaChange,
  onAgregar,
  carrito,
}) {
  // Cantidad total de este producto en el carrito (para el badge)
  function cantidadEnCarrito(productoId) {
    const item = carrito.find(i => i.producto_id === productoId)
    return item ? item.cantidad : 0
  }

  // Alerta de stock bajo (bebidas con stock < alerta_minimo)
  function stockBajo(producto) {
    if (!producto.gestiona_stock) return false
    const alerta = producto.alerta_minimo ?? 5
    return (producto.cantidad_actual ?? 0) <= alerta
  }

  function sinStock(producto) {
    if (!producto.gestiona_stock) return false
    return (producto.cantidad_actual ?? 0) <= 0
  }

  return (
    <div className="product-grid-wrapper">

      {/* ── Tabs de categorías ─────────────────────────────────────── */}
      <div className="category-tabs">
        <button
          className={`cat-tab ${categoriaActiva === null ? 'active' : ''}`}
          onClick={() => onCategoriaChange(null)}
          style={categoriaActiva === null ? { '--cat-color': '#f97316' } : {}}
        >
          <span className="cat-tab-icon">🍴</span>
          <span className="cat-tab-label">Todo</span>
        </button>

        {categorias.map(cat => (
          <button
            key={cat.id}
            className={`cat-tab ${categoriaActiva === cat.id ? 'active' : ''}`}
            style={{ '--cat-color': cat.color }}
            onClick={() => onCategoriaChange(
              categoriaActiva === cat.id ? null : cat.id
            )}
          >
            <span className="cat-tab-icon">
              {cat.icon ?? ICON_CATEGORIA[cat.id] ?? '🍴'}
            </span>
            <span className="cat-tab-label">{cat.nombre}</span>
          </button>
        ))}
      </div>

      {/* ── Grid de productos ──────────────────────────────────────── */}
      <div className="products-grid">
        {productos.length === 0 && (
          <div className="products-empty">
            <span>😔</span>
            <p>Sin productos en esta categoría</p>
          </div>
        )}

        {productos.map(producto => {
          const qty      = cantidadEnCarrito(producto.id)
          const agotado  = sinStock(producto)
          const alerta   = stockBajo(producto) && !agotado

          return (
            <button
              key={producto.id}
              className={`product-btn ${qty > 0 ? 'in-cart' : ''} ${agotado ? 'agotado' : ''}`}
              onClick={() => !agotado && onAgregar(producto)}
              disabled={agotado}
              title={agotado ? 'Sin stock' : producto.nombre}
            >
              {/* Badge de cantidad en carrito */}
              {qty > 0 && (
                <span className="product-badge">{qty}</span>
              )}

              {/* Indicador de stock bajo */}
              {alerta && (
                <span className="product-stock-alerta" title={`Stock: ${producto.cantidad_actual}`}>
                  ⚠️
                </span>
              )}

              <div className="product-btn-nombre">{producto.nombre}</div>
              <div className="product-btn-precio">{formatCOP(producto.precio)}</div>

              {/* Stock visible para bebidas */}
              {producto.gestiona_stock === 1 && (
                <div className={`product-stock-tag ${agotado ? 'agotado' : alerta ? 'bajo' : 'ok'}`}>
                  {agotado
                    ? 'Agotado'
                    : `Stock: ${producto.cantidad_actual ?? 0}`}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
