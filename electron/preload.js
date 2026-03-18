const { contextBridge, ipcRenderer } = require('electron')

const api = {
  // ── Productos ──────────────────────────────────────────────────────────────
  productos: {
    listar: () => ipcRenderer.invoke('productos:listar'),
    crear: (data) => ipcRenderer.invoke('productos:crear', data),
    actualizar: (id, data) => ipcRenderer.invoke('productos:actualizar', id, data),
    eliminar: (id) => ipcRenderer.invoke('productos:eliminar', id),
  },

  // ── Categorías ─────────────────────────────────────────────────────────────
  categorias: {
    listar: () => ipcRenderer.invoke('categorias:listar'),
    crear: (data) => ipcRenderer.invoke('categorias:crear', data),
  },

  // ── Ventas ─────────────────────────────────────────────────────────────────
  ventas: {
    crear: (data) => ipcRenderer.invoke('ventas:crear', data),
    listarHoy: () => ipcRenderer.invoke('ventas:listarHoy'),
    listarPorFecha: (desde, hasta) => ipcRenderer.invoke('ventas:listarPorFecha', desde, hasta),
    anular: (id) => ipcRenderer.invoke('ventas:anular', id),
  },

  // ── Caja ───────────────────────────────────────────────────────────────────
  caja: {
    obtenerActiva: () => ipcRenderer.invoke('caja:obtenerActiva'),
    abrir: (monto) => ipcRenderer.invoke('caja:abrir', monto),
    cerrar: (sesionId) => ipcRenderer.invoke('caja:cerrar', sesionId),
    registrarEgreso: (data) => ipcRenderer.invoke('caja:registrarEgreso', data),
    listarMovimientos: (sesionId) => ipcRenderer.invoke('caja:listarMovimientos', sesionId),
    resumenSesion: (sesionId) => ipcRenderer.invoke('caja:resumenSesion', sesionId),
  },

  // ── Stock ──────────────────────────────────────────────────────────────────
  stock: {
    listar: () => ipcRenderer.invoke('stock:listar'),
    ajustar: (data) => ipcRenderer.invoke('stock:ajustar', data),
    historial: (productoId) => ipcRenderer.invoke('stock:historial', productoId),
  },

  // ── Reportes ───────────────────────────────────────────────────────────────
  reportes: {
    resumenDiario: (fecha) => ipcRenderer.invoke('reportes:resumenDiario', fecha),
    productosMasVendidos: (desde, hasta) => ipcRenderer.invoke('reportes:productosMasVendidos', desde, hasta),
    horasPico: (fecha) => ipcRenderer.invoke('reportes:horasPico', fecha),
    resumenMensual: (anio, mes) => ipcRenderer.invoke('reportes:resumenMensual', anio, mes),
  },

  // ── Impresión ──────────────────────────────────────────────────────────────
  print: {
    recibo: (ventaId) => ipcRenderer.invoke('print:recibo', ventaId),
    cierreCaja: (data) => ipcRenderer.invoke('print:cierreCaja', data),
  },

  // ── Configuración ──────────────────────────────────────────────────────────
  config: {
    obtener: (clave) => ipcRenderer.invoke('config:obtener', clave),
    guardar: (clave, valor) => ipcRenderer.invoke('config:guardar', clave, valor),
    obtenerTodos: () => ipcRenderer.invoke('config:obtenerTodos'),
  },

}


Object.freeze(api);
Object.freeze(api.productos);
Object.freeze(api.ventas);


contextBridge.exposeInMainWorld('electronAPI', api);