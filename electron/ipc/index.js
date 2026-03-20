const { registerAuthHandlers } = require('./auth.ipc')
const { registerPrintHandlers } = require('./print.ipc')
const { ipcMain } = require('electron')
const { getDatabase } = require('../database/connection')

function registerAllHandlers() {
  registerAuthHandlers()    // ← NUEVO
  registerPrintHandlers()
  _registrarProductos()
  _registrarCategorias()
  _registrarVentas()
  _registrarCaja()
  _registrarStock()
  _registrarReportes()
  _registrarConfig()
  console.log('[IPC] ✅ Todos los handlers registrados.')
}

function fechaHoy() {
  return new Date().toLocaleDateString('en-CA')
}

// ─── Productos ────────────────────────────────────────────────────────────────

function _registrarProductos() {
  ipcMain.handle('productos:listar', () => {
    const db = getDatabase()
    return db.prepare(`
      SELECT p.*, c.nombre AS categoria_nombre, c.color AS categoria_color,
             s.cantidad_actual, s.alerta_minimo, s.unidad
      FROM productos p
      JOIN categorias c ON c.id = p.categoria_id
      LEFT JOIN stock s ON s.producto_id = p.id
      WHERE p.activo = 1
      ORDER BY c.orden ASC, p.nombre ASC
    `).all()
  })

  ipcMain.handle('productos:crear', (_, data) => {
    const db = getDatabase()
    const { nombre, precio, categoria_id, gestiona_stock = false, imagen_path = null } = data
    if (!nombre?.trim()) throw new Error('El nombre es obligatorio.')
    if (precio == null || precio < 0) throw new Error('El precio debe ser >= 0.')

    return db.transaction(() => {
      const res = db.prepare(`
        INSERT INTO productos (nombre, precio, categoria_id, gestiona_stock, imagen_path)
        VALUES (?, ?, ?, ?, ?)
      `).run(nombre.trim(), precio, categoria_id, gestiona_stock ? 1 : 0, imagen_path)

      if (gestiona_stock) {
        db.prepare('INSERT INTO stock (producto_id, cantidad_actual, alerta_minimo) VALUES (?, 0, 5)').run(res.lastInsertRowid)
      }
      return db.prepare('SELECT * FROM productos WHERE id = ?').get(res.lastInsertRowid)
    })()
  })

  ipcMain.handle('productos:actualizar', (_, id, data) => {
    const db = getDatabase()
    const { nombre, precio, categoria_id, gestiona_stock, activo } = data
    db.prepare(`
      UPDATE productos SET nombre=?, precio=?, categoria_id=?, gestiona_stock=?, activo=? WHERE id=?
    `).run(nombre.trim(), precio, categoria_id, gestiona_stock ? 1 : 0, activo ? 1 : 0, id)
    return { success: true }
  })

  ipcMain.handle('productos:eliminar', (_, id) => {
    const db = getDatabase()
    db.prepare('UPDATE productos SET activo = 0 WHERE id = ?').run(id)
    return { success: true }
  })
}

// ─── Categorías ───────────────────────────────────────────────────────────────

function _registrarCategorias() {
  ipcMain.handle('categorias:listar', () => {
    return getDatabase().prepare('SELECT * FROM categorias WHERE activo=1 ORDER BY orden ASC').all()
  })

  ipcMain.handle('categorias:crear', (_, { nombre, orden = 0, color = '#6366f1' }) => {
    const db = getDatabase()
    if (!nombre?.trim()) throw new Error('Nombre obligatorio.')
    const res = db.prepare('INSERT INTO categorias (nombre,orden,color) VALUES (?,?,?)').run(nombre.trim(), orden, color)
    return db.prepare('SELECT * FROM categorias WHERE id=?').get(res.lastInsertRowid)
  })
}

// ─── Ventas ───────────────────────────────────────────────────────────────────

function _registrarVentas() {
  ipcMain.handle('ventas:crear', (_, data) => {
    const db = getDatabase()
    const { items, metodo_pago, total, sesion_id } = data
    if (!items?.length) throw new Error('Sin productos.')
    if (!sesion_id)     throw new Error('Sin sesión de caja.')

    return db.transaction(() => {
      const { lastInsertRowid: ventaId } = db.prepare(
        'INSERT INTO ventas (total, metodo_pago, sesion_id) VALUES (?,?,?)'
      ).run(total, metodo_pago, sesion_id)

      const stmtItem  = db.prepare('INSERT INTO venta_items (venta_id,producto_id,cantidad,precio_unitario,subtotal) VALUES (?,?,?,?,?)')
      const stmtStock = db.prepare('UPDATE stock SET cantidad_actual=cantidad_actual-?, updated_at=CURRENT_TIMESTAMP WHERE producto_id=?')
      const stmtMov   = db.prepare("INSERT INTO movimientos_stock (producto_id,tipo,cantidad,referencia_id) VALUES (?,'venta',?,?)")

      for (const item of items) {
        stmtItem.run(ventaId, item.producto_id, item.cantidad, item.precio_unitario, item.subtotal)
        const p = db.prepare('SELECT gestiona_stock FROM productos WHERE id=?').get(item.producto_id)
        if (p?.gestiona_stock) {
          stmtStock.run(item.cantidad, item.producto_id)
          stmtMov.run(item.producto_id, -item.cantidad, ventaId)
        }
      }

      const venta = db.prepare('SELECT * FROM ventas WHERE id=?').get(ventaId)
      const ventaItems = db.prepare(`
        SELECT vi.*, p.nombre AS producto_nombre FROM venta_items vi
        JOIN productos p ON p.id=vi.producto_id WHERE vi.venta_id=?
      `).all(ventaId)
      return { ...venta, items: ventaItems }
    })()
  })

  ipcMain.handle('ventas:listarHoy', () => {
    const db = getDatabase()
    return db.prepare(`
      SELECT v.*, COUNT(vi.id) AS total_items FROM ventas v
      LEFT JOIN venta_items vi ON vi.venta_id=v.id
      WHERE date(v.created_at,'localtime')=? AND v.estado='completada'
      GROUP BY v.id ORDER BY v.created_at DESC
    `).all(fechaHoy())
  })

  ipcMain.handle('ventas:listarPorFecha', (_, desde, hasta) => {
    return getDatabase().prepare(`
      SELECT * FROM ventas
      WHERE date(created_at,'localtime') BETWEEN ? AND ? AND estado='completada'
      ORDER BY created_at DESC
    `).all(desde, hasta)
  })

  ipcMain.handle('ventas:anular', (_, id) => {
    const db = getDatabase()
    const venta = db.prepare('SELECT * FROM ventas WHERE id=?').get(id)
    if (!venta)                   throw new Error('Venta no encontrada.')
    if (venta.estado==='anulada') throw new Error('Ya anulada.')

    db.transaction(() => {
      db.prepare("UPDATE ventas SET estado='anulada' WHERE id=?").run(id)
      for (const item of db.prepare('SELECT * FROM venta_items WHERE venta_id=?').all(id)) {
        const p = db.prepare('SELECT gestiona_stock FROM productos WHERE id=?').get(item.producto_id)
        if (p?.gestiona_stock) {
          db.prepare('UPDATE stock SET cantidad_actual=cantidad_actual+? WHERE producto_id=?').run(item.cantidad, item.producto_id)
          db.prepare("INSERT INTO movimientos_stock (producto_id,tipo,cantidad,referencia_id,nota) VALUES (?,'ajuste_manual',?,?,'Reversión anulación')").run(item.producto_id, item.cantidad, id)
        }
      }
    })()
    return { success: true }
  })
}

// ─── Caja ─────────────────────────────────────────────────────────────────────

function _registrarCaja() {
  ipcMain.handle('caja:obtenerActiva', () => {
    return getDatabase().prepare("SELECT * FROM sesiones_caja WHERE estado='abierta' LIMIT 1").get() ?? null
  })

  ipcMain.handle('caja:abrir', (_, monto) => {
    const db = getDatabase()
    if (db.prepare("SELECT id FROM sesiones_caja WHERE estado='abierta'").get()) {
      throw new Error('Ya hay una caja abierta.')
    }
    if (monto == null || monto < 0) throw new Error('Monto inválido.')
    const { lastInsertRowid } = db.prepare('INSERT INTO sesiones_caja (monto_apertura) VALUES (?)').run(monto)
    return db.prepare('SELECT * FROM sesiones_caja WHERE id=?').get(lastInsertRowid)
  })

  ipcMain.handle('caja:cerrar', (_, sesionId) => {
    const db = getDatabase()
    const sesion = db.prepare('SELECT * FROM sesiones_caja WHERE id=?').get(sesionId)
    if (!sesion)                  throw new Error('Sesión no encontrada.')
    if (sesion.estado==='cerrada') throw new Error('Ya cerrada.')

    const { total: tv } = db.prepare("SELECT COALESCE(SUM(total),0) AS total FROM ventas WHERE sesion_id=? AND estado='completada'").get(sesionId)
    const { total: te } = db.prepare("SELECT COALESCE(SUM(monto),0) AS total FROM movimientos_caja WHERE sesion_id=? AND tipo='egreso'").get(sesionId)
    const montoCierre = sesion.monto_apertura + tv - te

    db.prepare("UPDATE sesiones_caja SET estado='cerrada',monto_cierre=?,cerrada_at=CURRENT_TIMESTAMP WHERE id=?").run(montoCierre, sesionId)
    return { sesion_id: sesionId, monto_apertura: sesion.monto_apertura, total_ventas: tv, total_egresos: te, monto_cierre: montoCierre }
  })

  ipcMain.handle('caja:registrarEgreso', (_, { sesion_id, monto, descripcion }) => {
    const db = getDatabase()
    if (!descripcion?.trim()) throw new Error('Descripción obligatoria.')
    if (monto <= 0)           throw new Error('Monto debe ser > 0.')
    const { lastInsertRowid } = db.prepare("INSERT INTO movimientos_caja (sesion_id,tipo,monto,descripcion) VALUES (?,'egreso',?,?)").run(sesion_id, monto, descripcion.trim())
    return { id: lastInsertRowid, sesion_id, monto, descripcion }
  })

  ipcMain.handle('caja:listarMovimientos', (_, sesionId) => {
    return getDatabase().prepare('SELECT * FROM movimientos_caja WHERE sesion_id=? ORDER BY created_at DESC').all(sesionId)
  })

  ipcMain.handle('caja:resumenSesion', (_, sesionId) => {
    const db = getDatabase()
    const sesion  = db.prepare('SELECT * FROM sesiones_caja WHERE id=?').get(sesionId)
    const ventas  = db.prepare(`SELECT COUNT(*) AS cantidad, COALESCE(SUM(total),0) AS total,
      COALESCE(SUM(CASE WHEN metodo_pago='efectivo' THEN total ELSE 0 END),0) AS efectivo,
      COALESCE(SUM(CASE WHEN metodo_pago='nequi'    THEN total ELSE 0 END),0) AS nequi,
      COALESCE(SUM(CASE WHEN metodo_pago='daviplata' THEN total ELSE 0 END),0) AS daviplata
      FROM ventas WHERE sesion_id=? AND estado='completada'`).get(sesionId)
    const { total: egresos } = db.prepare("SELECT COALESCE(SUM(monto),0) AS total FROM movimientos_caja WHERE sesion_id=? AND tipo='egreso'").get(sesionId)
    return { sesion, ventas, egresos }
  })
}

// ─── Stock ────────────────────────────────────────────────────────────────────

function _registrarStock() {
  ipcMain.handle('stock:listar', () => {
    return getDatabase().prepare(`
      SELECT s.*, p.nombre AS producto_nombre, p.gestiona_stock FROM stock s
      JOIN productos p ON p.id=s.producto_id WHERE p.activo=1 ORDER BY p.nombre ASC
    `).all()
  })

  ipcMain.handle('stock:ajustar', (_, { producto_id, cantidad, tipo = 'ajuste_manual', nota = null }) => {
    const db = getDatabase()
    db.transaction(() => {
      db.prepare('UPDATE stock SET cantidad_actual=cantidad_actual+?,updated_at=CURRENT_TIMESTAMP WHERE producto_id=?').run(cantidad, producto_id)
      db.prepare('INSERT INTO movimientos_stock (producto_id,tipo,cantidad,nota) VALUES (?,?,?,?)').run(producto_id, tipo, cantidad, nota)
    })()
    return { success: true }
  })

  ipcMain.handle('stock:historial', (_, productoId) => {
    return getDatabase().prepare('SELECT * FROM movimientos_stock WHERE producto_id=? ORDER BY created_at DESC LIMIT 50').all(productoId)
  })
}

// ─── Reportes ─────────────────────────────────────────────────────────────────

function _registrarReportes() {
  ipcMain.handle('reportes:resumenDiario', (_, fecha) => {
    return getDatabase().prepare(`
      SELECT COUNT(*) AS total_ventas, COALESCE(SUM(total),0) AS ingresos_total,
        COALESCE(SUM(CASE WHEN metodo_pago='efectivo'  THEN total ELSE 0 END),0) AS efectivo,
        COALESCE(SUM(CASE WHEN metodo_pago='nequi'     THEN total ELSE 0 END),0) AS nequi,
        COALESCE(SUM(CASE WHEN metodo_pago='daviplata' THEN total ELSE 0 END),0) AS daviplata
      FROM ventas WHERE date(created_at,'localtime')=? AND estado='completada'
    `).get(fecha ?? fechaHoy())
  })

  ipcMain.handle('reportes:productosMasVendidos', (_, desde, hasta) => {
    return getDatabase().prepare(`
      SELECT p.id, p.nombre, c.nombre AS categoria,
        SUM(vi.cantidad) AS total_vendido, SUM(vi.subtotal) AS total_ingresos
      FROM venta_items vi JOIN productos p ON p.id=vi.producto_id
      JOIN categorias c ON c.id=p.categoria_id JOIN ventas v ON v.id=vi.venta_id
      WHERE date(v.created_at,'localtime') BETWEEN ? AND ? AND v.estado='completada'
      GROUP BY vi.producto_id ORDER BY total_vendido DESC LIMIT 20
    `).all(desde ?? fechaHoy(), hasta ?? fechaHoy())
  })

  ipcMain.handle('reportes:horasPico', (_, fecha) => {
    return getDatabase().prepare(`
      SELECT CAST(strftime('%H',created_at,'localtime') AS INTEGER) AS hora,
        COUNT(*) AS total_ventas, COALESCE(SUM(total),0) AS total_ingresos
      FROM ventas WHERE date(created_at,'localtime')=? AND estado='completada'
      GROUP BY hora ORDER BY hora ASC
    `).all(fecha ?? fechaHoy())
  })

  ipcMain.handle('reportes:resumenMensual', (_, anio, mes) => {
    const prefijo = `${anio ?? new Date().getFullYear()}-${String(mes ?? new Date().getMonth()+1).padStart(2,'0')}`
    return getDatabase().prepare(`
      SELECT date(created_at,'localtime') AS fecha, COUNT(*) AS total_ventas, COALESCE(SUM(total),0) AS total_ingresos
      FROM ventas WHERE strftime('%Y-%m',created_at,'localtime')=? AND estado='completada'
      GROUP BY fecha ORDER BY fecha ASC
    `).all(prefijo)
  })
}

// ─── Configuración ────────────────────────────────────────────────────────────

function _registrarConfig() {
  ipcMain.handle('config:obtener', (_, clave) => {
    const row = getDatabase().prepare('SELECT valor FROM configuracion WHERE clave=?').get(clave)
    return row?.valor ?? null
  })

  ipcMain.handle('config:guardar', (_, clave, valor) => {
    getDatabase().prepare('INSERT OR REPLACE INTO configuracion (clave,valor) VALUES (?,?)').run(clave, String(valor))
    return { success: true }
  })

  ipcMain.handle('config:obtenerTodos', () => {
    return getDatabase().prepare('SELECT * FROM configuracion').all()
      .reduce((acc, r) => ({ ...acc, [r.clave]: r.valor }), {})
  })
}

module.exports = { registerAllHandlers }
