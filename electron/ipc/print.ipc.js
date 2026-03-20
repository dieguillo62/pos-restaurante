const { ipcMain } = require('electron')
const { getDatabase } = require('../database/connection')

/**
 * Registra los handlers IPC de impresión.
 * Llamar desde electron/ipc/index.js → registerAllHandlers()
 */
function registerPrintHandlers() {
  // ── print:recibo ────────────────────────────────────────────────
  ipcMain.handle('print:recibo', async (_, ventaId) => {
    const db = getDatabase()

    // 1. Obtener datos completos de la venta
    const venta = db.prepare('SELECT * FROM ventas WHERE id = ?').get(ventaId)
    if (!venta) return { success: false, mensaje: `Venta #${ventaId} no encontrada.` }

    const items = db.prepare(`
      SELECT vi.*, p.nombre AS producto_nombre
      FROM venta_items vi
      JOIN productos p ON p.id = vi.producto_id
      WHERE vi.venta_id = ?
    `).all(ventaId)

    const configRows = db.prepare('SELECT * FROM configuracion').all()
    const config = configRows.reduce((acc, r) => ({ ...acc, [r.clave]: r.valor }), {})

    // 2. Construir estructura de impresión para electron-pos-printer
    const fechaFormato = new Date(venta.created_at).toLocaleString('es-CO', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

    const METODO_LABEL = {
      efectivo:  'Efectivo',
      nequi:     'Nequi',
      daviplata: 'DaviPlata',
    }

    const dataToPrint = [
      // ── Encabezado ────────────────────────────────────────────
      {
        type: 'text',
        value: config.nombre_negocio || 'MI POS',
        style: { fontWeight: '700', textAlign: 'center', fontSize: '18px' },
      },
      {
        type: 'text',
        value: config.direccion || '',
        style: { textAlign: 'center', fontSize: '12px' },
      },
      {
        type: 'text',
        value: config.telefono || '',
        style: { textAlign: 'center', fontSize: '12px' },
      },
      {
        type: 'text',
        value: '--------------------------------',
        style: { textAlign: 'center' },
      },
      {
        type: 'text',
        value: `Ticket: #${String(venta.id).padStart(5, '0')}`,
        style: { textAlign: 'center', fontWeight: '700' },
      },
      {
        type: 'text',
        value: fechaFormato,
        style: { textAlign: 'center', fontSize: '12px' },
      },
      {
        type: 'text',
        value: `Pago: ${METODO_LABEL[venta.metodo_pago] || venta.metodo_pago}`,
        style: { textAlign: 'center', fontSize: '12px' },
      },
      {
        type: 'text',
        value: '--------------------------------',
        style: { textAlign: 'center' },
      },

      // ── Tabla de productos ────────────────────────────────────
      {
        type: 'table',
        tableHeader: ['Cant', 'Producto', 'Total'],
        tableBody: items.map(i => [
          String(i.cantidad),
          i.producto_nombre,
          `$${Number(i.subtotal).toLocaleString('es-CO')}`,
        ]),
        tableFooter: ['-', 'TOTAL', `$${Number(venta.total).toLocaleString('es-CO')}`],
        tableHeaderStyle: { fontWeight: '700', fontSize: '12px' },
        tableBodyStyle:   { fontSize: '12px' },
        tableFooterStyle: { fontWeight: '700', fontSize: '13px' },
      },

      // ── Pie ───────────────────────────────────────────────────
      {
        type: 'text',
        value: '--------------------------------',
        style: { textAlign: 'center' },
      },
      {
        type: 'text',
        value: config.mensaje_recibo || '¡Gracias por su visita!',
        style: { textAlign: 'center', fontSize: '13px', fontWeight: '600' },
      },
      {
        type: 'text',
        value: ' ',
        style: { fontSize: '14px' },
      },
    ]

    // 3. Imprimir
    try {
      const { PosPrinter } = require('electron-pos-printer')

      const options = {
        printerName: config.impresora_nombre || 'POS-80',
        preview:     false,
        silent:      true,
        copies:      1,
        timeOutPerLine: 400,
        pageSize: '80mm',
      }

      await PosPrinter.print(dataToPrint, options)

      console.log(`[PRINT] ✅ Ticket #${ventaId} impreso en "${options.printerName}"`)
      return { success: true, mensaje: `Ticket #${ventaId} impreso correctamente.` }

    } catch (err) {
      console.error('[PRINT] ❌ Error al imprimir:', err.message)
      return {
        success: false,
        mensaje: `Error al imprimir: ${err.message}`,
        // Devolvemos los datos para que React muestre el preview igualmente
        data: { venta, items, config },
      }
    }
  })

  // ── print:cierreCaja ────────────────────────────────────────────
  ipcMain.handle('print:cierreCaja', async (_, resumenData) => {
    try {
      const { PosPrinter } = require('electron-pos-printer')

      const { sesion, ventas = {}, egresos = 0, config = {} } = resumenData

      const fechaCierre = new Date().toLocaleString('es-CO', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })

      const dataToPrint = [
        {
          type: 'text',
          value: config.nombre_negocio || 'MI POS',
          style: { fontWeight: '700', textAlign: 'center', fontSize: '16px' },
        },
        {
          type: 'text',
          value: 'CIERRE DE CAJA',
          style: { fontWeight: '700', textAlign: 'center', fontSize: '14px' },
        },
        {
          type: 'text',
          value: fechaCierre,
          style: { textAlign: 'center', fontSize: '12px' },
        },
        {
          type: 'text',
          value: '--------------------------------',
          style: { textAlign: 'center' },
        },
        {
          type: 'table',
          tableHeader: ['Concepto', 'Valor'],
          tableBody: [
            ['Apertura',        `$${Number(sesion?.monto_apertura ?? 0).toLocaleString('es-CO')}`],
            ['Ventas totales',  `$${Number(ventas.total ?? 0).toLocaleString('es-CO')}`],
            ['  - Efectivo',    `$${Number(ventas.efectivo  ?? 0).toLocaleString('es-CO')}`],
            ['  - Nequi',       `$${Number(ventas.nequi     ?? 0).toLocaleString('es-CO')}`],
            ['  - DaviPlata',   `$${Number(ventas.daviplata ?? 0).toLocaleString('es-CO')}`],
            ['Egresos',         `$${Number(egresos).toLocaleString('es-CO')}`],
          ],
          tableFooter: [
            'TOTAL EN CAJA',
            `$${Number(
              (sesion?.monto_apertura ?? 0) + (ventas.total ?? 0) - egresos
            ).toLocaleString('es-CO')}`,
          ],
          tableHeaderStyle: { fontWeight: '700', fontSize: '12px' },
          tableBodyStyle:   { fontSize: '12px' },
          tableFooterStyle: { fontWeight: '700', fontSize: '13px' },
        },
        {
          type: 'text',
          value: ' ',
          style: { fontSize: '14px' },
        },
      ]

      const options = {
        printerName: config.impresora_nombre || 'POS-80',
        preview:     false,
        silent:      true,
        copies:      1,
        pageSize:    '80mm',
      }

      await PosPrinter.print(dataToPrint, options)
      return { success: true, mensaje: 'Cierre de caja impreso.' }

    } catch (err) {
      console.error('[PRINT] ❌ Error al imprimir cierre:', err.message)
      return { success: false, mensaje: `Error: ${err.message}` }
    }
  })
}

module.exports = { registerPrintHandlers }
