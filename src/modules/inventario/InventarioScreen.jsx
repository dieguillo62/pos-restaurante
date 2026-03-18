import React, { useState, useEffect, useCallback } from 'react'
import './inventario.css'
import { formatCOP } from '../pos/ProductGrid'

export default function InventarioScreen() {
  const [stock,          setStock]          = useState([])
  const [productoSel,    setProductoSel]    = useState(null)
  const [historial,      setHistorial]      = useState([])
  const [modalAjuste,    setModalAjuste]    = useState(null)  // producto seleccionado para ajustar
  const [cargando,       setCargando]       = useState(false)

  const cargarStock = useCallback(async () => {
    try {
      const data = await window.electronAPI.stock.listar()
      setStock(data)
    } catch (err) {
      console.error('[Inventario]', err)
    }
  }, [])

  useEffect(() => { cargarStock() }, [cargarStock])

  async function cargarHistorial(productoId) {
    try {
      const data = await window.electronAPI.stock.historial(productoId)
      setHistorial(data)
    } catch (err) {
      console.error('[Historial]', err)
    }
  }

  function seleccionarProducto(prod) {
    setProductoSel(prod)
    cargarHistorial(prod.producto_id)
  }

  async function handleAjuste(productoId, cantidad, tipo, nota) {
    setCargando(true)
    try {
      await window.electronAPI.stock.ajustar({ producto_id: productoId, cantidad, tipo, nota })
      await cargarStock()
      if (productoSel?.producto_id === productoId) {
        cargarHistorial(productoId)
      }
      setModalAjuste(null)
    } catch (err) {
      alert(`Error al ajustar stock:\n${err.message}`)
    } finally {
      setCargando(false)
    }
  }

  const stockBajo  = stock.filter(s => s.cantidad_actual > 0 && s.cantidad_actual <= s.alerta_minimo)
  const stockCero  = stock.filter(s => s.cantidad_actual <= 0)

  return (
    <div className="inventario-screen">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="inv-header">
        <div>
          <h2 className="inv-titulo">📦 Inventario de Bebidas</h2>
          <p className="inv-subtitulo">Solo productos con gestión de stock activada</p>
        </div>
        <button className="btn-refresh" onClick={cargarStock} title="Actualizar">
          🔄 Actualizar
        </button>
      </div>

      {/* ── Alertas ─────────────────────────────────────────────────── */}
      {stockCero.length > 0 && (
        <div className="alerta alerta-roja">
          🚨 <strong>{stockCero.length} producto{stockCero.length > 1 ? 's' : ''} agotado{stockCero.length > 1 ? 's' : ''}:</strong>{' '}
          {stockCero.map(s => s.producto_nombre).join(', ')}
        </div>
      )}
      {stockBajo.length > 0 && (
        <div className="alerta alerta-amarilla">
          ⚠️ <strong>{stockBajo.length} producto{stockBajo.length > 1 ? 's' : ''} con stock bajo:</strong>{' '}
          {stockBajo.map(s => s.producto_nombre).join(', ')}
        </div>
      )}

      <div className="inv-layout">

        {/* ── Tabla de stock ──────────────────────────────────────────── */}
        <div className="inv-tabla-wrapper">
          {stock.length === 0 ? (
            <div className="inv-empty">
              <span>📦</span>
              <p>No hay productos con gestión de stock.</p>
              <small>Activa "gestionar stock" en los productos de tipo bebida.</small>
            </div>
          ) : (
            <table className="inv-tabla">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Stock actual</th>
                  <th>Alerta mín.</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {stock.map(prod => {
                  const agotado = prod.cantidad_actual <= 0
                  const bajo    = !agotado && prod.cantidad_actual <= prod.alerta_minimo
                  const ok      = !agotado && !bajo

                  return (
                    <tr
                      key={prod.producto_id}
                      className={`inv-fila ${productoSel?.producto_id === prod.producto_id ? 'selected' : ''}`}
                      onClick={() => seleccionarProducto(prod)}
                    >
                      <td className="inv-nombre">{prod.producto_nombre}</td>
                      <td className="inv-cantidad">
                        <span className={`stock-badge ${agotado ? 'agotado' : bajo ? 'bajo' : 'ok'}`}>
                          {prod.cantidad_actual} {prod.unidad}
                        </span>
                      </td>
                      <td className="inv-alerta-min">{prod.alerta_minimo}</td>
                      <td>
                        <span className={`estado-dot ${agotado ? 'rojo' : bajo ? 'amarillo' : 'verde'}`} />
                        <span className="estado-texto">
                          {agotado ? 'Agotado' : bajo ? 'Stock bajo' : 'Normal'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn-ajustar"
                          onClick={e => { e.stopPropagation(); setModalAjuste(prod) }}
                        >
                          ✏️ Ajustar
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Historial del producto seleccionado ────────────────────── */}
        {productoSel && (
          <div className="inv-historial">
            <h3 className="inv-historial-titulo">
              📋 Historial — {productoSel.producto_nombre}
            </h3>
            {historial.length === 0
              ? <p className="inv-historial-vacio">Sin movimientos registrados</p>
              : (
                <div className="historial-lista">
                  {historial.map(mov => (
                    <div key={mov.id} className={`historial-row ${mov.cantidad >= 0 ? 'entrada' : 'salida'}`}>
                      <span className="hist-tipo-icon">
                        {mov.tipo === 'venta' ? '🛒' : mov.tipo === 'entrada' ? '📥' : '✏️'}
                      </span>
                      <div className="hist-info">
                        <span className="hist-tipo">
                          {mov.tipo === 'venta' ? 'Venta' : mov.tipo === 'entrada' ? 'Entrada' : 'Ajuste'}
                        </span>
                        {mov.nota && <span className="hist-nota">{mov.nota}</span>}
                      </div>
                      <span className="hist-fecha">
                        {new Date(mov.created_at).toLocaleDateString('es-CO', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                      <span className={`hist-cantidad ${mov.cantidad >= 0 ? 'pos' : 'neg'}`}>
                        {mov.cantidad >= 0 ? '+' : ''}{mov.cantidad}
                      </span>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        )}
      </div>

      {/* ── Modal de ajuste ──────────────────────────────────────────── */}
      {modalAjuste && (
        <ModalAjuste
          producto={modalAjuste}
          onGuardar={handleAjuste}
          onCerrar={() => setModalAjuste(null)}
          cargando={cargando}
        />
      )}
    </div>
  )
}

// ── Modal de ajuste de stock ──────────────────────────────────────────────────
function ModalAjuste({ producto, onGuardar, onCerrar, cargando }) {
  const [tipo,     setTipo]     = useState('entrada')
  const [cantidad, setCantidad] = useState('')
  const [nota,     setNota]     = useState('')

  const cantNum = parseInt(cantidad) || 0
  const valido  = cantNum > 0

  const cantidadFinal = tipo === 'entrada' ? cantNum : -cantNum

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <h2 className="modal-title">✏️ Ajustar stock</h2>
          <button className="modal-close" onClick={onCerrar}>✕</button>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          <strong>{producto.producto_nombre}</strong> — Stock actual:{' '}
          <strong style={{ color: 'var(--accent)' }}>{producto.cantidad_actual} {producto.unidad}</strong>
        </p>

        {/* Tipo de ajuste */}
        <div>
          <label className="form-label">Tipo de ajuste</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { id: 'entrada',       label: '📥 Entrada',    color: 'var(--success)' },
              { id: 'ajuste_manual', label: '✏️ Corrección', color: 'var(--warning)' },
            ].map(t => (
              <button
                key={t.id}
                style={{
                  flex: 1, padding: '10px', border: `2px solid ${tipo === t.id ? t.color : 'var(--border)'}`,
                  borderRadius: 'var(--radius-sm)', background: tipo === t.id ? `rgba(from ${t.color} r g b / .1)` : 'var(--bg-input)',
                  color: tipo === t.id ? t.color : 'var(--text-secondary)',
                  fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
                  transition: 'all .12s',
                }}
                onClick={() => setTipo(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cantidad */}
        <div>
          <label className="form-label">
            Cantidad ({tipo === 'entrada' ? 'unidades a agregar' : 'cantidad real en caja'})
          </label>
          <input
            className="form-input"
            type="number"
            min="1"
            placeholder="0"
            value={cantidad}
            onChange={e => setCantidad(e.target.value.replace(/\D/g,''))}
            autoFocus
          />
          {cantNum > 0 && (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Stock resultante:{' '}
              <strong style={{ color: 'var(--accent)' }}>
                {tipo === 'entrada'
                  ? producto.cantidad_actual + cantNum
                  : cantNum} {producto.unidad}
              </strong>
            </p>
          )}
        </div>

        {/* Nota opcional */}
        <div>
          <label className="form-label">Nota (opcional)</label>
          <input
            className="form-input"
            type="text"
            placeholder="Ej: Ingresó caja de 24 unidades"
            value={nota}
            onChange={e => setNota(e.target.value)}
          />
        </div>

        <div className="cierre-acciones">
          <button className="btn-cancelar" onClick={onCerrar} disabled={cargando}>
            Cancelar
          </button>
          <button
            className="btn-confirmar-cierre"
            onClick={() => onGuardar(producto.producto_id, cantidadFinal, tipo, nota || null)}
            disabled={!valido || cargando}
          >
            {cargando ? '⏳ Guardando...' : '✅ Guardar ajuste'}
          </button>
        </div>
      </div>
    </div>
  )
}
