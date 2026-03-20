import React from 'react'

/**
 * TicketPreview — Simulación visual de ticket térmico 80mm
 *
 * Props:
 *   venta   { id, total, metodo_pago, created_at }
 *   items   [{ producto_nombre, cantidad, precio_unitario, subtotal }]
 *   config  { nombre_negocio, direccion, telefono, mensaje_recibo }
 *   onCerrar  () => void
 *   onImprimir () => void   (opcional)
 *   imprimiendo  bool       (opcional)
 */
export default function TicketPreview({
  venta,
  items = [],
  config = {},
  onCerrar,
  onImprimir,
  imprimiendo = false,
}) {
  if (!venta) return null

  const fecha = new Date(venta.created_at).toLocaleString('es-CO', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  })

  const METODO_LABEL = {
    efectivo:  'Efectivo',
    nequi:     'Nequi',
    daviplata: 'DaviPlata',
  }

  const ticketId = `#${String(venta.id).padStart(5, '0')}`

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onCerrar?.()}>
      <div style={styles.wrapper}>

        {/* ── Controles externos al ticket ──────────────────────── */}
        <div style={styles.controls}>
          <span style={styles.controlsTitle}>Vista previa del ticket</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {onImprimir && (
              <button
                style={{ ...styles.btnControl, ...styles.btnPrint }}
                onClick={onImprimir}
                disabled={imprimiendo}
              >
                {imprimiendo ? '⏳ Imprimiendo...' : '🖨️ Imprimir'}
              </button>
            )}
            <button style={{ ...styles.btnControl, ...styles.btnClose }} onClick={onCerrar}>
              ✕ Cerrar
            </button>
          </div>
        </div>

        {/* ── Ticket térmico ────────────────────────────────────── */}
        <div style={styles.ticket}>

          {/* Encabezado */}
          <div style={styles.nombreNegocio}>
            {config.nombre_negocio || 'MI POS'}
          </div>

          {config.direccion && (
            <div style={styles.lineaCentro}>{config.direccion}</div>
          )}
          {config.telefono && (
            <div style={styles.lineaCentro}>Tel: {config.telefono}</div>
          )}

          <div style={styles.separador}>{'─'.repeat(32)}</div>

          <div style={styles.lineaCentro}><strong>Ticket {ticketId}</strong></div>
          <div style={styles.lineaCentro}>{fecha}</div>
          <div style={styles.lineaCentro}>
            Pago: {METODO_LABEL[venta.metodo_pago] || venta.metodo_pago}
          </div>

          <div style={styles.separador}>{'─'.repeat(32)}</div>

          {/* Encabezado de tabla */}
          <div style={styles.filaHeader}>
            <span style={{ width: 30 }}>Cant</span>
            <span style={{ flex: 1 }}>Producto</span>
            <span style={{ width: 70, textAlign: 'right' }}>Total</span>
          </div>

          <div style={styles.separadorFino}>{'·'.repeat(32)}</div>

          {/* Items */}
          {items.map((item, i) => (
            <div key={i} style={styles.filaItem}>
              <span style={{ width: 30 }}>{item.cantidad}x</span>
              <span style={{ flex: 1 }}>{item.producto_nombre}</span>
              <span style={{ width: 70, textAlign: 'right' }}>
                ${Number(item.subtotal).toLocaleString('es-CO')}
              </span>
            </div>
          ))}

          <div style={styles.separador}>{'─'.repeat(32)}</div>

          {/* Total */}
          <div style={styles.filaTotal}>
            <span>TOTAL</span>
            <span style={styles.totalValor}>
              ${Number(venta.total).toLocaleString('es-CO')}
            </span>
          </div>

          <div style={styles.separador}>{'─'.repeat(32)}</div>

          {/* Pie */}
          <div style={{ ...styles.lineaCentro, marginTop: 4 }}>
            {config.mensaje_recibo || '¡Gracias por su visita!'}
          </div>

          {/* Perforación simulada */}
          <div style={styles.perforacion}>
            {'◦ '.repeat(16)}
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Estilos inline (independientes del tema claro/oscuro) ─────────────────────
// El ticket SIEMPRE es blanco con texto negro — así se ve una impresión real.
const FONT = '"Courier New", Courier, monospace'
const TICKET_W = 300   // ~80mm en pantalla

const styles = {
  overlay: {
    position:        'fixed',
    inset:           0,
    background:      'rgba(0,0,0,0.72)',
    backdropFilter:  'blur(4px)',
    display:         'flex',
    flexDirection:   'column',
    alignItems:      'center',
    justifyContent:  'center',
    zIndex:          2000,
    padding:         20,
    overflowY:       'auto',
  },

  wrapper: {
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    gap:            12,
    width:          TICKET_W,
  },

  controls: {
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'space-between',
    width:           '100%',
  },

  controlsTitle: {
    fontSize:   12,
    fontWeight: 700,
    color:      'rgba(255,255,255,0.7)',
    fontFamily: 'inherit',
  },

  btnControl: {
    padding:      '8px 14px',
    border:       'none',
    borderRadius: 8,
    fontSize:     12,
    fontWeight:   700,
    cursor:       'pointer',
    fontFamily:   'inherit',
    minHeight:    36,
  },

  btnPrint: {
    background: '#22c55e',
    color:      '#fff',
  },

  btnClose: {
    background: 'rgba(255,255,255,0.15)',
    color:      '#fff',
  },

  // ── El ticket en sí ──────────────────────────────────────────
  ticket: {
    width:           TICKET_W,
    background:      '#ffffff',
    color:           '#111111',
    fontFamily:      FONT,
    fontSize:        12,
    padding:         '20px 16px 8px',
    boxShadow:       '0 8px 32px rgba(0,0,0,0.5)',
    borderRadius:    '2px 2px 0 0',
    lineHeight:      1.55,
  },

  nombreNegocio: {
    textAlign:  'center',
    fontWeight: '700',
    fontSize:   17,
    fontFamily: FONT,
    marginBottom: 2,
  },

  lineaCentro: {
    textAlign:  'center',
    fontSize:   11,
    fontFamily: FONT,
    lineHeight: 1.4,
  },

  separador: {
    textAlign:   'center',
    color:       '#555',
    fontSize:    11,
    margin:      '6px 0',
    letterSpacing: '-1px',
    fontFamily:  FONT,
    overflow:    'hidden',
  },

  separadorFino: {
    textAlign:   'center',
    color:       '#aaa',
    fontSize:    10,
    margin:      '3px 0',
    letterSpacing: '-1px',
    fontFamily:  FONT,
  },

  filaHeader: {
    display:    'flex',
    fontWeight: '700',
    fontSize:   11,
    fontFamily: FONT,
    padding:    '1px 0',
  },

  filaItem: {
    display:    'flex',
    fontSize:   11,
    fontFamily: FONT,
    padding:    '2px 0',
    lineHeight: 1.35,
  },

  filaTotal: {
    display:        'flex',
    justifyContent: 'space-between',
    fontWeight:     '700',
    fontSize:       13,
    fontFamily:     FONT,
    padding:        '4px 0',
  },

  totalValor: {
    fontSize:   15,
    fontWeight: '700',
    fontFamily: FONT,
  },

  perforacion: {
    marginTop:   12,
    textAlign:   'center',
    color:       '#ccc',
    fontSize:    10,
    letterSpacing: '0px',
    fontFamily:  FONT,
    overflow:    'hidden',
  },
}
